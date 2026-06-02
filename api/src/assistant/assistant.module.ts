import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { OrchestratorService } from './orchestrator.service';
import { KnowledgeService } from '../ai/knowledge/knowledge.service';
import { KnowledgeEmbeddingService } from '../ai/knowledge/knowledge-embedding.service';
import { UserContextService } from '../ai/knowledge/user-context.service';
import { AiModule } from '../ai/ai.module';
import { StaffingModule } from '../staffing/staffing.module';
import { RecruitmentModule } from '../recruitment/recruitment.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { SupportModule } from '../support/support.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ToolHandlerRegistry } from './tools/tool-handler.registry';
import { ProfileHandler } from './tools/handlers/profile.handler';
import { LeadsHandler } from './tools/handlers/leads.handler';
import { RecruitmentReadHandler } from './tools/handlers/recruitment.handler';
import { MarketplaceReadHandler } from './tools/handlers/marketplace.handler';
import { StaffingHandler } from './tools/handlers/staffing.handler';
import { SupportHandler } from './tools/handlers/support.handler';
import { SearchHandler } from './tools/handlers/search.handler';
import { DraftsHandler } from './tools/handlers/drafts.handler';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    StaffingModule,
    RecruitmentModule,
    MarketplaceModule,
    SupportModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    OrchestratorService,
    KnowledgeService,
    KnowledgeEmbeddingService,
    UserContextService,
    // Tool handler layer
    ToolHandlerRegistry,
    ProfileHandler,
    LeadsHandler,
    RecruitmentReadHandler,
    MarketplaceReadHandler,
    StaffingHandler,
    SupportHandler,
    SearchHandler,
    DraftsHandler,
  ],
  exports: [AssistantService],
})
export class AssistantModule {}
