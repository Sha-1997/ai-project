import { PrismaClient, User, Membership, SubscriptionPlan, AuditLog } from "@prisma/client";
import { MembershipService } from "./membership.service.js";
import { FounderService } from "./founder.service.js";
import { PaymentService } from "./payment.service.js";
import { CmsService } from "./cms.service.js";
import * as crypto from "crypto";

export interface DashboardMetrics {
  totalUsers: number;
  activeMembers: number;
  founderSeatsRemaining: number;
  totalRevenueAED: number;
  activeModulesCount: number;
  openIssuesCount: number;
}

export class AdminService {
  private prisma: PrismaClient;
  private membershipService: MembershipService;
  private founderService: FounderService;
  private paymentService: PaymentService;
  private cmsService: CmsService;

  constructor(
    prismaClient?: PrismaClient,
    services?: {
      membershipService?: MembershipService;
      founderService?: FounderService;
      paymentService?: PaymentService;
      cmsService?: CmsService;
    }
  ) {
    this.prisma = prismaClient || new PrismaClient();
    this.membershipService = services?.membershipService || new MembershipService(this.prisma);
    this.founderService = services?.founderService || new FounderService(this.prisma);
    this.paymentService = services?.paymentService || new PaymentService(this.prisma);
    this.cmsService = services?.cmsService || new CmsService(this.prisma);
  }

  /**
   * 1. EXECUTIVE DASHBOARD METRICS SUMMARY
   */
  async getExecutiveDashboardMetrics(): Promise<DashboardMetrics> {
    const totalUsers = await this.prisma.user.count({ where: { softDeleted: false } });
    const activeMembers = await this.prisma.membership.count({ where: { status: "ACTIVE" } });
    
    const activeFounders = await this.founderService.getActiveSeatsCount();
    const founderSeatsRemaining = Math.max(0, 1000 - activeFounders);

    // Sum overall active transactions revenues
    const activationLogs = await this.prisma.auditLog.findMany({
      where: { action: "MEMBERSHIP_ACTIVATION" },
    });

    let totalRevenueAED = 0;
    for (const log of activationLogs) {
      if (log.newVal) {
        try {
          const parsed = JSON.parse(log.newVal);
          if (parsed.totalAmount) {
            totalRevenueAED += Number(parsed.totalAmount);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    const activeModulesCount = await this.prisma.aiModule.count({ where: { status: "ACTIVE" } });

    return {
      totalUsers,
      activeMembers,
      founderSeatsRemaining,
      totalRevenueAED,
      activeModulesCount,
      openIssuesCount: 0, // Mock database count placeholder
    };
  }

  /**
   * 2. GLOBAL SEARCH COMPILER
   */
  async globalSearch(query: string): Promise<Record<string, any[]>> {
    const formattedQuery = `%${query}%`;

    // Query Users
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
    });

    // Query memberships
    const memberships = await this.prisma.membership.findMany({
      where: {
        OR: [
          { status: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { user: true, plan: true },
      take: 10,
    });

    // Query settings keys
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        OR: [
          { key: { contains: query, mode: "insensitive" } },
          { value: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
    });

    return {
      users,
      memberships,
      settings,
    };
  }

  /**
   * 3. MANAGE USER ACCOUNT LIFECYCLE
   */
  async manageUserStatus(userId: string, newStatus: string, actorId: string): Promise<User> {
    if (!["ACTIVE", "BLOCKED", "SUSPENDED"].includes(newStatus)) {
      throw new Error(`Invalid status override target: ${newStatus}`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User record not found");

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    // Write audit trail details
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "ADMIN_USER_STATUS_CHANGE",
        entityName: "User",
        entityId: userId,
        previousVal: JSON.stringify({ status: user.status }),
        newVal: JSON.stringify({ status: newStatus }),
      },
    });

    return updatedUser;
  }

  /**
   * 4. DYNAMIC PRICING AND CAPACITY SETTINGS
   */
  async adjustPlanPricing(planId: string, newPrice: number, actorId: string): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error("Subscription plan not found.");

    const updatedPlan = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { price: newPrice },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "ADMIN_PLAN_PRICE_ADJUSTED",
        entityName: "SubscriptionPlan",
        entityId: planId,
        previousVal: JSON.stringify({ price: plan.price.toString() }),
        newVal: JSON.stringify({ price: newPrice.toString() }),
      },
    });

    return updatedPlan;
  }

  /**
   * 5. REVIEW NAMING PROPOSALS
   */
  async reviewNamingProposal(settingKey: string, approvalStatus: string, actorId: string): Promise<void> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: settingKey } });
    if (!setting) throw new Error("Challenge proposal setting key not found.");

    // Update settings details to note review outcomes
    await this.prisma.systemSetting.update({
      where: { key: settingKey },
      data: {
        description: `Status: ${approvalStatus}. Audited by ${actorId}`,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "ADMIN_CHALLENGE_REVIEWED",
        entityName: "SystemSetting",
        entityId: settingKey,
        newVal: JSON.stringify({ approvalStatus }),
      },
    });
  }

  /**
   * 6. AUDITABLE RANDOM GIVEAWAY DRAWER
   * Selects a random eligible paid Founder user using cryptographic generators.
   */
  async drawGiveawayWinner(actorId: string): Promise<User> {
    // Query list of all active paid Founder memberships
    const founders = await this.prisma.membership.findMany({
      where: {
        plan: { code: "FOUNDER" },
        status: "ACTIVE",
      },
      include: { user: true },
    });

    if (founders.length === 0) {
      throw new Error("No active paid Founder accounts found to draw a winner from.");
    }

    // Cryptographically secure random selection to ensure audit compliance
    const randomIndex = crypto.randomInt(0, founders.length);
    const winnerUser = founders[randomIndex].user;

    // Log the result immutably
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "GIVEAWAY_WINNER_DRAWN",
        entityName: "User",
        entityId: winnerUser.id,
        newVal: JSON.stringify({
          winnerEmail: winnerUser.email,
          totalPoolCount: founders.length,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return winnerUser;
  }
}
