import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../shared/audit.service';
import { CheckoutDto } from './dto/checkout.dto';
import { InvoicesService } from '../invoices/invoices.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invoices: InvoicesService,
  ) {}

  /**
   * Initialize a checkout payment session mapping the order ID
   */
  async createCheckoutSession(
    userId: string,
    dto: CheckoutDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Unauthorized access to this order.');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(`Cannot checkout order in status: ${order.status}`);
    }

    // Verify seat reservation checkout lock is still active
    if (order.reservedUntil && order.reservedUntil < new Date()) {
      throw new BadRequestException('Checkout seat reservation window has expired. Please create a new order.');
    }

    const transactionId = `tx_${crypto.randomBytes(8).toString('hex')}`;

    // Create PaymentTransaction log in database
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        transactionId,
        provider: 'Stripe',
        status: 'INITIATED',
        amount: order.totalAmount,
        currency: order.currency,
      },
    });

    await this.audit.logAction(
      userId,
      'PAYMENT_CHECKOUT_INITIATED',
      ipAddress,
      userAgent,
      `Checkout session: ${transactionId} initialized for order: ${order.orderNumber}`,
    );

    return {
      success: true,
      transactionId: transaction.transactionId,
      checkoutUrl: `https://checkout.stripe.com/pay/${transaction.transactionId}`,
      amount: transaction.amount,
      currency: transaction.currency,
    };
  }

  /**
   * Verify payments webhook and trigger membership activations
   */
  async handleWebhook(
    payload: any,
    signature: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    console.log('[JovianeX Payments] Webhook received. Validating signature...');

    // Simple webhook validation checks
    if (!signature || signature !== 'jovianex-stripe-webhook-secret-2026') {
      throw new BadRequestException('Invalid webhook signature verification.');
    }

    const { event, data } = payload;
    const { transactionId } = data;

    // 1. Fetch transaction record
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Payment transaction reference ${transactionId} not found.`);
    }

    // 2. IDEMPOTENCY CHECK: If already handled, ignore duplicate events
    if (transaction.status === 'SUCCEEDED' || transaction.status === 'FAILED') {
      console.log(`[JovianeX Payments] Transaction ${transactionId} already processed in status: ${transaction.status}. Skipping.`);
      return { processed: false, reason: 'Duplicate event ignored' };
    }

    // 3. Process events
    if (event === 'payment.succeeded') {
      await this.prisma.$transaction(async (tx) => {
        // Update transaction to SUCCEEDED
        await tx.paymentTransaction.update({
          where: { transactionId },
          data: {
            status: 'SUCCEEDED',
            rawPayload: JSON.stringify(payload),
          },
        });

        // Update Order status to PAID
        const order = await tx.order.update({
          where: { id: transaction.orderId },
          data: {
            status: 'PAID',
            reservedUntil: null,
          },
          include: {
            items: true,
          },
        });

        // Find associated plan details
        const orderItem = order.items[0];
        const plan = await tx.membershipPlan.findUnique({
          where: { id: orderItem.planId },
        });

        if (!plan) {
          throw new NotFoundException('Plan associated with order item not found.');
        }

        // Calculate expiresAt
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + plan.durationYears);

        // Generate serial sequential Founder number: e.g. JXF-N-0001
        const activeFoundersCount = await tx.founderProfile.count();
        const founderNumber = `JXF-N-${String(activeFoundersCount + 1).padStart(4, '0')}`;

        // Activate User Subscription
        const activeSub = await tx.membershipSubscription.update({
          where: { userId: order.userId },
          data: {
            status: 'ACTIVE',
            founderNumber,
            expiresAt,
            reservedUntil: null,
          },
        });

        // Create Founder Profile
        await tx.founderProfile.create({
          data: {
            userId: order.userId,
            founderNumber,
            tier: plan.code === 'founder_launch' ? 'ELITE_FOUNDER' : 'FOUNDER',
            badgeStatus: 'ACTIVE',
            isActive: true,
          },
        });

        // Record history log
        await tx.membershipHistory.create({
          data: {
            userId: order.userId,
            subscriptionId: activeSub.id,
            oldStatus: 'PENDING_PAYMENT',
            newStatus: 'ACTIVE',
            reason: `Order ${order.orderNumber} PAID. Founder Number ${founderNumber} assigned.`,
          },
        });

        // Retrieve user details for audit
        const user = await tx.user.findUnique({
          where: { id: order.userId },
        });

        // Generate Invoice
        await this.invoices.generateInvoiceInternal(
          tx,
          order.id,
          order.userId,
          user ? user.founderId : 'UNKNOWN',
          order.totalAmount,
          order.currency,
        );
      });

      // Log success event
      const order = await this.prisma.order.findUnique({
        where: { id: transaction.orderId },
      });

      await this.audit.logAction(
        order ? order.userId : null,
        'PAYMENT_TRANSACTION_SUCCEEDED',
        ipAddress,
        userAgent,
        `Payment verified. Order ${order ? order.orderNumber : 'N/A'} marked as PAID. Membership activated.`,
      );

      return { processed: true, status: 'SUCCEEDED' };
    } else {
      // Payment Failed logic
      await this.prisma.paymentTransaction.update({
        where: { transactionId },
        data: {
          status: 'FAILED',
          rawPayload: JSON.stringify(payload),
        },
      });

      const order = await this.prisma.order.findUnique({
        where: { id: transaction.orderId },
      });

      if (order) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'FAILED' },
        });
      }

      await this.audit.logAction(
        order ? order.userId : null,
        'PAYMENT_TRANSACTION_FAILED',
        ipAddress,
        userAgent,
        `Payment failed for transaction reference: ${transactionId}`,
      );

      return { processed: true, status: 'FAILED' };
    }
  }
}
