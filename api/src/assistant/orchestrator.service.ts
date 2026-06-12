import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from '../ai/llm-client';
import { SafetyService } from '../ai/safety.service';
import { UserContextService } from '../ai/knowledge/user-context.service';
import { getRoleCapabilities } from '../ai/knowledge/role-capabilities';
import { AssistantOrchestratorSchema } from '../ai/agents/assistant-orchestrator/schema';
import { getToolsForRole } from './tools/tool-registry';
import { ToolHandlerRegistry } from './tools/tool-handler.registry';
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

const MAX_TOOL_STEPS = 5;

// Tools whose structured results the frontend renders as rich cards. For these
// we emit tool_call + tool_result SSE events (in addition to feeding the result
// back to the LLM so it can narrate a summary).
// KEEP IN SYNC with RESULT_CARD_TOOLS in frontend/components/assistant/ResultCards.tsx
// (which decides rendering) and TOOL_STATUS_LABELS below (running-status copy).
const RESULT_CARD_TOOLS = new Set<string>([
  'search_candidates',
  'search_candidates_ai',
  'search_products',
  'search_services',
  'search_jobs',
  'search_foundations',
  'find_foundation',
  'view_match_results',
  'get_pending_educator_approvals',
]);

// Human-readable status shown while an L1 result-card tool is running, so the UI
// can display "Searching candidates…" instead of a bare spinner (Phase 4).
const TOOL_STATUS_LABELS: Record<string, string> = {
  search_candidates: 'Searching candidates…',
  search_candidates_ai: 'Matching candidates…',
  search_products: 'Searching products…',
  search_services: 'Searching services…',
  search_jobs: 'Searching jobs…',
  search_foundations: 'Searching foundations…',
  find_foundation: 'Looking up the foundation…',
  view_match_results: 'Fetching match results…',
  get_pending_educator_approvals: 'Fetching pending educator approvals…',
};

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
    private readonly safety: SafetyService,
    private readonly userContext: UserContextService,
    private readonly registry: ToolHandlerRegistry,
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
        if (output.nextSteps?.length) {
          sendEvent('next_steps', { nextSteps: output.nextSteps });
        }
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

      // L1/L2: execute and accumulate result for the next LLM call.
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

      // For result-card tools, surface the card placeholder before executing.
      const emitCard = RESULT_CARD_TOOLS.has(toolName);
      if (emitCard) {
        sendEvent('tool_call', {
          toolCallId: toolCallRecord.id,
          toolName,
          level,
          approvalRequired: false,
          args,
        });
        // Streaming execution status so the UI shows a meaningful label while the
        // tool runs (Phase 4 reliability).
        sendEvent('tool_status', {
          toolCallId: toolCallRecord.id,
          toolName,
          status: 'running',
          label: TOOL_STATUS_LABELS[toolName] ?? 'Working…',
        });
      }

      let toolResult: unknown;
      let toolError: string | undefined;

      try {
        toolResult = await this.registry.execute(toolName, args, principal, locale, disabledFlags);
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

      if (emitCard) {
        sendEvent('tool_result', {
          toolCallId: toolCallRecord.id,
          toolName,
          result: toolError ? undefined : (toolResult as Record<string, unknown>),
          error: toolError,
        });
      }

      // Strip contact PII (email, phone, address) before the result is fed back
      // into the LLM prompt. The raw result is already emitted to the frontend
      // via the tool_result SSE event above, so UI rendering is unaffected.
      const llmSafeResult = toolResult != null ? this.safety.scrubForLlm(toolResult as unknown) : toolResult;
      const resultText = toolError
        ? `Tool "${toolName}" failed: ${toolError}`
        : `Tool "${toolName}" result: ${JSON.stringify(llmSafeResult)}`;

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

  /**
   * Execute a previously-proposed L3 tool after the user confirms it. Verifies
   * ownership and that the tool is still permitted for the user's role, runs the
   * handler, and records the outcome. Returns the structured result for the UI.
   */
  async confirmToolCall(
    toolCallId: string,
    principal: AssistantPrincipalContext,
    locale: 'fr' | 'de' | 'en',
    overrideArgs?: Record<string, unknown>,
  ): Promise<{ toolCallId: string; toolName: string; result?: unknown; error?: string }> {
    const record = await this.prisma.aIToolCall.findUnique({ where: { id: toolCallId } });
    if (!record) throw new NotFoundException('Tool call not found');

    await this.assertConversationAccess(record.conversationId, principal);

    if (record.status === AIToolCallStatus.EXECUTED) {
      return { toolCallId, toolName: record.toolName, result: record.outputJson };
    }
    if (record.status !== AIToolCallStatus.AWAITING_APPROVAL && record.status !== AIToolCallStatus.APPROVED) {
      throw new ForbiddenException(`Tool call cannot be confirmed from status ${record.status}`);
    }

    const disabledFlags = await this.fetchDisabledFlags();
    const toolDef = getToolsForRole(principal.role, disabledFlags).find((t) => t.name === record.toolName);
    if (!toolDef) throw new ForbiddenException('Tool no longer available for this role');

    // overrideArgs (e.g. an edited draft text) take precedence over stored args
    const storedArgs = (record.inputJson as Record<string, unknown>) ?? {};
    const args = overrideArgs ? { ...storedArgs, ...overrideArgs } : storedArgs;

    try {
      const result = await this.registry.execute(record.toolName, args, principal, locale, disabledFlags);
      await this.prisma.aIToolCall.update({
        where: { id: toolCallId },
        data: { status: AIToolCallStatus.EXECUTED, outputJson: result as any, executedAt: new Date() },
      });
      return { toolCallId, toolName: record.toolName, result };
    } catch (err: any) {
      const message = err?.message ?? 'Tool execution failed';
      await this.prisma.aIToolCall.update({
        where: { id: toolCallId },
        data: { status: AIToolCallStatus.FAILED, errorMessage: message },
      });
      return { toolCallId, toolName: record.toolName, error: message };
    }
  }

  /** Mark a pending L3 tool call as rejected (user cancelled). */
  async rejectToolCall(toolCallId: string, principal: AssistantPrincipalContext): Promise<{ toolCallId: string }> {
    const record = await this.prisma.aIToolCall.findUnique({ where: { id: toolCallId } });
    if (!record) throw new NotFoundException('Tool call not found');
    await this.assertConversationAccess(record.conversationId, principal);
    if (record.status === AIToolCallStatus.AWAITING_APPROVAL || record.status === AIToolCallStatus.APPROVED) {
      await this.prisma.aIToolCall.update({
        where: { id: toolCallId },
        data: { status: AIToolCallStatus.REJECTED },
      });
    }
    return { toolCallId };
  }

  private async assertConversationAccess(conversationId: string, principal: AssistantPrincipalContext) {
    const conv = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    const isAdmin = principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN;
    if (conv.userId !== principal.userId && !isAdmin) {
      throw new ForbiddenException();
    }
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
}
