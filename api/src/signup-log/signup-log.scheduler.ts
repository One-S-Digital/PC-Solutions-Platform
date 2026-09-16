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
      const stuck = await this.prisma.user.findMany({
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
        take: 500,
      });

      for (const user of stuck) {
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

      if (stuck.length > 0) {
        this.logger.warn(
          `${stuck.length} educator(s) stuck at INCOMPLETE for more than ${STUCK_AFTER_HOURS}h`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Stuck-educator sweep failed: ${err?.message || err}`);
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
