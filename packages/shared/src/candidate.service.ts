import { PrismaClient, Candidate, WorkExperience, Education, Certification, ResumeFile } from "@prisma/client";

export interface ExperienceInput {
  companyName: string;
  position: string;
  employmentType: string;
  startDate: Date;
  endDate?: Date;
  responsibilities?: string;
  achievements?: string;
}

export interface EducationInput {
  institution: string;
  degree: string;
  specialization?: string;
  startDate: Date;
  endDate?: Date;
}

export interface CertificationInput {
  certificateName: string;
  issuingOrganization: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialUrl?: string;
}

export class CandidateService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * 1. ADD WORK EXPERIENCE RECORD
   */
  async addWorkExperience(candidateId: string, input: ExperienceInput): Promise<WorkExperience> {
    const experience = await this.prisma.workExperience.create({
      data: {
        candidateId,
        companyName: input.companyName,
        position: input.position,
        employmentType: input.employmentType,
        startDate: input.startDate,
        endDate: input.endDate,
        responsibilities: input.responsibilities,
        achievements: input.achievements,
      },
    });

    await this.recalculateProfileCompleteness(candidateId);
    return experience;
  }

  /**
   * 2. ADD EDUCATION RECORD
   */
  async addEducation(candidateId: string, input: EducationInput): Promise<Education> {
    const education = await this.prisma.education.create({
      data: {
        candidateId,
        institution: input.institution,
        degree: input.degree,
        specialization: input.specialization,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });

    await this.recalculateProfileCompleteness(candidateId);
    return education;
  }

  /**
   * 3. ADD CERTIFICATION RECORD
   */
  async addCertification(candidateId: string, input: CertificationInput): Promise<Certification> {
    const certification = await this.prisma.certification.create({
      data: {
        candidateId,
        certificateName: input.certificateName,
        issuingOrganization: input.issuingOrganization,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate,
        credentialUrl: input.credentialUrl,
      },
    });

    await this.recalculateProfileCompleteness(candidateId);
    return certification;
  }

  /**
   * 4. SECURE RESUME FILE UPLOAD WITH VERSIONING
   * Enforces secure file types and maintains sequential version numbering.
   */
  async uploadResumeFile(
    candidateId: string,
    fileUrl: string,
    fileName: string,
    uploadSource: "MANUAL" | "UPLOAD" | "AI_GENERATED"
  ): Promise<ResumeFile> {
    // Secure file type validation checks (Must end in .pdf or .docx)
    const lowerName = fileName.toLowerCase();
    const isExtensionAllowed = lowerName.endsWith(".pdf") || lowerName.endsWith(".docx");
    if (!isExtensionAllowed) {
      throw new Error("Invalid file format. Only PDF and DOCX uploads are permitted.");
    }

    return this.prisma.$transaction(async (tx) => {
      // Check current CV uploads count to calculate version sequence
      const existingResumesCount = await tx.resumeFile.count({ where: { candidateId } });
      const nextVersionNumber = existingResumesCount + 1;

      // If it is the first resume, set as default. Otherwise false by default.
      const isDefaultFlag = existingResumesCount === 0;

      const resume = await tx.resumeFile.create({
        data: {
          candidateId,
          fileUrl,
          fileName,
          isDefault: isDefaultFlag,
          versionNumber: nextVersionNumber,
          uploadSource,
          parsedResumeJson: null, // Placeholder for future AI Parsing engine (Sprint 2 Task 003)
        },
      });

      // Log the CV upload audit trail
      await tx.auditLog.create({
        data: {
          action: "CANDIDATE_RESUME_UPLOADED",
          entityName: "Candidate",
          entityId: candidateId,
          newVal: JSON.stringify({ fileName, versionNumber: nextVersionNumber, uploadSource }),
        },
      });

      // Recalculate completeness
      const completenessScore = await this.calculateCompletenessScore(candidateId, tx);
      console.log(`[CandidateService] Completeness recalculated inside transaction: ${completenessScore}%`);

      return resume;
    });
  }

  /**
   * 5. SET DEFAULT RESUME FILE
   */
  async setDefaultResume(candidateId: string, resumeId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Verify resume exists for this candidate
      const resume = await tx.resumeFile.findFirst({
        where: { id: resumeId, candidateId },
      });

      if (!resume) throw new Error("Resume record not found for this candidate.");

      // Set all resumes to false
      await tx.resumeFile.updateMany({
        where: { candidateId },
        data: { isDefault: false },
      });

      // Update target to true
      await tx.resumeFile.update({
        where: { id: resumeId },
        data: { isDefault: true },
      });
    });
  }

  /**
   * 6. PROFILE COMPLETENESS ENGINE
   * Computes profile completion score dynamically out of 100%:
   *  - Base Profile details (headline, location) = 20%
   *  - Resume file uploads (CV attached) = 30%
   *  - Work Experience history records = 25%
   *  - Academic Education logs = 15%
   *  - Certifications/Preferences = 10%
   */
  async calculateCompletenessScore(candidateId: string, txClient?: any): Promise<number> {
    const db = txClient || this.prisma;

    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
      include: {
        user: true,
        workExperiences: true,
        educations: true,
        certifications: true,
        resumeFiles: true,
      },
    });

    if (!candidate) throw new Error("Candidate profile details not found.");

    let score = 0;

    // 1. Base Profile details (Name, headline, preferences): 20%
    if (candidate.user.name && candidate.preferredLocation) {
      score += 20;
    } else if (candidate.user.name) {
      score += 10;
    }

    // 2. Resume file uploads (CV attached): 30%
    if (candidate.resumeFiles.length > 0) {
      score += 30;
    }

    // 3. Work Experience history records: 25%
    if (candidate.workExperiences.length > 0) {
      score += 25;
    }

    // 4. Academic Education logs: 15%
    if (candidate.educations.length > 0) {
      score += 15;
    }

    // 5. Certifications/Preferences: 10%
    if (candidate.certifications.length > 0) {
      score += 10;
    }

    return score;
  }

  /**
   * Helper to recalculate and log outside transaction blocks
   */
  private async recalculateProfileCompleteness(candidateId: string): Promise<number> {
    const score = await this.calculateCompletenessScore(candidateId);
    
    // Save completion score as a placeholder inside candidate metadata
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        aiMatchScorePlaceholder: score, // Store completeness temporarily in placeholder score
      },
    });

    return score;
  }
}
