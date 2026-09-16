import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SignupLogService } from './signup-log.service';
import { readClientIp } from './signup-log.request';
import {
  CLIENT_EVENT_STAGE,
  CLIENT_REPORTABLE_EVENTS,
  SignupOutcome,
  SignupSource,
  SignupStage,
} from './signup-log.events';

class ClientSignupEventDto {
  @IsString()
  @MaxLength(100)
  correlationId: string;

  @IsString()
  @MaxLength(100)
  event: string;

  @IsOptional()
  @IsIn([SignupOutcome.OK, SignupOutcome.FAIL, SignupOutcome.SKIP])
  outcome?: 'OK' | 'FAIL' | 'SKIP';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  errorCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  errorMessage?: string;

  /** Presence flags and counters only; scrubbed again server-side. */
  @IsOptional()
  @IsObject()
  detail?: Record<string, unknown>;
}

/**
 * The browser half of the signup trace.
 *
 * This endpoint has to be public: nearly every event it accepts happens before
 * the user has a session (role picked, account submitted, verification sent),
 * and the one that matters most — abandoning step 3 — fires from a page that is
 * being torn down. Requiring a token would blind us to exactly the cases we are
 * trying to see.
 *
 * It is made safe by being narrow rather than by being authenticated: the event
 * name must be one of a fixed allow-list, the body is validated and then
 * scrubbed to primitives, and the route is rate-limited per IP. Nothing it
 * writes is read back as a fact about the user — these rows are evidence for a
 * human reading a timeline, never an input to authorization.
 */
@Controller('signup-log')
export class SignupLogController {
  constructor(private readonly signupLog: SignupLogService) {}

  @Public()
  @Post('client-event')
  @HttpCode(202)
  // Generous enough for a normal wizard run (roughly a dozen events, plus
  // per-attempt retry rows), tight enough that the table cannot be flooded.
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async recordClientEvent(@Body() body: ClientSignupEventDto, @Req() req: Request) {
    if (!CLIENT_REPORTABLE_EVENTS.has(body.event)) {
      // 202 rather than 400: a stale frontend sending a retired event name
      // should be dropped quietly, not shown an error mid-signup.
      return { accepted: false };
    }

    await this.signupLog.record({
      correlationId: body.correlationId,
      event: body.event,
      stage: CLIENT_EVENT_STAGE[body.event] ?? SignupStage.WIZARD,
      source: SignupSource.CLIENT,
      outcome: body.outcome ?? SignupOutcome.OK,
      role: body.role,
      email: body.email,
      errorCode: body.errorCode,
      errorMessage: body.errorMessage,
      detail: body.detail,
      ipAddress: readClientIp(req),
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    return { accepted: true };
  }
}

/** Read side. Admin-only — these rows carry email, IP and user agent. */
@Controller('admin/signup-log')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class SignupLogAdminController {
  constructor(private readonly signupLog: SignupLogService) {}

  /** One row per journey — the list you scan to spot the broken ones. */
  @Get('journeys')
  async listJourneys(
    @Query('limit') limit?: string,
    @Query('onlyFailed') onlyFailed?: string,
    @Query('days') days?: string,
  ) {
    const windowDays = parseBoundedInt(days, 30, 1, 365);
    return {
      journeys: await this.signupLog.listJourneys({
        limit: parseBoundedInt(limit, 50, 1, 200),
        onlyFailed: onlyFailed === 'true',
        since: new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000),
      }),
    };
  }

  /** Started vs. completed, by role. Answers "is this educators-only?". */
  @Get('funnel')
  async getFunnel(@Query('days') days?: string) {
    const windowDays = parseBoundedInt(days, 30, 1, 365);
    return {
      windowDays,
      funnel: await this.signupLog.getFunnel(
        new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000),
      ),
    };
  }

  @Get('events')
  async search(
    @Query('email') email?: string,
    @Query('correlationId') correlationId?: string,
    @Query('role') role?: string,
    @Query('outcome') outcome?: string,
    @Query('event') event?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (outcome && !['OK', 'FAIL', 'SKIP'].includes(outcome)) {
      throw new BadRequestException('outcome must be one of: OK, FAIL, SKIP');
    }
    return this.signupLog.search({
      email,
      correlationId,
      role,
      outcome,
      event,
      page: parseBoundedInt(page, 1, 1, 10_000),
      limit: parseBoundedInt(limit, 50, 1, 200),
    });
  }

  /** Full timeline for one journey. */
  @Get('timeline/:correlationId')
  async getTimeline(@Param('correlationId') correlationId: string) {
    return { events: await this.signupLog.getTimeline(correlationId) };
  }

  /**
   * Full timeline for one account, across every attempt it made.
   *
   * This is what the "Why is this profile incomplete?" link on the educator
   * approvals screen opens.
   */
  @Get('user/:userId')
  async getUserTimeline(@Param('userId') userId: string, @Query('email') email?: string) {
    return { events: await this.signupLog.getTimelineForUser(userId, email) };
  }
}

function parseBoundedInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) throw new BadRequestException('Expected a positive integer');
  return Math.min(max, Math.max(min, parseInt(raw, 10)));
}
