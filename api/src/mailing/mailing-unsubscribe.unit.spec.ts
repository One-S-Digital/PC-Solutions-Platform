import { BadRequestException } from '@nestjs/common';
import { MailingCampaignStatus } from '@prisma/client';
import { MailingService } from './mailing.service';
import {
  MailingUnsubscribeService,
  isEmailAddress,
  maskEmail,
  normaliseEmail,
} from './mailing-unsubscribe.service';
import { MailingUnsubscribeController } from './mailing-unsubscribe.controller';

/**
 * Every campaign footer has carried an HMAC-signed unsubscribe link since
 * campaigns existed, and no route answered it. These tests pin down what
 * answering it means: the right person is opted out, nobody else can be, the
 * action is never taken by a mere GET, and an opt-out is honoured on the next
 * send rather than only acknowledged on screen.
 */

const USER_ID = '6f1c1a7e-2b8e-4d6a-9d57-2d9f6a2f0a11';
const OTHER_USER_ID = 'b1a2c3d4-0000-4000-8000-000000000002';
const CAMPAIGN_ID = 'c0ffee00-1111-4222-8333-444455556666';

function build() {
  const prisma = {
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    userNotificationPreferences: { upsert: jest.fn().mockResolvedValue({}) },
    mailingSuppression: { findUnique: jest.fn(), upsert: jest.fn().mockResolvedValue({}), findMany: jest.fn() },
  };
  // The token functions are pure; the mailing service is only needed to mint and
  // verify them with the real secret.
  const mailing = new MailingService({} as any, {} as any);
  const service = new MailingUnsubscribeService(prisma as any, mailing);
  return { prisma, mailing, service };
}

describe('MailingUnsubscribeService.inspect', () => {
  it('rejects a token that does not verify, without touching the database', async () => {
    const { service, prisma } = build();
    await expect(service.inspect('not-a-token')).resolves.toBeNull();
    await expect(service.inspect('')).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a token whose recipient was swapped for someone else', async () => {
    const { service, mailing, prisma } = build();
    const real = mailing.signUnsubscribeToken(USER_ID, CAMPAIGN_ID);
    const [, hmac] = real.split('.');
    const forged = `${Buffer.from(`${OTHER_USER_ID}:${CAMPAIGN_ID}`).toString('base64url')}.${hmac}`;

    await expect(service.inspect(forged)).resolves.toBeNull();
    await expect(service.unsubscribe(forged)).resolves.toBe(false);
    expect(prisma.userNotificationPreferences.upsert).not.toHaveBeenCalled();
  });

  it('describes a user link without acting on it', async () => {
    const { service, mailing, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({
      email: 'ada.lovelace@example.com',
      notificationPreferences: null,
    });

    const status = await service.inspect(mailing.signUnsubscribeToken(USER_ID, CAMPAIGN_ID));

    expect(status).toEqual({ maskedEmail: 'a***@example.com', alreadyUnsubscribed: false });
    expect(prisma.userNotificationPreferences.upsert).not.toHaveBeenCalled();
  });

  it('reports a user who already opted out', async () => {
    const { service, mailing, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({
      email: 'ada@example.com',
      notificationPreferences: { mailingListOptOut: true },
    });
    const status = await service.inspect(mailing.signUnsubscribeToken(USER_ID, CAMPAIGN_ID));
    expect(status?.alreadyUnsubscribed).toBe(true);
  });

  it('treats a deleted account as already done rather than as an error', async () => {
    const { service, mailing, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    const status = await service.inspect(mailing.signUnsubscribeToken(USER_ID, CAMPAIGN_ID));
    expect(status).toEqual({ maskedEmail: null, alreadyUnsubscribed: true });
  });

  it('recognises a suppressed extra address', async () => {
    const { service, mailing, prisma } = build();
    prisma.mailingSuppression.findUnique.mockResolvedValue({ id: 's1' });
    prisma.user.findFirst.mockResolvedValue(null);

    const status = await service.inspect(mailing.signUnsubscribeToken('Guest@Example.com', CAMPAIGN_ID));

    expect(status).toEqual({ maskedEmail: 'g***@example.com', alreadyUnsubscribed: true });
    expect(prisma.mailingSuppression.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'guest@example.com' } }),
    );
  });

  it('recognises an extra address that belongs to a registered user who opted out', async () => {
    const { service, mailing, prisma } = build();
    prisma.mailingSuppression.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id: USER_ID, notificationPreferences: { mailingListOptOut: true } });
    const status = await service.inspect(mailing.signUnsubscribeToken('ada@example.com', CAMPAIGN_ID));
    expect(status?.alreadyUnsubscribed).toBe(true);
  });
});

