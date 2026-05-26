import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { OrchestratorService } from './orchestrator.service';
import { KnowledgeService } from '../ai/knowledge/knowledge.service';
import { UserContextService } from '../ai/knowledge/user-context.service';
import { AiModule } from '../ai/ai.module';
import { StaffingModule } from '../staffing/staffing.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AiModule, StaffingModule],
  controllers: [AssistantController],
  providers: [AssistantService, OrchestratorService, KnowledgeService, UserContextService],
  exports: [AssistantService],
})
export class AssistantModule {}
