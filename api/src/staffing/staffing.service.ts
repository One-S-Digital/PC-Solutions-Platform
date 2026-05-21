import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClient } from '../ai/llm-client';
import { StaffingRequestParserSchema } from '../ai/agents/staffing-request-parser/schema';
import { HybridMatcherService } from './hybrid-matcher.service';
import { CreateStaffingRequestDto } from './dto/create-staffing-request.dto';
import { UserRole } from '@prisma/client';
import { REDIS_ENABLED } from '../../common/redis.config';
import {
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
    @InjectQueue(STAFFING_MATCH_QUEUE)
    private readonly matchQueue: Queue,
    @InjectQueue(STAFFING_EXPLAIN_QUEUE)
    private readonly explainQueue: Queue,
    @InjectQueue(STAFFING_EMBED_REQUEST_QUEUE)
    private readonly embedRequestQueue: Queue,
    @InjectQueue(STAFFING_EMBED_PROFILE_QUEUE)
    private readonly embedProfileQueue: Queue,
  ) {}

  async createRequest(
    dto: CreateStaffingRequestDto,
    principal: StaffingPrincipal,
  ) {
    if (!principal.organizationId) {
      throw new ForbiddenException('No organisation linked to this account');
    }

    const locale = dto.locale ?? 'fr';
    const isShort = dto.rawText.length <= SYNC_THRESHOLD_CHARS;

    // ── Create the raw record immediately ───────────────────────────────────
    const request = await this.prisma.staffingRequest.create({
      data: {
        foundationId: principal.organizationId,
        createdById: principal.userId,
        rawText: dto.rawText,
        locale,
        status: 'PENDING_PARSE',
      },
    });

    if (isShort) {
      // ── Synchronous parse preview ────────────────────────────────────────
      try {
        const { output } = await this.llm.run({
          agent: 'staffing-request-parser',
          input: { rawText: dto.rawText },
          schema: StaffingRequestParserSchema,
          locale,
          principal,
          entityRef: request.id,
        });

        await this.prisma.staffingRequest.update({
          where: { id: request.id },
          data: {
            ...this.parsedOutputToData(output),
            status: 'PARSED',
          },
        });

        // Kick off async matching in background
        await this.enqueueMatchJobs(request.id);

        return this.prisma.staffingRequest.findUniqueOrThrow({
          where: { id: request.id },
        });
      } catch (err) {
        this.logger.error(`Sync parse failed for request ${request.id}`, err);
        // Return the raw record; background queue will retry parsing
        await this.enqueueMatchJobs(request.id);
        return request;
      }
    }

    // ── Long input — fully async ─────────────────────────────────────────────
    await this.enqueueMatchJobs(request.id);
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
            avatarAsset: { select: { url: true } },
          },
        },
      },
    });
  }

  // Called by the match queue processor
  async runMatching(requestId: string) {
    const count = await this.matcher.match(requestId);
    this.logger.log(`Matched ${count} candidates for request ${requestId}`);

    // Enqueue explanations for the top 5
    const top = await this.prisma.matchResult.findMany({
      where: { staffingRequestId: requestId },
      orderBy: { totalScore: 'desc' },
      take: 5,
      select: { id: true },
    });

    if (REDIS_ENABLED) {
      for (const m of top) {
        await this.explainQueue.add({ matchResultId: m.id });
      }
    }

    return count;
  }

  private async enqueueMatchJobs(requestId: string) {
    if (!REDIS_ENABLED) {
      // Fallback: run synchronously in dev when Redis is absent
      await this.matcher.match(requestId).catch((err) =>
        this.logger.error('Sync fallback match failed', err),
      );
      return;
    }
    await this.matchQueue.add({ staffingRequestId: requestId });
    await this.embedRequestQueue.add({ staffingRequestId: requestId });
  }

  private parsedOutputToData(
    output: Awaited<ReturnType<typeof StaffingRequestParserSchema.parseAsync>>,
  ) {
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

  private assertAccess(foundationId: string, principal: StaffingPrincipal) {
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
