import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../shared/audit.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Fetch user account and profile details
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            phoneNumber: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    return user;
  }

  /**
   * Update user profile properties
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    // Update Profile record
    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
      },
    });

    // Write audit log
    await this.audit.logAction(
      userId,
      'USER_PROFILE_UPDATE',
      ipAddress,
      userAgent,
      `Updated parameters: ${Object.keys(dto).join(', ')}`,
    );

    return {
      userId,
      email: user.email,
      profile: {
        fullName: updatedProfile.fullName,
        phoneNumber: updatedProfile.phoneNumber,
        updatedAt: updatedProfile.updatedAt,
      },
      message: 'User profile updated successfully.',
    };
  }

  async getUserCount(): Promise<number> {
    return this.prisma.user.count();
  }
}
