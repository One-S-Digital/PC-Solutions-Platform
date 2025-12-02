import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { FoundationAnalyticsController } from './foundation-analytics.controller';
import { FoundationAnalyticsService } from './foundation-analytics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AnalyticsController, FoundationAnalyticsController],
  providers: [AnalyticsService, FoundationAnalyticsService],
  exports: [AnalyticsService, FoundationAnalyticsService],
})
export class AnalyticsModule {}
