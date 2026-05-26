import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, AIMessageSender } from '@prisma/client';
import { AssistantService } from './assistant.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from './orchestrator.service';
import { Response } from 'express';

const SUPER_ADMIN = { userId: 'user-1', role: UserRole.SUPER_ADMIN, organizationId: undefined };
const FOUNDATION = { userId: 'user-2', role: UserRole.FOUNDATION, organizationId: 'org-1' };
const EDUCATOR = { userId: 'user-3', role: UserRole.EDUCATOR, organizationId: undefined };
const PARENT = { userId: 'user-4', role: UserRole.PARENT, organizationId: undefined };
const SUPPLIER = { userId: 'user-5', role: UserRole.PRODUCT_SUPPLIER, organizationId: 'org-2' };
const SERVICE_PROVIDER = { userId: 'user-6', role: UserRole.SERVICE_PROVIDER, organizationId: 'org-3' };
const OTHER_USER = { userId: 'user-99', role: UserRole.FOUNDATION, organizationId: 'org-1' };

function makeConversation(overrides: any = {}) {
  return {
    id: 'conv-1',
    userId: FOUNDATION.userId,
    organizationId: 'org-1',
    role: UserRole.FOUNDATION,
    locale: 'fr',
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
    ...overrides,
  };
}

function makeRes(): jest.Mocked<Response> {
  return {
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  } as any;
}

