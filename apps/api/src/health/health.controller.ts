import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisHealthIndicator } from '@jovianex/cache';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getHealth() {
    const redisStatus = await this.redisHealth.checkHealth();
    return {
      status: redisStatus.status,
      service: 'JovianeX API',
      version: '1.0.0',
      redis: redisStatus.redis,
    };
  }

  @Get('readiness')
  async getReadiness() {
    let dbConnected = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (err) {
      dbConnected = false;
    }

    const redisStatus = await this.redisHealth.checkHealth();
    const redisConnected = redisStatus.redis.connected;

    const isReady = dbConnected && redisConnected;

    return {
      status: isReady ? 'UP' : 'DOWN',
      checks: {
        database: dbConnected ? 'UP' : 'DOWN',
        redis: redisConnected ? 'UP' : 'DOWN',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('version')
  getVersion() {
    return {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      releaseDate: '2026-07-08',
    };
  }
}
