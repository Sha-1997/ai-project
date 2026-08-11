import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PatchEmployerDto } from '../dto/patch-employer.dto';

@Injectable()
export class EmployersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves or creates an employer recruiter profile
   */
  async getOrCreateEmployer(userId: string) {
    let employer = await this.prisma.employer.findUnique({
      where: { userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!employer) {
      employer = await this.prisma.employer.create({
        data: {
          userId,
        },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
    }

    return employer;
  }

  /**
   * Update recruiter settings
   */
  async updateEmployer(userId: string, dto: PatchEmployerDto) {
    const employer = await this.getOrCreateEmployer(userId);

    return this.prisma.employer.update({
      where: { id: employer.id },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        department: dto.department !== undefined ? dto.department.trim() : undefined,
        businessEmail: dto.businessEmail !== undefined ? dto.businessEmail.trim() : undefined,
        contactNumber: dto.contactNumber !== undefined ? dto.contactNumber.trim() : undefined,
      },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });
  }
}
