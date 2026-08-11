import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ApplicationsService } from '../applications/applications.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly applicationsService: ApplicationsService,
  ) { }

  // ─── Public Job Board ─────────────────────────────────────────────────────────

  /**
   * GET /api/v1/jobs
   * Public job search with filters
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getJobs(
    @Query('search') search?: string,

    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('location') location?: string,

    @Query('category') category?: string,

    @Query('employmentType') employmentType?: string,

    @Query('workplaceType') workplaceType?: string,

    @Query('salaryMin') salaryMin?: string,
    @Query('salaryMax') salaryMax?: string,

    @Query('experienceLevel') experienceLevel?: string,

    @Query('skills') skills?: string,

    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    return this.jobsService.getJobs(
      search,
      country,
      city,
      location,
      category,
      employmentType,
      workplaceType,
      salaryMin ? Number(salaryMin) : undefined,
      salaryMax ? Number(salaryMax) : undefined,
      experienceLevel,
      skills ? skills.split(',') : undefined,
      pageNum,
      limitNum,
    );
  }

  @Get('job-categories')
  async findAllJobCategory() {
    return this.jobsService.findAllJobCategory();
  }

  /**
   * GET /api/v1/jobs/saved
   * Candidate's saved jobs list
   */
  @Get('saved')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSaved(@Req() req: any) {
    const userId = req.user.sub;
    return this.jobsService.getSavedJobs(userId);
  }

  /**
   * GET /api/v1/jobs/:id
   * Public single job detail view
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getJob(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  // ─── Candidate Actions ────────────────────────────────────────────────────────

  /**
   * POST /api/v1/jobs/save
   * Save a job for later
   */
  @Post('save')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async save(@Req() req: any, @Body('jobId') jobId: string) {
    const userId = req.user.sub;
    return this.jobsService.saveJob(userId, jobId);
  }

  /**
   * POST /api/v1/jobs/unsave
   * Remove a saved job
   */
  @Post('unsave')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unsave(@Req() req: any, @Body('jobId') jobId: string) {
    const userId = req.user.sub;
    return this.jobsService.unsaveJob(userId, jobId);
  }

  /**
   * POST /api/v1/jobs/apply
   * Apply to a job posting
   */
  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async applyToJob(
    @Req() req: any,
    @Body('jobId') jobId: string,
    @Body('notes') notes?: string,
  ) {
    const userId = req.user.sub;
    return this.applicationsService.applyToJob(userId, jobId, { jobId, notes });
  }


}
