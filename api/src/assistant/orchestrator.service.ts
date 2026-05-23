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

    // No tool call → stream the message and persist
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
    const approvalRequired = level === 'L3_EXECUTE';

    // L3 tools need user approval — show the card and stop here
    if (approvalRequired) {
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

    // L1/L2 tools execute silently — no tool_call event shown to the user
    let toolResult: unknown;
    let toolError: string | undefined;
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

    // Second LLM call: synthesize tool result into a real answer
    const toolContext = toolError
      ? `Tool "${toolName}" failed: ${toolError}`
      : JSON.stringify(toolResult);

    const { output: finalOutput } = await this.llm.run({
      agent: 'assistant-orchestrator',
      input: { userMessage, conversationHistory, availableTools: '', locale, toolResult: toolContext },
      schema: AssistantOrchestratorSchema,
      locale,
      principal,
    });

    sendEvent('token', { text: finalOutput.message });
    await this.prisma.aIMessage.create({
      data: { conversationId, sender: AIMessageSender.ASSISTANT, content: finalOutput.message },
    });
  }

  private async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipalContext,
    _locale: 'fr' | 'de' | 'en',
  ) {
    switch (toolName) {
      case 'search_help_docs': {
        const query = ((args.query as string) || '').toLowerCase();
        if (query.includes('staff request') || query.includes('staffing') || query.includes('replacement') || query.includes('remplacement')) {
          return {
            answer: 'To create a staffing request: go to Recruitment → Replacements in the sidebar, click "New Request", then fill in the role, start/end dates, required languages, qualifications, and canton. The system will automatically match candidates from the pool and notify you.',
            links: ['/staffing/requests/new'],
          };
        }
        if (query.includes('job post') || query.includes('listing') || query.includes('offre')) {
          return {
            answer: 'To post a job: go to Recruitment → Job Listings, click "Create Listing", specify the role, work percentage, location, and requirements. Published listings are visible to educators in the candidate pool.',
            links: ['/recruitment/listings/new'],
          };
        }
        if (query.includes('educator') || query.includes('candidate') || query.includes('éducateur')) {
          return {
            answer: 'To find educators: use Recruitment → Candidate Pool to browse profiles, or create a staffing request to let the matching engine automatically suggest the best candidates.',
            links: ['/recruitment/candidates'],
          };
        }
        if (query.includes('invitation') || query.includes('invite') || query.includes('user')) {
          return {
            answer: 'To invite a user: go to Users in the sidebar, click "Invite User", enter their email and role. They will receive an invitation email with a link to complete their registration.',
            links: ['/users/invite'],
          };
        }
        return {
          answer: 'You can navigate the platform using the sidebar. Recruitment features are under the Recruitment section, user management is under Users, and platform settings are under Platform Ops.',
          links: [],
        };
      }

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
