import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from '../ai/llm-client';
import {
  StaffingRequestParserSchema,
  StaffingRequestParserOutput,
} from '../ai/agents/staffing-request-parser/schema';
import { HybridMatcherService } from './hybrid-matcher.service';
import { CreateStaffingRequestDto } from './dto/create-staffing-request.dto';
import { UserRole } from '@prisma/client';
import { REDIS_ENABLED } from '../common/redis.config';
import {
  STAFFING_PARSE_REQUEST_QUEUE,
  STAFFING_MATCH_QUEUE,
  STAFFING_EXPLAIN_QUEUE,
  STAFFING_EMBED_PROFILE_QUEUE,
  STAFFING_EMBED_REQUEST_QUEUE,
} from './queues/staffing-queues.module';

export interface StaffingPrincipal {
  userId: string;
  role: UserRole;
  organizationId?: string;
}

// Characters above this threshold are sent to the async queue; shorter ones get
// a synchronous preview response so the UI feels snappy.
const SYNC_THRESHOLD_CHARS = 800;

@Injectable()
export class StaffingService {
  private readonly logger = new Logger(StaffingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
    private readonly matcher: HybridMatcherService,
    @Optional() @InjectQueue(STAFFING_PARSE_REQUEST_QUEUE)
    private readonly parseQueue: Queue | null = null,
    @Optional() @InjectQueue(STAFFING_MATCH_QUEUE)
    private readonly matchQueue: Queue | null = null,
    @Optional() @InjectQueue(STAFFING_EXPLAIN_QUEUE)
    private readonly explainQueue: Queue | null = null,
    @Optional() @InjectQueue(STAFFING_EMBED_REQUEST_QUEUE)
    private readonly embedRequestQueue: Queue | null = null,
    @Optional() @InjectQueue(STAFFING_EMBED_PROFILE_QUEUE)
    private readonly embedProfileQueue: Queue | null = null,
  ) {}

  async createRequest(
    dto: CreateStaffingRequestDto,
    principal: StaffingPrincipal,
  ) {
    const isAdmin =
      principal.role === UserRole.ADMIN || principal.role === UserRole.SUPER_ADMIN;
    if (!principal.organizationId && !isAdmin) {
      throw new ForbiddenException('No organisation linked to this account');
    }

    // Admins may pass an explicit foundationId to act on behalf of a specific org,
    // or leave it null for a platform-wide search.
    const resolvedFoundationId = dto.foundationId ?? principal.organizationId ?? null;

    const locale = dto.locale ?? 'fr';
    const isShort = dto.rawText.length <= SYNC_THRESHOLD_CHARS;

    const request = await this.prisma.staffingRequest.create({
      data: {
        foundationId: resolvedFoundationId,
        createdById: principal.userId,
        rawText: dto.rawText,
        locale,
        status: 'PENDING_PARSE',
      },
    });

    if (isShort) {
      // Sync parse preview for snappy UI
      try {
        await this.parseRequest(request.id, principal);
        await this.enqueueMatchAndEmbed(request.id);
        return this.prisma.staffingRequest.findUniqueOrThrow({
          where: { id: request.id },
        });
      } catch (err) {
        this.logger.error(`Sync parse failed for request ${request.id}`, err);
        // Fall back to async parse path so we don't lose the request
        await this.enqueueParse(request.id);
        return request;
      }
    }

    // Long input — fully async: parse first, then match
    await this.enqueueParse(request.id);
    return request;
  }

  async getRequest(id: string, principal: StaffingPrincipal) {
    const req = await this.prisma.staffingRequest.findUnique({
      where: { id },
      include: { foundation: { select: { id: true, name: true } } },
    });
    if (!req) throw new NotFoundException('Staffing request not found');
    this.assertAccess(req.foundationId, principal);
    return req;
  }

