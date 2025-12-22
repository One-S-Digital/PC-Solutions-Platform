import { Module, DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TranslationQueueProcessor } from './translation-queue.processor';
import { DeepLService } from './deepl.service';
import { TranslationMemoryService } from './translation-memory.service';
import { CostTrackingService } from './cost-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';

function isRedisEnabled(): boolean {
  // In production (Render), we disable Redis/Bull unless explicitly configured.
  // In non-production, default to localhost for developer convenience.
  if (process.env.NODE_ENV !== 'production') return true;
  return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
}

function getBullRedisConfig():
  | string
  | {
      host: string;
      port: number;
      password?: string;
    } {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  };
}

@Module({})
export class TranslationQueueModule {
  static register(): DynamicModule {
    const redisEnabled = isRedisEnabled();

    // Always provide these services so TranslationService can fall back to inline translation.
    const base = {
      module: TranslationQueueModule,
      imports: [PrismaModule],
      providers: [DeepLService, TranslationMemoryService, CostTrackingService],
      exports: [DeepLService, TranslationMemoryService, CostTrackingService],
    } as DynamicModule;

    if (!redisEnabled) {
      return base;
    }

    return {
      ...base,
      imports: [
        ...(base.imports || []),
        BullModule.registerQueue({
          name: 'translation',
          redis: getBullRedisConfig(),
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
      ],
      providers: [...(base.providers || []), TranslationQueueProcessor],
      exports: [...(base.exports || []), BullModule],
    };
  }
}

