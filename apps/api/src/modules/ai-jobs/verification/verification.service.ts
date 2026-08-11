import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SubmitVerificationDto } from '../dto/submit-verification.dto';
import { ReviewVerificationDto } from '../dto/review-verification.dto';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to verify if employer has OWNER/HR_MANAGER role in organization
   */
  private async verifyMemberRole(userId: string, organizationId: string) {
    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new ForbiddenException('Recruiter profile not registered.');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_employerId: {
          organizationId,
          employerId: employer.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not associated with this organization.');
    }

    if (membership.role !== 'OWNER' && membership.role !== 'HR_MANAGER') {
      throw new ForbiddenException('Only owners or HR managers can submit verification requests.');
    }

    return membership;
  }

  /**
   * Submit organization verification and document references
   */
  async submitVerification(userId: string, organizationId: string, dto: SubmitVerificationDto) {
    await this.verifyMemberRole(userId, organizationId);

    return this.prisma.$transaction(async (tx) => {
      // Find or create verification entry
      let verification = await tx.organizationVerification.findUnique({
        where: { organizationId },
      });

      if (!verification) {
        verification = await tx.organizationVerification.create({
          data: {
            organizationId,
            status: 'PENDING_REVIEW',
            level: dto.level || 'BASIC',
            submittedAt: new Date(),
          },
        });
      } else {
        verification = await tx.organizationVerification.update({
          where: { id: verification.id },
          data: {
            status: 'PENDING_REVIEW',
            level: dto.level || 'BASIC',
            submittedAt: new Date(),
          },
        });
      }

      // Delete existing document references to clear old uploads
      await tx.verificationDocument.deleteMany({
        where: { verificationId: verification.id },
      });

      // Insert new document metadata
      if (dto.documents && dto.documents.length > 0) {
        await tx.verificationDocument.createMany({
          data: dto.documents.map((d) => ({
            verificationId: verification.id,
            documentType: d.documentType,
            secureUrl: d.secureUrl,
          })),
        });
      }

      return verification;
    });
  }

  /**
   * Get organization verification details and docs
   */
  async getVerification(userId: string, organizationId: string) {
    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new ForbiddenException('Invalid recruiter account.');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_employerId: {
          organizationId,
          employerId: employer.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization.');
    }

    const verification = await this.prisma.organizationVerification.findUnique({
      where: { organizationId },
      include: {
        documents: true,
        reviews: { orderBy: { reviewedAt: 'desc' } },
        complianceNotes: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!verification) {
      return {
        status: 'NOT_SUBMITTED',
        level: 'BASIC',
        documents: [],
        reviews: [],
        complianceNotes: [],
      };
    }

    return verification;
  }

  /**
   * Admin verification review override action
   */
  async adminReviewVerification(adminUserId: string, id: string, dto: ReviewVerificationDto) {
    const verification = await this.prisma.organizationVerification.findUnique({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException('Verification request entry not found.');
    }

    let status = 'PENDING_REVIEW';
    if (dto.action === 'APPROVED') status = 'VERIFIED';
    if (dto.action === 'REJECTED') status = 'REJECTED';
    if (dto.action === 'REQUESTED_INFO') status = 'INFO_REQUESTED';

    return this.prisma.$transaction(async (tx) => {
      // Save review log audit
      await tx.verificationReview.create({
        data: {
          verificationId: id,
          reviewerId: adminUserId,
          action: dto.action,
          notes: dto.notes || null,
        },
      });

      // Update verification profile status
      const updated = await tx.organizationVerification.update({
        where: { id },
        data: { status },
      });

      // Update organization verification status flag
      await tx.organization.update({
        where: { id: verification.organizationId },
        data: { isVerified: status === 'VERIFIED' },
      });

      return updated;
    });
  }

  /**
   * List all verifications
   */
  async adminGetVerifications() {
    return this.prisma.organizationVerification.findMany({
      include: {
        organization: true,
        documents: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Policy Checker: Checks if an organization is allowed to post jobs based on configuration parameters
   */
  async checkJobPostingPolicy(organizationId: string) {
    // 1. Fetch organization verification status
    const verification = await this.prisma.organizationVerification.findUnique({
      where: { organizationId },
    });

    // 2. Fetch dynamic policy setting: Default verified required to false for MVP launch flexibility
    const requiredBeforePosting = false; 

    if (requiredBeforePosting) {
      if (!verification || verification.status !== 'VERIFIED') {
        throw new BadRequestException('Job posting requires organization verification to be approved first.');
      }
    }

    return {
      allowed: true,
      reason: 'Policy rules accept posting for current status.',
    };
  }
}
