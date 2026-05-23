import { Test } from '@nestjs/testing';
import { UserRole, AIMessageSender } from '@prisma/client';
import { OrchestratorService } from './orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from '../ai/llm-client';
import { StaffingService } from '../staffing/staffing.service';

const PRINCIPAL = { userId: 'user-1', role: UserRole.FOUNDATION, organizationId: 'org-1' };
const CONVERSATION_ID = 'conv-1';

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let prisma: any;
  let llm: jest.Mocked<Pick<LlmClient, 'run'>>;
  let staffing: jest.Mocked<Pick<StaffingService, 'createRequest'>>;
  let sendEvent: jest.Mock;

  function mockLlmSequence(...outputs: { message: string; toolCall?: any }[]) {
    let call = 0;
    (llm as any).run.mockImplementation(() => {
      const output = outputs[Math.min(call++, outputs.length - 1)];
      return Promise.resolve({ output, cacheHit: false, modelUsed: 'test-model' });
    });
  }

  beforeEach(async () => {
    sendEvent = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        {
          provide: PrismaService,
          useValue: {
            aIMessage: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
            },
            aIToolCall: {
              create: jest.fn().mockResolvedValue({ id: 'tc-1' }),
              update: jest.fn().mockResolvedValue({}),
            },
            matchResult: {
              findUnique: jest.fn().mockResolvedValue({ explanation: 'Good fit', totalScore: 88 }),
            },
          },
        },
        {
          provide: LlmClient,
          useValue: { run: jest.fn() },
        },
        {
          provide: StaffingService,
          useValue: { createRequest: jest.fn().mockResolvedValue({ id: 'sr-1', status: 'PENDING' }) },
        },
      ],
    }).compile();

    service = module.get(OrchestratorService);
    prisma = module.get(PrismaService);
    llm = module.get(LlmClient) as any;
    staffing = module.get(StaffingService) as any;
  });

  // ── Basic message round-trip ──────────────────────────────────────────────

  describe('plain message (no tool call)', () => {
    beforeEach(() => {
      mockLlmSequence({ message: 'Bonjour! Comment puis-je vous aider?', toolCall: null });
    });

    it('emits a token event with the assistant message text', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Hello', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('token', { text: 'Bonjour! Comment puis-je vous aider?' });
    });

    it('persists the assistant message to the database', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Hello', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.aIMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sender: AIMessageSender.ASSISTANT, conversationId: CONVERSATION_ID }),
        }),
      );
    });

    it('passes conversation history to the LLM', async () => {
      prisma.aIMessage.findMany.mockResolvedValue([
        { sender: 'USER', content: 'Hi' },
        { sender: 'ASSISTANT', content: 'Hello' },
      ]);
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Next question', principal: PRINCIPAL, locale: 'fr', sendEvent });
      const input = (llm as any).run.mock.calls[0][0].input;
      expect(input.conversationHistory).toContain('User: Hi');
      expect(input.conversationHistory).toContain('Assistant: Hello');
    });
  });

  // ── L1/L2 tool calls (silent execution + synthesis) ──────────────────────

  describe('L1 tool call: search_help_docs (silent execution)', () => {
    beforeEach(() => {
      mockLlmSequence(
        // First call: intent detection
        { message: 'Let me look that up.', toolCall: { name: 'search_help_docs', args: { query: 'how to add a staff request' } } },
        // Second call: synthesis
        { message: 'Pour créer une demande de personnel, allez dans Recrutement → Remplacements.', toolCall: null },
      );
    });

    it('does NOT emit a tool_call event (background execution)', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).not.toHaveBeenCalledWith('tool_call', expect.anything());
    });

    it('does NOT emit a tool_result event (background execution)', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).not.toHaveBeenCalledWith('tool_result', expect.anything());
    });

    it('calls the LLM twice — once for intent, once for synthesis', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect((llm as any).run).toHaveBeenCalledTimes(2);
    });

    it('passes toolResult to the synthesis LLM call', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: PRINCIPAL, locale: 'fr', sendEvent });
      const secondCallInput = (llm as any).run.mock.calls[1][0].input;
      expect(secondCallInput.toolResult).toBeDefined();
    });

    it('streams the synthesized answer from the second LLM call', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('token', {
        text: 'Pour créer une demande de personnel, allez dans Recrutement → Remplacements.',
      });
    });

    it('marks the tool call as EXECUTED in the database', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.aIToolCall.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'EXECUTED' }) }),
      );
    });
  });

  // ── L2 tool: search_internal_candidates ───────────────────────────────────

  describe('L2 tool call: search_internal_candidates (silent execution)', () => {
    beforeEach(() => {
      mockLlmSequence(
        { message: 'Searching candidates.', toolCall: { name: 'search_internal_candidates', args: { rawText: 'EDE Geneva 80%' } } },
        { message: 'Une demande de personnel a été créée.', toolCall: null },
      );
    });

    it('calls StaffingService.createRequest', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find me an EDE', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(staffing.createRequest).toHaveBeenCalled();
    });

    it('does not emit a tool_call event', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find me an EDE', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).not.toHaveBeenCalledWith('tool_call', expect.anything());
    });

    it('streams a synthesized final answer', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find me an EDE', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('token', { text: 'Une demande de personnel a été créée.' });
    });
  });

  // ── Unknown tool ──────────────────────────────────────────────────────────

  describe('unknown tool name', () => {
    it('emits an error event without throwing', async () => {
      mockLlmSequence({
        message: 'Using tool.',
        toolCall: { name: 'non_existent_tool', args: {} },
      });

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Do something', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.stringContaining('non_existent_tool') }));
    });
  });

  // ── explain_match tool ────────────────────────────────────────────────────

  describe('explain_match tool execution (silent)', () => {
    beforeEach(() => {
      mockLlmSequence(
        { message: 'Fetching explanation.', toolCall: { name: 'explain_match', args: { matchResultId: 'mr-123' } } },
        { message: "Ce candidat est un excellent match car il parle français.", toolCall: null },
      );
    });

    it('fetches match explanation from DB', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Explain this match', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.matchResult.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'mr-123' } }),
      );
    });

    it('streams the synthesized answer (not a raw tool result event)', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Explain this match', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).not.toHaveBeenCalledWith('tool_result', expect.anything());
      expect(sendEvent).toHaveBeenCalledWith('token', expect.objectContaining({ text: expect.any(String) }));
    });
  });
});
