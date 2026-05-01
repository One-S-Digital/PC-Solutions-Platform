import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TranslationQueueProcessor } from './translation-queue.processor';
import { DeepLService } from './deepl.service';
import { TranslationMemoryService } from './translation-memory.service';
import { CostTrackingService } from './cost-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { sharedRedisOptions, REDIS_ENABLED } from '../common/redis.config';

@Module({
  imports: [
    ...(REDIS_ENABLED
      ? [
          BullModule.registerQueue({
            name: 'translation',
            redis: sharedRedisOptions,
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          }),
        ]
      : []),
    PrismaModule,
  ],
  providers: [
    ...(REDIS_ENABLED ? [TranslationQueueProcessor] : []),
    DeepLService,
    TranslationMemoryService,
    CostTrackingService,
  ],
  exports: [
    ...(REDIS_ENABLED ? [BullModule] : []),
    DeepLService,
    TranslationMemoryService,
    CostTrackingService,
  ],
})
export class TranslationQueueModule {}

