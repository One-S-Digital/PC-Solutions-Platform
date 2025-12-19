import { Module } from '@nestjs/common';
import { StaticTranslationController } from './static-translation.controller';
import { StaticTranslationPublicController } from './static-translation.public.controller';
import { StaticTranslationService } from './static-translation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import { TranslationQueueModule } from '../translation/translation-queue.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TranslationQueueModule, // For DeepLService, TranslationMemoryService, CostTrackingService
    CacheModule.register({
      ttl: 15 * 60 * 1000, // 15 minutes
      max: 1000, // maximum number of items in cache
    }),
  ],
  controllers: [StaticTranslationController, StaticTranslationPublicController],
  providers: [StaticTranslationService],
  exports: [StaticTranslationService],
})
export class StaticTranslationModule {}

