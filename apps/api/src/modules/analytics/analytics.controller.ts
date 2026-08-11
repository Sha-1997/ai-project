import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { EventsService } from '../events/events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EcosystemEvent } from '../../common/types/event.types';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly eventsService: EventsService,
  ) {}

  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingestEvent(@Body() event: EcosystemEvent) {
    return this.eventsService.publish(event);
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  async getSummary() {
    return this.analyticsService.getSummaryMetrics();
  }

  @Get('funnel')
  @HttpCode(HttpStatus.OK)
  async getFunnel() {
    return this.analyticsService.getFunnelMetrics();
  }

  @Get('exports')
  @HttpCode(HttpStatus.OK)
  async exportReport() {
    return this.analyticsService.exportStructuredReport();
  }
}
