import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmClient } from '../../ai/llm-client';
import { createHash } from 'crypto';
import {
  STAFFING_EMBED_PROFILE_QUEUE,
  STAFFING_EMBED_REQUEST_QUEUE,
} from '../queues/staffing-queues.module';

function profileText(user: {
  jobRole: string | null;
  jobRoles: string[];
  skills: string[];
  certifications: string[];
  region: string | null;
  shortBio: string | null;
}): string {
  return [
    user.jobRole,
    ...user.jobRoles,
    ...user.skills,
    ...user.certifications,
    user.region,
    user.shortBio,
  ]
    .filter(Boolean)
    .join(' ');
}

@Processor(STAFFING_EMBED_PROFILE_QUEUE)
export class StaffingEmbedProfileProcessor {
  private readonly logger = new Logger(StaffingEmbedProfileProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
  ) {}

  @Process()
  async handle(job: Job<{ userId: string }>) {
    const { userId } = job.data;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        jobRole: true,
        jobRoles: true,
        skills: true,
        certifications: true,
        region: true,
        shortBio: true,
      },
    });
    if (!user) return;

    const text = profileText(user);
    if (!text.trim()) return;

    const hash = createHash('sha256').update(text).digest('hex');

    const existing = await this.prisma.educatorEmbedding.findUnique({
      where: { userId },
      select: { profileHash: true },
    });
    if (existing?.profileHash === hash) return; // unchanged

    try {
      const vector = await this.llm.embed(text);
      // Store as raw JSON array — Prisma cannot write vector type directly;
      // we use a raw query instead.
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO educator_embeddings ("id","userId","model","profileHash","embedding","updatedAt")
         VALUES (gen_random_uuid(), $1, 'voyage-3-lite', $2, $3::vector, NOW())
         ON CONFLICT ("userId") DO UPDATE
           SET "profileHash" = EXCLUDED."profileHash",
               "embedding"   = EXCLUDED."embedding",
               "updatedAt"   = NOW()`,
        userId,
        hash,
        JSON.stringify(vector),
      );
    } catch (err) {
      this.logger.error(`Profile embed failed for user ${userId}`, err);
      throw err;
    }
  }
}

@Processor(STAFFING_EMBED_REQUEST_QUEUE)
export class StaffingEmbedRequestProcessor {
  private readonly logger = new Logger(StaffingEmbedRequestProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
  ) {}

  @Process()
  async handle(job: Job<{ staffingRequestId: string }>) {
    const { staffingRequestId } = job.data;
    const req = await this.prisma.staffingRequest.findUnique({
      where: { id: staffingRequestId },
      select: { rawText: true, roleRequired: true, canton: true, languages: true, qualifications: true },
    });
    if (!req) return;

    const text = [
      req.rawText,
      req.roleRequired,
      req.canton,
      ...(req.languages ?? []),
      ...(req.qualifications ?? []),
    ]
      .filter(Boolean)
      .join(' ');

    const hash = createHash('sha256').update(text).digest('hex');

    try {
      const vector = await this.llm.embed(text);
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO staffing_request_embeddings ("id","staffingRequestId","model","profileHash","embedding","createdAt")
         VALUES (gen_random_uuid(), $1, 'voyage-3-lite', $2, $3::vector, NOW())
         ON CONFLICT ("staffingRequestId") DO UPDATE
           SET "profileHash" = EXCLUDED."profileHash",
               "embedding"   = EXCLUDED."embedding"`,
        staffingRequestId,
        hash,
        JSON.stringify(vector),
      );
    } catch (err) {
      this.logger.error(`Request embed failed for ${staffingRequestId}`, err);
      throw err;
    }
  }
}
