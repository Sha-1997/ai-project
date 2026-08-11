import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { FounderController } from './founder.controller';
import { FounderService } from './founder.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('FounderController', () => {
  let controller: FounderController;
  let mockFounderService: any;

  beforeEach(async () => {
    mockFounderService = {
      getDashboardSummary: jest.fn().mockResolvedValue({
        welcome: { fullName: 'Founder Name', email: 'test@jovianex.com', status: 'ACTIVE' },
        founderCard: { founderNumber: 'JXF-2026-000001', joinDate: new Date(), tier: 'Silver', badgeStatus: 'PENDING' },
        membership: { planName: 'Basic Plan', status: 'ACTIVE', expiresAt: new Date() },
        aiJobsLaunchStatus: 'LAUNCHED',
      }),
      getProfile: jest.fn().mockResolvedValue({
        id: 'founder-1',
        fullName: 'Founder Name',
        country: 'India',
      }),
      updateProfile: jest.fn().mockResolvedValue({
        success: true,
        message: 'Profile updated successfully',
      }),
      calculateProfileCompletion: jest.fn().mockResolvedValue({
        completionPercentage: 80,
      }),
      getActivityFeed: jest.fn().mockResolvedValue([]),
      getWidgets: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FounderController],
      providers: [
        {
          provide: FounderService,
          useValue: mockFounderService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FounderController>(FounderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return dashboard summary correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const summary = await controller.getDashboardSummary(req);
    expect(mockFounderService.getDashboardSummary).toHaveBeenCalledWith('user-1');
    expect(summary.welcome.fullName).toBe('Founder Name');
  });

  it('should return profile information correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const profile = await controller.getProfile(req);
    expect(mockFounderService.getProfile).toHaveBeenCalledWith('user-1');
    expect(profile.fullName).toBe('Founder Name');
  });
});
