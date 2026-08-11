import { PrismaClient, JobApplication, ApplicationEvent } from "@prisma/client";
import { CandidateService } from "./candidate.service.js";

export class ApplicationService {
  private prisma: PrismaClient;
  private candidateService: CandidateService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
    this.candidateService = new CandidateService(this.prisma);
  }

  /**
   * 1. CANDIDATE JOB APPLICATION SUBMISSION
   * Validation Rules:
   *  - Profile completeness score must be >= 50%
   *  - Job status must be ACTIVE or PUBLISHED
   *  - Job application deadline must not have passed
   *  - Duplicate applications check
   */
  async submitApplication(
    candidateId: string,
    jobId: string,
    coverLetter?: string,
    source: string = "JOVIANEX_SEARCH"
  ): Promise<JobApplication> {
    const allowedSources = ["JOVIANEX_SEARCH", "DIRECT_LINK", "REFERRAL", "QR_CODE", "CAMPAIGN"];
    const verifiedSource = allowedSources.includes(source) ? source : "JOVIANEX_SEARCH";

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify candidate profile exists
      const candidate = await tx.candidate.findUnique({
        where: { id: candidateId },
        include: { resumeFiles: true, user: true },
      });
      if (!candidate) throw new Error("Candidate profile details not found.");

      // 2. Enforce profile completeness threshold (>= 50%)
      const completenessScore = await this.candidateService.calculateCompletenessScore(candidateId, tx);
      if (completenessScore < 50) {
        throw new Error(`Application blocked: Profile completeness is currently ${completenessScore}%. Minimum 50% required.`);
      }

      // 3. Find default/active resume version to lock to this application record
      const defaultResume = candidate.resumeFiles.find((r) => r.isDefault);
      if (!defaultResume) {
        throw new Error("Application blocked: Please set a default Resume file before submitting applications.");
      }

      // 4. Verify targeted job details
      const job = await tx.job.findUnique({ where: { id: jobId } });
      if (!job) throw new Error("Job posting not found.");

      // Enforce job status restrictions
      if (!["PUBLISHED", "ACTIVE"].includes(job.status)) {
        throw new Error(`Application blocked: Target job posting is currently ${job.status}`);
      }

      // Enforce deadline check
      if (job.applicationDeadline && job.applicationDeadline < new Date()) {
        throw new Error("Application blocked: The deadline for this job posting has already passed.");
      }

      // Enforce duplicate application check
      const duplicate = await tx.jobApplication.findFirst({
        where: { candidateId, jobId },
      });
      if (duplicate) {
        throw new Error("Duplicate submission: You have already applied for this job.");
      }

      // 5. Submit application and freeze resume
      const app = await tx.jobApplication.create({
        data: {
          candidateId,
          organizationId: job.organizationId,
          jobId,
          resumeFileId: defaultResume.id,
          coverLetter,
          currentStage: "SUBMITTED",
          status: "ACTIVE",
          source: verifiedSource,
        },
      });

      // Write event audit logs
      await tx.applicationEvent.create({
        data: {
          applicationId: app.id,
          actorId: candidate.userId,
          action: "CREATED",
          newVal: JSON.stringify({ currentStage: "SUBMITTED", resumeFileId: defaultResume.id, source: verifiedSource }),
          notes: "Application submitted by candidate.",
        },
      });

      return app;
    });
  }

  /**
   * 2. WITHDRAW APPLICATION (CANDIDATE ACTION)
   * Verification: only candidate owner can withdraw.
   */
  async withdrawApplication(appId: string, candidateUserId: string): Promise<JobApplication> {
    return this.prisma.$transaction(async (tx) => {
      const app = await tx.jobApplication.findUnique({
        where: { id: appId },
        include: { candidate: true },
      });
      if (!app) throw new Error("Job application details not found.");

      // Enforce ownership validation checks
      if (app.candidate.userId !== candidateUserId) {
        throw new Error("Unauthorized: You do not have permission to withdraw this application.");
      }

      const updated = await tx.jobApplication.update({
        where: { id: appId },
        data: {
          currentStage: "WITHDRAWN",
          status: "ARCHIVED",
        },
      });

      // Log event
      await tx.applicationEvent.create({
        data: {
          applicationId: appId,
          actorId: candidateUserId,
          action: "WITHDRAWN",
          previousVal: JSON.stringify({ currentStage: app.currentStage, status: app.status }),
          newVal: JSON.stringify({ currentStage: "WITHDRAWN", status: "ARCHIVED" }),
          notes: "Application withdrawn by candidate.",
        },
      });

      return updated;
    });
  }

  /**
   * 3. RECRUITER-DRIVEN STAGE TRANSITIONS
   * Allowed stages: SUBMITTED, UNDER_REVIEW, SHORTLISTED, INTERVIEW, ASSESSMENT, FINAL_REVIEW, OFFER_EXTENDED, HIRED, REJECTED.
   * Verification: actor must belong to the hiring organization.
   */
  async transitionApplicationStage(
    appId: string,
    nextStage: string,
    actorUserId: string,
    notes?: string
  ): Promise<JobApplication> {
    const allowed = [
      "SUBMITTED",
      "UNDER_REVIEW",
      "SHORTLISTED",
      "INTERVIEW",
      "ASSESSMENT",
      "FINAL_REVIEW",
      "OFFER_EXTENDED",
      "HIRED",
      "REJECTED",
    ];

    if (!allowed.includes(nextStage)) {
      throw new Error(`Invalid stage transition target: ${nextStage}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const app = await tx.jobApplication.findUnique({
        where: { id: appId },
      });
      if (!app) throw new Error("Job application details not found.");

      // Check actor permissions (must belong to hiring organization)
      const staff = await tx.employer.findFirst({
        where: { userId: actorUserId, organizationId: app.organizationId },
      });
      if (!staff) {
        throw new Error("Unauthorized: You do not have permission to evaluate applicants for this organization.");
      }

      const updated = await tx.jobApplication.update({
        where: { id: appId },
        data: { currentStage: nextStage },
      });

      // Write event history
      await tx.applicationEvent.create({
        data: {
          applicationId: appId,
          actorId: staff.id,
          action: "STAGE_CHANGED",
          previousVal: JSON.stringify({ currentStage: app.currentStage }),
          newVal: JSON.stringify({ currentStage: nextStage }),
          notes: notes || `Stage transitioned by recruiter to ${nextStage}`,
        },
      });

      return updated;
    });
  }

  /**
   * 4. RETRIEVE APPLICATION TIMELINE HISTORY
   */
  async getApplicationTimeline(appId: string): Promise<ApplicationEvent[]> {
    return this.prisma.applicationEvent.findMany({
      where: { applicationId: appId },
      orderBy: { createdAt: "asc" },
    });
  }
}
