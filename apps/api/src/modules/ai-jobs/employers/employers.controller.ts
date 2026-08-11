import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmployersService } from './employers.service';
import { JobsService } from '../jobs/jobs.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PatchEmployerDto } from '../dto/patch-employer.dto';
import { CreateJobV2Dto } from '../dto/create-job-v2.dto';

@Controller('employers')
@UseGuards(JwtAuthGuard)
export class EmployersController {
  constructor(
    private readonly employersService: EmployersService,
    private readonly jobsService: JobsService,
  ) { }

  // ─── Employer Profile ────────────────────────────────────────────────────────

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.employersService.getOrCreateEmployer(userId);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Req() req: any, @Body() dto: PatchEmployerDto) {
    const userId = req.user.sub;
    return this.employersService.updateEmployer(userId, dto);
  }

  // ─── Employer Job Management ─────────────────────────────────────────────────

  /**
   * GET /api/v1/employers/me/jobs
   * List all jobs belonging to the authenticated employer (all statuses)
   */
  @Get('me/jobs')
  @HttpCode(HttpStatus.OK)
  async getMyJobs(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const userId = req.user.sub;
    return this.jobsService.getMyJobs(
      userId,
      status,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 10,
    );
  }

  /**
   * POST /api/v1/employers/me/jobs
   * Create a new job posting (starts as DRAFT)
   */
  @Post('me/jobs')
  @HttpCode(HttpStatus.CREATED)
  async createJob(@Req() req: any, @Body() dto: CreateJobV2Dto) {
    const userId = req.user.sub;
    return this.jobsService.createJob(userId, dto);
  }

  /**
   * PATCH /api/v1/employers/me/jobs/:id
   * Edit a job posting
   */
  @Patch('me/jobs/:id')
  @HttpCode(HttpStatus.OK)
  async updateJob(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateJobV2Dto>,
  ) {
    const userId = req.user.sub;
    return this.jobsService.updateJob(userId, id, dto);
  }

  /**
   * POST /api/v1/employers/me/jobs/:id/publish
   * Transition DRAFT/PAUSED → PUBLISHED
   */
  @Post('me/jobs/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishJob(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.jobsService.publishJob(userId, id);
  }

  /**
   * POST /api/v1/employers/me/jobs/:id/pause
   * Transition PUBLISHED → PAUSED
   */
  @Post('me/jobs/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseJob(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.jobsService.pauseJob(userId, id);
  }

  /**
   * POST /api/v1/employers/me/jobs/:id/close
   * Transition PUBLISHED/PAUSED → CLOSED
   */
  @Post('me/jobs/:id/close')
  @HttpCode(HttpStatus.OK)
  async closeJob(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.jobsService.closeJob(userId, id);
  }

  /**
   * POST /api/v1/employers/me/jobs/:id/duplicate
   * Duplicate an existing job as a new DRAFT
   */
  @Post('me/jobs/:id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateJob(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.jobsService.duplicateJob(userId, id);
  }

  @Delete('me/jobs/:id')
  @HttpCode(HttpStatus.OK)
  async deleteJob(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = req.user.sub;

    return this.jobsService.deleteJob(userId, id);
  }
}
