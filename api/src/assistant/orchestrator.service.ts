import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from '../ai/llm-client';
import { StaffingService } from '../staffing/staffing.service';
import { KnowledgeService } from '../ai/knowledge/knowledge.service';
import { UserContextService } from '../ai/knowledge/user-context.service';
import { ROLE_CAPABILITIES } from '../ai/knowledge/role-capabilities';
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

    // Fetch role capabilities and live user context (Phase 1)
    const [ctx] = await Promise.all([
      this.userContext.build(principal.userId, principal.role, principal.organizationId),
    ]);

    const platformContext = ROLE_CAPABILITIES[principal.role] ?? '';
    const availableTools = getToolsForRole(principal.role)
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
      const toolDef = getToolsForRole(principal.role).find((t) => t.name === toolName);
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
        toolResult = await this.executeTool(toolName, args, principal, locale);
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

    // Reached MAX_TOOL_STEPS without a clean answer — this shouldn't happen because
    // the last iteration forces availableTools:'' which results in toolCall:null,
    // but guard anyway.
    this.logger.warn(`Orchestrator reached MAX_TOOL_STEPS (${MAX_TOOL_STEPS}) for conversation ${conversationId}`);
  }

  private async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipalContext,
    _locale: 'fr' | 'de' | 'en',
  ): Promise<unknown> {
    const limit = Math.min(Number(args.limit) || 5, 10);

    switch (toolName) {
      // ── Universal ────────────────────────────────────────────────────────
      case 'search_help_docs': {
        const articles = this.knowledge.search(
          (args.query as string) || '',
          principal.role,
        );
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
        const where: any = { foundationId: principal.organizationId };
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
        return { leads, total: leads.length };
      }

      case 'get_my_orders': {
        const where: any = { organizationId: principal.organizationId };
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
        return { orders, total: orders.length };
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
        if (principal.role === UserRole.PRODUCT_SUPPLIER || principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN) {
          const products = await this.prisma.product.findMany({
            where: { supplierId: principal.organizationId },
            take: limit,
            select: { id: true, title: true, price: true, status: true, isActive: true },
          });
          return { listings: products, type: 'products', total: products.length };
        }
        if (principal.role === UserRole.SERVICE_PROVIDER) {
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
        return { listings: [], total: 0 };
      }

      // ── Service Provider ───────────────────────────────────────────────────
      case 'get_my_service_requests': {
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
