import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateFounderDto } from './dto/update-founder.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PatchCampaignDto } from './dto/patch-campaign.dto';
import { Request } from 'express';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @HttpCode(HttpStatus.OK)
  async getUsers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.adminService.getUsers(search, status, pageNum, limitNum);
  }

  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  async getUser(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() expressReq: Request,
  ) {
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.adminService.updateUser(id, dto, ip, userAgent);
  }

  @Get('founders')
  @HttpCode(HttpStatus.OK)
  async getFounders(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.adminService.getFounders(search, status, pageNum, limitNum);
  }

  @Get('founders/:id')
  @HttpCode(HttpStatus.OK)
  async getFounder(@Param('id') id: string) {
    return this.adminService.getFounderById(id);
  }

  @Patch('founders/:id')
  @HttpCode(HttpStatus.OK)
  async updateFounder(
    @Param('id') id: string,
    @Body() dto: UpdateFounderDto,
    @Req() expressReq: Request,
  ) {
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.adminService.updateFounder(id, dto, ip, userAgent);
  }

  // --- MEMBERSHIP PLANS ROUTES ---

  @Get('membership/plans')
  @HttpCode(HttpStatus.OK)
  async getPlans() {
    return this.adminService.getMembershipPlans();
  }

  @Post('membership/plans')
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @Body() dto: CreatePlanDto,
    @Req() expressReq: Request,
  ) {
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.adminService.createMembershipPlan(dto, ip, userAgent);
  }

  @Patch('membership/plans/:id')
  @HttpCode(HttpStatus.OK)
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @Req() expressReq: Request,
  ) {
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.adminService.updateMembershipPlan(id, dto, ip, userAgent);
  }

  // --- SUBSCRIPTIONS ROUTES ---

  @Get('subscriptions')
  @HttpCode(HttpStatus.OK)
  async getSubscriptions(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.adminService.getSubscriptions(search, status, pageNum, limitNum);
  }

  @Patch('subscriptions/:id')
  @HttpCode(HttpStatus.OK)
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
    @Req() expressReq: Request,
  ) {
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.adminService.updateSubscription(id, dto, ip, userAgent);
  }

  // --- FOUNDER SEAT ALLOCATIONS ---

  @Get('founder-seats')
  @HttpCode(HttpStatus.OK)
  async getFounderSeats() {
    return this.adminService.getFounderSeatsSummary();
  }

  // --- FINANCE OPERATIONS ROUTES ---

  @Get('payments')
  @HttpCode(HttpStatus.OK)
  async getPayments(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.adminService.getPayments(search, status, pageNum, limitNum);
  }

  @Get('payments/:id')
  @HttpCode(HttpStatus.OK)
  async getPayment(@Param('id') id: string) {
    return this.adminService.getPaymentById(id);
  }

  @Get('invoices')
  @HttpCode(HttpStatus.OK)
  async getInvoices(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.adminService.getInvoices(search, status, pageNum, limitNum);
  }

  @Get('invoices/:id')
  @HttpCode(HttpStatus.OK)
  async getInvoice(@Param('id') id: string) {
    return this.adminService.getInvoiceById(id);
  }

  @Get('finance/dashboard')
  @HttpCode(HttpStatus.OK)
  async getFinanceDashboard() {
    return this.adminService.getFinanceDashboardMetrics();
  }

  @Get('payment-providers/health')
  @HttpCode(HttpStatus.OK)
  async getProvidersHealth() {
    return this.adminService.getPaymentProvidersHealth();
  }

  // --- CAMPAIGNS & REFERRALS OPERATIONS ---

  @Get('campaigns')
  @HttpCode(HttpStatus.OK)
  async adminGetCampaigns(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.adminService.adminGetCampaigns(search, status, pageNum, limitNum);
  }

  @Patch('campaigns/:id')
  @HttpCode(HttpStatus.OK)
  async adminUpdateCampaign(
    @Param('id') id: string,
    @Body() dto: PatchCampaignDto,
    @Req() expressReq: Request,
  ) {
    const ip = expressReq.ip || expressReq.socket.remoteAddress;
    const userAgent = expressReq.headers['user-agent'];
    return this.adminService.adminUpdateCampaign(id, dto, ip, userAgent);
  }

  @Get('referrals')
  @HttpCode(HttpStatus.OK)
  async adminGetReferrals(
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.adminService.adminGetReferrals(search, pageNum, limitNum);
  }

  @Get('naming-challenge')
  @HttpCode(HttpStatus.OK)
  async adminGetNamingEntries(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.adminService.adminGetNamingEntries(search, status, pageNum, limitNum);
  }

  @Get('giveaway')
  @HttpCode(HttpStatus.OK)
  async adminGetGiveaway(
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.adminService.adminGetGiveawayCandidates(search, pageNum, limitNum);
  }
}