  async getMatches(requestId: string, principal: StaffingPrincipal) {
    const req = await this.prisma.staffingRequest.findUnique({
      where: { id: requestId },
      select: { foundationId: true },
    });
    if (!req) throw new NotFoundException('Staffing request not found');
    this.assertAccess(req.foundationId, principal);

    return this.prisma.matchResult.findMany({
      where: { staffingRequestId: requestId },
      orderBy: { totalScore: 'desc' },
      take: 50,
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobRole: true,
            jobRoles: true,
            region: true,
            cities: true,
            certifications: true,
            skills: true,
            shortBio: true,
            avatarAsset: { select: { publicUrl: true } },
          },
        },
      },
    });
  }

  // Called by parse-request processor or sync path.
  // Runs the LLM parser and writes structured fields back to the StaffingRequest.
  async parseRequest(requestId: string, principal?: StaffingPrincipal) {
    const req = await this.prisma.staffingRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    const resolvedPrincipal: StaffingPrincipal = principal ?? {
      userId: req.createdById,
      role: UserRole.FOUNDATION,
      organizationId: req.foundationId ?? undefined,
    };

    const { output } = await this.llm.run({
      agent: 'staffing-request-parser',
      input: { rawText: req.rawText },
      schema: StaffingRequestParserSchema,
      locale: (req.locale as 'fr' | 'de' | 'en') ?? 'fr',
      principal: resolvedPrincipal,
      entityRef: req.id,
    });

    await this.prisma.staffingRequest.update({
      where: { id: req.id },
      data: { ...this.parsedOutputToData(output), status: 'PARSED' },
    });
  }

  // Called by the match-queue processor. Defensive: if status is still
  // PENDING_PARSE (e.g. parse failed and was retried, but caller bypassed it),
  // run the parser before matching.
  async runMatching(requestId: string) {
    const req = await this.prisma.staffingRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { id: true, status: true, createdById: true, foundationId: true },
    });

    if (req.status === 'PENDING_PARSE') {
      this.logger.warn(`Request ${requestId} reached match worker unparsed — parsing inline`);
      await this.parseRequest(requestId);
    }

    const count = await this.matcher.match(requestId);
    this.logger.log(`Matched ${count} candidates for request ${requestId}`);

    const top = await this.prisma.matchResult.findMany({
      where: { staffingRequestId: requestId },
      orderBy: { totalScore: 'desc' },
      take: 5,
      select: { id: true },
    });

    if (this.explainQueue) {
      for (const m of top) {
        await this.explainQueue.add({ matchResultId: m.id });
      }
    }

    return count;
  }

  // Called by the parse-request processor after a successful parse.
  async enqueueMatchAndEmbed(requestId: string) {
    if (!REDIS_ENABLED || !this.matchQueue) {
      // No Redis → run match synchronously so the dev flow still works
      await this.matcher.match(requestId).catch((err) =>
        this.logger.error('Sync fallback match failed', err),
      );
      return;
    }
    await this.matchQueue.add({ staffingRequestId: requestId });
    if (this.embedRequestQueue) {
      await this.embedRequestQueue.add({ staffingRequestId: requestId });
    }
  }

  private async enqueueParse(requestId: string) {
    if (!REDIS_ENABLED || !this.parseQueue) {
      // Dev fallback: parse + match inline
      try {
        await this.parseRequest(requestId);
        await this.matcher.match(requestId);
      } catch (err) {
        this.logger.error(`Sync fallback parse/match failed for ${requestId}`, err);
      }
      return;
    }
    await this.parseQueue.add({ staffingRequestId: requestId });
  }

  private parsedOutputToData(output: StaffingRequestParserOutput) {
    return {
      roleRequired: output.roleRequired ?? null,
      contractType: output.contractType ?? null,
      startDate: output.startDate ? new Date(output.startDate) : null,
      endDate: output.endDate ? new Date(output.endDate) : null,
      hoursPerWeek: output.hoursPerWeek ?? null,
      canton: output.canton ?? null,
      city: output.city ?? null,
      ageGroups: output.ageGroups ?? [],
      languages: output.languages ?? [],
      qualifications: output.qualifications ?? [],
      notes: output.notes ?? null,
    };
  }

  private assertAccess(foundationId: string | null, principal: StaffingPrincipal) {
    if (
      principal.role === UserRole.ADMIN ||
      principal.role === UserRole.SUPER_ADMIN
    )
      return;
    if (principal.organizationId !== foundationId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
