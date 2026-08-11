import { PrismaClient, Job, JobTemplate, JobHistory } from "@prisma/client";

export interface JobCreateInput {
  title: string;
  department?: string;
  description: string;
  categoryId: string;
  experienceRequiredYears: number;
  educationRequirement?: string;
  salaryMin?: number;
  salaryMax?: number;
  negotiableSalary?: boolean;
  isSalaryHidden?: boolean;
  currency?: string;
  employmentType: string;
  workMode: string;
  locationDetails?: string;
  countryCode: string;
  benefits?: string;
  vacancyCount?: number;
  applicationDeadline?: Date;
  scheduledPublishAt?: Date;
  customFields?: Record<string, any>;
}

export class JobPostingService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. CREATE JOB DRAFT
   */
  async createJobDraft(employerId: string, orgId: string, input: JobCreateInput): Promise<Job> {
    return this.prisma.job.create({
      data: {
        employerId,
        organizationId: orgId,
        title: input.title,
        department: input.department,
        description: input.description,
        categoryId: input.categoryId,
        experienceRequiredYears: input.experienceRequiredYears,
        educationRequirement: input.educationRequirement,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        negotiableSalary: input.negotiableSalary || false,
        isSalaryHidden: input.isSalaryHidden || false,
        currency: input.currency || "AED",
        employmentType: input.employmentType,
        workMode: input.workMode,
        locationDetails: input.locationDetails,
        countryCode: input.countryCode,
        benefits: input.benefits,
        vacancyCount: input.vacancyCount || 1,
        applicationDeadline: input.applicationDeadline,
        scheduledPublishAt: input.scheduledPublishAt,
        status: "DRAFT",
        customFieldsJson: input.customFields ? JSON.stringify(input.customFields) : null,
      },
    });
  }

  /**
   * 2. UPDATE JOB POSTING & WRITE CHANGELOG
   */
  async updateJobPosting(jobId: string, input: Partial<JobCreateInput>, editorId: string): Promise<Job> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.job.findUnique({ where: { id: jobId } });
      if (!existing) throw new Error("Job posting not found.");

      // Check editor credentials (must belong to organization)
      const editor = await tx.employer.findFirst({
        where: { userId: editorId, organizationId: existing.organizationId },
      });
      if (!editor) throw new Error("Unauthorized: Editor is not a staff member of the hiring organization.");

      // Write immutable version history snapshot
      await tx.jobHistory.create({
        data: {
          jobId,
          editorId: editor.id,
          changeLog: JSON.stringify(existing), // Save full snapshot of old data
        },
      });

      // Update fields
      const updated = await tx.job.update({
        where: { id: jobId },
        data: {
          title: input.title || existing.title,
          department: input.department !== undefined ? input.department : existing.department,
          description: input.description || existing.description,
          categoryId: input.categoryId || existing.categoryId,
          experienceRequiredYears: input.experienceRequiredYears !== undefined ? input.experienceRequiredYears : existing.experienceRequiredYears,
          educationRequirement: input.educationRequirement !== undefined ? input.educationRequirement : existing.educationRequirement,
          salaryMin: input.salaryMin !== undefined ? input.salaryMin : existing.salaryMin,
          salaryMax: input.salaryMax !== undefined ? input.salaryMax : existing.salaryMax,
          negotiableSalary: input.negotiableSalary !== undefined ? input.negotiableSalary : existing.negotiableSalary,
          isSalaryHidden: input.isSalaryHidden !== undefined ? input.isSalaryHidden : existing.isSalaryHidden,
          currency: input.currency || existing.currency,
          employmentType: input.employmentType || existing.employmentType,
          workMode: input.workMode || existing.workMode,
          locationDetails: input.locationDetails !== undefined ? input.locationDetails : existing.locationDetails,
          countryCode: input.countryCode || existing.countryCode,
          benefits: input.benefits !== undefined ? input.benefits : existing.benefits,
          vacancyCount: input.vacancyCount !== undefined ? input.vacancyCount : existing.vacancyCount,
          applicationDeadline: input.applicationDeadline !== undefined ? input.applicationDeadline : existing.applicationDeadline,
          scheduledPublishAt: input.scheduledPublishAt !== undefined ? input.scheduledPublishAt : existing.scheduledPublishAt,
          customFieldsJson: input.customFields ? JSON.stringify(input.customFields) : existing.customFieldsJson,
        },
      });

      return updated;
    });
  }

  /**
   * 3. TRANSITION JOB STATUS LIFECYCLE
   * Verification checks: Organizations must be VERIFIED prior to jobs transitioning to PUBLISHED/ACTIVE status.
   */
  async transitionJobStatus(jobId: string, nextStatus: string, actorId: string): Promise<Job> {
    const allowed = [
      "DRAFT",
      "UNDER_REVIEW",
      "APPROVED",
      "SCHEDULED",
      "PUBLISHED",
      "ACTIVE",
      "PAUSED",
      "CLOSED",
      "EXPIRED",
      "ARCHIVED",
    ];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Invalid target status transition: ${nextStatus}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
        include: { organization: true },
      });
      if (!job) throw new Error("Job posting not found.");

      // Check organization KYC verification status before publishing
      if (["PUBLISHED", "ACTIVE"].includes(nextStatus)) {
        if (job.organization.verificationStatus !== "VERIFIED") {
          throw new Error("Publishing blocked: Organization KYC profile has not been fully VERIFIED by administrators.");
        }
      }

      const updated = await tx.job.update({
        where: { id: jobId },
        data: { status: nextStatus },
      });

      // Log verification status logs
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "JOB_STATUS_TRANSITIONED",
          entityName: "Job",
          entityId: jobId,
          previousVal: JSON.stringify({ status: job.status }),
          newVal: JSON.stringify({ status: nextStatus }),
        },
      });

      return updated;
    });
  }

  /**
   * 4. MANAGE JOB TEMPLATES
   */
  async createJobTemplate(orgId: string, templateTitle: string, input: JobCreateInput): Promise<JobTemplate> {
    return this.prisma.jobTemplate.create({
      data: {
        organizationId: orgId,
        templateTitle,
        title: input.title,
        department: input.department,
        description: input.description,
        categoryId: input.categoryId,
        employmentType: input.employmentType,
        workMode: input.workMode,
        currency: input.currency || "AED",
        benefits: input.benefits,
        customFieldsJson: input.customFields ? JSON.stringify(input.customFields) : null,
      },
    });
  }
}

export class JobCatalogService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 5. PUBLIC JOB CATALOG SEARCH (SEPARATED QUERY LAYER)
   * Restricts results strictly to Published or Active jobs to optimize database indexes.
   */
  async searchActiveCatalog(filters: {
    query?: string;
    categoryId?: string;
    workMode?: string;
    countryCode?: string;
  }): Promise<Job[]> {
    const whereClause: any = {
      status: { in: ["PUBLISHED", "ACTIVE"] }, // Isolated database searches
    };

    if (filters.query) {
      whereClause.OR = [
        { title: { contains: filters.query, mode: "insensitive" } },
        { description: { contains: filters.query, mode: "insensitive" } },
        { department: { contains: filters.query, mode: "insensitive" } },
      ];
    }

    if (filters.categoryId) {
      whereClause.categoryId = filters.categoryId;
    }

    if (filters.workMode) {
      whereClause.workMode = filters.workMode;
    }

    if (filters.countryCode) {
      whereClause.countryCode = filters.countryCode;
    }

    return this.prisma.job.findMany({
      where: whereClause,
      include: {
        organization: {
          select: { name: true, websiteUrl: true, companySize: true },
        },
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
