import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { ClerkAuthMiddleware } from './auth/clerk-auth.middleware';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AdminModule } from './admin/admin.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';
import { BillingModule } from './billing/billing.module';
import { TranslationModule } from './translation/translation.module';
import { UploadModule } from './upload/upload.module';
import { SecurityModule } from './security/security.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { ElearningModule } from './elearning/elearning.module';
import { MessagingModule } from './messaging/messaging.module';
import { LeadsModule } from './leads/leads.module';
import { FrontendSettingsModule } from './frontend-settings/frontend-settings.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UserManagementModule } from './user-management/user-management.module';
import { ContentModerationModule } from './content-moderation/content-moderation.module';
import { SystemMonitoringModule } from './system-monitoring/system-monitoring.module';
import { EmailNotificationModule } from './email-notification/email-notification.module';
import { SubscriptionManagementModule } from './subscription-management/subscription-management.module';
import { SystemConfigurationModule } from './system-configuration/system-configuration.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

import {
  AUTH_REQUESTS_LIMIT,
  AUTH_THROTTLE_KEY,
  AUTH_TTL_SECONDS,
  UPLOAD_REQUESTS_LIMIT,
  UPLOAD_THROTTLE_KEY,
  UPLOAD_TTL_SECONDS,
} from './common/decorators/throttle.decorator';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: AUTH_THROTTLE_KEY,
        ttl: AUTH_TTL_SECONDS,
        limit: AUTH_REQUESTS_LIMIT,
      },
      {
        name: UPLOAD_THROTTLE_KEY,
        ttl: UPLOAD_TTL_SECONDS,
        limit: UPLOAD_REQUESTS_LIMIT,
      },
    ]),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    AdminModule,
    DashboardModule,
    SettingsModule,
    BillingModule,
    TranslationModule,
    UploadModule,
    SecurityModule,
    MarketplaceModule,
    RecruitmentModule,
    ElearningModule,
    MessagingModule,
    LeadsModule,
    FrontendSettingsModule,
    AnalyticsModule,
    UserManagementModule,
    ContentModerationModule,
    SystemMonitoringModule,
    EmailNotificationModule,
    SubscriptionManagementModule,
    SystemConfigurationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, RequestLoggerMiddleware)
      .forRoutes('*');
    
    // Apply ClerkAuthMiddleware to all routes except public ones
    consumer
      .apply(ClerkAuthMiddleware)
      .exclude(
        'api/auth/signup-data',
        'api/auth/signup-fields/(.*)',
        'api/health',
        'api/metrics',
        'api/users/sync'
      )
      .forRoutes('*');
  }
}
