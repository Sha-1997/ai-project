import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../shared/audit.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new CRM Lead
   */
  async createLead(dto: CreateLeadDto, actorUserId: string | null) {
    const lead = await this.prisma.lead.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        status: dto.status || 'NEW',
        source: dto.source || 'WEBSITE',
        notes: dto.notes,
      },
    });

    await this.audit.logAction(
      actorUserId,
      'CRM_LEAD_CREATE',
      undefined,
      undefined,
      `Created lead ID: ${lead.id} with email ${lead.email}`,
    );

    return lead;
  }

  /**
   * Query all Leads with search/status filters
   */
  async getLeads(filters: { status?: string; search?: string }) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetch single Lead by ID
   */
  async getLeadById(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }

  /**
   * Update Lead parameters
   */
  async updateLead(id: string, dto: UpdateLeadDto, actorUserId: string | null) {
    // Check existence
    await this.getLeadById(id);

    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data: dto,
    });

    await this.audit.logAction(
      actorUserId,
      'CRM_LEAD_UPDATE',
      undefined,
      undefined,
      `Updated lead ID: ${id}. New status: ${updatedLead.status}`,
    );

    return updatedLead;
  }

  /**
   * Remove a Lead from registry
   */
  async deleteLead(id: string, actorUserId: string | null) {
    await this.getLeadById(id);

    await this.prisma.lead.delete({
      where: { id },
    });

    await this.audit.logAction(
      actorUserId,
      'CRM_LEAD_DELETE',
      undefined,
      undefined,
      `Deleted lead ID: ${id}`,
    );

    return { success: true, message: `Lead ${id} deleted successfully` };
  }

  /**
   * Create a new CRM Customer
   */
  async createCustomer(dto: CreateCustomerDto, actorUserId: string | null) {
    const customer = await this.prisma.customer.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        status: dto.status || 'ACTIVE',
        lifetimeValue: dto.lifetimeValue || 0.0,
        organizationId: dto.organizationId || null,
        userId: dto.userId || null,
      },
    });

    await this.audit.logAction(
      actorUserId,
      'CRM_CUSTOMER_CREATE',
      undefined,
      undefined,
      `Created customer ID: ${customer.id} with email ${customer.email}`,
    );

    return customer;
  }

  /**
   * Query all Customers with search filters
   */
  async getCustomers(filters: { search?: string }) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Fetch single Customer by ID
   */
  async getCustomerById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Update Customer details
   */
  async updateCustomer(id: string, dto: UpdateCustomerDto, actorUserId: string | null) {
    await this.getCustomerById(id);

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: dto,
    });

    await this.audit.logAction(
      actorUserId,
      'CRM_CUSTOMER_UPDATE',
      undefined,
      undefined,
      `Updated customer ID: ${id}. New status: ${updatedCustomer.status}`,
    );

    return updatedCustomer;
  }

  /**
   * Delete a Customer from registry
   */
  async deleteCustomer(id: string, actorUserId: string | null) {
    await this.getCustomerById(id);

    await this.prisma.customer.delete({
      where: { id },
    });

    await this.audit.logAction(
      actorUserId,
      'CRM_CUSTOMER_DELETE',
      undefined,
      undefined,
      `Deleted customer ID: ${id}`,
    );

    return { success: true, message: `Customer ${id} deleted successfully` };
  }

  /**
   * Fetch CRM Dashboard aggregated statistics
   */
  async getDashboardStats() {
    const totalLeads = await this.prisma.lead.count();
    const totalCustomers = await this.prisma.customer.count();

    // Group leads by status
    const leadGroups = await this.prisma.lead.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const leadsByStatus = leadGroups.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Sum of customer lifetime value
    const aggregateLtv = await this.prisma.customer.aggregate({
      _sum: {
        lifetimeValue: true,
      },
    });

    // Recent leads (limit 5)
    const recentLeads = await this.prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    // Recent customers (limit 5)
    const recentCustomers = await this.prisma.customer.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        lifetimeValue: true,
        createdAt: true,
      },
    });

    return {
      totalLeads,
      totalCustomers,
      totalLifetimeValue: aggregateLtv._sum.lifetimeValue || 0.0,
      leadsByStatus,
      recentLeads,
      recentCustomers,
    };
  }
}
