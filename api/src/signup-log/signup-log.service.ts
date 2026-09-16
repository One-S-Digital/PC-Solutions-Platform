import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SignupEvent,
  SignupEventName,
  SignupOutcome,
  SignupOutcomeName,
  SignupSourceName,
  SignupStageName,
} from './signup-log.events';

/** Anything longer than this is truncated before it reaches the column. */
const MAX_STRING = 500;
/** Ceiling on `detail` keys, so a rogue client cannot store a document. */
const MAX_DETAIL_KEYS = 40;

export interface RecordSignupEventArgs {
  correlationId?: string | null;
  event: SignupEventName | string;
  stage: SignupStageName;
  source: SignupSourceName;
  outcome?: SignupOutcomeName;
  role?: string | null;
  userId?: string | null;
  clerkId?: string | null;
  email?: string | null;
  approvalStatusBefore?: string | null;
  approvalStatusAfter?: string | null;
  detail?: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes the signup trace.
 *
 * Three rules this service exists to enforce, so no caller has to remember them:
 *
 *  1. **It can never break a signup.** Every write is fire-and-forget and every
 *     failure is swallowed to a warning. A diagnostic that can fail the thing
 *     it diagnoses is worse than no diagnostic.
 *  2. **It records presence, not content.** `detail` is scrubbed to primitives
 *     and capped. The question we need answered is "did a bio arrive", never
 *     "what did the bio say" — and that keeps the table cheap to retain.
 *  3. **It mirrors to the console.** One structured `[signup-trace]` line per
 *     event, so the host log stream stays useful for live tailing even though
 *     the durable copy is the table.
 */
@Injectable()
export class SignupLogService {
  private readonly logger = new Logger('SignupTrace');
  private readonly enabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    // Opt-out, not opt-in: a diagnostic nobody remembered to switch on is the
    // reason this bug went a second round undiagnosed.
    this.enabled = process.env.SIGNUP_LOG_ENABLED !== 'false';
  }

