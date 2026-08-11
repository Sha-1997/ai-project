import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { MembershipService } from './membership.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SelectPlanDto } from './dto/select-plan.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { Request } from 'express';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('plans')
  @HttpCode(HttpStatus.OK)
  async getPlans() {
    return this.membershipService.getPlans();
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentSubscription(@Req() req: any) {
    const userId = req.user.sub;
    return this.membershipService.getCurrentSubscription(userId);
  }

  @Post('select-plan')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async selectPlan(
    @Req() req: any,
    @Body() dto: SelectPlanDto,
    @Req() expressReq: Request,
  ) {
    const userId = req.user.sub;
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.membershipService.selectPlan(userId, dto, ip, userAgent);
  }

  // --- ADMINISTRATION ENDPOINTS ---

  @Post('admin/plans')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Body() dto: CreatePlanDto) {
    // Note: Admin RBAC can be enforced here in later steps
    return this.membershipService.createPlan(dto);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAdminStats() {
    return this.membershipService.getAdminStats();
  }
}
