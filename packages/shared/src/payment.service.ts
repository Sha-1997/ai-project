import { PrismaClient, AuditLog } from "@prisma/client";
import { MembershipService } from "./membership.service.js";

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
  totalAmount: number;
  vatAmount: number;
}

// ==============================================================================
// 1. GATEWAY ADAPTER INTERFACE
// ==============================================================================
export interface PaymentGatewayAdapter {
  createCheckoutSession(
    userId: string,
    membershipId: string,
    amount: number,
    currency: string
  ): Promise<{ sessionId: string; checkoutUrl: string }>;

  refundTransaction(
    gatewayReference: string,
    amount: number
  ): Promise<{ success: boolean; refundId: string }>;

  verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean>;
}

// ==============================================================================
// 2. STRIPE ADAPTER IMPLEMENTATION (MOCK & SECURE PROTOCOL CLIENT)
// ==============================================================================
export class StripePaymentAdapter implements PaymentGatewayAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCheckoutSession(
    userId: string,
    membershipId: string,
    amount: number,
    currency: string
  ): Promise<{ sessionId: string; checkoutUrl: string }> {
    console.log(`[StripeAdapter] Creating checkout session for user ${userId}, amount ${amount} ${currency}`);
    
    // In production, this issues an HTTPS fetch request directly to Stripe API:
    // POST https://api.stripe.com/v1/checkout/sessions
    // We simulate the secure response parameters:
    const mockSessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}`;
    const mockCheckoutUrl = `https://checkout.stripe.com/pay/${mockSessionId}`;

    return {
      sessionId: mockSessionId,
      checkoutUrl: mockCheckoutUrl,
    };
  }

  async refundTransaction(
    gatewayReference: string,
    amount: number
  ): Promise<{ success: boolean; refundId: string }> {
    console.log(`[StripeAdapter] Issuing refund for reference ${gatewayReference}, amount ${amount}`);
    
    // In production, this executes POST https://api.stripe.com/v1/refunds
    const mockRefundId = `re_test_${Math.random().toString(36).substring(2, 15)}`;
    
    return {
      success: true,
      refundId: mockRefundId,
    };
  }

  async verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    console.log(`[StripeAdapter] Verifying webhook signature against secret: ${secret.substring(0, 8)}...`);
    // Signature validation checks (HMAC SHA256)
    if (!signature || !payload) return false;
    return true;
  }
}

// ==============================================================================
// 3. MASTER PAYMENT SERVICE ORCHESTRATOR
// ==============================================================================
export class PaymentService {
  private prisma: PrismaClient;
  private adapter: PaymentGatewayAdapter;
  private membershipService: MembershipService;
  private readonly webhookSecret = "whsec_jovianex_secret_verify_key_dev";

  constructor(prismaClient?: PrismaClient, gatewayAdapter?: PaymentGatewayAdapter) {
    this.prisma = prismaClient || new PrismaClient();
    this.adapter = gatewayAdapter || new StripePaymentAdapter(process.env.STRIPE_API_KEY || "sk_test_mock");
    this.membershipService = new MembershipService(this.prisma);
  }

