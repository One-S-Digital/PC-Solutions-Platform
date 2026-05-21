import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { StaffingController } from './staffing.controller';
import { StaffingService } from './staffing.service';
import { HybridMatcherService } from './hybrid-matcher.service';
import { StaffingQueuesModule } from './queues/staffing-queues.module';
import { StaffingParseProcessor } from './workers/staffing-parse.processor';
import { StaffingMatchProcessor } from './workers/staffing-match.processor';
import { StaffingExplainProcessor } from './workers/staffing-explain.processor';
import { StaffingEmbedProfileProcessor, StaffingEmbedRequestProcessor } from './workers/staffing-embed.processor';
import { REDIS_ENABLED } from '../common/redis.config';

@Module({
  imports: [PrismaModule, AuthModule, AiModule, StaffingQueuesModule],
  controllers: [StaffingController],
  providers: [
    StaffingService,
    HybridMatcherService,
    ...(REDIS_ENABLED
      ? [
          StaffingParseProcessor,
          StaffingMatchProcessor,
          StaffingExplainProcessor,
          StaffingEmbedProfileProcessor,
          StaffingEmbedRequestProcessor,
        ]
      : []),
  ],
  exports: [StaffingService],
})
export class StaffingModule {}
