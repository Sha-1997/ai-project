import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DatabaseService } from '../database/database.service';
import { RedisHealthIndicator } from '@jovianex/cache';
import { PrismaService } from '../database/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDbService: any;
  let mockRedisHealth: any;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockDbService = {
      getDbStatus: jest.fn().mockReturnValue(true),
      getRedisStatus: jest.fn().mockReturnValue(true),
    };

    mockRedisHealth = {
      checkHealth: jest.fn().mockResolvedValue({
        status: 'healthy',
        redis: {
          connected: true,
          latency: '2ms',
        },
      }),
    };

    mockPrismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
        {
          provide: RedisHealthIndicator,
          useValue: mockRedisHealth,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status with redis properties', async () => {
    const res = await controller.getHealth();
    expect(res.status).toBe('healthy');
    expect(res.redis.connected).toBe(true);
    expect(res.redis.latency).toBe('2ms');
  });

  it('should return UP status when both DB and Redis are healthy', async () => {
    const res = await controller.getReadiness();
    expect(res.status).toBe('UP');
    expect(res.checks.database).toBe('UP');
    expect(res.checks.redis).toBe('UP');
  });

  it('should return DOWN status when DB check throws error', async () => {
    mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection lost'));
    const res = await controller.getReadiness();
    expect(res.status).toBe('DOWN');
    expect(res.checks.database).toBe('DOWN');
    expect(res.checks.redis).toBe('UP');
  });
});
