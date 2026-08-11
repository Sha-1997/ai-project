import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PatchCandidateDto } from '../dto/patch-candidate.dto';
import { PostExperienceDto } from '../dto/post-experience.dto';
import { PostEducationDto } from '../dto/post-education.dto';

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches the complete candidate profile with related models.
   * If candidate does not exist, automatically creates candidate with default preferences.
   */
  async getOrCreateCandidate(userId: string) {
    let candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      include: {
        preference: true,
        experiences: true,
        educations: true,
        certifications: true,
        portfolios: true,
      },
    });

    if (!candidate) {
      candidate = await this.prisma.candidate.create({
        data: {
          userId,
          status: 'ACTIVE',
          visibility: 'PUBLIC',
          preference: {
            create: {
              currency: 'AED',
            },
          },
        },
        include: {
          preference: true,
          experiences: true,
          educations: true,
          certifications: true,
          portfolios: true,
        },
      });
    }

    return candidate;
  }

  /**
   * Update candidate settings and preference records
   */
  async updateCandidate(userId: string, dto: PatchCandidateDto) {
    const candidate = await this.getOrCreateCandidate(userId);

    const updateData: any = {};
    if (dto.headline !== undefined) updateData.headline = dto.headline;
    if (dto.careerSummary !== undefined) updateData.careerSummary = dto.careerSummary;
    if (dto.currentLocation !== undefined) updateData.currentLocation = dto.currentLocation;
    if (dto.preferredLocation !== undefined) updateData.preferredLocation = dto.preferredLocation;
    if (dto.visibility !== undefined) updateData.visibility = dto.visibility;
    if (dto.resumeUrl !== undefined) updateData.resumeUrl = dto.resumeUrl;
    if (dto.skills !== undefined) updateData.skills = dto.skills;

    // Preference Updates
    const preferenceUpdate: any = {};
    if (dto.employmentType !== undefined) preferenceUpdate.employmentType = dto.employmentType;
    if (dto.salaryExpectation !== undefined) preferenceUpdate.salaryExpectation = dto.salaryExpectation;
    if (dto.noticePeriodDays !== undefined) preferenceUpdate.noticePeriodDays = dto.noticePeriodDays;
    if (dto.remotePreference !== undefined) preferenceUpdate.remotePreference = dto.remotePreference;

    return this.prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        ...updateData,
        preference: {
          update: preferenceUpdate,
        },
      },
      include: {
        preference: true,
        experiences: true,
        educations: true,
      },
    });
  }

  /**
   * Append candidate experience record
   */
  async addExperience(userId: string, dto: PostExperienceDto) {
    const candidate = await this.getOrCreateCandidate(userId);

    return this.prisma.candidateExperience.create({
      data: {
        candidateId: candidate.id,
        title: dto.title.trim(),
        companyName: dto.companyName.trim(),
        location: dto.location || null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isCurrent: dto.isCurrent || false,
        description: dto.description || null,
      },
    });
  }

  /**
   * Append candidate education record
   */
  async addEducation(userId: string, dto: PostEducationDto) {
    const candidate = await this.getOrCreateCandidate(userId);

    return this.prisma.candidateEducation.create({
      data: {
        candidateId: candidate.id,
        institution: dto.institution.trim(),
        degree: dto.degree.trim(),
        fieldOfStudy: dto.fieldOfStudy || null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        grade: dto.grade || null,
      },
    });
  }

  /**
   * Overwrite skills tags
   */
  async updateSkills(userId: string, skills: string[]) {
    const candidate = await this.getOrCreateCandidate(userId);

    return this.prisma.candidate.update({
      where: { id: candidate.id },
      data: { skills },
    });
  }

  /**
   * Calculate dynamic profile completeness percentage based on weight keys configuration
   */
  async getProfileCompleteness(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      include: {
        preference: true,
        experiences: true,
        educations: true,
        user: { include: { profile: true } },
      },
    });

    if (!candidate) {
      return {
        progressPercentage: 0,
        missingSections: ['Personal Profile', 'Headline & Summary', 'Experience', 'Education', 'Skills', 'Preferences'],
      };
    }

    let progress = 0;
    const missing: string[] = [];

    // 1. Personal Information check: User Profile fullName and locations (Weight: 20%)
    const userProfile = candidate.user.profile;
    if (userProfile?.fullName && candidate.currentLocation) {
      progress += 20;
    } else {
      missing.push('Personal Details (Full Name, Current Location)');
    }

    // 2. Headline & Career Summary check (Weight: 20%)
    if (candidate.headline && candidate.careerSummary) {
      progress += 20;
    } else {
      missing.push('Headline & Career Summary');
    }

    // 3. Experience check (Weight: 20%)
    if (candidate.experiences.length > 0) {
      progress += 20;
    } else {
      missing.push('Work Experience (At least 1 entry)');
    }

    // 4. Education check (Weight: 20%)
    if (candidate.educations.length > 0) {
      progress += 20;
    } else {
      missing.push('Education (At least 1 entry)');
    }

    // 5. Skills tags check (Weight: 10%)
    if (candidate.skills && candidate.skills.length > 0) {
      progress += 10;
    } else {
      missing.push('Skills Tags (At least 1 tag)');
    }

    // 6. Career Preferences check (Weight: 10%)
    const pref = candidate.preference;
    if (pref?.employmentType && pref?.remotePreference) {
      progress += 10;
    } else {
      missing.push('Career Preferences (Job type, Remote status)');
    }

    return {
      progressPercentage: progress,
      missingSections: missing,
    };
  }
}
