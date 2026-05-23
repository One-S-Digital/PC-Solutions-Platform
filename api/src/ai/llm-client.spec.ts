import { Test } from '@nestjs/testing';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { LlmClient, LlmRunOptions } from './llm-client';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterAdapter } from './providers/openrouter.adapter';
import { VoyageAdapter } from './providers/voyage.adapter';
import { AuditLogService } from './audit-log.service';
import { ResultCacheService } from './result-cache.service';
import { SafetyService } from './safety.service';
import { BudgetService } from './budget.service';
import { CircuitBreakerService } from './circuit-breaker.service';

const TestSchema = z.object({ message: z.string(), code: z.number().optional() });
type TestOutput = z.infer<typeof TestSchema>;

const PRINCIPAL = { userId: 'user-1', role: UserRole.ADMIN, organizationId: 'org-1' };

function makeOptions(overrides: Partial<LlmRunOptions<TestOutput>> = {}): LlmRunOptions<TestOutput> {
  return {
    agent: 'echo-validate',
    input: { message: 'hello' },
    schema: TestSchema,
    principal: PRINCIPAL,
    ...overrides,
  };
}

describe('LlmClient', () => {
  let client: LlmClient;
  let openrouter: jest.Mocked<OpenRouterAdapter>;
  let resultCache: jest.Mocked<ResultCacheService>;
  let circuitBreaker: jest.Mocked<CircuitBreakerService>;
  let prisma: any;
  let safety: jest.Mocked<SafetyService>;
  let budget: jest.Mocked<BudgetService>;
  let auditLog: jest.Mocked<AuditLogService>;

  const originalEnv = process.env.AI_ASSISTANT_ENABLED;

  beforeEach(async () => {
    process.env.AI_ASSISTANT_ENABLED = 'true';

    const module = await Test.createTestingModule({
      providers: [
        LlmClient,
        {
          provide: PrismaService,
          useValue: {
            featureFlag: { findFirst: jest.fn().mockResolvedValue(null) },
            aiAgentConfig: { findFirst: jest.fn().mockResolvedValue(null) },
          },
        },
        {
          provide: OpenRouterAdapter,
          useValue: {
            run: jest.fn().mockResolvedValue({
              content: JSON.stringify({ echo: 'hello' }),
              modelUsed: 'google/gemini-2.5-flash',
              fallbackUsed: false,
              inputTokens: 10,
              outputTokens: 5,
            }),
          },
        },
        { provide: VoyageAdapter, useValue: { embed: jest.fn() } },
        { provide: AuditLogService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: ResultCacheService,
          useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: SafetyService,
          useValue: {
            assertNoSensitiveFields: jest.fn(),
            assertCandidateConsent: jest.fn(),
          },
        },
        {
          provide: BudgetService,
          useValue: { checkAndEnforce: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: CircuitBreakerService,
          useValue: {
            isOpen: jest.fn().mockReturnValue(false),
            recordSuccess: jest.fn(),
            recordFailure: jest.fn(),
          },
        },
      ],
    }).compile();

    client = module.get(LlmClient);
    openrouter = module.get(OpenRouterAdapter) as any;
    resultCache = module.get(ResultCacheService) as any;
    circuitBreaker = module.get(CircuitBreakerService) as any;
    prisma = module.get(PrismaService);
    safety = module.get(SafetyService) as any;
    budget = module.get(BudgetService) as any;
    auditLog = module.get(AuditLogService) as any;
  });

  afterEach(() => {
    process.env.AI_ASSISTANT_ENABLED = originalEnv;
  });

  // ── Feature flag bypass ────────────────────────────────────────────────────

  describe('feature flag gate', () => {
    it('skips DB flag check when AI_ASSISTANT_ENABLED=true', async () => {
      process.env.AI_ASSISTANT_ENABLED = 'true';
      openrouter.run.mockResolvedValue({
        content: JSON.stringify({ echo: 'hi', model: 'test' }),
        modelUsed: 'google/gemini-2.5-flash',
        fallbackUsed: false,
        inputTokens: 1,
        outputTokens: 1,
      });
      await client.run(makeOptions({ agent: 'echo-validate', schema: z.object({ echo: z.string(), model: z.string().optional() }) as any }));
      expect(prisma.featureFlag.findFirst).not.toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException when flag is missing and env is not set', async () => {
      delete process.env.AI_ASSISTANT_ENABLED;
      prisma.featureFlag.findFirst.mockResolvedValue(null);
      await expect(client.run(makeOptions())).rejects.toThrow(ServiceUnavailableException);
    });

    it('proceeds when flag is active in DB (env not set)', async () => {
      delete process.env.AI_ASSISTANT_ENABLED;
      prisma.featureFlag.findFirst.mockResolvedValue({ id: 'f1', key: 'ai_foundation_enabled', isActive: true });
      openrouter.run.mockResolvedValue({
        content: JSON.stringify({ echo: 'hi', model: 'test' }),
        modelUsed: 'google/gemini-2.5-flash',
        fallbackUsed: false,
        inputTokens: 1,
        outputTokens: 1,
      });
      const schema = z.object({ echo: z.string(), model: z.string().optional() });
      await expect(client.run(makeOptions({ agent: 'echo-validate', schema: schema as any }))).resolves.toBeDefined();
    });
  });

  // ── Permission check ───────────────────────────────────────────────────────

  describe('permission check', () => {
    it('throws ForbiddenException when principal role is not allowed for the agent', async () => {
      await expect(
        client.run(makeOptions({ principal: { userId: 'u1', role: UserRole.PARENT } })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('passes for an allowed role', async () => {
      openrouter.run.mockResolvedValue({
        content: JSON.stringify({ echo: 'hi', model: 'x' }),
        modelUsed: 'google/gemini-2.5-flash',
        fallbackUsed: false,
        inputTokens: 1,
        outputTokens: 1,
      });
      const schema = z.object({ echo: z.string(), model: z.string().optional() });
      await expect(
        client.run(makeOptions({ agent: 'echo-validate', principal: { userId: 'u1', role: UserRole.SUPER_ADMIN }, schema: schema as any })),
      ).resolves.toBeDefined();
    });
  });

  // ── Circuit breaker ────────────────────────────────────────────────────────

  describe('circuit breaker', () => {
    it('throws ServiceUnavailableException when circuit is open', async () => {
      circuitBreaker.isOpen.mockReturnValue(true);
      await expect(client.run(makeOptions())).rejects.toThrow(ServiceUnavailableException);
    });

    it('records success on a clean LLM call', async () => {
      openrouter.run.mockResolvedValue({
        content: JSON.stringify({ echo: 'hi', model: 'x' }),
        modelUsed: 'google/gemini-2.5-flash',
        fallbackUsed: false,
        inputTokens: 1,
        outputTokens: 1,
      });
      const schema = z.object({ echo: z.string(), model: z.string().optional() });
      await client.run(makeOptions({ agent: 'echo-validate', schema: schema as any }));
      expect(circuitBreaker.recordSuccess).toHaveBeenCalled();
    });

    it('records failure when OpenRouter throws', async () => {
      openrouter.run.mockRejectedValue(new Error('network error'));
      await expect(
        client.run(makeOptions({ agent: 'echo-validate', schema: z.object({ echo: z.string() }) as any })),
      ).rejects.toThrow();
      expect(circuitBreaker.recordFailure).toHaveBeenCalled();
    });
  });

  // ── Cache ─────────────────────────────────────────────────────────────────
  // match-explanation has cacheTtlSeconds: 3600, so it exercises the cache path.

  describe('result cache', () => {
    const explanationSchema = z.object({ explanation: z.string().max(400) });
    const cachedPayload = { explanation: 'Great fit because ...' };
    const cacheOpts = () =>
      makeOptions({
        agent: 'match-explanation',
        schema: explanationSchema as any,
        principal: { userId: 'u1', role: UserRole.SUPER_ADMIN },
        input: { matchResultId: 'mr-1', requestSummary: 'EDE Geneva' },
      });

    it('returns cached result without calling OpenRouter', async () => {
      resultCache.get.mockResolvedValue({ payload: cachedPayload, modelUsed: 'cached-model' });

      const result = await client.run(cacheOpts());

      expect(result.cacheHit).toBe(true);
      expect(result.modelUsed).toBe('cached-model');
      expect(openrouter.run).not.toHaveBeenCalled();
    });

    it('stores result in cache on a miss', async () => {
      resultCache.get.mockResolvedValue(null);
      openrouter.run.mockResolvedValue({
        content: JSON.stringify({ explanation: 'Live explanation' }),
        modelUsed: 'google/gemini-2.5-flash',
        fallbackUsed: false,
        inputTokens: 5,
        outputTokens: 5,
      });

      await client.run(cacheOpts());

      expect(resultCache.set).toHaveBeenCalled();
    });
  });

  // ── JSON output extraction ─────────────────────────────────────────────────

  describe('JSON output extraction', () => {
    const echoSchema = z.object({ echo: z.string(), model: z.string().optional() });
    const opts = () =>
      makeOptions({ agent: 'echo-validate', schema: echoSchema as any, principal: { userId: 'u1', role: UserRole.SUPER_ADMIN } });

    function mockContent(content: string) {
      openrouter.run.mockResolvedValue({
        content,
        modelUsed: 'model',
        fallbackUsed: false,
        inputTokens: 1,
        outputTokens: 1,
      });
    }

    it('parses clean JSON', async () => {
      mockContent(JSON.stringify({ echo: 'hi' }));
      const result = await client.run(opts());
      expect((result.output as any).echo).toBe('hi');
    });

    it('strips preamble text before the opening brace', async () => {
      mockContent('Sure, here is the result:\n{"echo": "stripped"}');
      const result = await client.run(opts());
      expect((result.output as any).echo).toBe('stripped');
    });

    it('strips trailing content after closing brace (markdown fence)', async () => {
      mockContent('```json\n{"echo": "fenced"}\n```');
      const result = await client.run(opts());
      expect((result.output as any).echo).toBe('fenced');
    });

    it('strips trailing whitespace / newlines after closing brace', async () => {
      mockContent('{"echo": "trailing"}\n\n');
      const result = await client.run(opts());
      expect((result.output as any).echo).toBe('trailing');
    });

    it('throws a descriptive error when content is not JSON at all', async () => {
      mockContent('I cannot help with that.');
      await expect(client.run(opts())).rejects.toThrow(/invalid output/i);
    });
  });

  // ── Sensitive field guard ──────────────────────────────────────────────────

  describe('sensitive field guard', () => {
    it('delegates to SafetyService.assertNoSensitiveFields before calling the LLM', async () => {
      safety.assertNoSensitiveFields.mockImplementation(() => {
        throw new ForbiddenException('sensitive');
      });
      await expect(client.run(makeOptions({ input: { age: 30 } }))).rejects.toThrow(ForbiddenException);
      expect(openrouter.run).not.toHaveBeenCalled();
    });
  });

  // ── Audit log ─────────────────────────────────────────────────────────────

  describe('audit log', () => {
    it('writes an audit log entry on a successful run', async () => {
      openrouter.run.mockResolvedValue({
        content: JSON.stringify({ echo: 'hi', model: 'x' }),
        modelUsed: 'google/gemini-2.5-flash',
        fallbackUsed: false,
        inputTokens: 10,
        outputTokens: 5,
      });
      const schema = z.object({ echo: z.string(), model: z.string().optional() });
      await client.run(makeOptions({ agent: 'echo-validate', schema: schema as any, principal: { userId: 'u1', role: UserRole.SUPER_ADMIN } }));
      expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ agentName: 'echo-validate', cacheHit: false }));
    });
  });
});
