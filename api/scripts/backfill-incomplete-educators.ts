/**
 * Report — and optionally chase — educator accounts that were never completed.
 *
 * Background: an educator's account is created by the Clerk `user.created`
 * webhook at email verification, which happens BEFORE step 3 of the signup
 * wizard collects the actual profile (bio, experience, CV). Anyone who dropped
 * out between those two points ended up with a real, admin-visible account and
 * a completely empty profile. Migration 20260701020000 reclassifies them to
 * INCOMPLETE; this script finds them and, with --execute, emails them a link to
 * finish.
 *
 * Usage:
 *   ts-node scripts/backfill-incomplete-educators.ts              # dry run (default)
 *   ts-node scripts/backfill-incomplete-educators.ts --execute    # send reminders
 *   ts-node scripts/backfill-incomplete-educators.ts --execute --limit 5
 *   ts-node scripts/backfill-incomplete-educators.ts --resend     # ignore "already emailed"
 *
 * Dry run is the default on purpose: this touches real users' inboxes.
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { EducatorApprovalStatus, PrismaClient, UserRole } from '@prisma/client';
import { EmailNotificationModule } from '../src/email-notification/email-notification.module';
import { EmailNotificationService } from '../src/email-notification/email-notification.service';

const REMINDER_EVENT = 'educator_profile_incomplete';

// Deliberately does NOT import AppModule: that registers ScheduleModule, which
// would start every cron in the API for the lifetime of this script.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), EmailNotificationModule],
})
class BackfillModule {}

interface Options {
  execute: boolean;
  resend: boolean;
  limit?: number;
}

function parseArgs(argv: string[]): Options {
  const limitFlagIndex = argv.indexOf('--limit');
  const rawLimit = limitFlagIndex >= 0 ? Number.parseInt(argv[limitFlagIndex + 1] ?? '', 10) : NaN;

  if (limitFlagIndex >= 0 && (!Number.isInteger(rawLimit) || rawLimit <= 0)) {
    throw new Error('--limit requires a positive integer');
  }

  return {
    execute: argv.includes('--execute'),
    resend: argv.includes('--resend'),
    limit: Number.isInteger(rawLimit) ? rawLimit : undefined,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    // Status distribution, so the operator can see what the migration did.
    const byStatus = await prisma.user.groupBy({
      by: ['approvalStatus'],
      where: { role: UserRole.EDUCATOR },
      _count: { _all: true },
    });

    console.log('\nEducator accounts by approval status:');
    for (const row of byStatus) {
      console.log(`  ${String(row.approvalStatus ?? 'NULL').padEnd(15)} ${row._count._all}`);
    }

    // Belt and braces: match on the status the migration sets AND on the
    // underlying condition, so a row the migration missed is still caught.
    const candidates = await prisma.user.findMany({
      where: {
        role: UserRole.EDUCATOR,
        approvalStatus: { in: [EducatorApprovalStatus.INCOMPLETE, EducatorApprovalStatus.PENDING_REVIEW] },
        AND: [
          { OR: [{ shortBio: null }, { shortBio: '' }] },
          { OR: [{ cvUrl: null }, { cvUrl: '' }] },
        ],
        email: { not: null },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        approvalStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      ...(options.limit ? { take: options.limit } : {}),
    });

    if (candidates.length === 0) {
      console.log('\nNo incomplete educator accounts found. Nothing to do.\n');
      return;
    }

    // Who has already had this reminder?
    const alreadyEmailed = new Set<string>();
    if (!options.resend) {
      const logs = await prisma.emailLog.findMany({
        where: {
          event: REMINDER_EVENT,
          status: 'sent',
          recipient: { in: candidates.map((c) => c.email as string) },
        },
        select: { recipient: true },
      });
      for (const log of logs) alreadyEmailed.add(log.recipient.toLowerCase());
    }

    const targets = candidates.filter((c) => !alreadyEmailed.has((c.email as string).toLowerCase()));

    console.log(`\nIncomplete educator accounts: ${candidates.length}`);
    console.log(`  already reminded: ${candidates.length - targets.length}`);
    console.log(`  to contact:       ${targets.length}\n`);

    for (const educator of targets) {
      const name = `${educator.firstName || ''} ${educator.lastName || ''}`.trim() || '(no name)';
      console.log(
        `  ${educator.createdAt.toISOString().slice(0, 10)}  ${String(educator.approvalStatus).padEnd(14)}  ${String(educator.email).padEnd(40)}  ${name}`,
      );
    }

    if (!options.execute) {
      console.log('\nDRY RUN — no emails sent. Re-run with --execute to send reminders.\n');
      return;
    }

    const app = await NestFactory.createApplicationContext(BackfillModule, {
      logger: ['error', 'warn'],
    });

    try {
      const emailService = app.get(EmailNotificationService);
      const config = app.get(ConfigService);
      const appUrl = config.get<string>('APP_URL') || config.get<string>('FRONTEND_URL') || '';

      if (!appUrl) {
        throw new Error('APP_URL (or FRONTEND_URL) must be set so the email can link back to the app.');
      }

      let sent = 0;
      let failed = 0;

      for (const educator of targets) {
        const ok = await emailService
          .sendNotification({
            event: REMINDER_EVENT,
            recipient: educator.email as string,
            recipientName: educator.firstName || undefined,
            payload: {
              firstName: educator.firstName || 'Educator',
              // LoginPage has no redirect parameter, but the role-based redirect
              // lands an incomplete educator on /educator/pending-approval,
              // which offers the "Finish your application" call to action.
              loginUrl: `${appUrl}/login`,
              supportUrl: `${appUrl}/support`,
            },
            bypassPreferences: true,
            allowUnknownRecipient: false,
          })
          .catch((err: any) => {
            console.error(`  FAILED ${educator.email}: ${err?.message || err}`);
            return false;
          });

        if (ok) {
          sent += 1;
        } else {
          failed += 1;
          console.warn(`  not sent: ${educator.email}`);
        }
      }

      console.log(`\nDone. sent=${sent} failed=${failed}\n`);
    } finally {
      await app.close();
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
