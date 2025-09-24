import { Module } from '@nestjs/common';
import { SubscriptionManagementController } from './subscription-management.controller';
import { SubscriptionManagementService } from './subscription-management.service';
import { PricingService } from './pricing.service';
import { FeatureFlagService } from './feature-flag.service';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmailNotificationModule } from '../email-notification/email-notification.module';

@Module({
  imports: [PrismaModule, EmailNotificationModule, AuthModule],
  controllers: [SubscriptionManagementController],
  providers: [
    SubscriptionManagementService,
    PricingService,
    FeatureFlagService,
    BillingService,
  ],
  exports: [
    SubscriptionManagementService,
    PricingService,
    FeatureFlagService,
    BillingService,
  ],
})
export class SubscriptionManagementModule {}