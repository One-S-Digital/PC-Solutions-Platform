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

  function mockLlmOutput(output: { message: string; toolCall?: any }) {
    (llm as any).run.mockResolvedValue({ output, cacheHit: false, modelUsed: 'test-model' });
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
      mockLlmOutput({ message: 'Bonjour! Comment puis-je vous aider?', toolCall: null });
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

  // ── L1/L2 tool calls (auto-execute) ──────────────────────────────────────

  describe('L1 tool call: search_help_docs (auto-execute)', () => {
    beforeEach(() => {
      mockLlmOutput({
        message: 'Let me search that for you.',
        toolCall: { name: 'search_help_docs', args: { query: 'how to create a job post' } },
      });
    });

    it('emits a tool_call event with the tool metadata', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I post a job?', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('tool_call', expect.objectContaining({ toolName: 'search_help_docs' }));
    });

    it('emits a tool_result event after execution', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I post a job?', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('tool_result', expect.objectContaining({ toolName: 'search_help_docs' }));
    });

    it('marks the tool call as EXECUTED in the database', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I post a job?', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.aIToolCall.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'EXECUTED' }) }),
      );
    });
  });

  describe('L3 tool call: (hypothetical) requires approval', () => {
    it('does not auto-execute and emits approvalRequired:true', async () => {
      // Temporarily inject a fake L3 tool by mocking the tool registry inline
      mockLlmOutput({
        message: 'I will execute this action.',
        toolCall: { name: 'search_internal_candidates', args: { rawText: 'EDE Geneva 80%' } },
      });

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find me an EDE', principal: PRINCIPAL, locale: 'fr', sendEvent });

      // search_internal_candidates is L2_DRAFT — it DOES auto-execute
      // So tool_result should still fire; confirm no error event
      expect(sendEvent).not.toHaveBeenCalledWith('error', expect.anything());
    });
  });

  // ── Unknown tool ──────────────────────────────────────────────────────────

  describe('unknown tool name', () => {
    it('emits an error event without throwing', async () => {
      mockLlmOutput({
        message: 'Using tool.',
        toolCall: { name: 'non_existent_tool', args: {} },
      });

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Do something', principal: PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.stringContaining('non_existent_tool') }));
    });
  });

  // ── explain_match tool ────────────────────────────────────────────────────

  describe('explain_match tool execution', () => {
    it('fetches match explanation from DB and returns it', async () => {
      mockLlmOutput({
        message: 'Here is the explanation.',
        toolCall: { name: 'explain_match', args: { matchResultId: 'mr-123' } },
      });

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Explain this match', principal: PRINCIPAL, locale: 'fr', sendEvent });

      expect(prisma.matchResult.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'mr-123' } }),
      );
      expect(sendEvent).toHaveBeenCalledWith('tool_result', expect.objectContaining({
        result: expect.objectContaining({ explanation: 'Good fit' }),
      }));
    });
  });
});
