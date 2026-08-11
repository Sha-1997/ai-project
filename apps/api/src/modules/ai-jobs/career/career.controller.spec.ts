import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { CareerController } from './career.controller';
import { CareerService } from './career.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

describe('CareerController', () => {
  let controller: CareerController;
  let mockCareerService: any;

  beforeEach(async () => {
    mockCareerService = {
      getDashboardSummary: jest.fn().mockResolvedValue({
        widgets: {
          atsScore: 85,
          savedJobsCount: 3,
          applicationsCount: 4,
          resumeStatus: 'OPTIMIZED',
        },
        progress: {
          applied: 2,
          interviews: 1,
          offers: 1,
          rejected: 0,
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CareerController],
      providers: [
        {
          provide: CareerService,
          useValue: mockCareerService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CareerController>(CareerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return career dashboard stats correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const res = await controller.getDashboard(req);
    expect(mockCareerService.getDashboardSummary).toHaveBeenCalledWith('user-1');
    expect(res.widgets.atsScore).toBe(85);
    expect(res.progress.offers).toBe(1);
  });
});
