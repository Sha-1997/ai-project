import { PrismaClient, Candidate, Employer, Job, JobApplication } from "@prisma/client";

export interface JobInput {
  title: string;
  description: string;
  categoryId: string;
  experienceRequiredYears: number;
  salaryMin?: number;
  salaryMax?: number;
  employmentType: string;
  workMode: string;
  locationDetails?: string;
  countryCode: string;
}

export class JobsService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. CREATE CANDIDATE PROFILE
   * Saves work experience, education level, and configures placeholders for AI parses.
   */
  async createCandidateProfile(
    userId: string,
    data: {
      resumeUrl?: string;
      experienceYears: number;
      educationLevel?: string;
      preferredLocation?: string;
      skillsList: string[]; // Seed skill relationships
    }
  ): Promise<Candidate> {
    return this.prisma.$transaction(async (tx) => {
      // Create Candidate record
      const candidate = await tx.candidate.create({
        data: {
          userId,
          resumeUrl: data.resumeUrl,
          experienceYears: data.experienceYears,
          educationLevel: data.educationLevel,
          preferredLocation: data.preferredLocation,
          visibilityStatus: "VISIBLE",
        },
      });

      // Link candidate skills
      for (const skillName of data.skillsList) {
        const skill = await tx.skill.upsert({
          where: { name: skillName },
          update: {},
          create: { name: skillName },
        });

        await tx.candidateSkill.create({
          data: {
            candidateId: candidate.id,
            skillId: skill.id,
            selfAssessmentRating: 3, // Default mid rating
            verifiedByAssessment: false,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: "CANDIDATE_PROFILE_CREATED",
          entityName: "Candidate",
          entityId: candidate.id,
        },
      });

      return candidate;
    });
  }

  /**
   * 2. REGISTER EMPLOYER (PENDING VERIFICATION GATES)
   */
  async registerEmployer(
    userId: string,
    companyName: string,
    data?: {
      industry?: string;
      companySize?: string;
      websiteUrl?: string;
      contactEmail?: string;
    }
  ): Promise<Employer> {
    const existing = await this.prisma.employer.findUnique({ where: { userId } });
    if (existing) throw new Error("User is already registered as an Employer");

    const employer = await this.prisma.employer.create({
      data: {
        userId,
        companyName,
        industry: data?.industry,
        companySize: data?.companySize,
        websiteUrl: data?.websiteUrl,
        contactEmail: data?.contactEmail,
        verificationStatus: "PENDING", // Operations verification gate
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: "EMPLOYER_REGISTERED",
        entityName: "Employer",
        entityId: employer.id,
      },
    });

    return employer;
  }

  /**
   * 3. PUBLISH JOB POSTING
   * Validation rule: Employer must be approved (APPROVED) before publishing jobs.
   */
  async publishJobPosting(
    employerId: string,
    jobData: JobInput,
    skillsList: Array<{ name: string; weight: number }>
  ): Promise<Job> {
    return this.prisma.$transaction(async (tx) => {
      const employer = await tx.employer.findUnique({ where: { id: employerId } });
      if (!employer) throw new Error("Employer record not found");

      // Enforce operational validation check
      if (employer.verificationStatus !== "APPROVED") {
        throw new Error("Only fully approved employers are authorized to publish job postings.");
      }

      // Create Job
      const job = await tx.job.create({
        data: {
          employerId,
          title: jobData.title,
          description: jobData.description,
          categoryId: jobData.categoryId,
          experienceRequiredYears: jobData.experienceRequiredYears,
          salaryMin: jobData.salaryMin,
          salaryMax: jobData.salaryMax,
          employmentType: jobData.employmentType,
          workMode: jobData.workMode,
          locationDetails: jobData.locationDetails,
          countryCode: jobData.countryCode,
          status: "ACTIVE", // Automatically active on publish
        },
      });

      // Bind skills weight
      for (const skillObj of skillsList) {
        const skill = await tx.skill.upsert({
          where: { name: skillObj.name },
          update: {},
          create: { name: skillObj.name },
        });

        await tx.jobSkill.create({
          data: {
            jobId: job.id,
            skillId: skill.id,
            importanceWeight: skillObj.weight,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "JOB_POST_PUBLISHED",
          entityName: "Job",
          entityId: job.id,
          newVal: JSON.stringify({ title: jobData.title, employerId }),
        },
      });

      return job;
    });
  }

  /**
   * 4. APPLY TO JOB
   * Validation rules:
   *  - Candidate profile must exist.
   *  - Expired or draft jobs cannot accept new applications.
   */
  async submitApplication(candidateId: string, jobId: string, notes?: string): Promise<JobApplication> {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.findUnique({ where: { id: candidateId } });
      if (!candidate) throw new Error("Candidate profile not found. Please complete signup.");

      const job = await tx.job.findUnique({ where: { id: jobId } });
      if (!job) throw new Error("Job posting not found.");

      // Check job lifecycle status
      if (job.status !== "ACTIVE") {
        throw new Error(`Job application failed: Target posting is currently ${job.status}`);
      }

      // Check duplicate application check
      const duplicate = await tx.jobApplication.findFirst({
        where: { candidateId, jobId },
      });
      if (duplicate) throw new Error("Application already submitted for this job.");

      // Submit application
      const application = await tx.jobApplication.create({
        data: {
          candidateId,
          jobId,
          currentStage: "APPLIED",
          status: "ACTIVE",
          notes,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "JOB_APPLICATION_SUBMITTED",
          entityName: "JobApplication",
          entityId: application.id,
        },
      });

      return application;
    });
  }

  /**
   * 5. WORKFLOW STAGES STAGE TRANSITION (CANDIDATE LIFECYCLE)
   */
  async transitionApplicationStage(
    applicationId: string,
    nextStage: string,
    notes?: string
  ): Promise<JobApplication> {
    const allowedStages = ["APPLIED", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];
    if (!allowedStages.includes(nextStage)) {
      throw new Error(`Invalid stage transition target: ${nextStage}`);
    }

    const application = await this.prisma.jobApplication.findUnique({ where: { id: applicationId } });
    if (!application) throw new Error("Job application details not found.");

    const updatedApp = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        currentStage: nextStage,
        notes: notes || application.notes,
      },
    });

    // Write audit trail details
    await this.prisma.auditLog.create({
      data: {
        action: "JOB_APPLICATION_STAGE_CHANGED",
        entityName: "JobApplication",
        entityId: applicationId,
        previousVal: JSON.stringify({ stage: application.currentStage }),
        newVal: JSON.stringify({ stage: nextStage }),
      },
    });

    return updatedApp;
  }
}
