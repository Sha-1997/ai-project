import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';

describe('AiController', () => {
  let controller: AiController;
  let mockAiService: any;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockAiService = {
      processPrompt: jest.fn().mockResolvedValue({
        reply: 'Mock AI response reply',
        tokenUsage: 12,
      }),
    };

    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call processPrompt service logic correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const dto = { prompt: 'Who is the founder of JovianeX?' };

    const res = await controller.handleChat(req, dto);
    expect(mockAiService.processPrompt).toHaveBeenCalledWith('user-1', 'Who is the founder of JovianeX?');
    expect(res.reply).toBe('Mock AI response reply');
  });
});
