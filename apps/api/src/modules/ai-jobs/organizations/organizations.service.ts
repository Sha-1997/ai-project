import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { PatchOrganizationDto } from '../dto/patch-organization.dto';
import { v4 as uuid } from 'uuid';
import { join } from 'path';
import { writeFile } from 'fs/promises';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create new organization workspace and set user as OWNER role
   */
  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    // Resolve recruiter employer profile
    let employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      employer = await this.prisma.employer.create({
        data: { userId },
      });
    }

    // Check if recruiter is already in an organization
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: { employerId: employer.id },
    });

    if (existingMember) {
      throw new BadRequestException('You are already linked to an organization workspace.');
    }

    // Check duplicate organization name
    const existingOrg = await this.prisma.organization.findUnique({
      where: { name: dto.name.trim() },
    });

    if (existingOrg) {
      throw new ConflictException(`Organization name '${dto.name}' is already registered.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name.trim(),
          industry: dto.industry || null,
          companySize: dto.companySize || null,
          website: dto.website || null,
          headquarters: dto.headquarters || null,
          countries: dto.countries || [],
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          employerId: employer.id,
          role: 'OWNER',
        },
      });

      return org;
    });
  }

  /**
   * Fetch active associated organization workspace
   */
  async getOrganizationForUser(userId: string) {
    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new NotFoundException('Employer recruiter profile not found.');
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: { employerId: employer.id },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('You have not created or joined an organization workspace.');
    }

    return membership.organization;
  }

  // /**
  //  * Update organization settings profile old
  //  */
  // async updateOrganization(userId: string, id: string, dto: PatchOrganizationDto) {
  //   const employer = await this.prisma.employer.findUnique({
  //     where: { userId },
  //   });

  //   if (!employer) {
  //     throw new ForbiddenException('Invalid recruiter account.');
  //   }

  //   // Verify OWNER permission status
  //   const membership = await this.prisma.organizationMember.findUnique({
  //     where: {
  //       organizationId_employerId: {
  //         organizationId: id,
  //         employerId: employer.id,
  //       },
  //     },
  //   });

  //   if (!membership) {
  //     throw new ForbiddenException('You are not associated with this organization.');
  //   }

  //   if (membership.role !== 'OWNER' && membership.role !== 'HR_MANAGER') {
  //     throw new ForbiddenException('Only owners or HR managers can modify organization profile settings.');
  //   }

  //   return this.prisma.organization.update({
  //     where: { id },
  //     data: {
  //       industry: dto.industry,
  //       companySize: dto.companySize,
  //       website: dto.website,
  //       headquarters: dto.headquarters,
  //       countries: dto.countries,
  //     },
  //   });
  // }

  /**
   * Update organization settings profile
   */
  async updateOrganization(userId: string, dto: PatchOrganizationDto, logo?: Express.Multer.File) {
    const employer = await this.prisma.employer.findUnique({
      where: {
        userId,
      },
    });

    if (!employer) {
      throw new ForbiddenException('Employer account not found');
    }

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        employerId: employer.id,
      },
    });

    let logoUrl: string | undefined;

    if (logo) {
      const filename = `${uuid()}-${logo.originalname}`;

      const uploadPath = join(process.cwd(), 'uploads', 'organizations', filename);

      await writeFile(uploadPath, logo.buffer);

      logoUrl = `/uploads/organizations/${filename}`;
    }

    let organization;

    if (existingMember) {
      organization = await this.prisma.organization.update({
        where: {
          id: existingMember.organizationId,
        },

        data: {
          ...(dto.name && {
            name: dto.name,
          }),

          ...(dto.industry && {
            industry: dto.industry,
          }),

          ...(dto.companySize && {
            companySize: dto.companySize,
          }),

          ...(dto.website && {
            website: dto.website,
          }),

          ...(dto.headquarters && {
            headquarters: dto.headquarters,
          }),

          ...(dto.countries && {
            countries: dto.countries,
          }),

          ...(logoUrl && {
            logoUrl,
          }),
        },
      });
    } else {
      organization = await this.prisma.organization.create({
        data: {
          name: dto.name || 'Organization',

          industry: dto.industry,

          companySize: dto.companySize,

          website: dto.website,

          headquarters: dto.headquarters,

          countries: dto.countries ?? [],

          logoUrl: logoUrl ?? null,
        },
      });

      await this.prisma.organizationMember.create({
        data: {
          organizationId: organization.id,

          employerId: employer.id,

          role: 'EMPLOYER',
        },
      });
    }

    return {
      success: true,

      message: 'Organization profile saved successfully',

      data: organization,
    };
  }

  /**
   * List team members
   */
  async getOrganizationMembers(userId: string, organizationId: string) {
    const employer = await this.prisma.employer.findUnique({
      where: { userId },
    });

    if (!employer) {
      throw new ForbiddenException('Invalid recruiter account.');
    }

    // Verify user is a member of this workspace
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_employerId: {
          organizationId,
          employerId: employer.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to view team members.');
    }

    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        employer: {
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
    });
  }
}
