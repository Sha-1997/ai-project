import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: string | null,
    action: string,
    ipAddress?: string,
    userAgent?: string,
    details?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          details: details ? (typeof details === 'object' ? JSON.stringify(details) : details) : null,
        },
      });
      console.log(`[JovianeX Audit] Action: ${action} recorded for User: ${userId || 'guest'}`);
    } catch (err) {
      console.error('[JovianeX Audit] Failed to record audit log:', err);
    }
  }
}
