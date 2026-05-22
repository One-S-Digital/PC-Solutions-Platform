import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from '../ai/llm-client';
import { StaffingService } from '../staffing/staffing.service';
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

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
    private readonly staffing: StaffingService,
  ) {}

  async run(options: OrchestratorRunOptions) {
    const { conversationId, userMessage, principal, locale, sendEvent } = options;

    // Build conversation history
    const history = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    const conversationHistory = history
      .map((m) => `${m.sender === 'USER' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const availableTools = getToolsForRole(principal.role)
      .map((t) => `${t.name}: ${t.description}`)
      .join(', ');

    // Signal start
    sendEvent('token', { text: '' });

    const { output } = await this.llm.run({
      agent: 'assistant-orchestrator',
      input: { userMessage, conversationHistory, availableTools, locale },
      schema: AssistantOrchestratorSchema,
      locale,
      principal,
    });

    // Stream the assistant message text
    sendEvent('token', { text: output.message });

    // Persist assistant message
    const assistantMsg = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        sender: AIMessageSender.ASSISTANT,
        content: output.message,
        structuredIntent: output.toolCall ? { toolCall: output.toolCall } : undefined,
      },
    });

    // Handle tool call if present
    if (output.toolCall) {
      const { name: toolName, args } = output.toolCall;
      const toolDef = getToolsForRole(principal.role).find((t) => t.name === toolName);
      if (!toolDef) {
        sendEvent('error', { message: `Unknown tool: ${toolName}` });
        return;
      }

      const level = toolDef.level as AIActionLevel;
      const approvalRequired = level === 'L3_EXECUTE';

      const toolCall = await this.prisma.aIToolCall.create({
        data: {
          conversationId,
          messageId: assistantMsg.id,
          toolName,
          level,
          inputJson: args as any,
          approvalRequired,
          status: approvalRequired ? AIToolCallStatus.AWAITING_APPROVAL : AIToolCallStatus.PROPOSED,
        },
      });

      sendEvent('tool_call', {
        toolCallId: toolCall.id,
        toolName,
        level,
        approvalRequired,
        args,
        modal: toolDef.modal,
      });

      // For L1/L2 tools, execute immediately after proposing
      if (!approvalRequired) {
        try {
          const result = await this.executeTool(toolName, args, principal, locale);
          await this.prisma.aIToolCall.update({
            where: { id: toolCall.id },
            data: {
              status: AIToolCallStatus.EXECUTED,
              outputJson: result as any,
              executedAt: new Date(),
            },
          });
          sendEvent('tool_result', { toolCallId: toolCall.id, toolName, result });
        } catch (err: any) {
          await this.prisma.aIToolCall.update({
            where: { id: toolCall.id },
            data: { status: AIToolCallStatus.FAILED, errorMessage: err?.message },
          });
          sendEvent('tool_result', { toolCallId: toolCall.id, toolName, error: err?.message });
        }
      }
    }
  }

  private async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipalContext,
    _locale: 'fr' | 'de' | 'en',
  ) {
    switch (toolName) {
      case 'search_help_docs':
        return { answer: 'Please refer to the platform documentation.', links: [] };

      case 'open_modal':
        return { modal: args.modal, prefill: args.prefill };

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
          prefill: {
            role: args.role,
            canton: args.canton,
            workPercentage: args.percentage,
            notes: args.notes,
          },
        };

      case 'draft_parent_reply':
        return {
          modal: 'parent_reply_modal',
          prefill: {
            leadId: args.leadId,
            draftMessage: `Re your enquiry: ${args.context}`,
          },
        };

      default:
        throw new Error(`Tool "${toolName}" execution not implemented`);
    }
  }
}
