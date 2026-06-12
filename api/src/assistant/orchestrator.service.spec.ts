import { Test } from '@nestjs/testing';
import { UserRole, AIMessageSender } from '@prisma/client';
import { OrchestratorService } from './orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from '../ai/llm-client';
import { UserContextService } from '../ai/knowledge/user-context.service';
import { ToolHandlerRegistry } from './tools/tool-handler.registry';
import { ProfileHandler } from './tools/handlers/profile.handler';
import { LeadsHandler } from './tools/handlers/leads.handler';
import { RecruitmentReadHandler } from './tools/handlers/recruitment.handler';
import { MarketplaceReadHandler } from './tools/handlers/marketplace.handler';
import { StaffingHandler } from './tools/handlers/staffing.handler';
import { SupportHandler } from './tools/handlers/support.handler';
import { SearchHandler } from './tools/handlers/search.handler';
import { DraftsHandler } from './tools/handlers/drafts.handler';
import { RecruitmentWriteHandler } from './tools/handlers/recruitment-write.handler';
import { LeadsWriteHandler } from './tools/handlers/leads-write.handler';
import { MarketplaceWriteHandler } from './tools/handlers/marketplace-write.handler';
import { MessagingHandler } from './tools/handlers/messaging.handler';
import { ReplacementsHandler } from './tools/handlers/replacements.handler';
import { AdminHandler } from './tools/handlers/admin.handler';
import { AdminOpsHandler } from './tools/handlers/admin-ops.handler';

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
      findUnique: jest.fn().mockResolvedValue(null),
    },
    aIConversation: {
      findUnique: jest.fn().mockResolvedValue({ userId: 'user-1', locale: 'fr' }),
    },
    matchResult: {
      findUnique: jest.fn().mockResolvedValue({ explanation: 'Good fit', totalScore: 88 }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ firstName: 'Alice', lastName: 'Martin', approvalStatus: null, email: 'alice@x.ch' }),
      count: jest.fn().mockResolvedValue(42),
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
      // Default: the application belongs to the foundation principal's org (org-1).
      findUnique: jest.fn().mockResolvedValue({ jobListing: { foundationId: 'org-1' } }),
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
    organization: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    featureFlag: {
      // No flags are explicitly disabled → all tools/articles available by default
      findMany: jest.fn().mockResolvedValue([]),
    },
    systemSettings: {
      // No FEATURE_FLAGS settings disabled by default
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let prisma: ReturnType<typeof mockPrisma>;
  let llm: jest.Mocked<Pick<LlmClient, 'run'>>;
  let staffingMock: {
    createRequest: jest.Mock;
    runMatching: jest.Mock;
    getMatches: jest.Mock;
    getRequest: jest.Mock;
  };
  let recruitmentMock: {
    findAllCandidates: jest.Mock;
    findAllJobListings: jest.Mock;
    createJobListing: jest.Mock;
    createJobApplication: jest.Mock;
    saveCandidate: jest.Mock;
    updateJobApplication: jest.Mock;
  };
  let marketplaceMock: {
    findAllProducts: jest.Mock;
    findAllServices: jest.Mock;
    createOrder: jest.Mock;
    createServiceRequest: jest.Mock;
  };
  let inquiryMock: { createInquiry: jest.Mock };
  let leadsMock: { respondToLead: jest.Mock; createParentLead: jest.Mock };
  let messagingMock: { createDirectMessage: jest.Mock };
  let replacementsMock: { createRequest: jest.Mock };
  let usersMock: { findAll: jest.Mock };
  let supportMock: { createTicket: jest.Mock };
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

  function buildRegistry(prismaImpl: any): ToolHandlerRegistry {
    return new ToolHandlerRegistry(
      new ProfileHandler(prismaImpl),
      new LeadsHandler(prismaImpl),
      new RecruitmentReadHandler(prismaImpl),
      new MarketplaceReadHandler(prismaImpl),
      new StaffingHandler(prismaImpl),
      new SupportHandler(supportMock as any),
      new SearchHandler(
        prismaImpl,
        knowledgeMock as any,
        embeddingMock as any,
        recruitmentMock as any,
        marketplaceMock as any,
        staffingMock as any,
      ),
      new DraftsHandler(),
      new RecruitmentWriteHandler(recruitmentMock as any, prismaImpl),
      new LeadsWriteHandler(leadsMock as any, prismaImpl),
      new MarketplaceWriteHandler(marketplaceMock as any, inquiryMock as any),
      new MessagingHandler(messagingMock as any),
      new ReplacementsHandler(replacementsMock as any),
      new AdminHandler(usersMock as any, prismaImpl),
      new AdminOpsHandler(prismaImpl, usersMock as any, {} as any, {} as any),
    );
  }

  async function makeService(prismaOverride?: any) {
    const prismaImpl = prismaOverride ?? prisma;
    const module = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: PrismaService, useValue: prismaImpl },
        { provide: LlmClient, useValue: { run: jest.fn() } },
        { provide: UserContextService, useValue: {
          build: jest.fn().mockResolvedValue({ profile: 'Alice Martin | Role: FOUNDATION', state: 'New parent leads: 3' }),
        }},
        { provide: ToolHandlerRegistry, useValue: buildRegistry(prismaImpl) },
      ],
    }).compile();

    service = module.get(OrchestratorService);
    llm = module.get(LlmClient) as any;
    return module;
  }

  beforeEach(async () => {
    sendEvent = jest.fn();
    prisma = mockPrisma() as any;
    embeddingMock = { isReady: false, searchSemantic: jest.fn().mockResolvedValue([]) };
    knowledgeMock = { search: jest.fn().mockReturnValue([]), formatForPrompt: jest.fn().mockReturnValue('No docs found.') };
    staffingMock = {
      createRequest: jest.fn().mockResolvedValue({ id: 'sr-1', status: 'PARSED' }),
      runMatching: jest.fn().mockResolvedValue(0),
      getMatches: jest.fn().mockResolvedValue([]),
      getRequest: jest.fn().mockResolvedValue({ roleRequired: 'EDE', canton: 'GE' }),
    };
    recruitmentMock = {
      findAllCandidates: jest.fn().mockResolvedValue([]),
      findAllJobListings: jest.fn().mockResolvedValue([]),
      createJobListing: jest.fn().mockResolvedValue({ id: 'job-1', title: 'EDE 80%', status: 'PUBLISHED', location: 'Genève' }),
      createJobApplication: jest.fn().mockResolvedValue({ id: 'app-1', status: 'PENDING' }),
      saveCandidate: jest.fn().mockResolvedValue({ id: 'saved-1' }),
      updateJobApplication: jest.fn().mockResolvedValue({ id: 'app-1', status: 'SHORTLISTED' }),
    };
    marketplaceMock = {
      findAllProducts: jest.fn().mockResolvedValue([]),
      findAllServices: jest.fn().mockResolvedValue([]),
      createOrder: jest.fn().mockResolvedValue({ id: 'order-1', totalAmount: 120, status: 'PENDING' }),
      createServiceRequest: jest.fn().mockResolvedValue({ id: 'sreq-1', status: 'PENDING' }),
    };
    inquiryMock = { createInquiry: jest.fn().mockResolvedValue({ id: 'inq-1' }) };
    leadsMock = {
      respondToLead: jest.fn().mockResolvedValue({ id: 'resp-1' }),
      createParentLead: jest.fn().mockResolvedValue({ id: 'lead-1', status: 'NEW', foundationId: 'org-9' }),
    };
    messagingMock = { createDirectMessage: jest.fn().mockResolvedValue({ id: 'dm-1' }) };
    replacementsMock = { createRequest: jest.fn().mockResolvedValue({ id: 'rr-1', status: 'OPEN' }) };
    usersMock = { findAll: jest.fn().mockResolvedValue({ data: [{ id: 'u-1', profileId: 'p-1', name: 'Bob', email: 'b@x.ch', role: 'EDUCATOR', orgName: null }] }) };
    supportMock = { createTicket: jest.fn().mockResolvedValue({ id: 'ticket-1', status: 'OPEN' }) };
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
      // All loop iterations return a tool call — the forced synthesis must get empty availableTools
      mockLlmSequence(
        { message: 'Step 1', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
        { message: 'Step 2', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
        { message: 'Step 3', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
        { message: 'Step 4', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
        { message: 'Final answer after forced synthesis.', toolCall: null },
      );

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Tell me everything', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });

      const calls = (llm as any).run.mock.calls;
      // The last call must have empty availableTools to force synthesis
      const lastCallInput = calls[calls.length - 1][0].input;
      expect(lastCallInput.availableTools).toBe('');
    });
  });

  // ── L1 search tool: search_candidates_ai (replaces search_internal_candidates) ─

  describe('L1 tool call: search_candidates_ai', () => {
    beforeEach(() => {
      mockLlmSequence(
        { message: 'Searching candidates.', toolCall: { name: 'search_candidates_ai', args: { rawText: 'EDE Geneva 80%' } } },
        { message: 'Voici les candidats trouvés.', toolCall: null },
      );
    });

    it('runs synchronous parse + match via StaffingService', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find me an EDE', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(staffingMock.createRequest).toHaveBeenCalled();
      expect(staffingMock.runMatching).toHaveBeenCalledWith('sr-1');
      expect(staffingMock.getMatches).toHaveBeenCalled();
    });

    it('emits tool_call and tool_result card events', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find me an EDE', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('tool_call', expect.objectContaining({ toolName: 'search_candidates_ai' }));
      expect(sendEvent).toHaveBeenCalledWith('tool_result', expect.objectContaining({ toolName: 'search_candidates_ai' }));
    });

    it('streams a synthesized final answer', async () => {
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find me an EDE', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });
      expect(sendEvent).toHaveBeenCalledWith('token', { text: 'Voici les candidats trouvés.' });
    });
  });

  // ── L3 escalation tool: contact_admin ─────────────────────────────────────

  describe('L3 tool call: contact_admin', () => {
    it('stops and emits an approval card instead of executing immediately', async () => {
      mockLlmSequence({
        message: "I'll file a support ticket for you.",
        toolCall: { name: 'contact_admin', args: { subject: 'Need help', message: 'Cannot find an educator' } },
      });
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'I need to speak to someone', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });

      expect(sendEvent).toHaveBeenCalledWith('tool_call', expect.objectContaining({
        toolName: 'contact_admin',
        approvalRequired: true,
        level: 'L3_EXECUTE',
      }));
      // The ticket must NOT be created until the user confirms
      expect(supportMock.createTicket).not.toHaveBeenCalled();
    });
  });

  // ── confirmToolCall — L3 execution after approval ─────────────────────────

  describe('confirmToolCall', () => {
    it('executes the stored contact_admin tool and marks it EXECUTED', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-1',
        conversationId: CONVERSATION_ID,
        toolName: 'contact_admin',
        status: 'AWAITING_APPROVAL',
        inputJson: { subject: 'Need help', message: 'Cannot find an educator' },
      });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-1', FOUNDATION_PRINCIPAL, 'fr');

      expect(supportMock.createTicket).toHaveBeenCalledWith('user-1', expect.objectContaining({ subject: 'Need help' }));
      expect(result.result).toBeDefined();
      expect(prisma.aIToolCall.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'EXECUTED' }) }),
      );
    });
  });

  // ── Phase 2: L3 write actions ─────────────────────────────────────────────

  describe('L3 write actions', () => {
    it('post_job stops and emits an approval card without executing', async () => {
      mockLlmSequence({
        message: "I'll publish this job posting.",
        toolCall: { name: 'post_job', args: { role: 'EDE', percentage: 80, location: 'Genève' } },
      });
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Post an EDE 80% job in Geneva', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });

      expect(sendEvent).toHaveBeenCalledWith('tool_call', expect.objectContaining({
        toolName: 'post_job',
        approvalRequired: true,
        level: 'L3_EXECUTE',
      }));
      expect(recruitmentMock.createJobListing).not.toHaveBeenCalled();
    });

    it('confirmToolCall executes post_job with the foundation org and marks EXECUTED', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-9',
        conversationId: CONVERSATION_ID,
        toolName: 'post_job',
        status: 'AWAITING_APPROVAL',
        inputJson: { role: 'EDE', percentage: 80, location: 'Genève' },
      });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-9', FOUNDATION_PRINCIPAL, 'fr');

      expect(recruitmentMock.createJobListing).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PUBLISHED' }),
        FOUNDATION_PRINCIPAL.organizationId,
      );
      expect(result.result).toBeDefined();
      expect(prisma.aIToolCall.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'EXECUTED' }) }),
      );
    });

    it('submit_enquiry is rejected when no valid parent email is available', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-3' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-14',
        conversationId: CONVERSATION_ID,
        toolName: 'submit_enquiry',
        status: 'AWAITING_APPROVAL',
        inputJson: { childName: 'Léa', childAge: 2 },
      });
      // Parent profile has no email, and none supplied in args.
      (prisma.user as any).findUnique = jest.fn().mockResolvedValue({ firstName: 'Pat', lastName: 'Doe', email: null });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-14', PARENT_PRINCIPAL, 'fr');

      expect(result.error).toBeDefined();
      expect(leadsMock.createParentLead).not.toHaveBeenCalled();
    });

    it('send_message executes via MessagingService on confirm', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-10',
        conversationId: CONVERSATION_ID,
        toolName: 'send_message',
        status: 'AWAITING_APPROVAL',
        inputJson: { recipientUserId: 'user-77', content: 'Hello there' },
      });
      await makeService(prisma);

      await service.confirmToolCall('tc-10', FOUNDATION_PRINCIPAL, 'fr');

      expect(messagingMock.createDirectMessage).toHaveBeenCalledWith('user-1', 'user-77', 'Hello there');
    });

    it('update_application_status executes when the application belongs to the foundation', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-12',
        conversationId: CONVERSATION_ID,
        toolName: 'update_application_status',
        status: 'AWAITING_APPROVAL',
        inputJson: { applicationId: 'app-1', status: 'shortlisted' },
      });
      (prisma.jobApplication as any).findUnique = jest.fn().mockResolvedValue({ jobListing: { foundationId: 'org-1' } });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-12', FOUNDATION_PRINCIPAL, 'fr');

      expect(recruitmentMock.updateJobApplication).toHaveBeenCalledWith('app-1', { status: 'SHORTLISTED' });
      expect(result.error).toBeUndefined();
    });

    it('update_application_status is rejected when the application belongs to another foundation', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-13',
        conversationId: CONVERSATION_ID,
        toolName: 'update_application_status',
        status: 'AWAITING_APPROVAL',
        inputJson: { applicationId: 'app-9', status: 'HIRED' },
      });
      (prisma.jobApplication as any).findUnique = jest.fn().mockResolvedValue({ jobListing: { foundationId: 'org-OTHER' } });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-13', FOUNDATION_PRINCIPAL, 'fr');

      expect(result.error).toBeDefined();
      expect(recruitmentMock.updateJobApplication).not.toHaveBeenCalled();
    });

    it('apply_to_job uses the educator userId as candidate on confirm', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-2' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-11',
        conversationId: CONVERSATION_ID,
        toolName: 'apply_to_job',
        status: 'AWAITING_APPROVAL',
        inputJson: { jobListingId: 'job-55' },
      });
      await makeService(prisma);

      await service.confirmToolCall('tc-11', EDUCATOR_PRINCIPAL, 'fr');

      expect(recruitmentMock.createJobApplication).toHaveBeenCalledWith(
        expect.objectContaining({ jobListingId: 'job-55' }),
        EDUCATOR_PRINCIPAL.userId,
      );
    });
  });

  // ── Phase 3: admin completeness tools ─────────────────────────────────────

  describe('admin tools', () => {
    const ADMIN_PRINCIPAL = { userId: 'admin-1', role: UserRole.ADMIN, organizationId: undefined };

    it('get_platform_stats aggregates counts', async () => {
      mockLlmSequence(
        { message: 'Fetching stats.', toolCall: { name: 'get_platform_stats', args: {} } },
        { message: 'Here are the platform stats.', toolCall: null },
      );
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'platform stats', principal: ADMIN_PRINCIPAL, locale: 'en', sendEvent });
      expect(prisma.user.count).toHaveBeenCalled();
      expect(prisma.parentLead.count).toHaveBeenCalled();
      expect(prisma.jobApplication.count).toHaveBeenCalled();
    });

    it('find_user queries UsersService.findAll', async () => {
      mockLlmSequence(
        { message: 'Searching users.', toolCall: { name: 'find_user', args: { search: 'bob' } } },
        { message: 'Found 1 user.', toolCall: null },
      );
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'find user bob', principal: ADMIN_PRINCIPAL, locale: 'en', sendEvent });
      expect(usersMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'bob', page: 1 }),
      );
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

    it('search_jobs: queries published job listings', async () => {
      recruitmentMock.findAllJobListings.mockResolvedValue([
        { id: 'job-1', title: 'EDE 80%', foundation: { name: 'Les Petits Pas' }, location: 'Genève', contractType: 'CDI' },
      ]);
      mockLlmSequence(
        { message: 'Searching jobs.', toolCall: { name: 'search_jobs', args: { location: 'Genève' } } },
        { message: 'Found 1 job.', toolCall: null },
      );
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find me a job in Geneva', principal: EDUCATOR_PRINCIPAL, locale: 'fr', sendEvent });
      expect(recruitmentMock.findAllJobListings).toHaveBeenCalledWith(
        expect.objectContaining({ publishedOnly: true }),
      );
      expect(sendEvent).toHaveBeenCalledWith('tool_result', expect.objectContaining({ toolName: 'search_jobs' }));
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

    it('search_foundations: queries FOUNDATION organizations', async () => {
      mockLlmSequence(
        { message: 'Searching foundations.', toolCall: { name: 'search_foundations', args: { canton: 'GE' } } },
        { message: 'Found foundations.', toolCall: null },
      );
      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'Find a crèche in Geneva', principal: PARENT_PRINCIPAL, locale: 'fr', sendEvent });
      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type: 'FOUNDATION' }) }),
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

  // ── Feature flags — systemSettings source ────────────────────────────────

  describe('fetchDisabledFlags — systemSettings integration', () => {
    it('treats v2_staffing_ia=false in systemSettings as disabled, hiding staffing tools from the LLM prompt', async () => {
      // Simulate the seeded default: v2_staffing_ia stored in system_settings with value 'false'
      prisma.systemSettings.findMany.mockResolvedValue([
        { key: 'v2_staffing_ia', value: 'false' },
      ]);

      // LLM responds without calling any tool
      mockLlmSequence({ message: 'Staffing info here.', toolCall: null });

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'find candidates', principal: FOUNDATION_PRINCIPAL, locale: 'fr', sendEvent });

      // The availableTools string passed to the LLM must not list staffing-gated tools
      const firstRunCall = (llm as any).run.mock.calls[0];
      const availableTools: string = firstRunCall[0].input.availableTools;
      expect(availableTools).not.toContain('search_candidates');
      expect(availableTools).not.toContain('draft_job_post');
    });
  });

  // ── MAX_TOOL_STEPS safety net ─────────────────────────────────────────────

  describe('MAX_TOOL_STEPS fallback', () => {
    it('sends a fallback token event if the LLM never returns toolCall:null', async () => {
      // Every loop iteration returns a tool call — LLM non-compliance scenario
      mockLlmSequence(
        { message: 'Step', toolCall: { name: 'search_help_docs', args: { query: 'test' } } },
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
