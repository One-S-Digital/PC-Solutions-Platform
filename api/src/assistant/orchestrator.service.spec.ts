import { Test } from '@nestjs/testing';
import { UserRole, AIMessageSender } from '@prisma/client';
import { OrchestratorService } from './orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from '../ai/llm-client';
import { StaffingService } from '../staffing/staffing.service';
import { KnowledgeService } from '../ai/knowledge/knowledge.service';
import { KnowledgeEmbeddingService } from '../ai/knowledge/knowledge-embedding.service';
import { UserContextService } from '../ai/knowledge/user-context.service';

const FOUNDATION_PRINCIPAL = { userId: 'user-1', role: UserRole.FOUNDATION, organizationId: 'org-1' };
const EDUCATOR_PRINCIPAL = { userId: 'user-2', role: UserRole.EDUCATOR, organizationId: undefined };
const PARENT_PRINCIPAL = { userId: 'user-3', role: UserRole.PARENT, organizationId: undefined };
const SUPPLIER_PRINCIPAL = { userId: 'user-4', role: UserRole.PRODUCT_SUPPLIER, organizationId: 'org-2' };
const SP_PRINCIPAL = { userId: 'user-5', role: UserRole.SERVICE_PROVIDER, organizationId: 'org-3' };
const CONVERSATION_ID = 'conv-1';

