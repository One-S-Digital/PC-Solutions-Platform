import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService, AssistantPrincipalContext } from './orchestrator.service';
import { UserRole, AIMessageSender } from '@prisma/client';
import { Response } from 'express';

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
    if (
      conv.userId !== principal.userId &&
      !([UserRole.ADMIN, UserRole.SUPER_ADMIN] as UserRole[]).includes(principal.role)
    ) {
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
    if (
      conv.userId !== principal.userId &&
      !([UserRole.ADMIN, UserRole.SUPER_ADMIN] as UserRole[]).includes(principal.role)
    ) {
      throw new ForbiddenException();
    }

    // Persist user message
    await this.prisma.aIMessage.create({
      data: { conversationId, sender: AIMessageSender.USER, content: userMessage },
    });

    // Set SSE headers
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

  private async assertAssistantEnabled() {
    const flag = await this.prisma.featureFlag.findFirst({
      where: { key: 'ai_assistant_enabled', isActive: true },
    });
    if (!flag) {
      throw new ForbiddenException('AI Assistant is not yet enabled.');
    }
  }
}
