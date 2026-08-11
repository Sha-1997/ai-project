import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CrmService } from './crm.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('api/v1/crm')
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('leads')
  async createLead(@Req() req: any, @Body() dto: CreateLeadDto) {
    const actorUserId = req.user?.sub || null;
    return this.crmService.createLead(dto, actorUserId);
  }

  @Get('leads')
  async getLeads(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.crmService.getLeads({ status, search });
  }

  @Get('leads/:id')
  async getLeadById(@Param('id') id: string) {
    return this.crmService.getLeadById(id);
  }

  @Patch('leads/:id')
  async updateLead(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateLeadDto,
  ) {
    const actorUserId = req.user?.sub || null;
    return this.crmService.updateLead(id, dto, actorUserId);
  }

  @Delete('leads/:id')
  async deleteLead(@Param('id') id: string, @Req() req: any) {
    const actorUserId = req.user?.sub || null;
    return this.crmService.deleteLead(id, actorUserId);
  }

  @Post('customers')
  async createCustomer(@Req() req: any, @Body() dto: CreateCustomerDto) {
    const actorUserId = req.user?.sub || null;
    return this.crmService.createCustomer(dto, actorUserId);
  }

  @Get('customers')
  async getCustomers(@Query('search') search?: string) {
    return this.crmService.getCustomers({ search });
  }

  @Get('customers/:id')
  async getCustomerById(@Param('id') id: string) {
    return this.crmService.getCustomerById(id);
  }

  @Patch('customers/:id')
  async updateCustomer(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateCustomerDto,
  ) {
    const actorUserId = req.user?.sub || null;
    return this.crmService.updateCustomer(id, dto, actorUserId);
  }

  @Delete('customers/:id')
  async deleteCustomer(@Param('id') id: string, @Req() req: any) {
    const actorUserId = req.user?.sub || null;
    return this.crmService.deleteCustomer(id, actorUserId);
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.crmService.getDashboardStats();
  }
}
