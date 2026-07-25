import {
  Injectable,
  ForbiddenException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenRouterAdapter } from './providers/openrouter.adapter';
import { VoyageAdapter } from './providers/voyage.adapter';
import { AuditLogService } from './audit-log.service';
import { ResultCacheService } from './result-cache.service';
import { SafetyService } from './safety.service';
import { BudgetService } from './budget.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AI_AGENTS, AgentName } from './ai-agents.config';
import { UserRole } from '@prisma/client';
import { createHash } from 'crypto';
import { ZodSchema } from 'zod';

export interface Principal {
  userId: string;
  role: UserRole;
  organizationId?: string;
}

export interface LlmRunOptions<TOut> {
  agent: AgentName;
  input: Record<string, unknown>;
  schema: ZodSchema<TOut>;
  promptOverride?: string;
  locale?: 'fr' | 'de' | 'en';
  cacheKey?: string;
  principal: Principal;
  agentRunId?: string;
  requireConsent?: string;
  entityRef?: string;
}

export interface LlmRunResult<TOut> {
  output: TOut;
  cacheHit: boolean;
  modelUsed: string;
}

@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openrouter: OpenRouterAdapter,
    private readonly voyage: VoyageAdapter,
    private readonly auditLog: AuditLogService,
    private readonly resultCache: ResultCacheService,
    private readonly safety: SafetyService,
    private readonly budget: BudgetService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async run<TOut>(options: LlmRunOptions<TOut>): Promise<LlmRunResult<TOut>> {
    const {
      agent: agentName,
      input,
      schema,
      locale = 'fr',
      principal,
      agentRunId,
      requireConsent,
      entityRef,
    } = options;
    const config = AI_AGENTS[agentName];
    if (!config) throw new Error(`Unknown agent: ${agentName}`);

    // Feature flag check
    const flag = await this.prisma.featureFlag.findFirst({
      where: { key: 'ai_foundation_enabled', isActive: true },
    });
    if (!flag) throw new ServiceUnavailableException('AI Foundation is not yet enabled.');

    // Permission check
    if (!config.allowedRoles.includes(principal.role)) {
      throw new ForbiddenException(
        `Role ${principal.role} is not allowed to invoke agent "${agentName}"`,
      );
    }

    // Consent check
    if (requireConsent) {
      await this.safety.assertCandidateConsent(requireConsent);
    }

    // Sensitive field check
    this.safety.assertNoSensitiveFields(input, agentName);

    // Budget check
    await this.budget.checkAndEnforce(config);

    // Cache check
    const inputHash = createHash('sha256')
      .update(JSON.stringify({ agentName, input, locale }))
      .digest('hex');
    const cacheKey = options.cacheKey || `${agentName}:${inputHash}`;

    if (config.cacheTtlSeconds !== undefined) {
      const cached = await this.resultCache.get<TOut>(cacheKey);
      if (cached) {
        const parsed = schema.safeParse(cached.payload);
        if (parsed.success) {
          this.logger.debug(`Cache hit for agent "${agentName}"`);
          await this.auditLog.log({
            agentName,
            promptVersion: 'cached',
            model: cached.modelUsed,
            fallbackUsed: false,
            inputHash,
            cacheHit: true,
            inputTokens: 0,
            outputTokens: 0,
            latencyMs: 0,
            principalId: principal.userId,
            organizationId: principal.organizationId,
            entityRef,
            agentRunId,
          });
          return { output: parsed.data, cacheHit: true, modelUsed: cached.modelUsed };
        }
      }
    }

    // Circuit breaker
    if (this.circuitBreaker.isOpen()) {
      throw new ServiceUnavailableException(
        'AI service temporarily unavailable. Please try again shortly.',
      );
    }

    // Resolve prompt version
    const agentConfigRow = await this.prisma.aiAgentConfig.findFirst({
      where: { agentName, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    const promptVersion = agentConfigRow?.promptVersion ?? 'v1';

    // Load agent prompt
    let promptTemplate: string;
    try {
      const mod = await import(`./agents/${agentName}/prompt.${promptVersion}`);
      promptTemplate =
        typeof mod.default === 'function' ? (mod.default as (i: typeof input, l: typeof locale) => string)(input, locale) : (mod.default as string);
    } catch {
      promptTemplate = options.promptOverride || JSON.stringify(input);
    }

    const start = Date.now();
    let result;
    let modelUsed = config.models[0];

    try {
      result = await this.openrouter.run({
        models: config.models,
        messages: [{ role: 'user', content: promptTemplate }],
        maxOutputTokens: config.maxOutputTokens,
        jsonSchema: schema._def as any,
      });
      modelUsed = result.modelUsed;
      this.circuitBreaker.recordSuccess();
    } catch (err) {
      this.circuitBreaker.recordFailure();
      throw err;
    }

    const latencyMs = Date.now() - start;
    const fallbackUsed = result.fallbackUsed;

    // Validate output
    let parsed: TOut;
    let rawContent = result.content;
    try {
      const jsonStart = rawContent.indexOf('{');
      if (jsonStart > 0) rawContent = rawContent.slice(jsonStart);
      parsed = schema.parse(JSON.parse(rawContent)) as TOut;
    } catch (parseErr) {
      this.logger.error(`Agent "${agentName}" output validation failed`, parseErr);
      throw new Error(`AI agent "${agentName}" returned invalid output. Please try again.`);
    }

    const outputHash = createHash('sha256').update(rawContent).digest('hex');

    // Cache result
    if (config.cacheTtlSeconds !== undefined) {
      await this.resultCache.set(cacheKey, agentName, parsed, modelUsed, config.cacheTtlSeconds);
    }

    // Write audit log
    await this.auditLog.log({
      agentName,
      promptVersion,
      model: modelUsed,
      fallbackUsed,
      inputHash,
      outputHash,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs,
      cacheHit: false,
      principalId: principal.userId,
      organizationId: principal.organizationId,
      entityRef,
      agentRunId,
    });

    return { output: parsed, cacheHit: false, modelUsed };
  }

  async embed(text: string, model?: string) {
    return this.voyage.embed(text, model);
  }
}
