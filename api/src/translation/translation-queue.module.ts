import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TranslationQueueProcessor } from './translation-queue.processor';
import { DeepLService } from './deepl.service';
import { TranslationMemoryService } from './translation-memory.service';
import { CostTrackingService } from './cost-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'translation',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        retryStrategy(times: number) {
          if (times > 3) {
            return null;
          }
          return Math.min(times * 500, 2000);
        },
        enableReadyCheck: false,
      },
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

