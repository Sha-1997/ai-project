import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PatchCandidateDto } from '../dto/patch-candidate.dto';
import { PostExperienceDto } from '../dto/post-experience.dto';
import { PostEducationDto } from '../dto/post-education.dto';

@Controller('candidates')
@UseGuards(JwtAuthGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.candidatesService.getOrCreateCandidate(userId);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Req() req: any, @Body() dto: PatchCandidateDto) {
    const userId = req.user.sub;
    return this.candidatesService.updateCandidate(userId, dto);
  }

  @Get('profile-completion')
  @HttpCode(HttpStatus.OK)
  async getProfileCompleteness(@Req() req: any) {
    const userId = req.user.sub;
    return this.candidatesService.getProfileCompleteness(userId);
  }

  @Post('skills')
  @HttpCode(HttpStatus.OK)
  async updateSkills(@Req() req: any, @Body('skills') skills: string[]) {
    const userId = req.user.sub;
    return this.candidatesService.updateSkills(userId, skills || []);
  }

  @Post('experience')
  @HttpCode(HttpStatus.CREATED)
  async addExperience(@Req() req: any, @Body() dto: PostExperienceDto) {
    const userId = req.user.sub;
    return this.candidatesService.addExperience(userId, dto);
  }

  @Post('education')
  @HttpCode(HttpStatus.CREATED)
  async addEducation(@Req() req: any, @Body() dto: PostEducationDto) {
    const userId = req.user.sub;
    return this.candidatesService.addEducation(userId, dto);
  }
}
