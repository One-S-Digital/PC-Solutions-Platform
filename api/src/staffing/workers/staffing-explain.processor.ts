import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmClient } from '../../ai/llm-client';
import { MatchExplanationSchema } from '../../ai/agents/match-explanation/schema';
import { STAFFING_EXPLAIN_QUEUE } from '../queues/staffing-queues.module';
import { UserRole } from '@prisma/client';

@Processor(STAFFING_EXPLAIN_QUEUE)
export class StaffingExplainProcessor {
  private readonly logger = new Logger(StaffingExplainProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClient,
  ) {}

  @Process()
  async handle(job: Job<{ matchResultId: string }>) {
    const { matchResultId } = job.data;

    const match = await this.prisma.matchResult.findUnique({
      where: { id: matchResultId },
      include: {
        staffingRequest: {
          select: {
            locale: true,
            roleRequired: true,
            canton: true,
            city: true,
            languages: true,
            createdById: true,
            foundationId: true,
          },
        },
        candidate: {
          select: {
            firstName: true,
            lastName: true,
            jobRole: true,
            certifications: true,
            region: true,
          },
        },
      },
    });

    if (!match) {
      this.logger.warn(`MatchResult ${matchResultId} not found`);
      return;
    }

    const req = match.staffingRequest;
    const cand = match.candidate;

    const requestSummary = [
      req.roleRequired,
      req.canton ?? req.city,
      req.languages.join('/'),
    ]
      .filter(Boolean)
      .join(', ');

    const candidateSummary = [
      `${cand.firstName ?? ''} ${cand.lastName ?? ''}`.trim(),
      cand.jobRole,
      cand.region,
      cand.certifications.slice(0, 3).join(', '),
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const { output } = await this.llm.run({
        agent: 'match-explanation',
        input: {
          roleScore: Number(match.roleScore),
          availabilityScore: Number(match.availabilityScore),
          locationScore: Number(match.locationScore),
          distanceKm: match.distanceKm ? Number(match.distanceKm) : null,
          qualificationScore: Number(match.qualificationScore),
          languageScore: Number(match.languageScore),
          ageGroupScore: Number(match.ageGroupScore),
          contractScore: Number(match.contractScore),
          responsivenessScore: Number(match.responsivenessScr),
          totalScore: Number(match.totalScore),
          requestSummary,
          candidateSummary,
        },
        schema: MatchExplanationSchema,
        locale: (req.locale as 'fr' | 'de' | 'en') ?? 'fr',
        principal: {
          userId: req.createdById,
          role: UserRole.FOUNDATION,
          organizationId: req.foundationId ?? undefined,
        },
        entityRef: matchResultId,
      });

      await this.prisma.matchResult.update({
        where: { id: matchResultId },
        data: { explanation: output.explanation, status: 'EXPLAINED' },
      });
    } catch (err) {
      this.logger.error(`Explanation failed for match ${matchResultId}`, err);
    }
  }
}
