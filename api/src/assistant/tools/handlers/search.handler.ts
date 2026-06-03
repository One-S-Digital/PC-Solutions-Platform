import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { KnowledgeService } from '../../../ai/knowledge/knowledge.service';
import { KnowledgeEmbeddingService } from '../../../ai/knowledge/knowledge-embedding.service';
import { RecruitmentService } from '../../../recruitment/recruitment.service';
import { MarketplaceService } from '../../../marketplace/marketplace.service';
import { StaffingService } from '../../../staffing/staffing.service';
import {
  AssistantPrincipal,
  CONTACT_ADMIN_SUGGESTION as CONTACT_ADMIN,
  isAdminRole,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/**
 * All search / lookup tools. Every search returns the standard envelope and,
 * when `total === 0`, a concrete `suggestions[]` list ending with contact_admin
 * so the assistant never dead-ends.
 */
@Injectable()
export class SearchHandler implements ToolHandler {
  readonly toolNames = [
    'search_help_docs',
    'find_foundation',
    'search_candidates',
    'search_candidates_ai',
    'search_products',
    'search_services',
    'search_jobs',
    'search_foundations',
    'view_match_results',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: KnowledgeService,
    private readonly knowledgeEmbedding: KnowledgeEmbeddingService,
    private readonly recruitment: RecruitmentService,
    private readonly marketplace: MarketplaceService,
    private readonly staffing: StaffingService,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
    locale: 'fr' | 'de' | 'en',
    disabledFlags: Set<string>,
  ): Promise<ToolResult> {
    switch (toolName) {
      case 'search_help_docs':
        return this.searchHelpDocs(args, principal, disabledFlags);
      case 'find_foundation':
        return this.findFoundation(args);
      case 'search_candidates':
        return this.searchCandidates(args, principal);
      case 'search_candidates_ai':
        return this.searchCandidatesAi(args, principal, locale);
      case 'search_products':
        return this.searchProducts(args, locale);
      case 'search_services':
        return this.searchServices(args, locale);
      case 'search_jobs':
        return this.searchJobs(args, locale);
      case 'search_foundations':
        return this.searchFoundations(args);
      case 'view_match_results':
        return this.viewMatchResults(args, principal);
      default:
        throw new Error(`SearchHandler cannot handle tool "${toolName}"`);
    }
  }

  // ── search_help_docs ──────────────────────────────────────────────────────
  private async searchHelpDocs(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
    disabledFlags: Set<string>,
  ): Promise<ToolResult> {
    const query = (args.query as string) || '';
    let articles = await this.knowledgeEmbedding.searchSemantic(query, principal.role, 3, disabledFlags);
    if (articles.length === 0) {
      articles = this.knowledge.search(query, principal.role, 3, disabledFlags);
    }
    return {
      data: { docs: this.knowledge.formatForPrompt(articles) },
      total: articles.length,
      suggestions: articles.length === 0 ? [CONTACT_ADMIN] : undefined,
    };
  }

  // ── find_foundation (admin) ───────────────────────────────────────────────
  private async findFoundation(args: Record<string, unknown>): Promise<ToolResult> {
    const query = ((args.query as string) || '').trim();
    const foundations = await this.prisma.organization.findMany({
      where: { type: 'FOUNDATION', name: { contains: query, mode: 'insensitive' } },
      select: { id: true, name: true, city: true, canton: true },
      orderBy: { name: 'asc' },
      take: 5,
    });
    return {
      data: { foundations },
      total: foundations.length,
      suggestions: foundations.length === 0 ? [CONTACT_ADMIN] : undefined,
    };
  }

  // ── search_candidates (direct pool, no AI parse) ──────────────────────────
  private async searchCandidates(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const role = (args.role as string) || undefined;
    const location = (args.location as string) || undefined;
    const search = (args.search as string) || undefined;
    const skills = Array.isArray(args.skills) ? (args.skills as string[]) : undefined;

    const candidates = await this.recruitment.findAllCandidates({
      role,
      location,
      search,
      skills,
      // Foundations only see opted-in candidates; admins see the full pool.
      visibleOnly: !isAdminRole(principal.role),
    });

    const data = candidates.slice(0, 10).map((c: any) => this.toCandidateCard(c));
    return {
      data: { candidates: data },
      total: candidates.length,
      hasMore: candidates.length > 10,
      suggestions:
        candidates.length === 0
          ? [
              { label: 'Try an AI-ranked search instead', actionType: 'broaden_search', payload: { tool: 'search_candidates_ai' } },
              { label: 'Broaden the search to all cantons', actionType: 'broaden_search', payload: { location: null } },
              { label: 'Post a job to attract candidates', actionType: 'post_job', payload: { role, canton: location } },
              CONTACT_ADMIN,
            ]
          : undefined,
    };
  }

  // ── search_candidates_ai (parse → sync match → ranked) ────────────────────
  private async searchCandidatesAi(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
    locale: 'fr' | 'de' | 'en',
  ): Promise<ToolResult> {
    const rawText = (args.rawText as string) || (args.query as string) || '';
    const foundationId = (args.foundationId as string) || undefined;

    const request = await this.staffing.createRequest(
      { rawText, foundationId, locale },
      { userId: principal.userId, role: principal.role, organizationId: principal.organizationId },
    );

    // Force synchronous matching regardless of queue config so the assistant
    // returns ranked candidates in the same turn (parses inline if needed).
    await this.staffing.runMatching(request.id);

    const [matches, parsed] = await Promise.all([
      this.staffing.getMatches(request.id, {
        userId: principal.userId,
        role: principal.role,
        organizationId: principal.organizationId,
      }),
      this.staffing.getRequest(request.id, {
        userId: principal.userId,
        role: principal.role,
        organizationId: principal.organizationId,
      }),
    ]);

    const parsedRole = parsed.roleRequired ?? null;
    const parsedCanton = parsed.canton ?? null;

    const candidates = matches.slice(0, 10).map((m: any) => ({
      ...this.toCandidateCard(m.candidate),
      matchResultId: m.id,
      score: m.totalScore != null ? Math.round(m.totalScore) : undefined,
    }));

    return {
      data: {
        candidates,
        staffingRequestId: request.id,
        parsedRole,
        parsedCanton,
      },
      total: matches.length,
      hasMore: matches.length > 10,
      suggestions:
        matches.length === 0
          ? [
              { label: 'Remove date / hours constraints and retry', actionType: 'broaden_search' },
              { label: 'Post a job to attract candidates', actionType: 'post_job', payload: { role: parsedRole, canton: parsedCanton } },
              CONTACT_ADMIN,
            ]
          : undefined,
    };
  }

  // ── search_products ───────────────────────────────────────────────────────
  private async searchProducts(
    args: Record<string, unknown>,
    locale: 'fr' | 'de' | 'en',
  ): Promise<ToolResult> {
    const products = await this.marketplace.findAllProducts({
      category: (args.category as string) || undefined,
      search: (args.search as string) || (args.query as string) || undefined,
      isActive: true,
      lang: locale,
    });
    const data = products.slice(0, 10).map((p: any) => ({
      id: p.id,
      title: p.title,
      price: p.price ?? null,
      currency: p.priceCurrency ?? 'CHF',
      category: p.category ?? p.primaryCategory ?? null,
      supplierName: p.supplier?.name ?? null,
      imageUrl: p.imageAsset?.publicUrl ?? null,
    }));
    return {
      data: { products: data },
      total: products.length,
      hasMore: products.length > 10,
      suggestions:
        products.length === 0
          ? [
              { label: 'Try a broader category', actionType: 'broaden_search', payload: { category: null } },
              { label: 'Send a supplier inquiry for a custom quote', actionType: 'navigate', payload: { tool: 'send_supplier_inquiry' } },
              CONTACT_ADMIN,
            ]
          : undefined,
    };
  }

  // ── search_services ───────────────────────────────────────────────────────
  private async searchServices(
    args: Record<string, unknown>,
    locale: 'fr' | 'de' | 'en',
  ): Promise<ToolResult> {
    const services = await this.marketplace.findAllServices({
      category: (args.category as string) || undefined,
      search: (args.search as string) || (args.query as string) || undefined,
      isActive: true,
      lang: locale,
    });
    const data = services.slice(0, 10).map((s: any) => ({
      id: s.id,
      title: s.title,
      price: s.price ?? null,
      category: s.category ?? null,
      providerName: s.provider?.organization?.name ?? s.provider?.businessName ?? null,
    }));
    return {
      data: { services: data },
      total: services.length,
      hasMore: services.length > 10,
      suggestions:
        services.length === 0
          ? [
              { label: 'Try a nearby canton', actionType: 'broaden_search' },
              CONTACT_ADMIN,
            ]
          : undefined,
    };
  }

  // ── search_jobs (educator) ────────────────────────────────────────────────
  private async searchJobs(
    args: Record<string, unknown>,
    locale: 'fr' | 'de' | 'en',
  ): Promise<ToolResult> {
    const listings = await this.recruitment.findAllJobListings({
      location: (args.location as string) || undefined,
      search: (args.search as string) || (args.query as string) || undefined,
      contractType: (args.contractType as string) || undefined,
      publishedOnly: true,
      lang: locale,
    });
    const data = listings.slice(0, 10).map((j: any) => ({
      id: j.id,
      title: j.title,
      foundationName: j.foundation?.name ?? null,
      location: j.location ?? null,
      contractType: j.contractType ?? null,
      startDate: j.startDate ?? null,
    }));
    return {
      data: { jobs: data },
      total: listings.length,
      hasMore: listings.length > 10,
      suggestions:
        listings.length === 0
          ? [
              { label: 'Broaden the location', actionType: 'broaden_search', payload: { location: null } },
              { label: 'Contact admin to be notified when matching jobs appear', actionType: 'contact_admin' },
            ]
          : undefined,
    };
  }

  // ── search_foundations (parent) ───────────────────────────────────────────
  private async searchFoundations(args: Record<string, unknown>): Promise<ToolResult> {
    const where: Record<string, unknown> = { type: 'FOUNDATION' };
    const and: Record<string, unknown>[] = [];
    if (args.canton) and.push({ canton: { equals: args.canton as string, mode: 'insensitive' } });
    if (args.city) and.push({ city: { contains: args.city as string, mode: 'insensitive' } });
    if (args.query) and.push({ name: { contains: args.query as string, mode: 'insensitive' } });
    if (and.length) where.AND = and;

    const foundations = await this.prisma.organization.findMany({
      where,
      select: { id: true, name: true, city: true, canton: true },
      orderBy: { name: 'asc' },
      take: 10,
    });
    return {
      data: { foundations },
      total: foundations.length,
      suggestions:
        foundations.length === 0
          ? [
              { label: 'Broaden the canton or city', actionType: 'broaden_search' },
              CONTACT_ADMIN,
            ]
          : undefined,
    };
  }

  // ── view_match_results (fetch ranked matches for an existing request) ─────
  private async viewMatchResults(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const staffingRequestId = (args.staffingRequestId as string) || (args.requestId as string);
    if (!staffingRequestId) {
      return {
        data: { candidates: [] },
        total: 0,
        suggestions: [CONTACT_ADMIN],
      };
    }
    const matches = await this.staffing.getMatches(staffingRequestId, {
      userId: principal.userId,
      role: principal.role,
      organizationId: principal.organizationId,
    });
    const candidates = matches.slice(0, 10).map((m: any) => ({
      ...this.toCandidateCard(m.candidate),
      matchResultId: m.id,
      score: m.totalScore != null ? Math.round(m.totalScore) : undefined,
    }));
    return {
      data: { candidates, staffingRequestId },
      total: matches.length,
      hasMore: matches.length > 10,
      suggestions:
        matches.length === 0
          ? [
              { label: 'Run a fresh AI search instead', actionType: 'broaden_search', payload: { tool: 'search_candidates_ai' } },
              CONTACT_ADMIN,
            ]
          : undefined,
    };
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  private toCandidateCard(c: any) {
    if (!c) return null;
    const roles = Array.isArray(c.jobRoles) && c.jobRoles.length ? c.jobRoles : c.jobRole ? [c.jobRole] : [];
    const region = c.region ?? (Array.isArray(c.cities) ? c.cities[0] : null) ?? null;
    return {
      id: c.id,
      name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Candidate',
      role: roles[0] ?? null,
      region,
      skills: Array.isArray(c.skills) ? c.skills.slice(0, 4) : [],
      avatarUrl: c.avatarAsset?.publicUrl ?? null,
    };
  }
}
