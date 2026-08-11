import { Injectable as NestInjectable, NotFoundException as NestNotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../shared/audit.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@NestInjectable()
export class FounderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Dynamic Founder Eligibility Engine
   */
  async calculateEligibility(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NestNotFoundException('User not found.');
    }

    const totalActiveSubscriptions = await this.prisma.membershipSubscription.count({
      where: { status: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
    });

    const now = new Date();
    let eligiblePlanCode = 'standard_t2';

    if (totalActiveSubscriptions < 1000) {
      eligiblePlanCode = 'founder_launch';
    } else if (totalActiveSubscriptions < 5000) {
      eligiblePlanCode = 'early_growth';
    } else if (totalActiveSubscriptions < 10000) {
      eligiblePlanCode = 'growth';
    } else {
      if (now <= new Date('2027-01-31T23:59:59Z')) {
        eligiblePlanCode = 'expansion';
      } else if (now <= new Date('2027-06-30T23:59:59Z')) {
        eligiblePlanCode = 'standard';
      } else if (now <= new Date('2027-12-31T23:59:59Z')) {
        eligiblePlanCode = 'growth_t2';
      } else {
        eligiblePlanCode = 'standard_t2';
      }
    }

    const plan = await this.prisma.membershipPlan.findUnique({
      where: { code: eligiblePlanCode },
    });

    if (!plan || !plan.isActive) {
      throw new NestNotFoundException(`Eligible membership plan (${eligiblePlanCode}) is currently inactive or not seeded.`);
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + plan.durationYears);

    await this.prisma.membershipEligibility.create({
      data: {
        userId,
        eligible: user.status === 'ACTIVE',
        reason: user.status === 'ACTIVE' ? 'Email verified. Seat available.' : 'Pending email verification.',
      },
    });

    return {
      userId,
      eligible: user.status === 'ACTIVE',
      reason: user.status === 'ACTIVE' ? 'Seat available.' : 'Account email must be verified.',
      availablePlan: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        durationYears: plan.durationYears,
        benefits: plan.benefits,
        expiresAtCalculated: expiresAt.toISOString(),
      },
      currentEcosystemSeatsCount: totalActiveSubscriptions,
    };
  }

  /**
   * Fetch Founder Recognition profile
   */
  async getFounderProfile(userId: string) {
    const founder = await this.prisma.founderProfile.findUnique({
      where: { userId },
    });

    if (!founder) {
      throw new NestNotFoundException('Founder profile not found. Complete payment upgrade first.');
    }

    return founder;
  }

  /**
   * Dynamic Profile Completion Onboarding engine checks
   */
  async calculateProfileCompletion(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NestNotFoundException('Profile not found.');
    }

    // Weight of 10 fields (10% each)
    const checklist = [
      { field: 'fullName', value: profile.fullName },
      { field: 'phoneNumber', value: profile.phoneNumber },
      { field: 'country', value: profile.country },
      { field: 'profilePhoto', value: profile.profilePhoto },
      { field: 'dob', value: profile.dob },
      { field: 'city', value: profile.city },
      { field: 'preferredLanguage', value: profile.preferredLanguage },
      { field: 'resumeUrl', value: profile.resumeUrl },
      { field: 'skills', value: profile.skills && profile.skills.length > 0 ? profile.skills : null },
      { field: 'careerPreferences', value: profile.careerPreferences && profile.careerPreferences.length > 0 ? profile.careerPreferences : null },
    ];

    const missingFields: string[] = [];
    let completedCount = 0;

    for (const item of checklist) {
      if (item.value !== null && item.value !== undefined && item.value !== '') {
        completedCount++;
      } else {
        missingFields.push(item.field);
      }
    }

    const progressPercentage = completedCount * 10.0;

    // Upsert completion record
    await this.prisma.profileCompletion.upsert({
      where: { userId },
      update: {
        progressPercentage,
        missingFields,
        completedAt: progressPercentage === 100.0 ? new Date() : null,
      },
      create: {
        userId,
        progressPercentage,
        missingFields,
        completedAt: progressPercentage === 100.0 ? new Date() : null,
      },
    });

    return {
      progressPercentage,
      missingFields,
      isCompleted: progressPercentage === 100.0,
    };
  }

  /**
   * Fetch Profile Details
   */
  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NestNotFoundException('Profile not found.');
    }

    return profile;
  }

  /**
   * Securely Update Profile details
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const updated = await this.prisma.profile.update({
      where: { userId },
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        country: dto.country,
        profilePhoto: dto.profilePhoto,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        city: dto.city,
        preferredLanguage: dto.preferredLanguage,
        resumeUrl: dto.resumeUrl,
        skills: dto.skills,
        careerPreferences: dto.careerPreferences,
      },
    });

    // Recalculate completions
    const completion = await this.calculateProfileCompletion(userId);

    // Record activity feed log
    await this.prisma.activityFeed.create({
      data: {
        userId,
        actionType: 'PROFILE_UPDATE',
        description: `Updated profile details. Completion Progress: ${completion.progressPercentage}%`,
      },
    });

    await this.audit.logAction(
      userId,
      'PROFILE_UPDATED',
      ipAddress,
      userAgent,
      `Onboarding checklist update. Percentage: ${completion.progressPercentage}%`,
    );

    return {
      success: true,
      profile: updated,
      completion,
    };
  }

  /**
   * Fetch Dashboard Welcome metrics
   */
  async getDashboardSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        membershipSubscription: { include: { plan: true } },
        founderProfile: true,
      },
    });

    if (!user) {
      throw new NestNotFoundException('User account not found.');
    }

    // Dynamic completions check
    const completion = await this.calculateProfileCompletion(userId);

    // Count referrals
    const referralsCount = await this.prisma.referral.count({
      where: { referrerId: userId },
    });

    // Count campaigns challenges participant registrations
    const campaignsCount = await this.prisma.campaignParticipant.count({
      where: { userId },
    });

    // Find active widgets
    const widgets = await this.getWidgets();

    return {
      welcome: {
        fullName: user.profile?.fullName || 'Ecosystem Candidate',
        email: user.email,
        status: user.status,
      },
      founderCard: user.founderProfile
        ? {
            founderNumber: user.founderProfile.founderNumber,
            joinDate: user.founderProfile.joinDate,
            tier: user.founderProfile.tier,
            badgeStatus: user.founderProfile.badgeStatus,
          }
        : null,
      membership: user.membershipSubscription
        ? {
            planName: user.membershipSubscription.plan.name,
            status: user.membershipSubscription.status,
            expiresAt: user.membershipSubscription.expiresAt,
          }
        : null,
      onboarding: completion,
      referrals: {
        totalReferrals: referralsCount,
      },
      campaigns: {
        totalJoined: campaignsCount,
      },
      widgets,
      aiJobsLaunchStatus: 'UPCOMING_MVP_2026',
    };
  }

  /**
   * Fetch Activity feed logs
   */
  async getActivityFeed(userId: string) {
    return this.prisma.activityFeed.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Load dashboard widgets dynamically from database settings (CTO Recommendation)
   */
  async getWidgets() {
    return this.prisma.dashboardWidget.findMany({
      where: { visibility: true },
      orderBy: { order: 'asc' },
    });
  }

  async getFounderSeatStats() {
  const totalSeats = 1000;

  const claimed = await this.prisma.founderProfile.count();

  return {
    claimed,
    total: totalSeats,
    remaining: Math.max(totalSeats - claimed, 0),
    percentage: Math.min((claimed / totalSeats) * 100, 100),
  };
}
}
