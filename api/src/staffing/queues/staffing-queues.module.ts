import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { sharedRedisOptions, REDIS_ENABLED } from '../../common/redis.config';

export const STAFFING_PARSE_REQUEST_QUEUE = 'staffing.parse-request';
export const STAFFING_MATCH_QUEUE = 'staffing.match';
export const STAFFING_EXPLAIN_QUEUE = 'staffing.explain';
export const STAFFING_EMBED_PROFILE_QUEUE = 'staffing.embed-profile';
export const STAFFING_EMBED_REQUEST_QUEUE = 'staffing.embed-request';

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
};

@Module({
  imports: [
    ...(REDIS_ENABLED
      ? [
          BullModule.registerQueue(
            { name: STAFFING_PARSE_REQUEST_QUEUE, redis: sharedRedisOptions, defaultJobOptions },
            { name: STAFFING_MATCH_QUEUE, redis: sharedRedisOptions, defaultJobOptions },
            { name: STAFFING_EXPLAIN_QUEUE, redis: sharedRedisOptions, defaultJobOptions },
            { name: STAFFING_EMBED_PROFILE_QUEUE, redis: sharedRedisOptions, defaultJobOptions },
            { name: STAFFING_EMBED_REQUEST_QUEUE, redis: sharedRedisOptions, defaultJobOptions },
          ),
        ]
      : []),
  ],
  exports: [BullModule],
})
export class StaffingQueuesModule {}
