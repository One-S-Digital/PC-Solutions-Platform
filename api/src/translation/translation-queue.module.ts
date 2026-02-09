import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TranslationQueueProcessor } from './translation-queue.processor';
import { DeepLService } from './deepl.service';
import { TranslationMemoryService } from './translation-memory.service';
import { CostTrackingService } from './cost-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { sharedRedisOptions } from '../common/redis.config';

@Module({
  imports: [
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
    PrismaModule,
  ],
  providers: [
    TranslationQueueProcessor,
    DeepLService,
    TranslationMemoryService,
    CostTrackingService,
  ],
  exports: [BullModule, DeepLService, TranslationMemoryService, CostTrackingService],
})
export class TranslationQueueModule {}

