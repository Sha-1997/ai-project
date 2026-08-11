import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ApplyJobDto } from '../dto/apply-job.dto';
import { PatchApplicationStatusDto } from '../dto/patch-application-status.dto';
import { PostNoteDto } from '../dto/post-note.dto';
import { PostHiringDto } from '../dto/post-hiring.dto';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit job application (duplicate check & candidate check)
   */
  async applyToJob(userId: string, jobId: string, dto: ApplyJobDto) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
    });

    if (!candidate) {
      throw new ForbiddenException('User is not registered as a candidate.');
    }

    if (candidate.status !== 'ACTIVE') {
      throw new BadRequestException('Your candidate account is currently suspended.');
    }

    // Verify Job exists and is published
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job posting not found.');
    }

    if (job.status !== 'PUBLISHED') {
      throw new BadRequestException('Applications are not being accepted for this job status.');
    }

    // Check duplicate
    const existing = await this.prisma.jobApplication.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidate.id,
          jobId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('You have already applied for this job posting.');
    }

    return this.prisma.$transaction(async (tx) => {
      const app = await tx.jobApplication.create({
        data: {
          candidateId: candidate.id,
          jobId,
          status: 'APPLIED',
          notes: dto.notes ? dto.notes.trim() : null,
        },
      });

      // Save initial status transition history log
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: app.id,
          oldStatus: 'NONE',
          newStatus: 'APPLIED',
          changedById: userId,
          notes: 'Application submitted successfully.',
        },
      });

      return app;
    });
  }

  /**
   * Get Candidate own applications list
   */
  async getCandidateApplications(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
    });

    if (!candidate) {
      throw new ForbiddenException('Candidate account not found.');
    }

    return this.prisma.jobApplication.findMany({
      where: { candidateId: candidate.id },
      include: {
        job: { include: { organization: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  /**
   * Get Recruiter organization applications list
   */
  async getEmployerApplications(userId: string) {
    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new ForbiddenException('Employer account not found.');
    }

    // Resolve associated organization workspace
    const membership = await this.prisma.organizationMember.findFirst({
      where: { employerId: employer.id },
    });

    if (!membership) {
      throw new ForbiddenException('Employer recruiter is not associated with an organization.');
    }

    return this.prisma.jobApplication.findMany({
      where: {
        job: {
          organizationId: membership.organizationId,
        },
      },
      include: {
        job: true,
        candidate: {
          include: {
            user: {
              select: {
                email: true,
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  /**
   * Detailed search profile (filters employer internal notes if candidate calls)
   */
  async getApplicationById(userId: string, id: string) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: {
        job: { include: { organization: true } },
        candidate: {
          include: {
            user: {
              select: {
                email: true,
                profile: true,
              },
            },
            experiences: true,
            educations: true,
          },
        },
        statusHistory: { orderBy: { changedAt: 'desc' } },
        employerNotes: { orderBy: { createdAt: 'desc' } },
        hiringDecision: true,
      },
    });

    if (!app) {
      throw new NotFoundException('Application not found.');
    }

    // Check Candidate ownership
    const isCandidateOwner = app.candidate.userId === userId;

    // Check Recruiter membership
    let isRecruiterMember = false;
    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (employer) {
      const membership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_employerId: {
            organizationId: app.job.organizationId,
            employerId: employer.id,
          },
        },
      });
      if (membership) {
        isRecruiterMember = true;
      }
    }

    if (!isCandidateOwner && !isRecruiterMember) {
      throw new ForbiddenException('You do not have access to view this application details.');
    }

    // CTO Recommendation: internal notes and hiring details are private to recruiters
    if (isCandidateOwner) {
      const { employerNotes, hiringDecision, ...sanitized } = app as any;
      return sanitized;
    }

    return app;
  }

  /**
   * Recruiter update application status
   */
  async updateApplicationStatusByRecruiter(userId: string, id: string, dto: PatchApplicationStatusDto) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!app) {
      throw new NotFoundException('Application not found.');
    }

    // Verify recruiter belongs to the organization
    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new ForbiddenException('Recruiter profile not registered.');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_employerId: {
          organizationId: app.job.organizationId,
          employerId: employer.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not belong to the hiring organization.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Save status history log
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          oldStatus: app.status,
          newStatus: dto.status,
          changedById: userId,
          notes: dto.notes || 'Status updated by recruiter.',
        },
      });

      return tx.jobApplication.update({
        where: { id },
        data: { status: dto.status },
      });
    });
  }

  /**
   * Candidate withdraw application
   */
  async withdrawApplicationByCandidate(userId: string, id: string, notes?: string) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { candidate: true },
    });

    if (!app) {
      throw new NotFoundException('Application not found.');
    }

    if (app.candidate.userId !== userId) {
      throw new ForbiddenException('You can only withdraw your own applications.');
    }

    if (app.status === 'WITHDRAWN') {
      throw new BadRequestException('This application has already been withdrawn.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          oldStatus: app.status,
          newStatus: 'WITHDRAWN',
          changedById: userId,
          notes: notes || 'Withdrawn by candidate.',
        },
      });

      return tx.jobApplication.update({
        where: { id },
        data: { status: 'WITHDRAWN' },
      });
    });
  }

  /**
   * Employer add internal comment note (private from candidate view)
   */
  async addEmployerNote(userId: string, id: string, dto: PostNoteDto) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!app) {
      throw new NotFoundException('Application not found.');
    }

    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new ForbiddenException('Recruiter profile not registered.');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_employerId: {
          organizationId: app.job.organizationId,
          employerId: employer.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not belong to the hiring organization.');
    }

    return this.prisma.employerNote.create({
      data: {
        applicationId: id,
        authorId: userId,
        content: dto.content.trim(),
      },
    });
  }

  /**
   * Record hiring decisions details
   */
  async recordHiringDecision(userId: string, id: string, dto: PostHiringDto) {
    const app = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!app) {
      throw new NotFoundException('Application not found.');
    }

    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new ForbiddenException('Recruiter profile not registered.');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_employerId: {
          organizationId: app.job.organizationId,
          employerId: employer.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not belong to the hiring organization.');
    }

    return this.prisma.hiringDecision.upsert({
      where: { applicationId: id },
      update: {
        decision: dto.decision,
        offeredSalary: dto.offeredSalary || null,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : null,
        notes: dto.notes || null,
      },
      create: {
        applicationId: id,
        decision: dto.decision,
        offeredSalary: dto.offeredSalary || null,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : null,
        notes: dto.notes || null,
      },
    });
  }
}
