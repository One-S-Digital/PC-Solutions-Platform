import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailingService } from './mailing.service';

export interface UnsubscribeStatus {
  /** Enough of the address to recognise it, not enough to harvest it. */
  maskedEmail: string | null;
  alreadyUnsubscribed: boolean;
}

/**
 * What the unsubscribe link in a campaign footer does.
 *
 * The links themselves have been generated and HMAC-signed since campaigns
 * existed (`MailingService.signUnsubscribeToken`); nothing answered them. A token
 * names one of two kinds of recipient, and they are opted out in different
 * places:
 *
 *  - a **user id** (anyone matched from the database) → their
 *    `mailingListOptOut` preference, which every database audience already
 *    honours;
 *  - an **email address** (an "extra" recipient an admin typed in, who may have
 *    no user row at all) → the `mailing_suppressions` table, which the campaign
 *    sender checks before every extra address.
 *
 * Both operations are idempotent: a link opened twice, or by a mail scanner
 * before the person, must never turn into an error.
 */
@Injectable()
export class MailingUnsubscribeService {
  private readonly logger = new Logger(MailingUnsubscribeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailing: MailingService,
  ) {}

  /**
   * Read-only. Tells the page whether the link is genuine and what it is about to
   * do, without doing it — the page asks the person to confirm. A GET that
   * unsubscribed would be triggered by every link scanner and prefetcher between
   * the sender and the inbox.
   *
   * Returns `null` for a token that does not verify.
   */
  async inspect(token: string): Promise<UnsubscribeStatus | null> {
    const claim = this.mailing.verifyUnsubscribeToken(token);
    if (!claim) return null;

    if (isEmailAddress(claim.userId)) {
      const email = normaliseEmail(claim.userId);
      const [suppressed, user] = await Promise.all([
        this.prisma.mailingSuppression.findUnique({ where: { email }, select: { id: true } }),
        this.findUserByEmail(email),
      ]);
      return {
        maskedEmail: maskEmail(email),
        alreadyUnsubscribed: Boolean(suppressed) || Boolean(user?.notificationPreferences?.mailingListOptOut),
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: claim.userId },
      select: { email: true, notificationPreferences: { select: { mailingListOptOut: true } } },
    });
    // The account is gone, so there is nothing left to opt out. Reporting that as
    // done is true, and saves the person an error about an account they deleted.
    if (!user) return { maskedEmail: null, alreadyUnsubscribed: true };

    return {
      maskedEmail: maskEmail(user.email),
      alreadyUnsubscribed: Boolean(user.notificationPreferences?.mailingListOptOut),
    };
  }

  /** Opt the token's owner out of campaign mail. Returns `false` for a token that does not verify. */
  async unsubscribe(token: string): Promise<boolean> {
    const claim = this.mailing.verifyUnsubscribeToken(token);
    if (!claim) return false;

    if (isEmailAddress(claim.userId)) {
      const email = normaliseEmail(claim.userId);
      await this.prisma.mailingSuppression.upsert({
        where: { email },
        update: {},
        create: { email, reason: 'unsubscribe', campaignId: claim.campaignId },
      });

      // The same address may also belong to a registered user, whose place in
      // database audiences comes from their preference rather than from here.
      const user = await this.findUserByEmail(email);
      if (user) await this.optOutUser(user.id);

      this.logger.log(`Unsubscribed an extra address via campaign ${claim.campaignId}`);
      return true;
    }

    const user = await this.prisma.user.findUnique({ where: { id: claim.userId }, select: { id: true } });
    if (user) {
      await this.optOutUser(user.id);
      this.logger.log(`Unsubscribed user ${user.id} via campaign ${claim.campaignId}`);
    }
    return true;
  }

  private findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, notificationPreferences: { select: { mailingListOptOut: true } } },
    });
  }

  private optOutUser(userId: string) {
    return this.prisma.userNotificationPreferences.upsert({
      where: { userId },
      update: { mailingListOptOut: true },
      create: { userId, mailingListOptOut: true },
    });
  }
}

export function isEmailAddress(subject: string): boolean {
  return subject.includes('@');
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** `ada.lovelace@example.com` → `a***@example.com`. */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local[0]}***@${domain}`;
}
