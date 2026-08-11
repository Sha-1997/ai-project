import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { calculateProfileCompletion } from './profile-completion';

@Injectable()
export class CareerService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: {
        userId,
      },

      include: {
        experiences: true,
        educations: true,
      },
    });

    if (!candidate) {
      throw new ForbiddenException('User is not registered as a candidate.');
    }

    const [totalApps, savedJobsCount, appliedCount, interviewCount, offersCount, rejectedCount] =
      await Promise.all([
        this.prisma.jobApplication.count({
          where: {
            candidateId: candidate.id,
          },
        }),

        this.prisma.savedJob.count({
          where: {
            candidateId: candidate.id,
          },
        }),

        this.prisma.jobApplication.count({
          where: {
            candidateId: candidate.id,
            status: 'APPLIED',
          },
        }),

        this.prisma.jobApplication.count({
          where: {
            candidateId: candidate.id,
            status: {
              in: ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'],
            },
          },
        }),

        this.prisma.jobApplication.count({
          where: {
            candidateId: candidate.id,
            status: 'OFFER_EXTENDED',
          },
        }),

        this.prisma.jobApplication.count({
          where: {
            candidateId: candidate.id,
            status: 'REJECTED',
          },
        }),
      ]);

    let atsScore = 40;

    if (candidate.headline) atsScore += 15;

    if (candidate.careerSummary) atsScore += 15;

    if (candidate.skills.length) atsScore += 15;

    if (candidate.experiences.length) atsScore += 15;

    const profileCompletion = await this.prisma.profileCompletion.findUnique({
      where: {
        userId,
      },
    });

    return {
      widgets: {
        atsScore: Math.min(atsScore, 100),

        savedJobsCount,

        applicationsCount: totalApps,

        resumeStatus: atsScore >= 80 ? 'OPTIMIZED' : 'NEEDS_IMPROVEMENT',
      },
      profileCompletion: {
        progressPercentage: profileCompletion?.progressPercentage || 0,

        missingFields: profileCompletion?.missingFields || [],

        completedAt: profileCompletion?.completedAt || null,
      },
      progress: {
        applied: appliedCount,

        interviews: interviewCount,

        offers: offersCount,

        rejected: rejectedCount,
      },
    };
  }

  async getResume(userId: string) {
    return await this.prisma.candidate.findUnique({
      where: {
        userId,
      },

      include: {
        experiences: true,

        educations: true,

        certifications: true,

        portfolios: true,

        preference: true,
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  async updateResume(
    userId: string,
    data: any,
    files?: {
      resumeFile?: Express.Multer.File[];
      profilePhoto?: Express.Multer.File[];
      certificates?: Express.Multer.File[];
    },
  ) {
    const { experiences, educations, ...candidateData } = data;

    const resumeFile = files?.resumeFile?.[0];

    const photoFile = files?.profilePhoto?.[0];

    const resumeUrl = resumeFile ? `/uploads/${resumeFile.filename}` : undefined;

    const profilePhoto = photoFile ? `/uploads/${photoFile.filename}` : undefined;

    return await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.upsert({
        where: {
          userId,
        },

        update: {
          headline: candidateData.headline,

          careerSummary: candidateData.careerSummary,

          currentLocation: candidateData.currentLocation,

          preferredLocation: candidateData.preferredLocation,

          skills: candidateData.skills || [],

          ...(resumeUrl && {
            resumeUrl,
          }),
        },

        create: {
          userId,

          headline: candidateData.headline,

          careerSummary: candidateData.careerSummary,

          currentLocation: candidateData.currentLocation,

          preferredLocation: candidateData.preferredLocation,

          skills: candidateData.skills || [],

          ...(resumeUrl && {
            resumeUrl,
          }),
        },
      });

      // SAVE PROFILE PHOTO

      if (profilePhoto) {
        await tx.profile.upsert({
          where: {
            userId,
          },

          update: {
            profilePhoto,
          },

          create: {
            userId,

            profilePhoto,

            skills: [],

            careerPreferences: [],
          },
        });
      }

      // EXPERIENCE UPDATE

      // EXPERIENCE UPDATE

      if (experiences) {
        await tx.candidateExperience.deleteMany({
          where: {
            candidateId: candidate.id,
          },
        });

        const validExperiences = experiences
          .filter(
            (exp) =>
              exp.title &&
              exp.companyName &&
              exp.startDate &&
              !isNaN(new Date(exp.startDate).getTime()),
          )
          .map((exp) => ({
            candidateId: candidate.id,

            title: exp.title,

            companyName: exp.companyName,

            location: exp.location || null,

            startDate: new Date(exp.startDate),

            endDate:
              exp.endDate && !isNaN(new Date(exp.endDate).getTime()) ? new Date(exp.endDate) : null,

            isCurrent: exp.isCurrent ?? false,

            description: exp.description || null,
          }));

        if (validExperiences.length) {
          await tx.candidateExperience.createMany({
            data: validExperiences,
          });
        }
      }

      // EDUCATION UPDATE

      // EDUCATION UPDATE

      if (educations) {
        await tx.candidateEducation.deleteMany({
          where: {
            candidateId: candidate.id,
          },
        });

        const validEducations = educations
          .filter(
            (edu) =>
              edu.institution &&
              edu.degree &&
              edu.startDate &&
              !isNaN(new Date(edu.startDate).getTime()),
          )
          .map((edu) => ({
            candidateId: candidate.id,

            institution: edu.institution,

            degree: edu.degree,

            fieldOfStudy: edu.fieldOfStudy || null,

            startDate: new Date(edu.startDate),

            endDate:
              edu.endDate && !isNaN(new Date(edu.endDate).getTime()) ? new Date(edu.endDate) : null,

            grade: edu.grade || null,
          }));

        if (validEducations.length) {
          await tx.candidateEducation.createMany({
            data: validEducations,
          });
        }
      }

      // CERTIFICATES

      if (files?.certificates?.length) {
        await tx.candidateCertification.createMany({
          data: files.certificates.map((file) => ({
            candidateId: candidate.id,

            name: file.originalname,

            issuingOrganization: 'Uploaded Certificate',

            credentialUrl: `/uploads/${file.filename}`,
          })),
        });
      }
      // PROFILE COMPLETION UPDATE

      const candidateWithDetails = await tx.candidate.findUnique({
        where: {
          id: candidate.id,
        },

        include: {
          experiences: true,
          educations: true,
        },
      });

      const completion = calculateProfileCompletion(candidateWithDetails);

      await tx.profileCompletion.upsert({
        where: {
          userId,
        },

        update: {
          progressPercentage: completion.percentage,

          missingFields: completion.missingFields,

          completedAt: completion.percentage === 100 ? new Date() : null,
        },

        create: {
          userId,

          progressPercentage: completion.percentage,

          missingFields: completion.missingFields,

          completedAt: completion.percentage === 100 ? new Date() : null,
        },
      });
      return await tx.candidate.findUnique({
        where: {
          id: candidate.id,
        },

        include: {
          experiences: true,

          educations: true,

          certifications: true,

          portfolios: true,

          preference: true,

          user: {
            include: {
              profile: true,
              profileCompletion: true,
            },
          },
        },
      });
    });
  }
}
