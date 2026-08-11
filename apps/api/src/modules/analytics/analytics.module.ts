import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { EventsService } from '../events/events.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, EventsService],
  exports: [AnalyticsService, EventsService],
})
export class AnalyticsModule {}
