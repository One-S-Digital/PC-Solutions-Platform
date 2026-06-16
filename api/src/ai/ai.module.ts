import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmClient } from './llm-client';
import { OpenRouterAdapter } from './providers/openrouter.adapter';
import { VoyageAdapter } from './providers/voyage.adapter';
import { AuditLogService } from './audit-log.service';
import { ResultCacheService } from './result-cache.service';
import { SafetyService } from './safety.service';
import { BudgetService } from './budget.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AiQueuesModule } from './queues/ai-exec.queue';
import { AiHealthController } from './ai-health.controller';
import { AiAdminController } from './admin/ai-admin.controller';
import { AiAdminService } from './admin/ai-admin.service';

@Module({
  imports: [PrismaModule, AiQueuesModule],
  controllers: [AiHealthController, AiAdminController],
  providers: [
    LlmClient,
    OpenRouterAdapter,
    VoyageAdapter,
    AuditLogService,
    ResultCacheService,
    SafetyService,
    BudgetService,
    CircuitBreakerService,
    AiAdminService,
  ],
  exports: [LlmClient, AuditLogService],
})
export class AiModule {}
