import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../shared/audit.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new order and temporarily reserve a Founder seat
   */
  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('Account email verification pending.');
    }

    // 1. Fetch pricing plan
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Selected membership plan is inactive or not found.');
    }

    // 2. Validate seat inventory availability
    if (plan.maxSeats && plan.seatsTaken >= plan.maxSeats) {
      throw new ConflictException('Selected plan seats capacity has been filled.');
    }

    // Check if user already has an active order or subscription
    const existingActiveSub = await this.prisma.membershipSubscription.findUnique({
      where: { userId },
    });
    if (existingActiveSub && existingActiveSub.status === 'ACTIVE') {
      throw new ConflictException('You already have an active subscription.');
    }

    // 3. Generate unique sequential Order Number
    const count = await this.prisma.order.count();
    const serial = String(count + 1).padStart(6, '0');
    const orderNumber = `JXO-2026-${serial}`;

    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes checkout lock

    // 4. Create Order inside database transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Lock a seat on the plan
      await tx.membershipPlan.update({
        where: { id: plan.id },
        data: { seatsTaken: { increment: 1 } },
      });

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: 'PENDING_PAYMENT',
          totalAmount: plan.price,
          currency: plan.currency,
          reservedUntil,
          items: {
            create: {
              planId: plan.id,
              name: plan.name,
              price: plan.price,
              quantity: 1,
            },
          },
        },
        include: {
          items: true,
        },
      });

      // Upsert user subscription state to PENDING_PAYMENT
      const upsertedSub = await tx.membershipSubscription.upsert({
        where: { userId },
        update: {
          planId: plan.id,
          status: 'PENDING_PAYMENT',
          amount: plan.price,
          currency: plan.currency,
          reservedUntil,
        },
        create: {
          userId,
          planId: plan.id,
          status: 'PENDING_PAYMENT',
          amount: plan.price,
          currency: plan.currency,
          reservedUntil,
        },
      });

      // Log subscription transition history
      await tx.membershipHistory.create({
        data: {
          userId,
          subscriptionId: upsertedSub.id,
          oldStatus: existingActiveSub?.status || 'DRAFT',
          newStatus: 'PENDING_PAYMENT',
          reason: `Created order: ${orderNumber}. Founder seat temporarily reserved.`,
        },
      });

      return newOrder;
    });

    // 5. Write audit log
    await this.audit.logAction(
      userId,
      'ORDER_CREATED',
      ipAddress,
      userAgent,
      `Order: ${orderNumber} created. Reserved seat until: ${reservedUntil.toISOString()}`,
    );

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      currency: order.currency,
      reservedUntil: order.reservedUntil,
      message: 'Order created successfully. Checkout seat locked for 15 minutes.',
    };
  }

  /**
   * Fetch order status details by ID
   */
  async getOrderById(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Unauthorized access to order details.');
    }

    return order;
  }
}
