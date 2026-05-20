import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { sharedRedisOptions, REDIS_ENABLED } from '../../common/redis.config';

export const AI_EXEC_QUEUE = 'ai.exec';
export const AI_EMBED_QUEUE = 'ai.embed';
export const AI_GEOCODE_QUEUE = 'ai.geocode';

@Module({
  imports: [
    ...(REDIS_ENABLED
      ? [
          BullModule.registerQueue({
            name: AI_EXEC_QUEUE,
            redis: sharedRedisOptions,
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          }),
          BullModule.registerQueue({
            name: AI_EMBED_QUEUE,
            redis: sharedRedisOptions,
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          }),
          BullModule.registerQueue({
            name: AI_GEOCODE_QUEUE,
            redis: sharedRedisOptions,
            defaultJobOptions: {
              attempts: 5,
              backoff: { type: 'exponential', delay: 5000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          }),
        ]
      : []),
  ],
  exports: [BullModule],
})
export class AiQueuesModule {}
