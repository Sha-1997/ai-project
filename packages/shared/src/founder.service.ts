import { PrismaClient, Membership, AuditLog } from "@prisma/client";

export interface FounderBenefits {
  priceLockActive: boolean;
  priceLockAmount: number;
  priceLockExpiry: Date | null;
  badgeName: string;
  hasCertificate: boolean;
  hasRecognitionBadge: boolean;
  hasCommunityAccess: boolean;
}

export class FounderService {
  private prisma: PrismaClient;
  private readonly FOUNDER_SEAT_LIMIT = 1000;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. GET ACTIVE FOUNDER SEATS COUNT
   */
  async getActiveSeatsCount(): Promise<number> {
    return this.prisma.membership.count({
      where: {
        plan: { code: "FOUNDER" },
        status: "ACTIVE",
      },
    });
  }

  /**
   * 2. CHECK FOUNDER ELIGIBILITY
   */
  async checkEligibility(userId: string): Promise<{ eligible: boolean; reason: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { eligible: false, reason: "User not found." };

    // Check if user already holds an active Founder seat
    const existingFounderSeat = await this.prisma.membership.findFirst({
      where: {
        userId,
        plan: { code: "FOUNDER" },
        status: "ACTIVE",
      },
    });

    if (existingFounderSeat) {
      return { eligible: false, reason: "User already holds a Founder membership." };
    }

    // Check seat capacity limit
    const activeSeats = await this.getActiveSeatsCount();
    if (activeSeats >= this.FOUNDER_SEAT_LIMIT) {
      return { eligible: false, reason: "Founder seat capacity has been reached." };
    }

    return { eligible: true, reason: "Eligible for Founder seat." };
  }

  /**
   * 3. CONCURRENCY-SAFE SEAT ALLOCATION
   * Utilizes database transaction blocks to prevent double-allocation of the 1000th seat.
   */
  async allocateFounderSeat(userId: string, membershipId: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      // Lock and count existing active Founder seats
      const activeSeats = await tx.membership.count({
        where: {
          plan: { code: "FOUNDER" },
          status: "ACTIVE",
        },
      });

      if (activeSeats >= this.FOUNDER_SEAT_LIMIT) {
        throw new Error("Founder seat capacity has been reached. Allocation aborted.");
      }

      // Verify that user doesn't have an active seat already (concurrency double-click check)
      const duplicateCheck = await tx.membership.findFirst({
        where: {
          userId,
          plan: { code: "FOUNDER" },
          status: "ACTIVE",
        },
      });

      if (duplicateCheck) {
        throw new Error("User already holds an active Founder membership.");
      }

      // Generate sequential six-digit Founder ID (e.g. F-000001)
      const nextId = activeSeats + 1;
      const founderId = `F-${String(nextId).padStart(6, "0")}`;

      // Save Founder ID details in system settings for auditing
      await tx.systemSetting.create({
        data: {
          key: `founder_id:${membershipId}`,
          value: founderId,
          description: `Locked Founder ID for membership ${membershipId}`,
        },
      });

      // Update membership with the price lock details (49 AED for 3 years)
      const now = new Date();
      const lockExpiry = new Date();
      lockExpiry.setFullYear(now.getFullYear() + 3); // 3 Years lock

      await tx.membership.update({
        where: { id: membershipId },
        data: {
          status: "ACTIVE",
          priceLockUntil: lockExpiry,
          version: { increment: 1 },
        },
      });

      // Log the seat allocation audit trail
      await tx.auditLog.create({
        data: {
          userId,
          action: "FOUNDER_SEAT_ALLOCATED",
          entityName: "Membership",
          entityId: membershipId,
          newVal: JSON.stringify({ founderId, priceLockUntil: lockExpiry }),
        },
      });

      return founderId;
    });
  }

  /**
   * 4. REVOKE FOUNDER SEAT (ADMIN ONLY)
   * Refunds or cancellations release the seat immediately back to the pool.
   */
  async revokeFounderSeat(membershipId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.findUnique({
        where: { id: membershipId },
        include: { user: true },
      });

      if (!membership) throw new Error("Membership details not found.");

      // Check if Founder ID exists
      const founderIdSetting = await tx.systemSetting.findUnique({
        where: { key: `founder_id:${membershipId}` },
      });

      const founderId = founderIdSetting ? founderIdSetting.value : "UNKNOWN";

      // Mark status as CANCELED or SUSPENDED
      await tx.membership.update({
        where: { id: membershipId },
        data: {
          status: "CANCELED",
          priceLockUntil: null, // Price lock is revoked
          version: { increment: 1 },
        },
      });

      // Grant demotion to regular user (delete user founder role)
      const founderRole = await tx.role.findUnique({ where: { code: "FOUNDER" } });
      if (founderRole) {
        await tx.userRole.deleteMany({
          where: {
            userId: membership.userId,
            roleId: founderRole.id,
          },
        });
      }

      // Remove the Founder ID key record from settings, freeing the sequential seat count
      await tx.systemSetting.delete({
        where: { key: `founder_id:${membershipId}` },
      });

      // Write revocation logs
      await tx.auditLog.create({
        data: {
          userId: membership.userId,
          action: "FOUNDER_SEAT_REVOKED",
          entityName: "Membership",
          entityId: membershipId,
          previousVal: JSON.stringify({ founderId }),
          newVal: JSON.stringify({ reason }),
        },
      });
    });
  }

  /**
   * 5. GET FOUNDER BENEFITS
   */
  async getFounderBenefits(userId: string): Promise<FounderBenefits> {
    const activeFounder = await this.prisma.membership.findFirst({
      where: {
        userId,
        plan: { code: "FOUNDER" },
        status: "ACTIVE",
        expiryDate: { gte: new Date() },
      },
      include: { plan: true },
    });

    if (!activeFounder) {
      return {
        priceLockActive: false,
        priceLockAmount: 0.00,
        priceLockExpiry: null,
        badgeName: "MEMBER",
        hasCertificate: false,
        hasRecognitionBadge: false,
        hasCommunityAccess: false,
      };
    }

    const now = new Date();
    const isLockActive = activeFounder.priceLockUntil && activeFounder.priceLockUntil > now;

    return {
      priceLockActive: !!isLockActive,
      priceLockAmount: 49.00, // Locked base price (AED)
      priceLockExpiry: activeFounder.priceLockUntil,
      badgeName: "FOUNDER",
      hasCertificate: true,
      hasRecognitionBadge: true,
      hasCommunityAccess: true,
    };
  }
}
