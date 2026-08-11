import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { ApplicationsService } from '../applications/applications.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

describe('JobsController', () => {
  let controller: JobsController;
  let mockJobsService: any;
  let mockApplicationsService: any;

  beforeEach(async () => {
    mockJobsService = {
      getJobs: jest.fn().mockResolvedValue({ jobs: [], pagination: {} }),
      getSavedJobs: jest.fn().mockResolvedValue([{ id: 'job-1', title: 'React Dev' }]),
      getJobById: jest.fn().mockResolvedValue({ id: 'job-1', title: 'React Dev' }),
      createJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
      updateJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
      saveJob: jest.fn().mockResolvedValue({ success: true }),
      unsaveJob: jest.fn().mockResolvedValue({ success: true }),
    };

    mockApplicationsService = {
      applyToJob: jest.fn().mockResolvedValue({ id: 'app-1', status: 'APPLIED' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<JobsController>(JobsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getJobs with filter parameters correctly', async () => {
    await controller.getJobs(
      'React',
      'UAE',
      'Dubai',
      'remote',
      'Engineering',
      'FULL_TIME',
      'HYBRID',
      '10000',
      '20000',
      'MID',
      'TypeScript,React',
      '1',
      '10',
    );

    expect(mockJobsService.getJobs).toHaveBeenCalledWith(
      'React',
      'UAE',
      'Dubai',
      'remote',
      'Engineering',
      'FULL_TIME',
      'HYBRID',
      10000,
      20000,
      'MID',
      ['TypeScript', 'React'],
      1,
      10,
    );
  });

  it('should call saveJob correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const res = await controller.save(req, 'job-1');
    expect(mockJobsService.saveJob).toHaveBeenCalledWith('user-1', 'job-1');
    expect(res.success).toBe(true);
  });

  it('should call unsaveJob correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const res = await controller.unsave(req, 'job-1');
    expect(mockJobsService.unsaveJob).toHaveBeenCalledWith('user-1', 'job-1');
    expect(res.success).toBe(true);
  });

  it('should call applyToJob correctly', async () => {
    const req = { user: { sub: 'user-1' } };
    const res = await controller.applyToJob(req, 'job-1', 'Notes details');
    expect(mockApplicationsService.applyToJob).toHaveBeenCalledWith('user-1', 'job-1', { jobId: 'job-1', notes: 'Notes details' });
    expect(res.status).toBe('APPLIED');
  });
});