describe('MailingUnsubscribeService.unsubscribe', () => {
  it('opts the token owner out, creating their preferences row if they never had one', async () => {
    const { service, mailing, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID });

    await expect(service.unsubscribe(mailing.signUnsubscribeToken(USER_ID, CAMPAIGN_ID))).resolves.toBe(true);

    expect(prisma.userNotificationPreferences.upsert).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      update: { mailingListOptOut: true },
      create: { userId: USER_ID, mailingListOptOut: true },
    });
  });

  it('opts out only the person the link names', async () => {
    const { service, mailing, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
    await service.unsubscribe(mailing.signUnsubscribeToken(USER_ID, CAMPAIGN_ID));

    const touched = prisma.userNotificationPreferences.upsert.mock.calls.map(c => c[0].where.userId);
    expect(touched).toEqual([USER_ID]);
  });

  it('is idempotent — opening the link again, or a scanner opening it first, changes nothing', async () => {
    const { service, mailing, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID });
    const token = mailing.signUnsubscribeToken(USER_ID, CAMPAIGN_ID);

    await expect(service.unsubscribe(token)).resolves.toBe(true);
    await expect(service.unsubscribe(token)).resolves.toBe(true);

    for (const [args] of prisma.userNotificationPreferences.upsert.mock.calls) {
      expect(args.update).toEqual({ mailingListOptOut: true });
    }
  });

  it('succeeds quietly for an account that no longer exists', async () => {
    const { service, mailing, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.unsubscribe(mailing.signUnsubscribeToken(USER_ID, CAMPAIGN_ID))).resolves.toBe(true);
    expect(prisma.userNotificationPreferences.upsert).not.toHaveBeenCalled();
  });

  it('suppresses an extra address by lowercase email, and remembers which campaign', async () => {
    const { service, mailing, prisma } = build();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.unsubscribe(mailing.signUnsubscribeToken('Guest@Example.COM', CAMPAIGN_ID))).resolves.toBe(true);

    expect(prisma.mailingSuppression.upsert).toHaveBeenCalledWith({
      where: { email: 'guest@example.com' },
      update: {},
      create: { email: 'guest@example.com', reason: 'unsubscribe', campaignId: CAMPAIGN_ID },
    });
    expect(prisma.userNotificationPreferences.upsert).not.toHaveBeenCalled();
  });

  it('also opts out the registered user behind an extra address', async () => {
    const { service, mailing, prisma } = build();
    prisma.user.findFirst.mockResolvedValue({ id: USER_ID });

    await service.unsubscribe(mailing.signUnsubscribeToken('ada@example.com', CAMPAIGN_ID));

    expect(prisma.mailingSuppression.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.userNotificationPreferences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );
  });

  it('writes nothing for an invalid token', async () => {
    const { service, prisma } = build();
    await expect(service.unsubscribe('garbage.deadbeef')).resolves.toBe(false);
    expect(prisma.userNotificationPreferences.upsert).not.toHaveBeenCalled();
    expect(prisma.mailingSuppression.upsert).not.toHaveBeenCalled();
  });
});

