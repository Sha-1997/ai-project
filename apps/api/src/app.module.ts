import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { SharedModule } from './modules/shared/shared.module';
import { HealthController } from './health/health.controller';
import { AppLoggerModule } from './common/logger/logger.module';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware';
import { ConfigModule } from './config/config.module';
import { EnvironmentModule } from './common/environment/environment.module';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from '@jovianex/cache';

// Domain Modules
import { AuthModule } from './modules/identity/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MembershipModule } from './modules/membership/membership.module';
import { FounderModule } from './modules/founder/founder.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { ReferralModule } from './modules/referral/referral.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { AiJobsModule } from './modules/ai-jobs/ai-jobs.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { CrmModule } from './modules/crm/crm.module';

import { SubscribeModule } from './modules/subscribe/subscribe.module';

@Module({
  imports: [
    ConfigModule,
    EnvironmentModule,
    RedisModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('redis.host') || 'localhost',
        port: configService.get<number>('redis.port') || 6379,
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    SharedModule,
    AppLoggerModule,
    AuthModule,
    UsersModule,
    MembershipModule,
    FounderModule,
    CampaignModule,
    ReferralModule,
    OrdersModule,
    PaymentsModule,
    InvoicesModule,
    AiJobsModule,
    NotificationModule,
    AdminModule,
    AnalyticsModule,
    AiModule,
    CrmModule,
    SubscribeModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
