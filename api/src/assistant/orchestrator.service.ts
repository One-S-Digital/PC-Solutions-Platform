import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from '../ai/llm-client';
import { StaffingService } from '../staffing/staffing.service';
import { KnowledgeService } from '../ai/knowledge/knowledge.service';
import { KnowledgeEmbeddingService } from '../ai/knowledge/knowledge-embedding.service';
import { UserContextService } from '../ai/knowledge/user-context.service';
import { getRoleCapabilities } from '../ai/knowledge/role-capabilities';
import { AssistantOrchestratorSchema } from '../ai/agents/assistant-orchestrator/schema';
import { getToolsForRole } from './tools/tool-registry';
import { UserRole, AIMessageSender, AIToolCallStatus, AIActionLevel } from '@prisma/client';

export interface AssistantPrincipalContext {
  userId: string;
  role: UserRole;
  organizationId?: string;
}

interface OrchestratorRunOptions {
  conversationId: string;
  userMessage: string;
  principal: AssistantPrincipalContext;
  locale: 'fr' | 'de' | 'en';
  sendEvent: (type: string, data: unknown) => void;
}

const MAX_TOOL_STEPS = 3;

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
    private readonly staffing: StaffingService,
    private readonly knowledge: KnowledgeService,
    private readonly knowledgeEmbedding: KnowledgeEmbeddingService,
    private readonly userContext: UserContextService,
  ) {}

  async run(options: OrchestratorRunOptions) {
    const { conversationId, userMessage, principal, locale, sendEvent } = options;

    // Build conversation history (last 20 messages)
    const history = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    const conversationHistory = history
      .map((m) => `${m.sender === 'USER' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // Fetch user context and disabled feature flags in parallel
    const [ctx, disabledFlags] = await Promise.all([
      this.userContext.build(principal.userId, principal.role, principal.organizationId),
      this.fetchDisabledFlags(),
    ]);

    const platformContext = getRoleCapabilities(principal.role, disabledFlags);
    const availableTools = getToolsForRole(principal.role, disabledFlags)
      .map((t) => `${t.name}: ${t.description}`)
      .join(', ');

    sendEvent('token', { text: '' });

    // Phase 3: bounded multi-step tool loop
    const accumulatedToolResults: string[] = [];

    for (let step = 0; step < MAX_TOOL_STEPS; step++) {
      const isLastStep = step === MAX_TOOL_STEPS - 1;
      const priorToolResult = accumulatedToolResults.length > 0
        ? accumulatedToolResults.join('\n---\n')
        : undefined;

      const { output } = await this.llm.run({
        agent: 'assistant-orchestrator',
        input: {
          userMessage,
          conversationHistory,
          // On last forced step: suppress tools so the LLM synthesizes an answer
          availableTools: isLastStep ? '' : availableTools,
          locale,
          toolResult: priorToolResult,
          role: principal.role,
          userProfile: ctx.profile,
          platformContext,
          userState: ctx.state,
        },
        schema: AssistantOrchestratorSchema,
        locale,
        principal,
      });

      // No tool call → stream the answer and persist
      if (!output.toolCall) {
        sendEvent('token', { text: output.message });
        await this.prisma.aIMessage.create({
          data: { conversationId, sender: AIMessageSender.ASSISTANT, content: output.message },
        });
        return;
      }

      const { name: toolName, args } = output.toolCall;
      const toolDef = getToolsForRole(principal.role, disabledFlags).find((t) => t.name === toolName);
      if (!toolDef) {
        sendEvent('error', { message: `Unknown tool: ${toolName}` });
        return;
      }

      const level = toolDef.level as AIActionLevel;

      // L3 tools require user approval — stop the loop and show the approval card
      if (level === 'L3_EXECUTE') {
        sendEvent('token', { text: output.message });
        const assistantMsg = await this.prisma.aIMessage.create({
          data: {
            conversationId,
            sender: AIMessageSender.ASSISTANT,
            content: output.message,
            structuredIntent: { toolCall: output.toolCall } as unknown as import('@prisma/client').Prisma.InputJsonValue,
          },
        });
        const toolCall = await this.prisma.aIToolCall.create({
          data: {
            conversationId,
            messageId: assistantMsg.id,
            toolName,
            level,
            inputJson: args as any,
            approvalRequired: true,
            status: AIToolCallStatus.AWAITING_APPROVAL,
          },
        });
        sendEvent('tool_call', {
          toolCallId: toolCall.id,
          toolName,
          level,
          approvalRequired: true,
          args,
          modal: toolDef.modal,
        });
        return;
      }

      // L1/L2: execute silently and accumulate result for next LLM call
      const toolCallRecord = await this.prisma.aIToolCall.create({
        data: {
          conversationId,
          toolName,
          level,
          inputJson: args as any,
          approvalRequired: false,
          status: AIToolCallStatus.PROPOSED,
        },
      });

      let toolResult: unknown;
      let toolError: string | undefined;

      try {
        toolResult = await this.executeTool(toolName, args, principal, locale, disabledFlags);
        await this.prisma.aIToolCall.update({
          where: { id: toolCallRecord.id },
          data: { status: AIToolCallStatus.EXECUTED, outputJson: toolResult as any, executedAt: new Date() },
        });
      } catch (err: any) {
        toolError = err?.message ?? 'Tool execution failed';
        await this.prisma.aIToolCall.update({
          where: { id: toolCallRecord.id },
          data: { status: AIToolCallStatus.FAILED, errorMessage: toolError },
        });
      }

      const resultText = toolError
        ? `Tool "${toolName}" failed: ${toolError}`
        : `Tool "${toolName}" result: ${JSON.stringify(toolResult)}`;

      accumulatedToolResults.push(resultText);
    }

    // Should not reach here — the last iteration forces availableTools:'' so the LLM
    // should return toolCall:null and exit early above. Guard against a non-compliant model.
    this.logger.warn(`Orchestrator reached MAX_TOOL_STEPS (${MAX_TOOL_STEPS}) for conversation ${conversationId}`);
    const fallback = accumulatedToolResults.length > 0
      ? `Based on what I found: ${accumulatedToolResults.join(' ')}`
      : "I wasn't able to complete your request. Please try again.";
    sendEvent('token', { text: fallback });
    await this.prisma.aIMessage.create({
      data: { conversationId, sender: AIMessageSender.ASSISTANT, content: fallback },
    });
  }

  // Returns the set of flag keys that are explicitly disabled.
  // Checks both sources: featureFlag rows (isActive:false) and systemSettings rows
  // with category='FEATURE_FLAGS' and value='false' (v2 rollout flags live there).
  // Convention: absent flag → enabled.
  private async fetchDisabledFlags(): Promise<Set<string>> {
    const [flagRows, settingRows] = await Promise.all([
      this.prisma.featureFlag.findMany({ where: { isActive: false }, select: { key: true } }),
      this.prisma.systemSettings.findMany({ where: { category: 'FEATURE_FLAGS' }, select: { key: true, value: true } }),
    ]);

    const disabled = new Set<string>(flagRows.map((f) => f.key));
    for (const row of settingRows) {
      if (row.value === false || row.value === 'false') {
        disabled.add(row.key);
      }
    }
    return disabled;
  }

  private async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipalContext,
    _locale: 'fr' | 'de' | 'en',
    disabledFlags: Set<string> = new Set(),
  ): Promise<unknown> {
    const limit = Math.min(Number(args.limit) || 5, 10);

    switch (toolName) {
      // ── Universal ────────────────────────────────────────────────────────
      case 'search_help_docs': {
        const query = (args.query as string) || '';
        // Semantic search first (Phase 4); keyword fallback when embeddings not ready
        let articles = await this.knowledgeEmbedding.searchSemantic(query, principal.role, 3, disabledFlags);
        if (articles.length === 0) {
          articles = this.knowledge.search(query, principal.role, 3, disabledFlags);
        }
        return { docs: this.knowledge.formatForPrompt(articles) };
      }

      case 'get_my_profile': {
        const user = await this.prisma.user.findUnique({
          where: { id: principal.userId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            approvalStatus: true,
            isActive: true,
            createdAt: true,
          },
        });
        return user ?? { error: 'Profile not found' };
      }

      case 'navigate_to':
        return { route: args.route, label: args.label };

      case 'open_modal':
        return { modal: args.modal, prefill: args.prefill };

      // ── Foundation ────────────────────────────────────────────────────────
      case 'get_my_leads': {
        const isAdminRole = principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN;
        // Admins without an org get a platform-wide view of recent leads
        const where: any = (!principal.organizationId && isAdminRole)
          ? {}
          : principal.organizationId
            ? { foundationId: principal.organizationId }
            : null;
        if (!where) return { leads: [], total: 0, error: 'No organization context' };
        if (args.status) where.status = args.status;
        const leads = await this.prisma.parentLead.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            parentName: true,
            childAge: true,
            status: true,
            preferredLocation: true,
            createdAt: true,
          },
        });
        return { leads, total: leads.length, scope: !principal.organizationId ? 'platform-wide' : 'organization' };
      }

      case 'get_my_orders': {
        const isAdminRole = principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN;
        const where: any = {};
        if (principal.role === UserRole.PRODUCT_SUPPLIER && principal.organizationId) {
          where.items = { some: { product: { supplierId: principal.organizationId } } };
        } else if (principal.organizationId) {
          where.organizationId = principal.organizationId;
        } else if (!isAdminRole) {
          return { orders: [], total: 0, error: 'No organization context' };
        }
        // Admins with no org: no where filter → platform-wide
        if (args.status) where.status = args.status;
        const orders = await this.prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        });
        return { orders, total: orders.length, scope: !principal.organizationId ? 'platform-wide' : 'organization' };
      }

      case 'search_internal_candidates': {
        const req = await this.staffing.createRequest(
          { rawText: args.rawText as string },
          { userId: principal.userId, role: principal.role, organizationId: principal.organizationId },
        );
        return { staffingRequestId: req.id, status: req.status };
      }

      case 'explain_match': {
        const match = await this.prisma.matchResult.findUnique({
          where: { id: args.matchResultId as string },
          select: { explanation: true, totalScore: true },
        });
        return { explanation: match?.explanation ?? 'No explanation available.' };
      }

      case 'draft_job_post':
        return {
          modal: 'job_post_modal',
          prefill: { role: args.role, canton: args.canton, workPercentage: args.percentage, notes: args.notes },
        };

      case 'draft_parent_reply':
        return {
          modal: 'parent_reply_modal',
          prefill: { leadId: args.leadId, draftMessage: args.context },
        };

      // ── Educator ───────────────────────────────────────────────────────────
      case 'get_my_applications': {
        const where: any = { candidateId: principal.userId };
        if (args.status) where.status = args.status;
        const applications = await this.prisma.jobApplication.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            status: true,
            createdAt: true,
            jobListing: { select: { title: true, location: true, contractType: true } },
          },
        });
        return { applications, total: applications.length };
      }

      // ── Parent ─────────────────────────────────────────────────────────────
      case 'get_my_enquiries': {
        const enquiries = await this.prisma.parentLead.findMany({
          where: { parentUserId: principal.userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            status: true,
            preferredLocation: true,
            createdAt: true,
            foundationId: true,
          },
        });
        return { enquiries, total: enquiries.length };
      }

      // ── Supplier ───────────────────────────────────────────────────────────
      case 'get_my_listings': {
        const isAdminRole = principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN;
        if (principal.role === UserRole.PRODUCT_SUPPLIER) {
          if (!principal.organizationId) return { listings: [], total: 0, error: 'No organization context' };
          const products = await this.prisma.product.findMany({
            where: { supplierId: principal.organizationId },
            take: limit,
            select: { id: true, title: true, price: true, status: true, isActive: true },
          });
          return { listings: products, type: 'products', total: products.length };
        }
        if (principal.role === UserRole.SERVICE_PROVIDER) {
          if (!principal.organizationId) return { listings: [], total: 0, error: 'No organization context' };
          const sp = await this.prisma.serviceProvider.findFirst({
            where: { organizationId: principal.organizationId },
            select: { id: true },
          });
          if (!sp) return { listings: [], type: 'services', total: 0 };
          const services = await this.prisma.service.findMany({
            where: { providerId: sp.id },
            take: limit,
            select: { id: true, title: true, price: true, isActive: true, category: true },
          });
          return { listings: services, type: 'services', total: services.length };
        }
        if (isAdminRole) {
          // Platform-wide view: most recent active products and services
          const [products, services] = await Promise.all([
            this.prisma.product.findMany({
              take: Math.ceil(limit / 2),
              orderBy: { createdAt: 'desc' },
              select: { id: true, title: true, price: true, status: true, isActive: true },
            }),
            this.prisma.service.findMany({
              take: Math.floor(limit / 2),
              orderBy: { createdAt: 'desc' },
              select: { id: true, title: true, price: true, isActive: true, category: true },
            }),
          ]);
          return { listings: [...products, ...services], type: 'all', total: products.length + services.length, scope: 'platform-wide' };
        }
        return { listings: [], total: 0 };
      }

      // ── Service Provider ───────────────────────────────────────────────────
      case 'get_my_service_requests': {
        const isAdminRole = principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN;
        if (isAdminRole && !principal.organizationId) {
          // Platform-wide view of all recent service requests
          const where: any = {};
          if (args.status) where.status = args.status;
          const requests = await this.prisma.serviceRequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
              id: true,
              status: true,
              description: true,
              scheduledAt: true,
              requestedAt: true,
              service: { select: { title: true } },
            },
          });
          return { requests, total: requests.length, scope: 'platform-wide' };
        }
        if (!principal.organizationId) return { requests: [], total: 0, error: 'No organization context' };
        const sp = await this.prisma.serviceProvider.findFirst({
          where: { organizationId: principal.organizationId },
          select: { id: true },
        });
        if (!sp) return { requests: [], total: 0 };
        const where: any = { service: { providerId: sp.id } };
        if (args.status) where.status = args.status;
        const requests = await this.prisma.serviceRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            status: true,
            description: true,
            scheduledAt: true,
            requestedAt: true,
            service: { select: { title: true } },
          },
        });
        return { requests, total: requests.length };
      }

      default:
        throw new Error(`Tool "${toolName}" execution not implemented`);
    }
  }
}
