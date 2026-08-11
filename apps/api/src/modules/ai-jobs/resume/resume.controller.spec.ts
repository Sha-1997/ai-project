import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

describe('ResumeController', () => {
  let controller: ResumeController;
  let mockResumeService: any;

  beforeEach(async () => {
    mockResumeService = {
      getResume: jest.fn().mockResolvedValue({ id: 'candidate-1', headline: 'Engineer' }),
      updateResume: jest.fn().mockResolvedValue({ id: 'candidate-1', headline: 'Updated Engineer' }),
      parseAndFillResume: jest.fn().mockResolvedValue({ id: 'candidate-1', headline: 'Parsed Engineer' }),
      analyzeAtsScore: jest.fn().mockResolvedValue({ overallScore: 85 }),
      getOptimizeSuggestions: jest.fn().mockResolvedValue({ overallScore: 78, optimizations: [] }),
      exportResumePdf: jest.fn().mockReturnValue(Buffer.from('PDF Content')),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumeController],
      providers: [
        {
          provide: ResumeService,
          useValue: mockResumeService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ResumeController>(ResumeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return candidate resume profile correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const res = await controller.getResume(req);
    expect(mockResumeService.getResume).toHaveBeenCalledWith('user-1');
    expect(res.headline).toBe('Engineer');
  });

  it('should call update resume correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const body = { headline: 'Updated Engineer' };
    const res = await controller.updateResume(req, body);
    expect(mockResumeService.updateResume).toHaveBeenCalledWith('user-1', body);
    expect(res.headline).toBe('Updated Engineer');
  });

  it('should call upload and parse correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const res = await controller.uploadResume(req, 'some raw text');
    expect(mockResumeService.parseAndFillResume).toHaveBeenCalledWith('user-1', 'some raw text');
    expect(res.headline).toBe('Parsed Engineer');
  });

  it('should call ATS score analysis correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const res = await controller.analyze(req, 'Look for NestJS skills');
    expect(mockResumeService.analyzeAtsScore).toHaveBeenCalledWith('user-1', 'Look for NestJS skills');
    expect(res.overallScore).toBe(85);
  });
});
