import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TranslationQueueProcessor } from './translation-queue.processor';
import { DeepLService } from './deepl.service';
import { TranslationMemoryService } from './translation-memory.service';
import { CostTrackingService } from './cost-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { isRedisQueueEnabled, sharedRedisOptions } from '../common/redis.config';

const translationQueueImports = isRedisQueueEnabled
  ? [
      BullModule.registerQueue({
        name: 'translation',
        redis: sharedRedisOptions,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs for debugging
        },
      }),
    ]
  : [];

const translationQueueProviders = isRedisQueueEnabled ? [TranslationQueueProcessor] : [];
const translationQueueExports = isRedisQueueEnabled ? [BullModule] : [];

@Module({
  imports: [
    ...translationQueueImports,
    PrismaModule,
  ],
  providers: [
    ...translationQueueProviders,
    DeepLService,
    TranslationMemoryService,
    CostTrackingService,
  ],
  exports: [...translationQueueExports, DeepLService, TranslationMemoryService, CostTrackingService],
})
export class TranslationQueueModule {}

