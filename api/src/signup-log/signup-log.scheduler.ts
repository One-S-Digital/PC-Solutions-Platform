import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EducatorApprovalStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SignupLogService } from './signup-log.service';
import { SignupEvent, SignupOutcome, SignupSource, SignupStage } from './signup-log.events';

/** Rows older than this are deleted. Overridable, but 90 days is the default. */
const DEFAULT_RETENTION_DAYS = 90;

/**
 * How long an educator may sit at INCOMPLETE before it counts as stuck.
 *
 * Long enough that someone who signs up in the evening and finishes the next
 * morning is not flagged; short enough that a genuinely lost signup surfaces
 * the next day rather than whenever somebody happens to look at the queue.
 */
const STUCK_AFTER_HOURS = 24;

/** Page size for the stuck-educator walk. */
const STUCK_BATCH_SIZE = 200;

/**
 * Safety valve on a single run.
 *
 * Generous enough that a real backlog is cleared in one night, bounded so a
 * pathological query cannot pin the scheduler indefinitely. Hitting it is
 * logged rather than swallowed.
 */
const MAX_STUCK_PER_RUN = 5000;

@Injectable()
export class SignupLogScheduler {
  private readonly logger = new Logger(SignupLogScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signupLog: SignupLogService,
  ) {}

  /**
   * Delete expired rows.
   *
   * This log holds email, IP and user agent, so it is personal data with a
   * purpose that expires. A fixed retention window is what makes keeping the
   * detail defensible in the first place — without the purge the honest answer
   * to "how long do you keep this" would be "forever".
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purgeExpired() {
    const days = parseRetentionDays(process.env.SIGNUP_LOG_RETENTION_DAYS);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      const { count } = await this.prisma.signupEventLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (count > 0) {
        this.logger.log(`Purged ${count} signup event(s) older than ${days} days`);
      }
    } catch (err: any) {
      this.logger.warn(`Signup log purge failed: ${err?.message || err}`);
    }
  }

  /**
   * Find educators who have been stuck at INCOMPLETE and say so, once each.
   *
   * The reported bug was noticed by a human scrolling the incomplete list days
   * after the fact. This turns that into a dated event on the account's own
   * timeline, so the next occurrence is discovered by looking at the log rather
   * than by chance — and so a spike is visible as a spike.
   *
   * Runs after the purge and is deliberately idempotent per day: the marker is
   * re-emitted daily, and the timeline shows how long the account has been
   * stuck by how many markers it carries.
   */
  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async flagStuckIncompleteEducators() {
    const cutoff = new Date(Date.now() - STUCK_AFTER_HOURS * 60 * 60 * 1000);

    try {
      // Keyset pagination, not a single capped query.
      //
      // Flagging an educator does not change their status — they stay
      // INCOMPLETE and stay eligible tomorrow. So a plain `take` would hand
      // back the same page every night and the accounts behind it would never
      // be reported at all, which is precisely the silent backlog this sweep
      // exists to surface. Ordering by id makes the walk deterministic.
      let cursor: string | undefined;
      let flagged = 0;

      while (flagged < MAX_STUCK_PER_RUN) {
        const batch = await this.prisma.user.findMany({
          where: {
            role: UserRole.EDUCATOR,
            approvalStatus: EducatorApprovalStatus.INCOMPLETE,
            createdAt: { lt: cutoff },
          },
          select: {
            id: true,
            email: true,
            clerkId: true,
            createdAt: true,
            shortBio: true,
            cvUrl: true,
          },
          orderBy: { id: 'asc' },
          take: STUCK_BATCH_SIZE,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        if (batch.length === 0) break;

        await this.flagBatch(batch);

        flagged += batch.length;
        cursor = batch[batch.length - 1].id;

        // A short page means the query is exhausted; no need to ask again.
        if (batch.length < STUCK_BATCH_SIZE) break;
      }

      if (flagged >= MAX_STUCK_PER_RUN) {
        // Not an error, but it means the backlog outgrew one run. Say so
        // rather than silently truncating the way the old `take` did.
        this.logger.warn(
          `Stuck-educator sweep hit its ${MAX_STUCK_PER_RUN} cap; more accounts remain and will be picked up on the next run`,
        );
      }

      if (flagged > 0) {
        this.logger.warn(
          `${flagged} educator(s) stuck at INCOMPLETE for more than ${STUCK_AFTER_HOURS}h`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Stuck-educator sweep failed: ${err?.message || err}`);
    }
  }

  /** Record one page of stuck educators. */
  private async flagBatch(
    batch: Array<{
      id: string;
      email: string | null;
      clerkId: string | null;
      createdAt: Date;
      shortBio: string | null;
      cvUrl: string | null;
    }>,
  ): Promise<void> {
    for (const user of batch) {
      const hoursStuck = Math.floor((Date.now() - user.createdAt.getTime()) / 3_600_000);
      await this.signupLog.record({
        event: SignupEvent.SYSTEM_STUCK_INCOMPLETE,
        stage: SignupStage.SYSTEM,
        source: SignupSource.SYSTEM,
        // FAIL, not OK: this is the outcome the whole log exists to catch,
        // and it should show up in the failed-journeys filter.
        outcome: SignupOutcome.FAIL,
        role: UserRole.EDUCATOR,
        userId: user.id,
        clerkId: user.clerkId,
        email: user.email,
        approvalStatusBefore: EducatorApprovalStatus.INCOMPLETE,
        approvalStatusAfter: EducatorApprovalStatus.INCOMPLETE,
        errorCode: 'STUCK_INCOMPLETE',
        detail: {
          hoursStuck,
          // The distinguishing question: is the account empty (never
          // submitted) or does it hold content that failed to promote?
          // The second case is a bug in our promotion logic, the first is a
          // drop-off. They need completely different fixes.
          hasShortBio: Boolean(user.shortBio?.trim()),
          hasCvUrl: Boolean(user.cvUrl?.trim()),
        },
      });
    }
  }
}

function parseRetentionDays(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return DEFAULT_RETENTION_DAYS;
  const parsed = parseInt(raw, 10);
  // A zero/absurd value would silently wipe the log, so keep it in a sane band.
  if (parsed < 1 || parsed > 3650) return DEFAULT_RETENTION_DAYS;
  return parsed;
}
