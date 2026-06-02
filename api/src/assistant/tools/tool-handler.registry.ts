import { Injectable, Logger } from '@nestjs/common';
import {
  AssistantPrincipal,
  ToolHandler,
  ToolResult,
} from './tool-handler.interface';
import { ProfileHandler } from './handlers/profile.handler';
import { LeadsHandler } from './handlers/leads.handler';
import { RecruitmentReadHandler } from './handlers/recruitment.handler';
import { MarketplaceReadHandler } from './handlers/marketplace.handler';
import { StaffingHandler } from './handlers/staffing.handler';
import { SupportHandler } from './handlers/support.handler';
import { SearchHandler } from './handlers/search.handler';
import { DraftsHandler } from './handlers/drafts.handler';

/**
 * Routes a tool name to its domain handler. Replaces the monolithic switch in
 * the orchestrator — adding a tool means adding a handler and registering it
 * in the constructor below.
 */
@Injectable()
export class ToolHandlerRegistry {
  private readonly logger = new Logger(ToolHandlerRegistry.name);
  private readonly handlers = new Map<string, ToolHandler>();

  constructor(
    profile: ProfileHandler,
    leads: LeadsHandler,
    recruitment: RecruitmentReadHandler,
    marketplace: MarketplaceReadHandler,
    staffing: StaffingHandler,
    support: SupportHandler,
    search: SearchHandler,
    drafts: DraftsHandler,
  ) {
    for (const handler of [profile, leads, recruitment, marketplace, staffing, support, search, drafts]) {
      this.register(handler);
    }
  }

  private register(handler: ToolHandler): void {
    for (const name of handler.toolNames) {
      if (this.handlers.has(name)) {
        this.logger.warn(`Tool "${name}" registered more than once — overwriting`);
      }
      this.handlers.set(name, handler);
    }
  }

  has(toolName: string): boolean {
    return this.handlers.has(toolName);
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
    locale: 'fr' | 'de' | 'en',
    disabledFlags: Set<string>,
  ): Promise<ToolResult> {
    const handler = this.handlers.get(toolName);
    if (!handler) {
      throw new Error(`No handler registered for tool "${toolName}"`);
    }
    return handler.execute(toolName, args, principal, locale, disabledFlags);
  }
}
