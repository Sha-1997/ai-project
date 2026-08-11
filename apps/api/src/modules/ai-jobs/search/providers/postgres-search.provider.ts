import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { ISearchProvider, SearchCriteria, SearchResult } from './search-provider.interface';

@Injectable()
export class PostgresSearchProvider implements ISearchProvider {
  constructor(private readonly prisma: PrismaService) {}

  async search(criteria: SearchCriteria): Promise<SearchResult> {
    const page = criteria.page || 1;
    const limit = criteria.limit || 10;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    };

    const andConditions: any[] = [];

    // 1. Keyword search (matches job title, company name, skills, description)
    if (criteria.keyword) {
      const keywordLower = criteria.keyword.trim().toLowerCase();
      andConditions.push({
        OR: [
          { title: { contains: keywordLower, mode: 'insensitive' } },
          { description: { contains: keywordLower, mode: 'insensitive' } },
          {
            organization: {
              name: { contains: keywordLower, mode: 'insensitive' },
            },
          },
          {
            skills: {
              some: {
                skillName: { contains: keywordLower, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    }

    // 2. Skills filter
    if (criteria.skills) {
      const skillsArray = criteria.skills
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);

      if (skillsArray.length > 0) {
        andConditions.push({
          skills: {
            some: {
              skillName: {
                in: skillsArray,
                mode: 'insensitive',
              },
            },
          },
        });
      }
    }

    // 3. Location matches
    if (criteria.location) {
      const locLower = criteria.location.trim().toLowerCase();
      andConditions.push({
        locations: {
          some: {
            OR: [
              { country: { contains: locLower, mode: 'insensitive' } },
              { city: { contains: locLower, mode: 'insensitive' } },
              { state: { contains: locLower, mode: 'insensitive' } },
            ],
          },
        },
      });
    }

    // 4. Workplace type
    if (criteria.workplaceType) {
      andConditions.push({
        locations: {
          some: {
            workplaceType: criteria.workplaceType,
          },
        },
      });
    }

    // 5. Salary range minimum
    if (criteria.salaryMin !== undefined) {
      andConditions.push({
        OR: [
          { salaryMax: { gte: criteria.salaryMin } },
          { salaryMin: { gte: criteria.salaryMin } },
        ],
      });
    }

    // 6. Salary range maximum
    if (criteria.salaryMax !== undefined) {
      andConditions.push({
        OR: [
          { salaryMin: { lte: criteria.salaryMax } },
          { salaryMax: { lte: criteria.salaryMax } },
        ],
      });
    }

    // 7. Experience level
    if (criteria.experienceLevel) {
      andConditions.push({
        experienceLevel: criteria.experienceLevel,
      });
    }

    // 8. Category ID
    if (criteria.categoryId) {
      andConditions.push({
        categoryId: criteria.categoryId,
      });
    }

    // 9. Organization ID
    if (criteria.organizationId) {
      andConditions.push({
        organizationId: criteria.organizationId,
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Handle sort mappings
    let orderBy: any = { createdAt: 'desc' }; // Default NEWEST
    if (criteria.sortBy === 'OLDEST') {
      orderBy = { createdAt: 'asc' };
    } else if (criteria.sortBy === 'SALARY_HIGH_TO_LOW') {
      orderBy = { salaryMax: 'desc' };
    } else if (criteria.sortBy === 'SALARY_LOW_TO_HIGH') {
      orderBy = { salaryMin: 'asc' };
    }

    const [jobs, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        skip,
        take,
        include: {
          organization: true,
          category: true,
          locations: true,
          skills: true,
          benefits: true,
        },
        orderBy,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
