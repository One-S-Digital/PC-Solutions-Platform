import { Module, MiddlewareConsumer, NestModule, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { BullModule } from '@nestjs/bull';
import { isRedisQueueEnabled, redisQueueStatusReason, sharedRedisOptions } from './common/redis.config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { RoleContextMiddleware } from './auth/middleware/role-context.middleware';
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
import { MockModule } from './mock.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ContentModule } from './content/content.module';
import { UserManagementModule } from './user-management/user-management.module';
import { ContentModerationModule } from './content-moderation/content-moderation.module';
import { SystemMonitoringModule } from './system-monitoring/system-monitoring.module';
import { EmailNotificationModule } from './email-notification/email-notification.module';
import { SubscriptionManagementModule } from './subscription-management/subscription-management.module';
import { SystemConfigurationModule } from './system-configuration/system-configuration.module';
import { HealthModule } from './health/health.module';
import { RoleManagementModule } from './admin/role-management/role-management.module';
import { SyncModule } from './sync/sync.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CompatModule } from './compat/compat.module';
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';
import { ContentManagementModule } from './content-management/content-management.module';
import { PolicyAlertsModule } from './policy-alerts/policy-alerts.module';
import { TranslationErrorsModule } from './translation-errors/translation-errors.module';
import { StaticTranslationModule } from './static-translation/static-translation.module';
import { SupportModule } from './support/support.module';
import { PartnersModule } from './partners/partners.module';
import { OrganizationDocumentsModule } from './organization-documents/organization-documents.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { VendorClientsModule } from './vendor-clients/vendor-clients.module';
import { CrawlerModule } from './crawler/crawler.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { BuildInfoMiddleware } from './common/middleware/build-info.middleware';
import { RenderDebugLoggerMiddleware } from './common/middleware/render-debug-logger.middleware';
import { MaintenanceModeMiddleware } from './common/middleware/maintenance-mode.middleware';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { CategoriesModule } from './categories/categories.module';

import {
  AUTH_REQUESTS_LIMIT,
  AUTH_THROTTLE_KEY,
  AUTH_TTL_SECONDS,
  UPLOAD_REQUESTS_LIMIT,
  UPLOAD_THROTTLE_KEY,
  UPLOAD_TTL_SECONDS,
} from './common/decorators/throttle.decorator';

const bullImports = isRedisQueueEnabled
  ? [
      BullModule.forRoot({
        redis: sharedRedisOptions,
      }),
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ...bullImports,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1, // 1 second
        limit: 30, // 30 requests per second (increased for dev/translation loading)
      },
      {
        name: 'medium',
        ttl: 10, // 10 seconds
        limit: 200, // 200 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60, // 1 minute
        limit: 600, // 600 requests per minute
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
    MockModule,
    AnalyticsModule,
    ContentModule,
    UserManagementModule,
    ContentModerationModule,
    SystemMonitoringModule,
    EmailNotificationModule,
    SubscriptionManagementModule,
    SystemConfigurationModule,
    HealthModule,
    RoleManagementModule,
    SyncModule,
    WebhooksModule,
    CompatModule,
    PlatformSettingsModule,
    ContentManagementModule,
    PolicyAlertsModule,
    TranslationErrorsModule,
    StaticTranslationModule,
    SupportModule,
    PartnersModule,
    OrganizationDocumentsModule,
    PromoCodesModule,
    VendorClientsModule,
    MaintenanceModule,
    CategoriesModule,
    CrawlerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    MaintenanceModeMiddleware,
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    if (isRedisQueueEnabled) {
      this.logger.log(
        `Redis queue enabled (${sharedRedisOptions.host}:${sharedRedisOptions.port})`,
      );
      return;
    }

    this.logger.warn(`Redis queue disabled: ${redisQueueStatusReason}`);
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, BuildInfoMiddleware, RenderDebugLoggerMiddleware, RequestLoggerMiddleware)
      .forRoutes('*');
    
    // Apply RoleContextMiddleware to all routes after auth
    consumer
      .apply(RoleContextMiddleware)
      .exclude(
        'api/auth/signup-data',
        'api/auth/signup-fields/*rest',
        'api/health',
        'api/health/*rest',
        'api/webhooks/*rest',
      )
      .forRoutes('*');

    // Global maintenance mode gate (platform-settings is the source of truth)
    consumer
      .apply(MaintenanceModeMiddleware)
      .forRoutes('*');
  }
}
