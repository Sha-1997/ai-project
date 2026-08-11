import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ResumeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch current candidate resume profile mapping
   */
  async getResume(userId: string) {
    let candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      include: {
        experiences: true,
        educations: true,
        certifications: true,
        portfolios: true,
      },
    });

    if (!candidate) {
      // Lazy-initialize candidate profile if missing
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User profile not found.');

      candidate = await this.prisma.candidate.create({
        data: {
          userId,
          status: 'ACTIVE',
          visibility: 'PUBLIC',
        },
        include: {
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
   * Bulk updates candidate resume profile and child lists
   */
  async updateResume(userId: string, data: any) {
    const candidate = await this.getResume(userId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Update core candidate attributes
      const updatedCandidate = await tx.candidate.update({
        where: { id: candidate.id },
        data: {
          headline: data.headline,
          careerSummary: data.careerSummary,
          currentLocation: data.currentLocation,
          preferredLocation: data.preferredLocation,
          skills: data.skills || [],
        },
      });

      // 2. Refresh experiences list
      if (data.experiences) {
        await tx.candidateExperience.deleteMany({ where: { candidateId: candidate.id } });
        if (data.experiences.length > 0) {
          await tx.candidateExperience.createMany({
            data: data.experiences.map((exp: any) => ({
              candidateId: candidate.id,
              title: exp.title,
              companyName: exp.companyName,
              location: exp.location || null,
              startDate: new Date(exp.startDate),
              endDate: exp.endDate ? new Date(exp.endDate) : null,
              isCurrent: exp.isCurrent || false,
              description: exp.description || null,
            })),
          });
        }
      }

      // 3. Refresh educations list
      if (data.educations) {
        await tx.candidateEducation.deleteMany({ where: { candidateId: candidate.id } });
        if (data.educations.length > 0) {
          await tx.candidateEducation.createMany({
            data: data.educations.map((edu: any) => ({
              candidateId: candidate.id,
              institution: edu.institution,
              degree: edu.degree,
              fieldOfStudy: edu.fieldOfStudy || null,
              startDate: new Date(edu.startDate),
              endDate: edu.endDate ? new Date(edu.endDate) : null,
              grade: edu.grade || null,
            })),
          });
        }
      }

      return this.prisma.candidate.findUnique({
        where: { id: candidate.id },
        include: {
          experiences: true,
          educations: true,
          certifications: true,
          portfolios: true,
        },
      });
    });
  }

  /**
   * Parse resume text payload and auto-populate candidate profile fields
   */
  async parseAndFillResume(userId: string, resumeText?: string) {
    // Simulated AI parsing: extracts structural attributes from resumeText
    const mockParsedProfile = {
      headline: 'Senior Full Stack Engineer',
      careerSummary: 'Experienced software developer specialized in NestJS, React, TypeScript, and AWS cloud migrations.',
      currentLocation: 'Dubai, UAE',
      preferredLocation: 'Remote',
      skills: ['TypeScript', 'Node.js', 'NestJS', 'React', 'Prisma', 'PostgreSQL', 'Docker'],
      experiences: [
        {
          title: 'Senior Software Engineer',
          companyName: 'Tech Innovations LLC',
          location: 'Dubai, UAE',
          startDate: '2023-01-01',
          isCurrent: true,
          description: 'Architected NestJS microservices and modernized core workflows.',
        },
      ],
      educations: [
        {
          institution: 'State University',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          startDate: '2018-09-01',
          endDate: '2022-06-30',
        },
      ],
    };

    return this.updateResume(userId, mockParsedProfile);
  }

  /**
   * Analyze ATS match score and list suggestions
   */
  async analyzeAtsScore(userId: string, jobDescription: string) {
    const resume = await this.getResume(userId);

    const skills = resume.skills || [];
    const lowerSkills = skills.map(s => s.toLowerCase());

    // Simple keyword extraction from target job description
    const sampleKeywords = ['typescript', 'nestjs', 'react', 'postgres', 'docker', 'aws', 'graphql'];
    const matched: string[] = [];
    const missing: string[] = [];

    sampleKeywords.forEach(kw => {
      if (jobDescription.toLowerCase().includes(kw) || lowerSkills.includes(kw)) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    });

    const skillsMatch = Math.round((matched.length / sampleKeywords.length) * 100);
    const overallScore = Math.min(100, Math.max(40, skillsMatch + 15));

    return {
      overallScore,
      formattingScore: 85,
      skillsMatch,
      experienceMatch: resume.experiences.length > 0 ? 90 : 50,
      matchedKeywords: matched,
      missingKeywords: missing,
      suggestions: [
        `Improve summary to highlight keywords: ${missing.join(', ')}`,
        'Format section headers clearly as modern minimal style',
        'Add a certification showing competency in cloud deployments',
      ],
    };
  }

  /**
   * Career optimize suggestions
   */
  async getOptimizeSuggestions(userId: string) {
    return {
      overallScore: 78,
      optimizations: [
        {
          field: 'careerSummary',
          original: 'I am a software engineer looking for jobs.',
          recommended: 'Dynamic Software Engineer with 3+ years experience driving clean microservices architectures and TypeScript integrations.',
        },
        {
          field: 'skills',
          original: 'Node.js, PostgreSQL',
          recommended: 'NestJS, Prisma ORM, Redis Caching, Docker containerization',
        },
      ],
    };
  }

  /**
   * Return a simulated PDF export layout document buffer
   */
  exportResumePdf(resume: any) {
    return Buffer.from(
      `JovianeX Professional Resume\nName: ${resume.userId}\nHeadline: ${resume.headline || 'Candidate'}\nSummary: ${resume.careerSummary || ''}\nSkills: ${resume.skills?.join(', ') || ''}`
    );
  }
}
