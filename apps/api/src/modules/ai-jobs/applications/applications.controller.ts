import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ApplyJobDto } from '../dto/apply-job.dto';
import { PatchApplicationStatusDto } from '../dto/patch-application-status.dto';
import { PostNoteDto } from '../dto/post-note.dto';
import { PostHiringDto } from '../dto/post-hiring.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post('jobs/:jobId/apply')
  @HttpCode(HttpStatus.CREATED)
  async apply(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Body() dto: ApplyJobDto,
  ) {
    const userId = req.user.sub;
    return this.applicationsService.applyToJob(userId, jobId, dto);
  }

  @Get('applications/me')
  @HttpCode(HttpStatus.OK)
  async getMyApplications(@Req() req: any) {
    const userId = req.user.sub;
    return this.applicationsService.getCandidateApplications(userId);
  }

  @Get('career/applications')
  @HttpCode(HttpStatus.OK)
  async getCareerApplications(@Req() req: any) {
    return this.getMyApplications(req);
  }

  @Get('employers/applications')
  @HttpCode(HttpStatus.OK)
  async getOrgApplications(@Req() req: any) {
    const userId = req.user.sub;
    return this.applicationsService.getEmployerApplications(userId);
  }

  @Get('applications/:id')
  @HttpCode(HttpStatus.OK)
  async getDetails(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.applicationsService.getApplicationById(userId, id);
  }

  @Patch('applications/:id')
  @HttpCode(HttpStatus.OK)
  async withdraw(@Req() req: any, @Param('id') id: string, @Body('notes') notes?: string) {
    const userId = req.user.sub;
    return this.applicationsService.withdrawApplicationByCandidate(userId, id, notes);
  }

  @Patch('employers/applications/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: PatchApplicationStatusDto,
  ) {
    const userId = req.user.sub;
    return this.applicationsService.updateApplicationStatusByRecruiter(userId, id, dto);
  }

  @Post('applications/:id/notes')
  @HttpCode(HttpStatus.CREATED)
  async addNote(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: PostNoteDto,
  ) {
    const userId = req.user.sub;
    return this.applicationsService.addEmployerNote(userId, id, dto);
  }

  @Post('applications/:id/hiring')
  @HttpCode(HttpStatus.OK)
  async saveHiring(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: PostHiringDto,
  ) {
    const userId = req.user.sub;
    return this.applicationsService.recordHiringDecision(userId, id, dto);
  }
}
