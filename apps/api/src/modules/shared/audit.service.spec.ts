import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-uuid' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call prisma auditLog create on action logged', async () => {
    await service.logAction('user-1', 'USER_REGISTERED', '127.0.0.1', 'Mozilla', 'some-details');

    expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'USER_REGISTERED',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla',
        details: 'some-details',
      },
    });
  });

  it('should catch database errors gracefully', async () => {
    mockPrismaService.auditLog.create.mockRejectedValue(new Error('DB Timeout'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await service.logAction('user-1', 'USER_REGISTERED');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
