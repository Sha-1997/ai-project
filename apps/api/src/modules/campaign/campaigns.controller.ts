import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubmitEntryDto } from './dto/submit-entry.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { Request } from 'express';

@Controller()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('campaigns')
  @HttpCode(HttpStatus.OK)
  async getCampaigns() {
    return this.campaignsService.getCampaigns();
  }

  @Get('campaigns/:id')
  @HttpCode(HttpStatus.OK)
  async getCampaign(@Param('id') id: string) {
    return this.campaignsService.getCampaignById(id);
  }

  // --- REFERRALS ROUTINES ---

  @Post('referrals')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async trackReferral(
    @Req() req: any,
    @Body('referralCode') referralCode: string,
    @Req() expressReq: Request,
  ) {
    const userId = req.user.sub;
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.campaignsService.trackReferralCode(userId, referralCode, ip, userAgent);
  }

  @Get('referrals/me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMyReferrals(@Req() req: any) {
    const userId = req.user.sub;
    return this.campaignsService.getMyReferralsSummary(userId);
  }

  // --- NAMING CHALLENGE ROUTINES ---

  @Post('naming-challenge/entries')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitNamingEntry(@Req() req: any, @Body() dto: SubmitEntryDto) {
    const userId = req.user.sub;
    return this.campaignsService.submitNamingChallengeEntry(userId, dto);
  }

  @Get('naming-challenge/my-entry')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMyNamingEntry(@Req() req: any) {
    const userId = req.user.sub;
    return this.campaignsService.getNamingChallengeEntry(userId);
  }

  // --- GIVEAWAY ROUTINES ---

  @Get('giveaway/eligibility')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getGiveawayEligibility(@Req() req: any) {
    const userId = req.user.sub;
    return this.campaignsService.calculateGiveawayEligibility(userId);
  }

  // --- ADMINISTRATION ---

  @Post('campaigns/admin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(@Body() dto: CreateCampaignDto) {
    // Note: Admin RBAC can be enforced here in later steps
    return this.campaignsService.createCampaign(dto);
  }
}