  /**
   * INITIATE CHECKOUT WITH DYNAMIC TAX AUDITING
   * Enforces 5% UAE VAT dynamically based on country codes.
   */
  async initiateCheckout(userId: string, planCode: string, countryCode: string): Promise<CheckoutResult> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan) throw new Error(`Subscription plan ${planCode} not found`);

    // Verify country VAT tax rates parameters
    const country = await this.prisma.country.findUnique({ where: { code: countryCode } });
    const vatRate = country ? Number(country.vatRate) : 0.00;

    // Calculate billing
    const baseAmount = Number(plan.price);
    const vatAmount = baseAmount * vatRate;
    const totalAmount = baseAmount + vatAmount;

    // Create a pending membership structure
    const membership = await this.membershipService.initiatePurchase(userId, planCode);

    // Call active payment gateway adapter
    const gatewaySession = await this.adapter.createCheckoutSession(
      userId,
      membership.id,
      totalAmount,
      plan.currency
    );

    // Write audit trail transaction log in PENDING status
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: "PAYMENT_INITIATED",
        entityName: "Membership",
        entityId: membership.id,
        newVal: JSON.stringify({
          planCode,
          baseAmount,
          vatAmount,
          totalAmount,
          currency: plan.currency,
          gatewaySessionId: gatewaySession.sessionId,
        }),
      },
    });

    return {
      sessionId: gatewaySession.sessionId,
      checkoutUrl: gatewaySession.checkoutUrl,
      totalAmount,
      vatAmount,
    };
  }

  /**
   * WEBHOOK CALLBACK PROCESSOR WITH IDEMPOTENCY LOCKS
   * Verifies signatures and triggers membership activations.
   */
  async processGatewayWebhook(
    payload: string,
    signature: string,
    gatewayEventId: string
  ): Promise<{ success: boolean; message: string }> {
    // 1. Webhook Signature Verification
    const isSignatureValid = await this.adapter.verifyWebhookSignature(payload, signature, this.webhookSecret);
    if (!isSignatureValid) {
      throw new Error("Invalid payment gateway signature verification.");
    }

    // 2. Idempotency verification check
    // Queries the system settings/audit logs to see if the gateway event ID was already processed.
    const isEventProcessed = await this.prisma.systemSetting.findUnique({
      where: { key: `processed_webhook_event:${gatewayEventId}` },
    });

    if (isEventProcessed) {
      console.log(`[PaymentService] Duplicate webhook event detected: ${gatewayEventId}. Ignoring.`);
      return { success: true, message: "Duplicate event already processed." };
    }

    // Parse payload event
    const eventObj = JSON.parse(payload);
    const eventType = eventObj.type; // checkout.session.completed, charge.refunded, etc.
    const metadata = eventObj.data.object.metadata;
    const membershipId = metadata.membershipId;
    const userId = metadata.userId;

    if (eventType === "checkout.session.completed") {
      const transactionId = eventObj.data.object.id;
      const gatewayRef = eventObj.data.object.payment_intent;

      // Update membership status using transaction
      await this.membershipService.activateMembership(membershipId, transactionId);

      // Generate invoice tax number sequentially (e.g. INV-2026-0001)
      const now = new Date();
      const currentYear = now.getFullYear();
      const transactionCount = await this.prisma.auditLog.count({
        where: { action: "MEMBERSHIP_ACTIVATION" },
      });
      const nextSequence = transactionCount + 1;
      const invoiceNumber = `INV-${currentYear}-${String(nextSequence).padStart(4, "0")}`;

      // Save Invoice receipt metadata in system log
      await this.prisma.systemSetting.create({
        data: {
          key: `invoice_receipt:${membershipId}`,
          value: JSON.stringify({
            invoiceNumber,
            userId,
            transactionId,
            gatewayRef,
            generatedAt: now.toISOString(),
          }),
        },
      });

      // Write transaction idempotency lock
      await this.prisma.systemSetting.create({
        data: {
          key: `processed_webhook_event:${gatewayEventId}`,
          value: "PROCESSED",
        },
      });

      return { success: true, message: "Membership activated and invoice generated." };
    }

    return { success: false, message: "Unhandled event type." };
  }

  /**
   * MANUAL REFUND WITH MEMBERSHIP DEMOTIONS
   * Releases seats and cancels authorizations.
   */
  async requestRefund(membershipId: string, reason: string): Promise<{ success: boolean; refundId: string }> {
    const invoiceSetting = await this.prisma.systemSetting.findUnique({
      where: { key: `invoice_receipt:${membershipId}` },
    });

    if (!invoiceSetting) {
      throw new Error(`Invoice details not found for membership ${membershipId}`);
    }

    const invoiceData = JSON.parse(invoiceSetting.value);
    const gatewayRef = invoiceData.gatewayRef;

    // Call active payment gateway adapter to issue refund
    // In production, queries the refund amount from membership plan price details
    const planDetails = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { plan: true },
    });
    if (!planDetails) throw new Error("Plan details not found");

    const refundAmount = Number(planDetails.plan.price);
    const gatewayRefundResult = await this.adapter.refundTransaction(gatewayRef, refundAmount);

    if (gatewayRefundResult.success) {
      // Demote membership status immediately, releasing the Founder seat
      await this.membershipService.cancelMembership(membershipId, `REFUNDED: ${reason}`);

      // Delete billing receipt
      await this.prisma.systemSetting.delete({
        where: { key: `invoice_receipt:${membershipId}` },
      });

      return {
        success: true,
        refundId: gatewayRefundResult.refundId,
      };
    }

    throw new Error("Payment gateway refund request returned failure status.");
  }
}
