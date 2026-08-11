import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../shared/audit.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { SubmitEntryDto } from './dto/submit-entry.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * List all campaigns
   */
  async getCampaigns() {
    return this.prisma.campaign.findMany({
      include: { rules: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetch campaign by ID
   */
  async getCampaignById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { rules: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found.');
    }

    return campaign;
  }

  /**
   * Administrative create campaign
   */
  async createCampaign(dto: CreateCampaignDto) {
    const existing = await this.prisma.campaign.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Campaign code '${dto.code}' already exists.`);
    }

    return this.prisma.campaign.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        status: 'DRAFT',
        maxEntries: dto.maxEntries || null,
        referralLimit: dto.referralLimit || null,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        featureFlag: dto.featureFlag || null,
      },
    });
  }

  /**
   * Submit Naming Challenge Entry (with deadlines validation)
   */
  async submitNamingChallengeEntry(userId: string, dto: SubmitEntryDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { code: 'naming_challenge' },
    });

    if (!campaign) {
      throw new NotFoundException('Naming challenge campaign has not been seeded.');
    }

    if (campaign.status !== 'LIVE') {
      throw new BadRequestException('The naming challenge is currently closed.');
    }

    // Submission deadline enforcement
    if (campaign.endAt && campaign.endAt < new Date()) {
      throw new BadRequestException('The naming challenge submission deadline has passed.');
    }

    // Check duplicate submission
    const existingEntry = await this.prisma.namingChallengeEntry.findUnique({
      where: {
        campaignId_userId: {
          campaignId: campaign.id,
          userId,
        },
      },
    });

    if (existingEntry) {
      throw new ConflictException('You have already submitted an entry for the naming challenge.');
    }

    // Create entry inside transaction
    const entry = await this.prisma.$transaction(async (tx) => {
      // Register participant
      await tx.campaignParticipant.upsert({
        where: {
          campaignId_userId: { campaignId: campaign.id, userId },
        },
        update: {},
        create: { campaignId: campaign.id, userId },
      });

      const newEntry = await tx.namingChallengeEntry.create({
        data: {
          campaignId: campaign.id,
          userId,
          proposedName: dto.proposedName.trim(),
          explanation: dto.explanation.trim(),
          status: 'PENDING',
        },
      });

      await tx.campaignAudit.create({
        data: {
          campaignId: campaign.id,
          userId,
          action: 'SUBMITTED_ENTRY',
          description: `Proposed name: ${dto.proposedName}`,
        },
      });

      return newEntry;
    });

    return {
      success: true,
      entryId: entry.id,
      proposedName: entry.proposedName,
      status: entry.status,
      message: 'Naming challenge entry submitted successfully.',
    };
  }

  /**
   * Fetch current user naming challenge entry
   */
  async getNamingChallengeEntry(userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { code: 'naming_challenge' },
    });

    if (!campaign) {
      throw new NotFoundException('Naming challenge campaign not found.');
    }

    const entry = await this.prisma.namingChallengeEntry.findUnique({
      where: {
        campaignId_userId: {
          campaignId: campaign.id,
          userId,
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('No submission found for this user.');
    }

    return entry;
  }

  /**
   * Dynamic Giveaway Eligibility Engine (Configurable criteria checks)
   */
  async calculateGiveawayEligibility(userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { code: 'giveaway_campaign' },
      include: { rules: true },
    });

    if (!campaign) {
      throw new NotFoundException('Giveaway campaign configuration not found.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        membershipSubscription: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    // 1. Check Verified Email criteria
    const isEmailVerified = user.status === 'ACTIVE' || user.status === 'SUSPENDED' || user.status === 'LOCKED';

    // 2. Check Active Membership criteria
    const isMembershipActive = user.membershipSubscription?.status === 'ACTIVE';

    // 3. Check Qualified Referrals count (Must have at least 3 qualified referrals)
    const qualifiedReferralsCount = await this.prisma.referral.count({
      where: {
        referrerId: userId,
        status: 'QUALIFIED',
      },
    });

    const hasEnoughReferrals = qualifiedReferralsCount >= 3;

    // Resolve final eligibility state
    const isEligible = isEmailVerified && isMembershipActive && hasEnoughReferrals;

    let reason = 'Giveaway eligibility verification failed.';
    if (isEligible) {
      reason = 'All dynamic criteria checked successfully. Registered for giveaway.';
    } else {
      const issues: string[] = [];
      if (!isEmailVerified) issues.push('email verification required');
      if (!isMembershipActive) issues.push('active founder membership required');
      if (!hasEnoughReferrals) issues.push(`needs 3 qualified referrals (current: ${qualifiedReferralsCount})`);
      reason = `Ineligible: ${issues.join(', ')}.`;
    }

    // Cache status record in database
    await this.prisma.giveawayEligibility.upsert({
      where: {
        campaignId_userId: {
          campaignId: campaign.id,
          userId,
        },
      },
      update: {
        eligible: isEligible,
        reason,
      },
      create: {
        campaignId: campaign.id,
        userId,
        eligible: isEligible,
        reason,
      },
    });

    return {
      eligible: isEligible,
      reason,
      criteria: {
        emailVerified: isEmailVerified,
        activeFounderMembership: isMembershipActive,
        qualifiedReferralsCount,
        requiredReferralsCount: 3,
      },
    };
  }

  /**
   * Submit/track incoming user referrals codes matching referrer profile codes
   */
  async trackReferralCode(userId: string, referralCode: string, ipAddress?: string, userAgent?: string) {
    const referrerProfile = await this.prisma.profile.findFirst({
      where: { referralCode },
    });

    if (!referrerProfile) {
      throw new NotFoundException(`Invalid referral code: ${referralCode}`);
    }

    if (referrerProfile.userId === userId) {
      throw new BadRequestException('You cannot refer yourself.');
    }

    // Validate duplicate referrals
    const existing = await this.prisma.referral.findUnique({
      where: {
        referrerId_refereeId: {
          referrerId: referrerProfile.userId,
          refereeId: userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('This referral relationship is already tracked.');
    }

    // Retrieve status checks to update qualified flag
    const referee = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Mapped as QUALIFIED if referee email is active verified
    const status = (referee && referee.status === 'ACTIVE') ? 'QUALIFIED' : 'PENDING';

    const referral = await this.prisma.referral.create({
      data: {
        referrerId: referrerProfile.userId,
        refereeId: userId,
        status,
      },
    });

    await this.audit.logAction(
      userId,
      'REFERRAL_REGISTERED',
      ipAddress,
      userAgent,
      `Referred by User ID: ${referrerProfile.userId}, Status: ${status}`,
    );

    return {
      success: true,
      referralId: referral.id,
      status: referral.status,
      message: 'Referral connection logged successfully.',
    };
  }

  /**
   * Fetch current user referrals statistics
   */
  async getMyReferralsSummary(userId: string) {
    const userProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!userProfile) {
      throw new NotFoundException('User profile not found.');
    }

    // Generate code if empty
    let referralCode = userProfile.referralCode;
    if (!referralCode) {
      referralCode = `JXREF-${userId.substring(0, 6).toUpperCase()}`;
      await this.prisma.profile.update({
        where: { userId },
        data: { referralCode },
      });
    }

    const totalReferrals = await this.prisma.referral.count({
      where: { referrerId: userId },
    });

    const qualifiedReferrals = await this.prisma.referral.count({
      where: { referrerId: userId, status: 'QUALIFIED' },
    });

    const refereesList = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: {
            email: true,
            profile: {
              select: {
                fullName: true,
                country: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const referees = refereesList.map((ref) => ({
      email: ref.referee.email,
      fullName: ref.referee.profile?.fullName || 'Anonymous Candidate',
      country: ref.referee.profile?.country || 'Unknown',
      status: ref.status,
      joinedAt: ref.createdAt.toISOString(),
    }));

    return {
      referralCode,
      referralLink: `https://jovianex.com/register?ref=${referralCode}`,
      totalReferrals,
      qualifiedReferrals,
      referees,
    };
  }
}
