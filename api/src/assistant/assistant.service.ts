import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService, AssistantPrincipalContext } from './orchestrator.service';
import { UserRole, AIMessageSender } from '@prisma/client';
import { Response } from 'express';

const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

const TITLE_MAX_LENGTH = 60;

/** Derives a conversation title from the first user message (word-boundary truncation). */
function deriveTitleFromMessage(message: string): string {
  const firstLine = message.split('\n')[0].replace(/\s+/g, ' ').trim();
  if (firstLine.length <= TITLE_MAX_LENGTH) return firstLine;
  const cut = firstLine.slice(0, TITLE_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > TITLE_MAX_LENGTH / 2 ? lastSpace : TITLE_MAX_LENGTH).trimEnd()}…`;
}

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
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        toolCalls: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== principal.userId && !ADMIN_ROLES.includes(principal.role)) {
      throw new ForbiddenException();
    }
    return conv;
  }

  /**
   * Sidebar conversation list: the user's own, non-archived conversations that
   * contain at least one message (the panel/workspace create a conversation
   * eagerly on open, so empty shells are hidden rather than listed).
   */
  async listConversations(principal: AssistantPrincipalContext) {
    return this.prisma.aIConversation.findMany({
      where: {
        userId: principal.userId,
        archivedAt: null,
        messages: { some: {} },
      },
      orderBy: { lastActivityAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        kind: true,
        statusLabel: true,
        lastActivityAt: true,
        startedAt: true,
      },
    });
  }

  /** Rename and/or (un)archive a conversation. Owner only (admins included for parity with getConversation). */
  async updateConversation(
    id: string,
    principal: AssistantPrincipalContext,
    patch: { title?: string; archived?: boolean },
  ) {
    const conv = await this.prisma.aIConversation.findUnique({ where: { id } });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== principal.userId && !ADMIN_ROLES.includes(principal.role)) {
      throw new ForbiddenException();
    }

    const title =
      typeof patch.title === 'string' && patch.title.trim()
        ? patch.title.trim().slice(0, 120)
        : undefined;
    const archivedAt =
      patch.archived === true ? new Date() : patch.archived === false ? null : undefined;

    return this.prisma.aIConversation.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(archivedAt !== undefined ? { archivedAt } : {}),
      },
      select: {
        id: true,
        title: true,
        kind: true,
        statusLabel: true,
        archivedAt: true,
        lastActivityAt: true,
        startedAt: true,
      },
    });
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

    // Keep the sidebar list fresh: bump activity, auto-title on first message
    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: {
        lastActivityAt: new Date(),
        ...(conv.title ? {} : { title: deriveTitleFromMessage(userMessage) }),
      },
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
