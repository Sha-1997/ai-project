import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../shared/audit.service';
import { SelectPlanDto } from './dto/select-plan.dto';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * List all configured active membership plans
   */
  async getPlans() {
    return this.prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  /**
   * Fetch current user subscription state
   */
  async getCurrentSubscription(userId: string) {
    const sub = await this.prisma.membershipSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!sub) {
      throw new NotFoundException('No active membership or selection found.');
    }

    return sub;
  }

  /**
   * Select pricing plan and temporarily lock seat for 15 minutes
   */
  async selectPlan(
    userId: string,
    dto: SelectPlanDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Release any expired reservations first to free seats
    await this.releaseExpiredReservations();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    // 2. Validate email verification
    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('Account email verification pending.');
    }

    // 3. Validate plan availability
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Selected membership plan is inactive or not found.');
    }

    // Verify seat capacity limits
    if (plan.maxSeats && plan.seatsTaken >= plan.maxSeats) {
      throw new ConflictException('Selected plan seats capacity has been filled.');
    }

    // 4. Validate current user subscription state
    const existingSub = await this.prisma.membershipSubscription.findUnique({
      where: { userId },
    });

    if (existingSub && existingSub.status === 'ACTIVE') {
      throw new ConflictException('You already have an active subscription.');
    }

    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes seat reservation

    // 5. Select/Update plan inside transaction
    const subscription = await this.prisma.$transaction(async (tx) => {
      // Increment seats taken
      await tx.membershipPlan.update({
        where: { id: plan.id },
        data: { seatsTaken: { increment: 1 } },
      });

      const oldStatus = existingSub?.status || 'DRAFT';

      // Upsert subscription
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

      // Record transitions audit history
      await tx.membershipHistory.create({
        data: {
          userId,
          subscriptionId: upsertedSub.id,
          oldStatus,
          newStatus: 'PENDING_PAYMENT',
          reason: `Selected plan: ${plan.code}. Checkout seat locked for 15 minutes.`,
        },
      });

      return upsertedSub;
    });

    // 6. Write audit log
    await this.audit.logAction(
      userId,
      'MEMBERSHIP_PLAN_SELECTED',
      ipAddress,
      userAgent,
      `Plan selected: ${plan.code}, amount: ${plan.price} ${plan.currency}, reservedUntil: ${reservedUntil.toISOString()}`,
    );

    return {
      success: true,
      subscriptionId: subscription.id,
      planCode: plan.code,
      amount: subscription.amount,
      currency: subscription.currency,
      reservedUntil: subscription.reservedUntil,
      message: 'Plan selected. Seat locked for 15 minutes. Proceed to checkout.',
    };
  }

  /**
   * Administrative Create Plan
   */
  async createPlan(dto: CreatePlanDto) {
    const existing = await this.prisma.membershipPlan.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Plan code '${dto.code}' already exists.`);
    }

    return this.prisma.membershipPlan.create({
      data: {
        code: dto.code,
        name: dto.name,
        price: dto.price,
        currency: dto.currency || 'AED',
        durationYears: dto.durationYears,
        maxSeats: dto.maxSeats || null,
        activeFrom: dto.activeFrom ? new Date(dto.activeFrom) : null,
        activeTo: dto.activeTo ? new Date(dto.activeTo) : null,
        description: dto.description || null,
        benefits: dto.benefits || [],
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  /**
   * Administrative Fetch Dashboard Counters
   */
  async getAdminStats() {
    const totalSubscriptions = await this.prisma.membershipSubscription.count();
    const activeSubscribers = await this.prisma.membershipSubscription.count({
      where: { status: 'ACTIVE' },
    });
    const pendingSubscribers = await this.prisma.membershipSubscription.count({
      where: { status: 'PENDING_PAYMENT' },
    });

    const plansStats = await this.prisma.membershipPlan.findMany({
      select: {
        code: true,
        name: true,
        seatsTaken: true,
        maxSeats: true,
      },
    });

    return {
      totalSubscriptions,
      activeSubscribers,
      pendingSubscribers,
      plansStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Releases checkout locks on expired pending subscriptions and decrements seat counts
   */
  private async releaseExpiredReservations() {
    const expiredReservations = await this.prisma.membershipSubscription.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        reservedUntil: { lt: new Date() },
      },
    });

    if (expiredReservations.length === 0) return;

    for (const sub of expiredReservations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Revert seats taken count
          await tx.membershipPlan.update({
            where: { id: sub.planId },
            data: { seatsTaken: { decrement: 1 } },
          });

          // Cancel subscription status
          await tx.membershipSubscription.update({
            where: { id: sub.id },
            data: {
              status: 'CANCELLED',
              reservedUntil: null,
            },
          });

          // Log transitions audit history
          await tx.membershipHistory.create({
            data: {
              userId: sub.userId,
              subscriptionId: sub.id,
              oldStatus: 'PENDING_PAYMENT',
              newStatus: 'CANCELLED',
              reason: 'Reservation window expired (15 minutes limit exceeded).',
            },
          });
        });

        console.log(`[JovianeX Membership] Seat reservation released for User: ${sub.userId}`);
      } catch (err) {
        console.error('[JovianeX Membership] Failed to release expired reservation:', err);
      }
    }
  }
}