describe('AssistantService', () => {
  let service: AssistantService;
  let prisma: any;
  let orchestrator: jest.Mocked<OrchestratorService>;

  const originalEnv = process.env.AI_ASSISTANT_ENABLED;

  beforeEach(async () => {
    process.env.AI_ASSISTANT_ENABLED = 'true';

    const module = await Test.createTestingModule({
      providers: [
        AssistantService,
        {
          provide: PrismaService,
          useValue: {
            featureFlag: { findFirst: jest.fn().mockResolvedValue(null) },
            aIConversation: {
              create: jest.fn().mockResolvedValue(makeConversation()),
              findUnique: jest.fn().mockResolvedValue(makeConversation()),
            },
            aIMessage: {
              create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
            },
          },
        },
        {
          provide: OrchestratorService,
          useValue: { run: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(AssistantService);
    prisma = module.get(PrismaService);
    orchestrator = module.get(OrchestratorService) as any;
  });

  afterEach(() => {
    process.env.AI_ASSISTANT_ENABLED = originalEnv;
  });

  // ── Feature gate ──────────────────────────────────────────────────────────

  describe('feature gate', () => {
    it('allows createConversation when AI_ASSISTANT_ENABLED=true', async () => {
      await expect(service.createConversation({ ...FOUNDATION, locale: 'fr' })).resolves.toBeDefined();
    });

    it('throws ForbiddenException when flag is missing and env not set', async () => {
      delete process.env.AI_ASSISTANT_ENABLED;
      prisma.featureFlag.findFirst.mockResolvedValue(null);
      await expect(service.createConversation({ ...FOUNDATION, locale: 'fr' })).rejects.toThrow(ForbiddenException);
    });

    it('allows access when DB flag is active', async () => {
      delete process.env.AI_ASSISTANT_ENABLED;
      prisma.featureFlag.findFirst.mockResolvedValue({ key: 'ai_assistant_enabled', isActive: true });
      await expect(service.createConversation({ ...FOUNDATION, locale: 'fr' })).resolves.toBeDefined();
    });
  });

  // ── createConversation — all roles ────────────────────────────────────────

  describe('createConversation()', () => {
    it.each([
      ['FOUNDATION', FOUNDATION],
      ['EDUCATOR', EDUCATOR],
      ['PARENT', PARENT],
      ['PRODUCT_SUPPLIER', SUPPLIER],
      ['SERVICE_PROVIDER', SERVICE_PROVIDER],
      ['SUPER_ADMIN', SUPER_ADMIN],
    ])('%s can create a conversation', async (_label, principal) => {
      await expect(service.createConversation({ ...principal, locale: 'fr' })).resolves.toBeDefined();
    });

    it('stores the userId and locale', async () => {
      await service.createConversation({ ...FOUNDATION, locale: 'de' });
      expect(prisma.aIConversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: FOUNDATION.userId, locale: 'de' }),
      });
    });

    it('defaults locale to fr', async () => {
      await service.createConversation(FOUNDATION);
      expect(prisma.aIConversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ locale: 'fr' }),
      });
    });
  });

  // ── getConversation ───────────────────────────────────────────────────────

  describe('getConversation()', () => {
    it('returns the conversation for its owner', async () => {
      const result = await service.getConversation('conv-1', FOUNDATION);
      expect(result.id).toBe('conv-1');
    });

    it('allows SUPER_ADMIN to view any conversation', async () => {
      await expect(service.getConversation('conv-1', SUPER_ADMIN)).resolves.toBeDefined();
    });

    it('throws ForbiddenException when non-owner tries to read', async () => {
      await expect(service.getConversation('conv-1', OTHER_USER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for missing conversation', async () => {
      prisma.aIConversation.findUnique.mockResolvedValue(null);
      await expect(service.getConversation('missing', FOUNDATION)).rejects.toThrow(NotFoundException);
    });

    it('allows an EDUCATOR to read their own conversation', async () => {
      prisma.aIConversation.findUnique.mockResolvedValue(makeConversation({ userId: EDUCATOR.userId, role: UserRole.EDUCATOR }));
      await expect(service.getConversation('conv-1', EDUCATOR)).resolves.toBeDefined();
    });
  });

  // ── streamMessage ─────────────────────────────────────────────────────────

  describe('streamMessage()', () => {
    let res: jest.Mocked<Response>;

    beforeEach(() => { res = makeRes(); });

    it('sets SSE headers before streaming', async () => {
      await service.streamMessage('conv-1', 'Hi', FOUNDATION, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.flushHeaders).toHaveBeenCalled();
    });

    it('persists the user message before calling the orchestrator', async () => {
      await service.streamMessage('conv-1', 'Hello', FOUNDATION, res);
      expect(prisma.aIMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sender: AIMessageSender.USER, content: 'Hello' }),
        }),
      );
    });

    it('calls the orchestrator with conversation context', async () => {
      await service.streamMessage('conv-1', 'Hello', FOUNDATION, res);
      expect(orchestrator.run).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'conv-1', userMessage: 'Hello' }),
      );
    });

    it('sends a done event and ends the response on success', async () => {
      await service.streamMessage('conv-1', 'Hello', FOUNDATION, res);
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: done'));
      expect(res.end).toHaveBeenCalled();
    });

    it('sends an error SSE event when orchestrator fails (does not throw)', async () => {
      orchestrator.run.mockRejectedValue(new Error('LLM failure'));
      await service.streamMessage('conv-1', 'Hello', FOUNDATION, res);
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('event: error'));
      expect(res.end).toHaveBeenCalled();
    });

    it('throws ForbiddenException when a non-owner non-admin sends a message', async () => {
      await expect(service.streamMessage('conv-1', 'Hello', OTHER_USER, res)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when conversation is missing', async () => {
      prisma.aIConversation.findUnique.mockResolvedValue(null);
      await expect(service.streamMessage('missing', 'Hello', FOUNDATION, res)).rejects.toThrow(NotFoundException);
    });

    it.each([
      ['EDUCATOR', EDUCATOR],
      ['PARENT', PARENT],
      ['PRODUCT_SUPPLIER', SUPPLIER],
      ['SERVICE_PROVIDER', SERVICE_PROVIDER],
    ])('%s can stream a message in their own conversation', async (_label, principal) => {
      prisma.aIConversation.findUnique.mockResolvedValue(
        makeConversation({ userId: principal.userId, role: principal.role }),
      );
      await service.streamMessage('conv-1', 'Hello', principal, res);
      expect(orchestrator.run).toHaveBeenCalled();
    });
  });
});
