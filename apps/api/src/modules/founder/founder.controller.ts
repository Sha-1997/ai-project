import { Controller, Get, Patch, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { FounderService } from './founder.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';

@Controller('founder')
@UseGuards(JwtAuthGuard)
export class FounderController {
  constructor(private readonly founderService: FounderService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  async getDashboardSummary(@Req() req: any) {
    const userId = req.user.sub;
    return this.founderService.getDashboardSummary(userId);
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.founderService.getProfile(userId);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto, @Req() expressReq: Request) {
    const userId = req.user.sub;
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.founderService.updateProfile(userId, dto, ip, userAgent);
  }

  @Get('profile-completion')
  @HttpCode(HttpStatus.OK)
  async getProfileCompletion(@Req() req: any) {
    const userId = req.user.sub;
    return this.founderService.calculateProfileCompletion(userId);
  }

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  async getActivity(@Req() req: any) {
    const userId = req.user.sub;
    return this.founderService.getActivityFeed(userId);
  }

  @Get('widgets')
  @HttpCode(HttpStatus.OK)
  async getWidgets() {
    return this.founderService.getWidgets();
  }

  @Public()
  @Get('seats')
  @HttpCode(HttpStatus.OK)
  async getFounderSeatStats() {
    return this.founderService.getFounderSeatStats();
  }
}