function mockPrisma() {
  return {
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
    user: {
      findUnique: jest.fn().mockResolvedValue({ firstName: 'Alice', lastName: 'Martin', approvalStatus: null }),
    },
    parentLead: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([
        { id: 'lead-1', parentName: 'Jean Dupont', childAge: 2, status: 'NEW', preferredLocation: 'Vaud', createdAt: new Date() },
      ]),
    },
    jobListing: {
      count: jest.fn().mockResolvedValue(2),
    },
    order: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([
        { id: 'order-1', totalAmount: 120, status: 'PENDING', createdAt: new Date() },
      ]),
    },
    jobApplication: {
      count: jest.fn().mockResolvedValue(4),
      findMany: jest.fn().mockResolvedValue([
        { id: 'app-1', status: 'PENDING', createdAt: new Date(), jobListing: { title: 'EDE 80%', location: 'Lausanne', contractType: 'CDI' } },
      ]),
    },
    product: {
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn().mockResolvedValue([
        { id: 'prod-1', title: 'Peinture non-toxique', price: 12.5, status: 'ACTIVE', isActive: true },
      ]),
    },
    serviceProvider: {
      findFirst: jest.fn().mockResolvedValue({ id: 'sp-1' }),
    },
    service: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([]),
    },
    serviceRequest: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([]),
    },
    featureFlag: {
      findMany: jest.fn().mockResolvedValue([
        { key: 'v2_staffing_ia' },
      ]),
    },
  };
}

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let prisma: ReturnType<typeof mockPrisma>;
  let llm: jest.Mocked<Pick<LlmClient, 'run'>>;
  let staffing: jest.Mocked<Pick<StaffingService, 'createRequest'>>;
  let embeddingMock: { isReady: boolean; searchSemantic: jest.Mock };
  let knowledgeMock: { search: jest.Mock; formatForPrompt: jest.Mock };
  let sendEvent: jest.Mock;

  function mockLlmSequence(...outputs: { message: string; toolCall?: any }[]) {
    let call = 0;
    (llm as any).run.mockImplementation(() => {
      const output = outputs[Math.min(call++, outputs.length - 1)];
      return Promise.resolve({ output, cacheHit: false, modelUsed: 'test-model' });
    });
  }

  async function makeService(prismaOverride?: any) {
    const module = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: PrismaService, useValue: prismaOverride ?? prisma },
        { provide: LlmClient, useValue: { run: jest.fn() } },
        { provide: StaffingService, useValue: { createRequest: jest.fn().mockResolvedValue({ id: 'sr-1', status: 'PENDING' }) } },
        { provide: KnowledgeService, useValue: knowledgeMock },
        { provide: KnowledgeEmbeddingService, useValue: embeddingMock },
        { provide: UserContextService, useValue: {
          build: jest.fn().mockResolvedValue({ profile: 'Alice Martin | Role: FOUNDATION', state: 'New parent leads: 3' }),
        }},
      ],
    }).compile();

    service = module.get(OrchestratorService);
    llm = module.get(LlmClient) as any;
    staffing = module.get(StaffingService) as any;
    return module;
  }

  beforeEach(async () => {
    sendEvent = jest.fn();
    prisma = mockPrisma() as any;
    embeddingMock = { isReady: false, searchSemantic: jest.fn().mockResolvedValue([]) };
    knowledgeMock = { search: jest.fn().mockReturnValue([]), formatForPrompt: jest.fn().mockReturnValue('No docs found.') };
    await makeService();
  });

  // ── Plain message (no tool call) ──────────────────────────────────────────

  describe('plain message (no tool call)', () => {
    beforeEach(() => {
      mockLlmSequence({ message: 'Bonjour! Comment puis-je vous aider?', toolCall: null });
    });

    it('emits a token event with the assistant message', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Hello', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('token', { text: 'Bonjour! Comment puis-je vous aider?' });
    });

    it('persists the assistant message', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Hello', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.aIMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sender: AIMessageSender.ASSISTANT, conversationId: CONVERSATION_ID }),
        }),
      );
    });

    it('includes conversation history in the LLM input', async () => {
      prisma.aIMessage.findMany.mockResolvedValue([
        { sender: 'USER', content: 'Hi' },
        { sender: 'ASSISTANT', content: 'Hello' },
      ]);
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Next', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      const input = (llm as any).run.mock.calls[0][0].input;
      expect(input.conversationHistory).toContain('User: Hi');
      expect(input.conversationHistory).toContain('Assistant: Hello');
    });

    it('injects role capabilities and user profile into the LLM input', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Hello', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      const input = (llm as any).run.mock.calls[0][0].input;
      expect(input.platformContext).toBeDefined();
      expect(input.userProfile).toBeDefined();
      expect(input.userState).toBeDefined();
    });
  });

  // ── L1 tool: search_help_docs ─────────────────────────────────────────────

  describe('L1 tool call: search_help_docs', () => {
    beforeEach(() => {
      mockLlmSequence(
        { message: 'Looking it up.', toolCall: { name: 'search_help_docs', args: { query: 'how to add a staff request' } } },
        { message: 'Pour créer une demande de personnel, allez dans Recrutement → Remplacements.', toolCall: null },
      );
    });

    it('does NOT emit a tool_call event (silent execution)', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).not.toHaveBeenCalledWith('tool_call', expect.anything());
    });

    it('makes two LLM calls — intent then synthesis', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect((llm as any).run).toHaveBeenCalledTimes(2);
    });

    it('passes accumulated tool result to synthesis call', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      const secondCallInput = (llm as any).run.mock.calls[1][0].input;
      expect(secondCallInput.toolResult).toBeDefined();
    });

    it('streams the synthesized answer', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('token', {
        text: 'Pour créer une demande de personnel, allez dans Recrutement → Remplacements.',
      });
    });

    it('marks the tool call as EXECUTED', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I add a staff request?', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.aIToolCall.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'EXECUTED' }) }),
      );
    });
  });

  // ── Multi-step tool loop (Phase 3) ────────────────────────────────────────

  describe('multi-step tool loop', () => {
    it('chains two tool calls before synthesizing a final answer', async () => {
      mockLlmSequence(
        { message: 'Fetching your leads.', toolCall: { name: 'get_my_leads', args: { limit: 3 } } },
        { message: 'Now drafting a reply.', toolCall: { name: 'draft_parent_reply', args: { leadId: 'lead-1', context: 'available spot' } } },
        { message: 'Done! Here is the draft.', toolCall: null },
      );

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Show my leads and draft a reply to the first one', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });

      expect((llm as any).run).toHaveBeenCalledTimes(3);
      expect(sendEvent).toHaveBeenCalledWith('token', { text: 'Done! Here is the draft.' });
    });

    it('caps the loop at MAX_TOOL_STEPS by forcing synthesis on the last iteration', async () => {
      // All 4 calls return a tool call — the 4th (forced synthesis) must get empty availableTools
      mockLlmSequence(
        { message: 'Step 1', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
        { message: 'Step 2', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
        { message: 'Step 3', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
        { message: 'Final answer after forced synthesis.', toolCall: null },
      );

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Tell me everything', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });

      const calls = (llm as any).run.mock.calls;
      // The last call must have empty availableTools to force synthesis
      const lastCallInput = calls[calls.length - 1][0].input;
      expect(lastCallInput.availableTools).toBe('');
    });
  });

  // ── L2 tool: search_internal_candidates ───────────────────────────────────

  describe('L2 tool call: search_internal_candidates', () => {
    beforeEach(() => {
      mockLlmSequence(
        { message: 'Searching candidates.', toolCall: { name: 'search_internal_candidates', args: { rawText: 'EDE Geneva 80%' } } },
        { message: 'Une demande a été créée.', toolCall: null },
      );
    });

    it('calls StaffingService.createRequest', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find me an EDE', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(staffing.createRequest).toHaveBeenCalled();
    });

    it('streams a synthesized final answer', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find me an EDE', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('token', { text: 'Une demande a été créée.' });
    });
  });

  // ── Per-role eval: Educator ───────────────────────────────────────────────

  describe('educator role', () => {
    it('get_my_applications: fetches applications for the educator user', async () => {
      mockLlmSequence(
        { message: 'Fetching applications.', toolCall: { name: 'get_my_applications', args: { limit: 5 } } },
        { message: 'You have 1 pending application.', toolCall: null },
      );
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Show my applications', principal: EDUCATOR_PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.jobApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ candidateId: EDUCATOR_PRINCIPAL.userId }) }),
      );
      expect(sendEvent).toHaveBeenCalledWith('token', { text: 'You have 1 pending application.' });
    });

    it('search_help_docs works for educator role', async () => {
      mockLlmSequence(
        { message: 'Looking up.', toolCall: { name: 'search_help_docs', args: { query: 'how to apply for a job' } } },
        { message: 'Go to Job Board to apply.', toolCall: null },
      );
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'How do I apply?', principal: EDUCATOR_PRINCIPAL, locale: 'en', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('token', expect.objectContaining({ text: expect.any(String) }));
    });
  });

  // ── Per-role eval: Parent ─────────────────────────────────────────────────

  describe('parent role', () => {
    it('get_my_enquiries: fetches parent enquiries', async () => {
      mockLlmSequence(
        { message: 'Fetching enquiries.', toolCall: { name: 'get_my_enquiries', args: { limit: 5 } } },
        { message: 'You have submitted 1 enquiry.', toolCall: null },
      );
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Show my enquiries', principal: PARENT_PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.parentLead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ parentUserId: PARENT_PRINCIPAL.userId }) }),
      );
    });
  });

  // ── Per-role eval: Supplier ───────────────────────────────────────────────

  describe('product supplier role', () => {
    it('get_my_listings: fetches supplier products', async () => {
      mockLlmSequence(
        { message: 'Fetching products.', toolCall: { name: 'get_my_listings', args: { limit: 5 } } },
        { message: 'You have 5 products listed.', toolCall: null },
      );
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Show my products', principal: SUPPLIER_PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ supplierId: SUPPLIER_PRINCIPAL.organizationId }) }),
      );
    });

    it('get_my_orders: queries by product supplierId, not organizationId (seller view)', async () => {
      mockLlmSequence(
        { message: 'Fetching orders.', toolCall: { name: 'get_my_orders', args: { limit: 5 } } },
        { message: 'You have 1 pending order.', toolCall: null },
      );
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Show my orders', principal: SUPPLIER_PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            items: { some: { product: { supplierId: SUPPLIER_PRINCIPAL.organizationId } } },
          }),
        }),
      );
      // Must NOT query by organizationId (which is the buyer field)
      const callWhere = prisma.order.findMany.mock.calls[0][0].where;
      expect(callWhere).not.toHaveProperty('organizationId');
    });
  });

  // ── Per-role eval: Service Provider ──────────────────────────────────────

  describe('service provider role', () => {
    it('get_my_service_requests: fetches pending requests for the provider', async () => {
      mockLlmSequence(
        { message: 'Fetching requests.', toolCall: { name: 'get_my_service_requests', args: { status: 'PENDING' } } },
        { message: 'You have pending requests.', toolCall: null },
      );
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Show pending requests', principal: SP_PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.serviceProvider.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: SP_PRINCIPAL.organizationId }) }),
      );
    });
  });

  // ── Unknown tool ──────────────────────────────────────────────────────────

  describe('unknown tool name', () => {
    it('emits an error event', async () => {
      mockLlmSequence({ message: 'Using tool.', toolCall: { name: 'non_existent_tool', args: {} } });
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Do something', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.stringContaining('non_existent_tool') }));
    });
  });

  // ── MAX_TOOL_STEPS safety net ─────────────────────────────────────────────

  describe('MAX_TOOL_STEPS fallback', () => {
    it('sends a fallback token event if the LLM never returns toolCall:null', async () => {
      // All 3 loop iterations return a tool call — LLM non-compliance scenario
      mockLlmSequence(
        { message: 'Step 1', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
        { message: 'Step 2', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
        { message: 'Step 3', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
      );

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Tell me everything', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });

      // A token event must be sent so the client is not left hanging
      expect(sendEvent).toHaveBeenCalledWith('token', expect.objectContaining({ text: expect.any(String) }));
      // The fallback message must be persisted
      expect(prisma.aIMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ sender: AIMessageSender.ASSISTANT }) }),
      );
    });
  });

  // ── Phase 4: semantic search with keyword fallback ─────────────────────────

  describe('search_help_docs — semantic vs keyword fallback', () => {
    it('uses semantic results and skips keyword search when embedding returns matches', async () => {
      const semanticArticle = { id: 'job-board', title: 'Job Board', content: 'Go to Job Board...', category: 'educator', keywords: ['job'] };
      // Make embedding ready and return a result
      embeddingMock.isReady = true;
      embeddingMock.searchSemantic.mockResolvedValue([semanticArticle]);

      mockLlmSequence(
        { message: 'Searching docs.', toolCall: { name: 'search_help_docs', args: { query: 'find a job' } } },
        { message: 'You can find jobs on the Job Board.', toolCall: null },
      );

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'find a job', principal: EDUCATOR_PRINCIPAL, locale: 'en', sendEvent });

      expect(embeddingMock.searchSemantic).toHaveBeenCalledWith('find a job', UserRole.EDUCATOR, 3, expect.any(Set));
      // Keyword search not called because semantic returned results
      expect(knowledgeMock.search).not.toHaveBeenCalled();
    });

    it('falls back to keyword search when semantic is not ready', async () => {
      // embeddingMock.isReady stays false → searchSemantic returns []
      mockLlmSequence(
        { message: 'Searching docs.', toolCall: { name: 'search_help_docs', args: { query: 'how to apply' } } },
        { message: 'Apply via the job board.', toolCall: null },
      );

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'how to apply', principal: EDUCATOR_PRINCIPAL, locale: 'en', sendEvent });

      expect(embeddingMock.searchSemantic).toHaveBeenCalled();
      // Keyword fallback was called because semantic returned []
      expect(knowledgeMock.search).toHaveBeenCalledWith('how to apply', UserRole.EDUCATOR, 3, expect.any(Set));
    });
  });
});
