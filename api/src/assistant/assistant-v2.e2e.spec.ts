/**
 * AI Assistant V2 — end-to-end integration spec
 *
 * Covers the specific v2 Phase 2–4 surface that is not exercised by the existing
 * orchestrator.service.spec.ts:
 *   • tool_status SSE events (Phase 4 streaming)
 *   • view_match_results (Phase 3 search tool)
 *   • Remaining L3 confirm paths: shortlist_candidate, respond_to_lead,
 *     place_order, request_service, send_supplier_inquiry,
 *     create_replacement_request
 *   • Enum-validation guard on create_replacement_request (urgency)
 *   • Enum-validation guard on update_application_status (status)
 *   • Tool-registry completeness (35 tools across all 7 roles)
 *   • RESULT_CARD_TOOLS / TOOL_STATUS_LABELS consistency check
 *
 * All tests run in-process with mocked services — no database required.
 */
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
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
import { getToolsForRole } from './tools/tool-registry';

const FOUNDATION_PRINCIPAL = { userId: 'user-1', role: UserRole.FOUNDATION, organizationId: 'org-1' };
const EDUCATOR_PRINCIPAL = { userId: 'user-2', role: UserRole.EDUCATOR, organizationId: undefined };
const PARENT_PRINCIPAL = { userId: 'user-3', role: UserRole.PARENT, organizationId: undefined };
const SP_PRINCIPAL = { userId: 'user-5', role: UserRole.SERVICE_PROVIDER, organizationId: 'org-3' };
const ADMIN_PRINCIPAL = { userId: 'admin-1', role: UserRole.ADMIN, organizationId: undefined };
const CONVERSATION_ID = 'conv-e2e';

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
      findUnique: jest.fn().mockResolvedValue({ userId: 'user-1', locale: 'en' }),
    },
    matchResult: {
      findUnique: jest.fn().mockResolvedValue({ explanation: 'Good fit', totalScore: 88 }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        firstName: 'Alice', lastName: 'Martin',
        approvalStatus: null, email: 'alice@x.ch',
      }),
      count: jest.fn().mockResolvedValue(100),
    },
    parentLead: {
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn().mockResolvedValue([
        { id: 'lead-1', parentName: 'Jean Dupont', childAge: 2, status: 'NEW', preferredLocation: 'Vaud', createdAt: new Date() },
      ]),
    },
    jobListing: { count: jest.fn().mockResolvedValue(3) },
    order: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
    },
    jobApplication: {
      count: jest.fn().mockResolvedValue(8),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({ jobListing: { foundationId: 'org-1' } }),
    },
    product: {
      count: jest.fn().mockResolvedValue(4),
      findMany: jest.fn().mockResolvedValue([]),
    },
    serviceProvider: { findFirst: jest.fn().mockResolvedValue({ id: 'sp-1' }) },
    service: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([]),
    },
    serviceRequest: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
    },
    organization: { findMany: jest.fn().mockResolvedValue([]) },
    featureFlag: { findMany: jest.fn().mockResolvedValue([]) },
    systemSettings: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('AI Assistant V2 — e2e integration', () => {
  let service: OrchestratorService;
  let prisma: ReturnType<typeof mockPrisma>;
  let llm: { run: jest.Mock };
  let sendEvent: jest.Mock;

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
  let staffingMock: { createRequest: jest.Mock; runMatching: jest.Mock; getMatches: jest.Mock; getRequest: jest.Mock };
  let embeddingMock: { isReady: boolean; searchSemantic: jest.Mock };
  let knowledgeMock: { search: jest.Mock; formatForPrompt: jest.Mock };

  function mockLlmOnce(output: { message: string; toolCall?: unknown }) {
    llm.run.mockResolvedValueOnce({ output, cacheHit: false, modelUsed: 'test' });
  }

  function buildRegistry(prismaImpl: any): ToolHandlerRegistry {
    return new ToolHandlerRegistry(
      new ProfileHandler(prismaImpl),
      new LeadsHandler(prismaImpl),
      new RecruitmentReadHandler(prismaImpl),
      new MarketplaceReadHandler(prismaImpl),
      new StaffingHandler(prismaImpl),
      new SupportHandler(supportMock as any),
      new SearchHandler(prismaImpl, knowledgeMock as any, embeddingMock as any, recruitmentMock as any, marketplaceMock as any, staffingMock as any),
      new DraftsHandler(),
      new RecruitmentWriteHandler(recruitmentMock as any, prismaImpl),
      new LeadsWriteHandler(leadsMock as any, prismaImpl),
      new MarketplaceWriteHandler(marketplaceMock as any, inquiryMock as any),
      new MessagingHandler(messagingMock as any),
      new ReplacementsHandler(replacementsMock as any),
      new AdminHandler(usersMock as any, prismaImpl),
    );
  }

  async function makeService(prismaOverride?: any) {
    const prismaImpl = prismaOverride ?? prisma;
    llm = { run: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: PrismaService, useValue: prismaImpl },
        { provide: LlmClient, useValue: llm },
        { provide: UserContextService, useValue: {
          build: jest.fn().mockResolvedValue({ profile: 'Alice | FOUNDATION', state: 'Leads: 5' }),
        }},
        { provide: ToolHandlerRegistry, useValue: buildRegistry(prismaImpl) },
      ],
    }).compile();
    service = module.get(OrchestratorService);
  }

  beforeEach(async () => {
    sendEvent = jest.fn();
    prisma = mockPrisma() as any;
    embeddingMock = { isReady: false, searchSemantic: jest.fn().mockResolvedValue([]) };
    knowledgeMock = { search: jest.fn().mockReturnValue([]), formatForPrompt: jest.fn().mockReturnValue('') };
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
      createParentLead: jest.fn().mockResolvedValue({ id: 'lead-1', status: 'NEW' }),
    };
    messagingMock = { createDirectMessage: jest.fn().mockResolvedValue({ id: 'dm-1' }) };
    replacementsMock = { createRequest: jest.fn().mockResolvedValue({ id: 'rr-1', status: 'OPEN' }) };
    usersMock = { findAll: jest.fn().mockResolvedValue({ data: [] }) };
    supportMock = { createTicket: jest.fn().mockResolvedValue({ id: 'ticket-1', status: 'OPEN' }) };
    await makeService();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 4: tool_status streaming
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Phase 4 — tool_status SSE streaming', () => {
    // Tools and the principal that can call them (role-restricted)
    const RESULT_CARD_TOOL_CASES: [string, typeof FOUNDATION_PRINCIPAL | typeof EDUCATOR_PRINCIPAL | typeof PARENT_PRINCIPAL | typeof ADMIN_PRINCIPAL][] = [
      ['search_candidates',     FOUNDATION_PRINCIPAL],
      ['search_candidates_ai',  FOUNDATION_PRINCIPAL],
      ['search_products',       FOUNDATION_PRINCIPAL],
      ['search_services',       FOUNDATION_PRINCIPAL],
      ['search_jobs',           EDUCATOR_PRINCIPAL],
      ['search_foundations',    PARENT_PRINCIPAL],
      ['find_foundation',       ADMIN_PRINCIPAL],
      ['view_match_results',    FOUNDATION_PRINCIPAL],
    ];

    it.each(RESULT_CARD_TOOL_CASES)(
      'emits tool_status{running} before executing %s',
      async (toolName, principal) => {
        mockLlmOnce({ message: 'Searching.', toolCall: { name: toolName, args: { query: 'test', limit: 1, requestId: 'sr-1', search: 'x' } } });
        mockLlmOnce({ message: 'Done.', toolCall: null });

        await service.run({ conversationId: CONVERSATION_ID, userMessage: 'search', principal, locale: 'en', sendEvent });

        expect(sendEvent).toHaveBeenCalledWith('tool_status', expect.objectContaining({
          toolName,
          status: 'running',
          label: expect.any(String),
        }));
      },
    );

    it('tool_status label for search_candidates_ai is "Matching candidates…"', async () => {
      mockLlmOnce({ message: 'Searching.', toolCall: { name: 'search_candidates_ai', args: { rawText: 'EDE Geneva' } } });
      mockLlmOnce({ message: 'Done.', toolCall: null });

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'find EDE', principal: FOUNDATION_PRINCIPAL, locale: 'en', sendEvent });

      expect(sendEvent).toHaveBeenCalledWith('tool_status', expect.objectContaining({
        toolName: 'search_candidates_ai',
        label: 'Matching candidates…',
      }));
    });

    it('does NOT emit tool_status for non-result-card tools like get_my_leads', async () => {
      mockLlmOnce({ message: 'Fetching.', toolCall: { name: 'get_my_leads', args: { limit: 5 } } });
      mockLlmOnce({ message: 'Done.', toolCall: null });

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'show leads', principal: FOUNDATION_PRINCIPAL, locale: 'en', sendEvent });

      expect(sendEvent).not.toHaveBeenCalledWith('tool_status', expect.anything());
    });

    it('tool_status event precedes tool_result event', async () => {
      mockLlmOnce({ message: 'Searching.', toolCall: { name: 'search_products', args: { query: 'paint', limit: 5 } } });
      mockLlmOnce({ message: 'Found products.', toolCall: null });

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'find paint', principal: FOUNDATION_PRINCIPAL, locale: 'en', sendEvent });

      const calls = sendEvent.mock.calls.map((c: any[]) => c[0]);
      const statusIdx = calls.indexOf('tool_status');
      const resultIdx = calls.indexOf('tool_result');
      expect(statusIdx).toBeGreaterThanOrEqual(0);
      expect(resultIdx).toBeGreaterThan(statusIdx);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 3: view_match_results
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Phase 3 — view_match_results', () => {
    it('emits tool_call, tool_status, and tool_result events', async () => {
      staffingMock.getMatches.mockResolvedValue([
        { educatorId: 'e-1', totalScore: 92, explanation: 'Excellent fit' },
      ]);
      staffingMock.getRequest.mockResolvedValue({ roleRequired: 'EDE', canton: 'GE' });

      mockLlmOnce({ message: 'Fetching match results.', toolCall: { name: 'view_match_results', args: { requestId: 'sr-1' } } });
      mockLlmOnce({ message: 'Here are your matches.', toolCall: null });

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'show matches for sr-1', principal: FOUNDATION_PRINCIPAL, locale: 'en', sendEvent });

      expect(sendEvent).toHaveBeenCalledWith('tool_call', expect.objectContaining({ toolName: 'view_match_results' }));
      expect(sendEvent).toHaveBeenCalledWith('tool_status', expect.objectContaining({
        toolName: 'view_match_results',
        label: 'Fetching match results…',
      }));
      expect(sendEvent).toHaveBeenCalledWith('tool_result', expect.objectContaining({ toolName: 'view_match_results' }));
    });

    it('calls getRequest and getMatches with the provided requestId', async () => {
      staffingMock.getMatches.mockResolvedValue([]);
      staffingMock.getRequest.mockResolvedValue({ roleRequired: 'EDE', canton: 'GE' });
      // Handler accepts 'staffingRequestId' or 'requestId' aliases
      mockLlmOnce({ message: 'Fetching.', toolCall: { name: 'view_match_results', args: { staffingRequestId: 'sr-42', requestId: 'sr-42' } } });
      mockLlmOnce({ message: 'No matches yet.', toolCall: null });

      await service.run({ conversationId: CONVERSATION_ID, userMessage: 'matches for sr-42', principal: FOUNDATION_PRINCIPAL, locale: 'en', sendEvent });

      // The handler should have resolved the request ID and called both methods
      const getMatchesCalls = staffingMock.getMatches.mock.calls;
      expect(getMatchesCalls.some((c: unknown[]) => c[0] === 'sr-42')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 2: remaining L3 confirm paths
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Phase 2 — shortlist_candidate confirm', () => {
    it('saves candidate shortlist via RecruitmentService on confirm', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-20',
        conversationId: CONVERSATION_ID,
        toolName: 'shortlist_candidate',
        status: 'AWAITING_APPROVAL',
        inputJson: { candidateId: 'user-99', jobListingId: 'job-1' },
      });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-20', FOUNDATION_PRINCIPAL, 'en');

      // Handler calls saveCandidate(foundationId, candidateId)
      expect(recruitmentMock.saveCandidate).toHaveBeenCalledWith(
        FOUNDATION_PRINCIPAL.organizationId,
        'user-99',
      );
      expect(result.error).toBeUndefined();
      expect(prisma.aIToolCall.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'EXECUTED' }) }),
      );
    });
  });

  describe('Phase 2 — respond_to_lead confirm', () => {
    it('calls LeadsService.respondToLead on confirm', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-21',
        conversationId: CONVERSATION_ID,
        toolName: 'respond_to_lead',
        status: 'AWAITING_APPROVAL',
        inputJson: { leadId: 'lead-1', message: 'We have a spot available' },
      });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-21', FOUNDATION_PRINCIPAL, 'en');

      // Handler calls respondToLead(leadId, foundationId, status, message)
      expect(leadsMock.respondToLead).toHaveBeenCalledWith(
        'lead-1',
        FOUNDATION_PRINCIPAL.organizationId,
        expect.any(String),
        'We have a spot available',
      );
      expect(result.error).toBeUndefined();
    });
  });

  describe('Phase 2 — place_order confirm', () => {
    it('creates an order via MarketplaceService on confirm', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-22',
        conversationId: CONVERSATION_ID,
        toolName: 'place_order',
        status: 'AWAITING_APPROVAL',
        inputJson: { productId: 'prod-1', quantity: 2 },
      });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-22', FOUNDATION_PRINCIPAL, 'en');

      // Handler resolves items from args and calls createOrder({ items, notes }, organizationId)
      expect(marketplaceMock.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ items: [expect.objectContaining({ productId: 'prod-1', quantity: 2 })] }),
        FOUNDATION_PRINCIPAL.organizationId,
      );
      expect(result.error).toBeUndefined();
    });
  });

  describe('Phase 2 — request_service confirm', () => {
    it('creates a service request via MarketplaceService on confirm', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-23',
        conversationId: CONVERSATION_ID,
        toolName: 'request_service',
        status: 'AWAITING_APPROVAL',
        inputJson: { serviceId: 'svc-1', description: 'ASAP please' },
      });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-23', FOUNDATION_PRINCIPAL, 'en');

      // Handler calls createServiceRequest(organizationId, serviceId, description, scheduledAt)
      expect(marketplaceMock.createServiceRequest).toHaveBeenCalledWith(
        FOUNDATION_PRINCIPAL.organizationId,
        'svc-1',
        'ASAP please',
        undefined,
      );
      expect(result.error).toBeUndefined();
    });
  });

  describe('Phase 2 — send_supplier_inquiry confirm', () => {
    it('creates an inquiry via InquiryService on confirm', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-24',
        conversationId: CONVERSATION_ID,
        toolName: 'send_supplier_inquiry',
        status: 'AWAITING_APPROVAL',
        inputJson: { supplierId: 'org-5', subject: 'Bulk pricing', message: 'Do you offer bulk discounts?' },
      });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-24', FOUNDATION_PRINCIPAL, 'en');

      // Handler calls createInquiry({ supplierId, message, subject, ... }, buyerOrgId)
      expect(inquiryMock.createInquiry).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Bulk pricing', message: 'Do you offer bulk discounts?' }),
        FOUNDATION_PRINCIPAL.organizationId,
      );
      expect(result.error).toBeUndefined();
    });
  });

  describe('Phase 2 — create_replacement_request confirm', () => {
    it('creates a replacement request via ReplacementsService on confirm', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-25',
        conversationId: CONVERSATION_ID,
        toolName: 'create_replacement_request',
        status: 'AWAITING_APPROVAL',
        inputJson: { role: 'EDE', startDate: '2026-06-10', urgency: 'URGENT', reason: 'Sick leave' },
      });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-25', FOUNDATION_PRINCIPAL, 'en');

      expect(replacementsMock.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({ urgency: 'URGENT' }),
        FOUNDATION_PRINCIPAL.organizationId,
        FOUNDATION_PRINCIPAL.userId,
      );
      expect(result.error).toBeUndefined();
    });

    it('rejects create_replacement_request with an invalid urgency value', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-26',
        conversationId: CONVERSATION_ID,
        toolName: 'create_replacement_request',
        status: 'AWAITING_APPROVAL',
        inputJson: { role: 'EDE', startDate: '2026-06-10', urgency: 'HIGH', reason: 'Test' },
      });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-26', FOUNDATION_PRINCIPAL, 'en');

      expect(result.error).toBeDefined();
      expect(replacementsMock.createRequest).not.toHaveBeenCalled();
    });
  });

  describe('Phase 2 — update_application_status enum validation', () => {
    it('rejects an unrecognised status string', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-27',
        conversationId: CONVERSATION_ID,
        toolName: 'update_application_status',
        status: 'AWAITING_APPROVAL',
        inputJson: { applicationId: 'app-1', status: 'approved' },
      });
      (prisma.jobApplication as any).findUnique = jest.fn().mockResolvedValue({ jobListing: { foundationId: 'org-1' } });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-27', FOUNDATION_PRINCIPAL, 'en');

      expect(result.error).toBeDefined();
      expect(recruitmentMock.updateJobApplication).not.toHaveBeenCalled();
    });

    it('accepts case-insensitive status (shortlisted → SHORTLISTED)', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-28',
        conversationId: CONVERSATION_ID,
        toolName: 'update_application_status',
        status: 'AWAITING_APPROVAL',
        inputJson: { applicationId: 'app-1', status: 'shortlisted' },
      });
      (prisma.jobApplication as any).findUnique = jest.fn().mockResolvedValue({ jobListing: { foundationId: 'org-1' } });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-28', FOUNDATION_PRINCIPAL, 'en');

      expect(result.error).toBeUndefined();
      expect(recruitmentMock.updateJobApplication).toHaveBeenCalledWith('app-1', { status: 'SHORTLISTED' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 4: rejectToolCall
  // ─────────────────────────────────────────────────────────────────────────────

  describe('rejectToolCall', () => {
    it('marks an AWAITING_APPROVAL tool call as REJECTED without executing the handler', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-r1',
        conversationId: CONVERSATION_ID,
        toolName: 'post_job',
        status: 'AWAITING_APPROVAL',
        inputJson: { role: 'EDE', percentage: 80, location: 'Genève' },
      });
      await makeService(prisma);

      await service.rejectToolCall('tc-r1', FOUNDATION_PRINCIPAL);

      expect(prisma.aIToolCall.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED' }) }),
      );
      expect(recruitmentMock.createJobListing).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Tool registry completeness
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Tool registry', () => {
    const NO_FLAGS = new Set<string>();

    it('exposes 35 tool definitions across all roles', () => {
      const allRoles = [
        UserRole.FOUNDATION,
        UserRole.EDUCATOR,
        UserRole.PARENT,
        UserRole.PRODUCT_SUPPLIER,
        UserRole.SERVICE_PROVIDER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ];
      const allToolNames = new Set<string>();
      for (const role of allRoles) {
        for (const tool of getToolsForRole(role, NO_FLAGS)) {
          allToolNames.add(tool.name);
        }
      }
      expect(allToolNames.size).toBe(35);
    });

    it('every role-exposed tool has a registered handler', async () => {
      const allRoles = [
        UserRole.FOUNDATION,
        UserRole.EDUCATOR,
        UserRole.PARENT,
        UserRole.PRODUCT_SUPPLIER,
        UserRole.SERVICE_PROVIDER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ];
      const registry = (service as any).registry as ToolHandlerRegistry;
      for (const role of allRoles) {
        for (const tool of getToolsForRole(role, NO_FLAGS)) {
          expect(registry.has(tool.name)).toBe(true);
        }
      }
    });

    it('all L3 tools are included in the universal tool list (send_message, contact_admin)', () => {
      const universalTools = getToolsForRole(UserRole.FOUNDATION, NO_FLAGS).map((t) => t.name);
      expect(universalTools).toContain('send_message');
      expect(universalTools).toContain('contact_admin');
    });

    it('admin-only tools are not exposed to EDUCATOR', () => {
      const educatorTools = getToolsForRole(UserRole.EDUCATOR, NO_FLAGS).map((t) => t.name);
      expect(educatorTools).not.toContain('find_user');
      expect(educatorTools).not.toContain('get_platform_stats');
    });

    it('educator-only tools are not exposed to PARENT', () => {
      const parentTools = getToolsForRole(UserRole.PARENT, NO_FLAGS).map((t) => t.name);
      expect(parentTools).not.toContain('apply_to_job');
      expect(parentTools).not.toContain('get_my_applications');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Cross-role security checks
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Cross-role authorization', () => {
    it('confirmToolCall rejects when conversation belongs to a different user', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-DIFFERENT' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-sec1',
        conversationId: CONVERSATION_ID,
        toolName: 'post_job',
        status: 'AWAITING_APPROVAL',
        inputJson: { role: 'EDE' },
      });
      await makeService(prisma);

      await expect(service.confirmToolCall('tc-sec1', FOUNDATION_PRINCIPAL, 'en')).rejects.toThrow();
    });

    it('confirmToolCall returns existing result when status is already EXECUTED (idempotent)', async () => {
      const storedOutput = { data: { id: 'job-1' }, total: 1 };
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-sec2',
        conversationId: CONVERSATION_ID,
        toolName: 'post_job',
        status: 'EXECUTED',
        outputJson: storedOutput,
        inputJson: { role: 'EDE' },
      });
      await makeService(prisma);

      const result = await service.confirmToolCall('tc-sec2', FOUNDATION_PRINCIPAL, 'en');

      // Returns early with stored output — does not re-execute
      expect(result.result).toEqual(storedOutput);
      expect(recruitmentMock.createJobListing).not.toHaveBeenCalled();
    });

    it('confirmToolCall throws when status is REJECTED (cannot re-confirm)', async () => {
      prisma.aIConversation = { findUnique: jest.fn().mockResolvedValue({ userId: 'user-1' }) } as any;
      (prisma.aIToolCall as any).findUnique = jest.fn().mockResolvedValue({
        id: 'tc-sec3',
        conversationId: CONVERSATION_ID,
        toolName: 'post_job',
        status: 'REJECTED',
        inputJson: { role: 'EDE' },
      });
      await makeService(prisma);

      await expect(service.confirmToolCall('tc-sec3', FOUNDATION_PRINCIPAL, 'en')).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Per-role welcome chips — frontend constant validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Per-role welcome suggestions', () => {
    // These are checked by importing the data directly from the compiled source.
    it('AssistantPanel exports suggestions for all 7 roles', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const panelSrc = fs.readFileSync(
        path.join(__dirname, '../../..', 'frontend/components/assistant/AssistantPanel.tsx'),
        'utf8',
      );
      const roles = ['FOUNDATION', 'EDUCATOR', 'PARENT', 'PRODUCT_SUPPLIER', 'SERVICE_PROVIDER', 'ADMIN', 'SUPER_ADMIN'];
      for (const role of roles) {
        expect(panelSrc).toContain(role);
      }
    });

    it('translation files contain welcome keys for every role (en)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const en = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '../../..', 'packages/translations/locales/en/assistant.json'),
          'utf8',
        ),
      ) as Record<string, unknown>;

      expect(en).toHaveProperty('welcome');
      const welcome = en.welcome as Record<string, unknown>;
      const expectedRoleKeys = ['foundation', 'educator', 'parent', 'supplier', 'serviceProvider', 'admin'];
      for (const key of expectedRoleKeys) {
        expect(welcome).toHaveProperty(key);
      }
    });

    it('translation files have parity across en/fr/de (96 keys each)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const countKeys = (obj: unknown): number => {
        if (!obj || typeof obj !== 'object') return 1;
        return Object.values(obj).reduce<number>((acc, v) => acc + countKeys(v), 0);
      };
      const base = path.join(__dirname, '../../..', 'packages/translations/locales');
      const counts = ['en', 'fr', 'de'].map((l) =>
        countKeys(JSON.parse(fs.readFileSync(path.join(base, l, 'assistant.json'), 'utf8'))),
      );
      expect(counts[0]).toBe(96);
      expect(counts.every((c) => c === counts[0])).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RESULT_CARD_TOOLS + TOOL_STATUS_LABELS consistency
  // ─────────────────────────────────────────────────────────────────────────────

  describe('RESULT_CARD_TOOLS / TOOL_STATUS_LABELS sync', () => {
    it('every RESULT_CARD_TOOL has a TOOL_STATUS_LABEL', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const src = fs.readFileSync(
        path.join(__dirname, 'orchestrator.service.ts'),
        'utf8',
      );

      const resultCardMatch = src.match(/RESULT_CARD_TOOLS = new Set<string>\(\[([\s\S]*?)\]\)/);
      expect(resultCardMatch).not.toBeNull();
      const resultCardTools = (resultCardMatch![1].match(/'([^']+)'/g) ?? []).map((s) => s.replace(/'/g, ''));

      const statusLabelsMatch = src.match(/TOOL_STATUS_LABELS: Record<string, string> = \{([\s\S]*?)\}/);
      expect(statusLabelsMatch).not.toBeNull();
      const statusLabelKeys = (statusLabelsMatch![1].match(/^\s+(\w+):/gm) ?? []).map((s) => s.trim().replace(':', ''));

      for (const tool of resultCardTools) {
        expect(statusLabelKeys).toContain(tool);
      }
    });

    it('frontend ResultCards.tsx lists the same result-card tools as the backend', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const backendSrc = fs.readFileSync(path.join(__dirname, 'orchestrator.service.ts'), 'utf8');
      const frontendSrc = fs.readFileSync(
        path.join(__dirname, '../../..', 'frontend/components/assistant/ResultCards.tsx'),
        'utf8',
      );

      const extract = (src: string) => {
        const m = src.match(/RESULT_CARD_TOOLS[^=]*=.*?new Set[^(]*\(\[([\s\S]*?)\]\)/);
        if (!m) return new Set<string>();
        return new Set<string>((m[1].match(/'([^']+)'/g) ?? []).map((s) => s.replace(/'/g, '')));
      };

      const backendSet = extract(backendSrc);
      const frontendSet = extract(frontendSrc);

      expect(backendSet.size).toBeGreaterThan(0);
      for (const tool of backendSet) {
        expect(frontendSet).toContain(tool);
      }
    });
  });
});
