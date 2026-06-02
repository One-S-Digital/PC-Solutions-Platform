import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService, AssistantPrincipalContext } from './orchestrator.service';
import { UserRole, AIMessageSender } from '@prisma/client';
import { Response } from 'express';

const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: OrchestratorService,
  ) {}

  async createConversation(principal: AssistantPrincipalContext & { locale?: string }) {
    await this.assertAssistantEnabled();
    return this.prisma.aIConversation.create({
      data: {
        userId: principal.userId,
        organizationId: principal.organizationId,
        role: principal.role,
        locale: principal.locale ?? 'fr',
      },
    });
  }

  async getConversation(id: string, principal: AssistantPrincipalContext) {
    const conv = await this.prisma.aIConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== principal.userId && !ADMIN_ROLES.includes(principal.role)) {
      throw new ForbiddenException();
    }
    return conv;
  }

  async streamMessage(
    conversationId: string,
    userMessage: string,
    principal: AssistantPrincipalContext,
    res: Response,
  ) {
    await this.assertAssistantEnabled();

    const conv = await this.prisma.aIConversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== principal.userId && !ADMIN_ROLES.includes(principal.role)) {
      throw new ForbiddenException();
    }

    await this.prisma.aIMessage.create({
      data: { conversationId, sender: AIMessageSender.USER, content: userMessage },
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (type: string, data: unknown) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await this.orchestrator.run({
        conversationId,
        userMessage,
        principal,
        locale: (conv.locale as 'fr' | 'de' | 'en') ?? 'fr',
        sendEvent,
      });
    } catch (err) {
      this.logger.error('Orchestrator error', err);
      sendEvent('error', { message: 'Assistant encountered an error. Please try again.' });
    } finally {
      sendEvent('done', {});
      res.end();
    }
  }

  /** Execute a confirmed L3 tool call and return its structured result. */
  async confirmToolCall(
    conversationId: string,
    toolCallId: string,
    principal: AssistantPrincipalContext,
  ) {
    await this.assertAssistantEnabled();
    const conv = await this.prisma.aIConversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== principal.userId && !ADMIN_ROLES.includes(principal.role)) {
      throw new ForbiddenException();
    }
    return this.orchestrator.confirmToolCall(
      toolCallId,
      principal,
      (conv.locale as 'fr' | 'de' | 'en') ?? 'fr',
    );
  }

  /** Mark a pending L3 tool call as rejected. */
  async rejectToolCall(
    conversationId: string,
    toolCallId: string,
    principal: AssistantPrincipalContext,
  ) {
    const conv = await this.prisma.aIConversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== principal.userId && !ADMIN_ROLES.includes(principal.role)) {
      throw new ForbiddenException();
    }
    return this.orchestrator.rejectToolCall(toolCallId, principal);
  }

  private async assertAssistantEnabled() {
    if (process.env.AI_ASSISTANT_ENABLED === 'true') return;
    const flag = await this.prisma.featureFlag.findFirst({
      where: { key: 'ai_assistant_enabled', isActive: true },
    });
    if (!flag) {
      throw new ForbiddenException('AI Assistant is not yet enabled.');
    }
  }
}
