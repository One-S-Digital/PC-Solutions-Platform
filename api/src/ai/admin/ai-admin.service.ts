import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_AGENTS } from '../ai-agents.config';
import { CircuitBreakerService } from '../circuit-breaker.service';

@Injectable()
export class AiAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async getOverview() {
    const todayStart = this.todayStart();

    const [flag, totalToday, cacheHits, fallbacks, recentLogs] = await Promise.all([
      this.prisma.featureFlag.findFirst({ where: { key: 'ai_foundation_enabled' } }),
      this.prisma.aiAuditLog.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.aiAuditLog.count({ where: { createdAt: { gte: todayStart }, cacheHit: true } }),
      this.prisma.aiAuditLog.count({ where: { createdAt: { gte: todayStart }, fallbackUsed: true } }),
      this.prisma.aiAuditLog.findMany({
        where: { createdAt: { gte: todayStart } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, agentName: true, model: true, principalId: true, organizationId: true,
          tokenUsage: true, costUsd: true, latencyMs: true, cacheHit: true,
          fallbackUsed: true, createdAt: true,
        },
      }),
    ]);

    const tokenAgg = await this.prisma.aiAuditLog.findMany({
      where: { createdAt: { gte: todayStart }, cacheHit: false },
      select: { tokenUsage: true, costUsd: true },
    });

    let inputTokens = 0;
    let outputTokens = 0;
    let costToday = 0;

    for (const row of tokenAgg) {
      const usage = row.tokenUsage as { input?: number; output?: number };
      inputTokens += usage?.input ?? 0;
      outputTokens += usage?.output ?? 0;
      costToday += Number(row.costUsd);
    }