describe('MailingUnsubscribeController', () => {
  function controller(overrides: Partial<Record<'inspect' | 'unsubscribe', jest.Mock>> = {}) {
    const service = {
      inspect: jest.fn().mockResolvedValue({ maskedEmail: 'a***@example.com', alreadyUnsubscribed: false }),
      unsubscribe: jest.fn().mockResolvedValue(true),
      ...overrides,
    };
    return { ctrl: new MailingUnsubscribeController(service as any), service };
  }

  it('GET status reads and never acts', async () => {
    const { ctrl, service } = controller();
    const res = await ctrl.status('tok');
    expect(res).toEqual({ success: true, data: { maskedEmail: 'a***@example.com', alreadyUnsubscribed: false } });
    expect(service.inspect).toHaveBeenCalledWith('tok');
    expect(service.unsubscribe).not.toHaveBeenCalled();
  });

  it('POST acts, taking the token from the query string first, then the body', async () => {
    const { ctrl, service } = controller();
    await expect(ctrl.confirm('from-query', { token: 'from-body' })).resolves.toEqual({ success: true });
    expect(service.unsubscribe).toHaveBeenLastCalledWith('from-query');

    await ctrl.confirm(undefined, { token: 'from-body' });
    expect(service.unsubscribe).toHaveBeenLastCalledWith('from-body');
  });

  it.each([undefined, '', 'x'.repeat(1025)])('rejects a missing or oversized token (%#)', async token => {
    const { ctrl, service } = controller();
    await expect(ctrl.status(token as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(ctrl.confirm(token as any, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(service.inspect).not.toHaveBeenCalled();
    expect(service.unsubscribe).not.toHaveBeenCalled();
  });

  it('answers 400 when the token does not verify', async () => {
    const { ctrl } = controller({
      inspect: jest.fn().mockResolvedValue(null),
      unsubscribe: jest.fn().mockResolvedValue(false),
    });
    await expect(ctrl.status('bad')).rejects.toBeInstanceOf(BadRequestException);
    await expect(ctrl.confirm('bad')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('address helpers', () => {
  it('tells an email subject from a user id', () => {
    expect(isEmailAddress('ada@example.com')).toBe(true);
    expect(isEmailAddress(USER_ID)).toBe(false);
  });

  it('normalises case and whitespace', () => {
    expect(normaliseEmail('  Ada@Example.COM ')).toBe('ada@example.com');
  });

  it('masks an address without revealing the local part', () => {
    expect(maskEmail('ada.lovelace@example.com')).toBe('a***@example.com');
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail('not-an-address')).toBeNull();
  });
});

describe('campaign sending honours suppressions', () => {
  function sendHarness(extraEmails: string[], suppressedEmails: string[]) {
    const campaign = {
      id: CAMPAIGN_ID,
      subject: 'Hello',
      bodyHtml: '<p>Hi</p>',
      bodyText: 'Hi',
      status: MailingCampaignStatus.SENDING,
      filtersJson: null,
      segmentId: null,
      extraEmailsJson: extraEmails,
      extraEmailsSent: false,
      sentCount: 0,
      failedCount: 0,
      cursor: null,
    };
    const sendEmail = jest.fn().mockResolvedValue({ success: true, messageId: 'm1', provider: 'test' });
    const prisma = {
      mailingCampaign: {
        findUnique: jest.fn().mockResolvedValue(campaign),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      frontendSettings: { findFirst: jest.fn().mockResolvedValue(null) },
      mailingSuppression: {
        findMany: jest.fn().mockResolvedValue(suppressedEmails.map(email => ({ email }))),
      },
      emailLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const transport = { isConfigured: () => true, sendEmail };
    const service = new MailingService(prisma as any, transport as any);
    return { service, sendEmail, prisma };
  }

  beforeEach(() => {
    process.env.MAILING_SMTP_RATE_LIMIT_MS = '0';
  });

  it('does not mail an extra address that unsubscribed, whatever its case', async () => {
    const { service, sendEmail } = sendHarness(
      ['gone@example.com', 'Stay@Example.com'],
      ['gone@example.com'],
    );

    const result = await service.sendBatch(CAMPAIGN_ID, 10);

    const recipients = sendEmail.mock.calls.map(c => c[0].to);
    expect(recipients).toEqual(['Stay@Example.com']);
    expect(result.sentCountThisBatch).toBe(1);
  });

  it('matches a suppression written in lowercase against an address pasted in mixed case', async () => {
    const { service, sendEmail, prisma } = sendHarness(['Gone@Example.COM'], ['gone@example.com']);

    await service.sendBatch(CAMPAIGN_ID, 10);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(prisma.mailingSuppression.findMany).toHaveBeenCalledWith({
      where: { email: { in: ['gone@example.com'] } },
      select: { email: true },
    });
  });

  it('still mails everyone when nobody has unsubscribed', async () => {
    const { service, sendEmail } = sendHarness(['a@example.com', 'b@example.com'], []);
    await service.sendBatch(CAMPAIGN_ID, 10);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('puts a working, three-language unsubscribe link in the footer', async () => {
    const { service, sendEmail } = sendHarness(['a@example.com'], []);
    await service.sendBatch(CAMPAIGN_ID, 10);

    const { html } = sendEmail.mock.calls[0][0];
    expect(html).toMatch(/\/unsubscribe\?token=[A-Za-z0-9_-]+\.[0-9a-f]{64}/);
    expect(html).toContain('Se désabonner');
    expect(html).toContain('Abmelden');
    expect(html).toContain('Unsubscribe');
  });
});
