import { PrismaClient, ReferralCode, Referral, Campaign, FraudReport } from "@prisma/client";
import * as crypto from "crypto";

export class GrowthService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. GENERATE UNIQUE IMMUTABLE REFERRAL IDENTITY
   */
  async generateReferralCode(userId: string): Promise<ReferralCode> {
    const activeCode = await this.prisma.referralCode.findFirst({
      where: { userId, isActive: true },
    });
    if (activeCode) return activeCode;

    const randomSuffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    const code = `JVX-${randomSuffix}`;
    const linkUrl = `https://jovianex.com/join?ref=${code}`;

    return this.prisma.referralCode.create({
      data: {
        userId,
        code,
        linkUrl,
        isActive: true,
      },
    });
  }

  /**
   * 2. INVITATION & REFERRAL REGISTRATION
   * Validation Rules:
   *  - Self-referrals blocked
   *  - Duplicate referral prevention
   *  - Configurable maximum active referrals limits checked (Founder = 10, Premium = 25, Partner = Unlimited)
   */
  async inviteUser(referrerId: string, refereeEmail: string, campaignId: string): Promise<Referral> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || !campaign.isActive) throw new Error("Target referral campaign is inactive or not found.");

    // Resolve referee user details
    const refereeUser = await this.prisma.user.findUnique({ where: { email: refereeEmail } });
    if (!refereeUser) throw new Error("Referee user account details not found. Please register first.");

    // Enforce self-referrals block
    if (referrerId === refereeUser.id) {
      throw new Error("Referral blocked: You cannot refer yourself.");
    }

    // Resolve inviter referral code
    const refCode = await this.prisma.referralCode.findFirst({
      where: { userId: referrerId, isActive: true },
    });
    if (!refCode) throw new Error("Referral code not generated for inviter.");

    // Enforce duplicate invitation checks
    const duplicate = await this.prisma.referral.findFirst({
      where: { refereeId: refereeUser.id, campaignId },
    });
    if (duplicate) {
      throw new Error("Duplicate referral: Referee has already been referred for this campaign.");
    }

    // Enforce configurable policy limits (PM recommendation: do not hardcode limits)
    const existingCount = await this.prisma.referral.count({
      where: { referrerId, campaignId, currentStatus: { not: "INVITED" } },
    });
    const policyLimit = campaign.maxReferralsPolicy;

    if (policyLimit !== -1 && existingCount >= policyLimit) {
      throw new Error(`Referral limit exceeded: The campaign policy restricts accounts to a maximum of ${policyLimit} active referrals.`);
    }

    return this.prisma.referral.create({
      data: {
        campaignId,
        referrerId,
        refereeId: refereeUser.id,
        referralCodeId: refCode.id,
        currentStatus: "INVITED",
        isAbuseFlagged: false,
      },
    });
  }

  /**
   * 3. LIFECYCLE STATE TRANSITIONS
   * Stages: INVITED -> REGISTERED -> VERIFIED -> PAID -> REWARDED
   */
  async transitionReferralStatus(referralId: string, nextStatus: string): Promise<Referral> {
    const allowed = ["INVITED", "REGISTERED", "VERIFIED", "PAID", "REWARDED"];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Invalid lifecycle status transition target: ${nextStatus}`);
    }

    const ref = await this.prisma.referral.findUnique({ where: { id: referralId } });
    if (!ref) throw new Error("Referral record not found.");

    // Enforce validation: rewards are only confirmed when status hits PAID
    let confirmedStatus = nextStatus;
    if (nextStatus === "REWARDED" && ref.currentStatus !== "PAID") {
      throw new Error("Reward blocked: Referral reward eligibility requires a completed paid membership verification.");
    }

    return this.prisma.referral.update({
      where: { id: referralId },
      data: { currentStatus: confirmedStatus },
    });
  }

  /**
   * 4. FRAUD AND ABUSE DETECTION SCANNERS
   * Rules checked: SAME_IP, DUPLICATE_PAYMENT, and VELOCITY_ABUSE
   */
  async runFraudCheck(referralId: string, refereeIp: string, referrerIp: string, refereeCardHash?: string, referrerCardHash?: string): Promise<boolean> {
    const ref = await this.prisma.referral.findUnique({ where: { id: referralId } });
    if (!ref) throw new Error("Referral record not found.");

    let fraudFlagged = false;
    let reason = "";

    // Rule A: Same IP Check
    if (refereeIp === referrerIp) {
      fraudFlagged = true;
      reason = "SAME_IP: Referrer and referee shared identical IP address.";
    }

    // Rule B: Duplicate Payment Method Check
    if (refereeCardHash && referrerCardHash && refereeCardHash === referrerCardHash) {
      fraudFlagged = true;
      reason = "DUPLICATE_PAYMENT: Referrer and referee shared identical payment cards details.";
    }

    // Rule C: Velocity Abuse (Too many referrals from same IP within short frame)
    const velocityCount = await this.prisma.referral.count({
      where: {
        referrerId: ref.referrerId,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }, // last 10 minutes
      },
    });
    if (velocityCount > 5) {
      fraudFlagged = true;
      reason = "VELOCITY_ABUSE: High frequency of referral signups detected (exceeded 5 in 10 mins).";
    }

    if (fraudFlagged) {
      await this.prisma.referral.update({
        where: { id: referralId },
        data: { isAbuseFlagged: true },
      });

      await this.prisma.fraudReport.create({
        data: {
          userId: ref.referrerId,
          refereeId: ref.refereeId,
          triggerReason: reason,
          status: "FLAGGED",
        },
      });
      console.warn(`[FraudDetector] Referral ${referralId} flagged for abuse. Reason: ${reason}`);
    }

    return fraudFlagged;
  }

  /**
   * 5. LEADERBOARD AGGREGATIONS
   * Displays top referrers, obfuscating referee names to respect privacy parameters.
   */
  async getLeaderboard(campaignId: string): Promise<any[]> {
    const referrals = await this.prisma.referral.findMany({
      where: { campaignId, currentStatus: "PAID" },
      include: { referrer: true },
    });

    // Group and aggregate count
    const scores: Record<string, { name: string; count: number }> = {};
    for (const r of referrals) {
      const id = r.referrerId;
      if (!scores[id]) {
        // Obfuscate name to protect privacy
        const nameParts = r.referrer.name.split(" ");
        const obfuscatedName = nameParts.map((p) => `${p.substring(0, 1)}.`).join(" ");

        scores[id] = {
          name: obfuscatedName || "User X.",
          count: 0,
        };
      }
      scores[id].count++;
    }

    return Object.values(scores).sort((a, b) => b.count - a.count);
  }
}
