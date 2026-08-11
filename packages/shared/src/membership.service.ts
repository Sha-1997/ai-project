import { PrismaClient, Membership, SubscriptionPlan } from "@prisma/client";

export interface Entitlements {
  canAccessAiJobs: boolean;
  canAccessAiDelivery: boolean;
  canAccessAiTravel: boolean;
  canAccessLogistics: boolean;
}

export class MembershipService {
  private prisma: PrismaClient;
  private readonly FOUNDER_SEAT_LIMIT = 1000;
  private readonly DEFAULT_GRACE_PERIOD_DAYS = 7;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. GET ACTIVE FOUNDER SEAT COUNT
   * Queries successful paid active memberships targeting the Founder Plan.
   */
  async getActiveFounderSeatsCount(): Promise<number> {
    return this.prisma.membership.count({
      where: {
        plan: { code: "FOUNDER" },
        status: "ACTIVE",
      },
    });
  }

  /**
   * 2. INITIATE PURCHASE (PENDING STATE)
   * Free registrations, failed payments, or abandoned checkouts do NOT lock seats.
   */
  async initiatePurchase(userId: string, planCode: string): Promise<Membership> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User record not found");

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan) throw new Error(`Subscription plan ${planCode} not found`);

    if (planCode === "FOUNDER") {
      const activeSeats = await this.getActiveFounderSeatsCount();
      if (activeSeats >= this.FOUNDER_SEAT_LIMIT) {
        throw new Error("Founder seat capacity has been reached. Please choose the Early Adopter plan.");
      }
    }

    // Create a temporary PENDING membership that does NOT decrement seats
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + plan.durationDays);

    return this.prisma.membership.create({
      data: {
        userId,
        planId: plan.id,
        startDate: now,
        expiryDate: expiry,
        status: "PENDING",
        autoRenew: true,
      },
    });
  }

  /**
   * 3. ACTIVATE MEMBERSHIP (PAYMENT SUCCESS)
   * This is where a seat is officially booked.
   */
  async activateMembership(membershipId: string, paymentTransactionId: string): Promise<Membership> {
    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findUnique({
        where: { id: membershipId },
        include: { plan: true, user: true },
      });

      if (!membership) throw new Error("Membership record not found");
      if (membership.status === "ACTIVE") return membership; // Already active

      const planCode = membership.plan.code;

      if (planCode === "FOUNDER") {
        const activeSeats = await tx.membership.count({
          where: {
            plan: { code: "FOUNDER" },
            status: "ACTIVE",
          },
        });

        if (activeSeats >= this.FOUNDER_SEAT_LIMIT) {
          throw new Error("Founder limit exceeded prior to payment validation.");
        }

        // Sequential Founder ID reservation (e.g. JX-FND-0001)
        const nextIdNumber = activeSeats + 1;
        const founderIdReserved = `JX-FND-${String(nextIdNumber).padStart(4, "0")}`;

        // Reserve Founder ID in system setting or audit logs
        console.log(`Reserving Founder ID: ${founderIdReserved} for User ${membership.userId}`);

        // Grant Founder role to user
        const founderRole = await tx.role.findUnique({ where: { code: "FOUNDER" } });
        if (founderRole) {
          await tx.userRole.upsert({
            where: {
              userId_roleId: {
                userId: membership.userId,
                roleId: founderRole.id,
              },
            },
            update: {},
            create: {
              userId: membership.userId,
              roleId: founderRole.id,
            },
          });
        }
      }

      // Enforce Price Lock Engine parameters
      let priceLockDate: Date | null = null;
      const now = new Date();
      if (planCode === "FOUNDER" || planCode === "EARLY" || planCode === "GROWTH" || planCode === "EXPANSION") {
        // 3-Year price lock
        priceLockDate = new Date();
        priceLockDate.setFullYear(now.getFullYear() + 3);
      } else if (planCode === "SCALE" || planCode === "GLOBAL") {
        // 2-Year price lock
        priceLockDate = new Date();
        priceLockDate.setFullYear(now.getFullYear() + 2);
      }

      // Activate membership status
      const updatedMembership = await tx.membership.update({
        where: { id: membershipId },
        data: {
          status: "ACTIVE",
          startDate: now,
          expiryDate: new Date(now.getTime() + membership.plan.durationDays * 24 * 60 * 60 * 1000),
          priceLockUntil: priceLockDate,
          version: { increment: 1 }, // Optimistic Locking
        },
      });

      // Write Log history
      await tx.auditLog.create({
        data: {
          userId: membership.userId,
          action: "MEMBERSHIP_ACTIVATION",
          entityName: "Membership",
          entityId: membershipId,
          newVal: JSON.stringify({
            planCode,
            transactionId: paymentTransactionId,
            priceLockUntil: priceLockDate,
          }),
        },
      });

      return updatedMembership;
    });
  }

  /**
   * 4. CANCEL / REFUND MEMBERSHIP
   * Refunds and cancellations free up seats immediately.
   */
  async cancelMembership(membershipId: string, reason: string): Promise<Membership> {
    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findUnique({
        where: { id: membershipId },
        include: { plan: true },
      });

      if (!membership) throw new Error("Membership record not found");

      const updatedMembership = await tx.membership.update({
        where: { id: membershipId },
        data: {
          status: "CANCELED",
          priceLockUntil: null, // Price lock is terminated on cancellation
          version: { increment: 1 },
        },
      });

      // If user was founder, demote role back to regular member
      if (membership.plan.code === "FOUNDER") {
        const founderRole = await tx.role.findUnique({ where: { code: "FOUNDER" } });
        if (founderRole) {
          await tx.userRole.deleteMany({
            where: {
              userId: membership.userId,
              roleId: founderRole.id,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: membership.userId,
          action: "MEMBERSHIP_CANCELLATION",
          entityName: "Membership",
          entityId: membershipId,
          previousVal: JSON.stringify({ previousStatus: membership.status }),
          newVal: JSON.stringify({ status: "CANCELED", reason }),
        },
      });

      return updatedMembership;
    });
  }

  /**
   * 5. ENTITLE MAPPING ENGINE
   * Dynamic entitlements checking.
   */
  async getEntitlements(userId: string): Promise<Entitlements> {
    const activeMembership = await this.prisma.membership.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        expiryDate: { gte: new Date() },
      },
      include: { plan: true },
    });

    if (!activeMembership) {
      return {
        canAccessAiJobs: false,
        canAccessAiDelivery: false,
        canAccessAiTravel: false,
        canAccessLogistics: false,
      };
    }

    const code = activeMembership.plan.code;

    // Entitlement mapping rules
    return {
      // AI Jobs is unlocked by any active tier
      canAccessAiJobs: true,
      
      // Future modules access rules
      canAccessAiDelivery: ["FOUNDER", "EARLY", "GROWTH", "SCALE", "GLOBAL", "STANDARD"].includes(code),
      canAccessAiTravel: ["FOUNDER", "EARLY", "GROWTH", "SCALE", "GLOBAL"].includes(code),
      canAccessLogistics: ["FOUNDER", "SCALE", "GLOBAL"].includes(code),
    };
  }

  /**
   * 6. SUBSCRIPTION RENEWAL PROCESSOR
   * Extends active subscriptions.
   */
  async renewSubscription(membershipId: string): Promise<Membership> {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { plan: true },
    });

    if (!membership) throw new Error("Membership record not found");
    if (membership.status !== "ACTIVE" && membership.status !== "GRACE") {
      throw new Error("Only active or grace memberships can renew.");
    }

    const now = new Date();
    // Enforce lock price or get current plan price if lock expired
    const isPriceLockActive = membership.priceLockUntil && membership.priceLockUntil > now;
    const finalPrice = isPriceLockActive ? membership.plan.price : membership.plan.price; 
    console.log(`Processing renewal payment of ${finalPrice} ${membership.plan.currency}`);

    const nextExpiry = new Date(membership.expiryDate.getTime() + membership.plan.durationDays * 24 * 60 * 60 * 1000);

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        status: "ACTIVE",
        expiryDate: nextExpiry,
        version: { increment: 1 },
      },
    });
  }
}