    return {
      foundation: {
        enabled: flag?.isActive ?? false,
        flagId: flag?.id ?? null,
      },
      openrouter: {
        configured: !!process.env.OPENROUTER_API_KEY,
        circuitBreakerOpen: this.circuitBreaker.isOpen(),
        callsToday: totalToday,
      },
      voyage: {
        configured: !!process.env.VOYAGE_API_KEY,
      },
      stats: {
        callsToday: totalToday,
        inputTokensToday: inputTokens,
        outputTokensToday: outputTokens,
        costTodayUsd: costToday,
        cacheHitRate: totalToday > 0 ? (cacheHits / totalToday) * 100 : 0,
        fallbackRate: totalToday > 0 ? (fallbacks / totalToday) * 100 : 0,
      },
      recentLogs,
    };
  }

  async getAgents() {
    const todayStart = this.todayStart();

    const agg = await this.prisma.aiAuditLog.groupBy({
      by: ['agentName'],
      where: { createdAt: { gte: todayStart } },
      _count: { id: true },
      _sum: { costUsd: true, latencyMs: true },
      _avg: { latencyMs: true },
    });

    const cacheHits = await this.prisma.aiAuditLog.groupBy({
      by: ['agentName'],
      where: { createdAt: { gte: todayStart }, cacheHit: true },
      _count: { id: true },
    });

    const fallbacks = await this.prisma.aiAuditLog.groupBy({
      by: ['agentName'],
      where: { createdAt: { gte: todayStart }, fallbackUsed: true },
      _count: { id: true },
    });

    const configs = await this.prisma.aiAgentConfig.findMany({
      where: { isActive: true },
    });

    const aggMap = Object.fromEntries(agg.map(r => [r.agentName, r]));
    const cacheMap = Object.fromEntries(cacheHits.map(r => [r.agentName, r._count.id]));
    const fallbackMap = Object.fromEntries(fallbacks.map(r => [r.agentName, r._count.id]));
    const configMap = Object.fromEntries(configs.map(c => [c.agentName, c]));

    return Object.values(AI_AGENTS).map(agent => {
      const stats = aggMap[agent.name];
      const totalCalls = stats?._count?.id ?? 0;
      return {
        name: agent.name,
        models: agent.models,
        allowedRoles: agent.allowedRoles,
        scopeRule: agent.scopeRule,
        maxOutputTokens: agent.maxOutputTokens,
        dailyTokenBudget: agent.dailyTokenBudget ?? null,
        activePromptVersion: configMap[agent.name]?.promptVersion ?? 'v1',
        stats: {
          callsToday: totalCalls,
          costTodayUsd: Number(stats?._sum?.costUsd ?? 0),
          avgLatencyMs: Math.round(stats?._avg?.latencyMs ?? 0),
          cacheHitRate: totalCalls > 0 ? ((cacheMap[agent.name] ?? 0) / totalCalls) * 100 : 0,
          fallbackRate: totalCalls > 0 ? ((fallbackMap[agent.name] ?? 0) / totalCalls) * 100 : 0,
        },
      };
    });
  }

  async getAuditLog(params: {
    page: number;
    limit: number;
    agentName?: string;
    principalId?: string;
    cacheHit?: boolean;
    fallbackUsed?: boolean;
    from?: string;
    to?: string;
  }) {
    const { page = 1, limit = 50, agentName, principalId, cacheHit, fallbackUsed, from, to } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (agentName) where.agentName = agentName;
    if (principalId) where.principalId = { contains: principalId, mode: 'insensitive' };
    if (cacheHit !== undefined) where.cacheHit = cacheHit;
    if (fallbackUsed !== undefined) where.fallbackUsed = fallbackUsed;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      this.prisma.aiAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, agentName: true, promptVersion: true, model: true, fallbackUsed: true,
          inputHash: true, outputHash: true, tokenUsage: true, costUsd: true,
          latencyMs: true, cacheHit: true, principalId: true, organizationId: true,
          entityRef: true, retrievedDocIds: true, agentRunId: true, createdAt: true,
        },
      }),
      this.prisma.aiAuditLog.count({ where }),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCostSummary() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const todayStart = this.todayStart();

    const [monthRows, byAgent, byDay] = await Promise.all([
      this.prisma.aiAuditLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, cacheHit: false },
        select: { costUsd: true, tokenUsage: true },
      }),
      this.prisma.aiAuditLog.groupBy({
        by: ['agentName'],
        where: { createdAt: { gte: thirtyDaysAgo }, cacheHit: false },
        _sum: { costUsd: true, latencyMs: true },
        _count: { id: true },
      }),
      this.prisma.aiAuditLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, cacheHit: false },
        select: { costUsd: true, createdAt: true, agentName: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const mtd = monthRows.reduce((s, r) => s + Number(r.costUsd), 0);
    const todayRows = monthRows.filter(r => true); // already grouped

    // Group by-day for chart
    const dailyMap: Record<string, { date: string; totalCost: number; byAgent: Record<string, number> }> = {};
    for (const row of byDay) {
      const dateKey = row.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, totalCost: 0, byAgent: {} };
      dailyMap[dateKey].totalCost += Number(row.costUsd);
      dailyMap[dateKey].byAgent[row.agentName] = (dailyMap[dateKey].byAgent[row.agentName] ?? 0) + Number(row.costUsd);
    }

    return {
      mtdCostUsd: mtd,
      topAgents: byAgent
        .sort((a, b) => Number(b._sum.costUsd) - Number(a._sum.costUsd))
        .slice(0, 10)
        .map(r => ({ agentName: r.agentName, costUsd: Number(r._sum.costUsd), calls: r._count.id })),
      dailyChart: Object.values(dailyMap),
    };
  }

  async getKnowledge() {
    const docs = await this.prisma.knowledgeDocument.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, source: true, cantonScope: true, locale: true, audience: true,
        version: true, title: true, createdAt: true, updatedAt: true,
      },
    });
    return docs;
  }

  async getSafety() {
    const [activeConsents, revokedConsents, recentRevocations] = await Promise.all([
      this.prisma.candidateConsent.count({ where: { isActive: true, revokedAt: null } }),
      this.prisma.candidateConsent.count({ where: { isActive: false } }),
      this.prisma.candidateConsent.findMany({
        where: { isActive: false },
        orderBy: { revokedAt: 'desc' },
        take: 20,
        select: { id: true, userId: true, revokedAt: true, version: true },
      }),
    ]);

    return { activeConsents, revokedConsents, recentRevocations };
  }

  async toggleFoundationFlag(flagId: string, enabled: boolean) {
    return this.prisma.featureFlag.update({
      where: { id: flagId },
      data: { isActive: enabled },
    });
  }

  async updateAgentConfig(agentName: string, body: { promptVersion?: string; models?: string[]; dailyTokenBudget?: number }) {
    return this.prisma.aiAgentConfig.upsert({
      where: {
        agentName_environment_foundationId: {
          agentName,
          environment: 'production',
          foundationId: null,
        },
      },
      create: {
        agentName,
        promptVersion: body.promptVersion ?? 'v1',
        environment: 'production',
        isActive: true,
      },
      update: {
        ...(body.promptVersion ? { promptVersion: body.promptVersion } : {}),
        updatedAt: new Date(),
      },
    });
  }

  async getEnvCheck() {
    return {
      OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
      VOYAGE_API_KEY: !!process.env.VOYAGE_API_KEY,
      MAPBOX_API_KEY: !!process.env.MAPBOX_API_KEY,
      REDIS_URL: !!(process.env.REDIS_URL || process.env.REDIS_HOST),
      DATABASE_URL: !!process.env.DATABASE_URL,
    };
  }

  private todayStart(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