  /**
   * Record one event. Callers do not await this and do not need to catch.
   *
   * Returns the promise only so tests can await a deterministic write; product
   * code should call it bare.
   */
  record(args: RecordSignupEventArgs): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    return this.write(args).catch(() => undefined);
  }

  private async write(args: RecordSignupEventArgs): Promise<void> {
    const row = {
      // A missing correlation id must not drop the event — an orphan row still
      // tells you the event happened, and it is joinable by email/userId.
      correlationId: trim(args.correlationId) || 'unlinked',
      event: String(args.event).slice(0, MAX_STRING),
      stage: args.stage,
      source: args.source,
      outcome: args.outcome ?? SignupOutcome.OK,
      role: trim(args.role),
      userId: trim(args.userId),
      clerkId: trim(args.clerkId),
      email: trim(args.email)?.toLowerCase() ?? null,
      approvalStatusBefore: trim(args.approvalStatusBefore),
      approvalStatusAfter: trim(args.approvalStatusAfter),
      detail: sanitizeDetail(args.detail),
      errorCode: trim(args.errorCode),
      errorMessage: trim(args.errorMessage),
      ipAddress: trim(args.ipAddress),
      userAgent: trim(args.userAgent)?.slice(0, MAX_STRING) ?? null,
    };

    // Mirror first: if the DB write is what fails, the console line is the only
    // record we get, and losing it would hide the very failure we care about.
    this.logger.log(
      `[signup-trace] ${row.event} ${row.outcome} cid=${row.correlationId} ` +
        `role=${row.role ?? '-'} user=${row.userId ?? '-'}` +
        (row.errorCode ? ` err=${row.errorCode}` : ''),
    );

    try {
      await this.prisma.signupEventLog.create({ data: row as any });
    } catch (err: any) {
      this.logger.warn(
        `Failed to persist signup event ${row.event} (cid=${row.correlationId}): ${err?.message || err}`,
      );
    }
  }

  // -- reads -----------------------------------------------------------------

  /** Every event for one journey, oldest first — this is the timeline view. */
  async getTimeline(correlationId: string) {
    return this.prisma.signupEventLog.findMany({
      where: { correlationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Everything known about one account, across correlation ids.
   *
   * Matches on userId OR email, because the early half of a journey has no
   * userId yet and a user who restarts the wizard gets a fresh correlation id.
   */
  async getTimelineForUser(userId: string, email?: string | null) {
    const normalized = email?.trim().toLowerCase();
    return this.prisma.signupEventLog.findMany({
      where: normalized ? { OR: [{ userId }, { email: normalized }] } : { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async search(params: {
    email?: string;
    correlationId?: string;
    role?: string;
    outcome?: string;
    event?: string;
    since?: Date;
    until?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));

    const where: any = {};
    if (params.email) where.email = { contains: params.email.trim().toLowerCase() };
    if (params.correlationId) where.correlationId = params.correlationId.trim();
    if (params.role) where.role = params.role;
    if (params.outcome) where.outcome = params.outcome;
    if (params.event) where.event = params.event;
    if (params.since || params.until) {
      where.createdAt = {
        ...(params.since ? { gte: params.since } : {}),
        ...(params.until ? { lte: params.until } : {}),
      };
    }

    const [events, total] = await this.prisma.$transaction([
      this.prisma.signupEventLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.signupEventLog.count({ where }),
    ]);

    return { events, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * One row per signup journey, newest first — the landing view.
   *
   * Grouped in SQL rather than in JS so a busy month does not have to be pulled
   * into memory to be summarised.
   */
  async listJourneys(params: { limit?: number; onlyFailed?: boolean; since?: Date }) {
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const since = params.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // "Problems" is deliberately wider than "has a FAIL row".
    //
    // Leaving step 3 is recorded as SKIP, not FAIL, because on mobile a
    // visibility change also fires when the user merely switches apps. So a
    // genuinely abandoned signup carries no FAIL until the daily sweep flags it
    // 24h later — and a signup lost yesterday evening is exactly the one
    // somebody is looking for this morning. An abandonment with no later
    // success is therefore treated as a problem in its own right.
    const onlyFailedClause = params.onlyFailed
      ? Prisma.sql`
        HAVING COUNT(*) FILTER (WHERE "outcome" = 'FAIL') > 0
            OR (COUNT(*) FILTER (WHERE "event" = ${SignupEvent.CLIENT_WIZARD_ABANDONED}) > 0
                AND COUNT(*) FILTER (WHERE "event" IN (
                      ${SignupEvent.API_EDUCATOR_PROMOTED},
                      ${SignupEvent.API_COMPLETE_PROFILE_SUCCEEDED}
                    )) = 0)`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        correlationId: string;
        startedAt: Date;
        lastAt: Date;
        eventCount: bigint;
        failures: bigint;
        role: string | null;
        email: string | null;
        userId: string | null;
        lastEvent: string;
        finalStatus: string | null;
      }>
    >`
      SELECT
        "correlationId",
        MIN("createdAt")                                           AS "startedAt",
        MAX("createdAt")                                           AS "lastAt",
        COUNT(*)                                                   AS "eventCount",
        COUNT(*) FILTER (WHERE "outcome" = 'FAIL')                 AS "failures",
        (ARRAY_AGG("role"    ORDER BY "createdAt" DESC) FILTER (WHERE "role"   IS NOT NULL))[1] AS "role",
        (ARRAY_AGG("email"   ORDER BY "createdAt" DESC) FILTER (WHERE "email"  IS NOT NULL))[1] AS "email",
        (ARRAY_AGG("userId"  ORDER BY "createdAt" DESC) FILTER (WHERE "userId" IS NOT NULL))[1] AS "userId",
        (ARRAY_AGG("event"   ORDER BY "createdAt" DESC))[1]                                     AS "lastEvent",
        (ARRAY_AGG("approvalStatusAfter" ORDER BY "createdAt" DESC)
           FILTER (WHERE "approvalStatusAfter" IS NOT NULL))[1]                                 AS "finalStatus"
      FROM "signup_event_logs"
      WHERE "createdAt" >= ${since}
      GROUP BY "correlationId"
      ${onlyFailedClause}
      ORDER BY MAX("createdAt") DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      ...r,
      eventCount: Number(r.eventCount),
      failures: Number(r.failures),
    }));
  }

  /**
   * The headline number: how many signups started versus how many reached a
   * submitted profile, split by role.
   */
  async getFunnel(since: Date) {
    const rows = await this.prisma.signupEventLog.groupBy({
      by: ['event', 'role'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    const counts: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      const role = row.role ?? 'UNKNOWN';
      counts[role] ??= {};
      counts[role][row.event] = row._count._all;
    }

    return Object.entries(counts).map(([role, byEvent]) => ({
      role,
      started: byEvent[SignupEvent.CLIENT_WIZARD_STARTED] ?? 0,
      accountCreated:
        (byEvent[SignupEvent.WEBHOOK_ACCOUNT_CREATED] ?? 0) +
        (byEvent[SignupEvent.API_COMPLETE_PROFILE_SUCCEEDED] ?? 0),
      profileSubmitted: byEvent[SignupEvent.API_EDUCATOR_PROMOTED] ?? 0,
      submitFailed: byEvent[SignupEvent.CLIENT_PROFILE_SUBMIT_FAILED] ?? 0,
      abandoned: byEvent[SignupEvent.CLIENT_WIZARD_ABANDONED] ?? 0,
      stuckIncomplete: byEvent[SignupEvent.SYSTEM_STUCK_INCOMPLETE] ?? 0,
    }));
  }
}

function trim(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_STRING);
}

/**
 * Reduce arbitrary context to something safe and small.
 *
 * Only primitives survive, strings are truncated, and the key count is capped.
 * Callers pass booleans like `hasShortBio` by convention; this is the backstop
 * that makes it true even when a client sends something else.
 */
function sanitizeDetail(detail: Record<string, unknown> | null | undefined): any {
  if (!detail || typeof detail !== 'object') return null;

  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (Object.keys(out).length >= MAX_DETAIL_KEYS) break;
    const safeKey = key.slice(0, 64);
    if (value === null || value === undefined) {
      out[safeKey] = null;
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      out[safeKey] = value;
    } else if (typeof value === 'string') {
      out[safeKey] = value.slice(0, MAX_STRING);
    } else if (Array.isArray(value)) {
      // Keep the shape signal (how many items) without the items themselves.
      out[safeKey] = value.length;
    }
    // Objects and functions are dropped outright — nothing needs them, and
    // they are the shape a payload dump would arrive in.
  }

  return Object.keys(out).length > 0 ? out : null;
}
