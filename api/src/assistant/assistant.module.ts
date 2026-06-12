import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { BriefingService } from './briefing.service';
import { OrchestratorService } from './orchestrator.service';
import { KnowledgeService } from '../ai/knowledge/knowledge.service';
import { KnowledgeEmbeddingService } from '../ai/knowledge/knowledge-embedding.service';
import { UserContextService } from '../ai/knowledge/user-context.service';
import { AiModule } from '../ai/ai.module';
import { StaffingModule } from '../staffing/staffing.module';
import { RecruitmentModule } from '../recruitment/recruitment.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { SupportModule } from '../support/support.module';
import { LeadsModule } from '../leads/leads.module';
import { MessagingModule } from '../messaging/messaging.module';
import { ReplacementsModule } from '../replacements/replacements.module';
import { UsersModule } from '../users/users.module';
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
import { RecruitmentWriteHandler } from './tools/handlers/recruitment-write.handler';
import { LeadsWriteHandler } from './tools/handlers/leads-write.handler';
import { MarketplaceWriteHandler } from './tools/handlers/marketplace-write.handler';
import { MessagingHandler } from './tools/handlers/messaging.handler';
import { ReplacementsHandler } from './tools/handlers/replacements.handler';
import { AdminHandler } from './tools/handlers/admin.handler';
import { AdminOpsHandler } from './tools/handlers/admin-ops.handler';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    StaffingModule,
    RecruitmentModule,
    MarketplaceModule,
    SupportModule,
    LeadsModule,
    MessagingModule,
    ReplacementsModule,
    UsersModule,
    AdminModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    BriefingService,
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
    RecruitmentWriteHandler,
    LeadsWriteHandler,
    MarketplaceWriteHandler,
    MessagingHandler,
    ReplacementsHandler,
    AdminHandler,
    AdminOpsHandler,
  ],
  exports: [AssistantService],
})
export class AssistantModule {}
