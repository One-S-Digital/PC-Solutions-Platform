import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

const MAILPIT_API_URL = process.env.MAILPIT_API_URL || 'http://localhost:8025/api/v1';

// Helper function to poll Mailpit for emails
async function waitForMailByHeader(header: string, value: string, timeoutMs = 7000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${MAILPIT_API_URL}/messages`);
      if (res.ok) {
        const data: any = await res.json();
        const msg = data.messages?.find((m: any) => {
          const h = m.Headers || {};
          const vals: string[] = Array.isArray(h[header]) ? h[header] : (h[header] ? [h[header]] : []);
          return vals.some(v => String(v).includes(value));
        });
        if (msg) return msg;
      }
    } catch (error) {
      // Continue polling
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Email with header ${header}=${value} not found within ${timeoutMs}ms`);
}

describe('Email Notifications E2E Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  let testUserToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Get test user
    const testUser = await prismaService.user.findUnique({
      where: { email: 'parent@demo.ch' }
    });
    
    testUserId = testUser?.id || '';
    testUserToken = jwtService.sign({
      sub: testUser?.clerkId,
      email: testUser?.email,
      role: testUser?.role
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Password Reset Email', () => {
    it('should send password reset email with correct content', async () => {
      const resetData = {
        to: 'user@test.local',
        link: 'https://app.local/reset?token=abc123'
      };

      const response = await request(app.getHttpServer())
        .post('/api/test-notify/password-reset')
        .send(resetData)
        .expect(201);

      expect(response.body).toHaveProperty('messageId');

      // Wait for email to arrive in Mailpit
      const msg = await waitForMailByHeader('X-Template', 'password-reset');
      
      expect(msg.To?.[0]?.Address).toBe(resetData.to);
      expect(msg.Subject).toMatch(/reset your password/i);

      // Get full message content
      const fullMessage = await fetch(`${MAILPIT_API_URL}/message/${msg.ID}`).then(r => r.json());
      const body = (fullMessage?.Text || fullMessage?.HTML || '');
      
      expect(body).toMatch(/abc123/);
      expect(body).toMatch(/password reset/i);
    });

    it('should include proper headers in password reset email', async () => {
      const resetData = {
        to: 'user@test.local',
        link: 'https://app.local/reset?token=def456'
      };

      await request(app.getHttpServer())
        .post('/api/test-notify/password-reset')
        .send(resetData)
        .expect(201);

      const msg = await waitForMailByHeader('X-Template', 'password-reset');
      
      expect(msg.Headers).toHaveProperty('X-Template');
      expect(msg.Headers['X-Template']).toBe('password-reset');
      expect(msg.Headers).toHaveProperty('X-Priority');
      expect(msg.Headers['X-Priority']).toBe('1'); // High priority
    });
  });

  describe('Invoice Email', () => {
    it('should send invoice email with billing details', async () => {
      const invoiceData = {
        to: 'billing@test.local',
        invoiceNo: 'INV-1001',
        amount: '49.00',
        currency: 'CHF'
      };

      const response = await request(app.getHttpServer())
        .post('/api/test-notify/invoice')
        .send(invoiceData)
        .expect(201);

      expect(response.body).toHaveProperty('messageId');

      const msg = await waitForMailByHeader('X-Template', 'invoice');
      
      expect(msg.To?.[0]?.Address).toBe(invoiceData.to);
      expect(msg.Subject).toMatch(/invoice/i);

      const fullMessage = await fetch(`${MAILPIT_API_URL}/message/${msg.ID}`).then(r => r.json());
      const body = (fullMessage?.Text || fullMessage?.HTML || '');
      
      expect(body).toMatch(/INV-1001/);
      expect(body).toMatch(/49\.00/);
      expect(body).toMatch(/CHF/);
    });

    it('should include PDF attachment for invoice', async () => {
      const invoiceData = {
        to: 'billing@test.local',
        invoiceNo: 'INV-1002',
        amount: '99.00',
        currency: 'CHF',
        includePdf: true
      };

      await request(app.getHttpServer())
        .post('/api/test-notify/invoice')
        .send(invoiceData)
        .expect(201);

      const msg = await waitForMailByHeader('X-Template', 'invoice');
      
      expect(msg.Attachments).toBeDefined();
      expect(msg.Attachments.length).toBeGreaterThan(0);
      
      const pdfAttachment = msg.Attachments.find((att: any) => 
        att.ContentType === 'application/pdf'
      );
      expect(pdfAttachment).toBeDefined();
    });
  });

  describe('Message Alert Email', () => {
    it('should send message alert to parent', async () => {
      const messageData = {
        to: 'parent@test.local',
        fromName: 'Educator Alice',
        childName: 'Emma',
        messagePreview: 'Emma had a great day today!'
      };

      const response = await request(app.getHttpServer())
        .post('/api/test-notify/message')
        .send(messageData)
        .expect(201);

      expect(response.body).toHaveProperty('messageId');

      const msg = await waitForMailByHeader('X-Template', 'message-alert');
      
      expect(msg.To?.[0]?.Address).toBe(messageData.to);
      expect(msg.Subject).toMatch(/new message/i);

      const fullMessage = await fetch(`${MAILPIT_API_URL}/message/${msg.ID}`).then(r => r.json());
      const body = (fullMessage?.Text || fullMessage?.HTML || '');
      
      expect(body).toMatch(/Educator Alice/);
      expect(body).toMatch(/Emma/);
    });

    it('should include conversation link in message alert', async () => {
      const messageData = {
        to: 'parent@test.local',
        fromName: 'Educator Bob',
        childName: 'Liam',
        conversationId: 'conv_123'
      };

      await request(app.getHttpServer())
        .post('/api/test-notify/message')
        .send(messageData)
        .expect(201);

      const msg = await waitForMailByHeader('X-Template', 'message-alert');
      
      const fullMessage = await fetch(`${MAILPIT_API_URL}/message/${msg.ID}`).then(r => r.json());
      const body = (fullMessage?.Text || fullMessage?.HTML || '');
      
      expect(body).toMatch(/conversation/i);
      expect(body).toMatch(/conv_123/);
    });
  });

  describe('Subscription Notification Emails', () => {
    it('should send subscription confirmation email', async () => {
      const subscriptionData = {
        to: 'customer@test.local',
        planName: 'Professional Plan',
        amount: '99.00',
        currency: 'CHF',
        billingPeriod: 'monthly'
      };

      const response = await request(app.getHttpServer())
        .post('/api/test-notify/subscription-confirmation')
        .send(subscriptionData)
        .expect(201);

      expect(response.body).toHaveProperty('messageId');

      const msg = await waitForMailByHeader('X-Template', 'subscription-confirmation');
      
      expect(msg.To?.[0]?.Address).toBe(subscriptionData.to);
      expect(msg.Subject).toMatch(/subscription confirmed/i);

      const fullMessage = await fetch(`${MAILPIT_API_URL}/message/${msg.ID}`).then(r => r.json());
      const body = (fullMessage?.Text || fullMessage?.HTML || '');
      
      expect(body).toMatch(/Professional Plan/);
      expect(body).toMatch(/99\.00/);
      expect(body).toMatch(/monthly/);
    });

    it('should send subscription cancellation email', async () => {
      const cancellationData = {
        to: 'customer@test.local',
        planName: 'Essential Plan',
        cancellationDate: '2024-02-15',
        accessUntil: '2024-03-15'
      };

      const response = await request(app.getHttpServer())
        .post('/api/test-notify/subscription-cancellation')
        .send(cancellationData)
        .expect(201);

      expect(response.body).toHaveProperty('messageId');

      const msg = await waitForMailByHeader('X-Template', 'subscription-cancellation');
      
      expect(msg.To?.[0]?.Address).toBe(cancellationData.to);
      expect(msg.Subject).toMatch(/subscription cancelled/i);

      const fullMessage = await fetch(`${MAILPIT_API_URL}/message/${msg.ID}`).then(r => r.json());
      const body = (fullMessage?.Text || fullMessage?.HTML || '');
      
      expect(body).toMatch(/Essential Plan/);
      expect(body).toMatch(/2024-02-15/);
      expect(body).toMatch(/2024-03-15/);
    });
  });

  describe('Email Template Validation', () => {
    it('should use correct sender information', async () => {
      const testData = {
        to: 'test@example.com',
        link: 'https://app.local/test'
      };

      await request(app.getHttpServer())
        .post('/api/test-notify/password-reset')
        .send(testData)
        .expect(201);

      const msg = await waitForMailByHeader('X-Template', 'password-reset');
      
      expect(msg.From?.Address).toMatch(/@.*\.ch$/); // Swiss domain
      expect(msg.From?.Name).toContain('PC Solutions');
    });

    it('should include unsubscribe link in marketing emails', async () => {
      const marketingData = {
        to: 'subscriber@test.local',
        subject: 'Monthly Newsletter',
        content: 'Check out our latest features!'
      };

      await request(app.getHttpServer())
        .post('/api/test-notify/marketing')
        .send(marketingData)
        .expect(201);

      const msg = await waitForMailByHeader('X-Template', 'marketing');
      
      const fullMessage = await fetch(`${MAILPIT_API_URL}/message/${msg.ID}`).then(r => r.json());
      const body = (fullMessage?.Text || fullMessage?.HTML || '');
      
      expect(body).toMatch(/unsubscribe/i);
      expect(body).toMatch(/unsubscribe-link/);
    });

    it('should handle HTML and text versions', async () => {
      const testData = {
        to: 'test@example.com',
        link: 'https://app.local/test'
      };

      await request(app.getHttpServer())
        .post('/api/test-notify/password-reset')
        .send(testData)
        .expect(201);

      const msg = await waitForMailByHeader('X-Template', 'password-reset');
      
      expect(msg.HTML).toBeDefined();
      expect(msg.Text).toBeDefined();
      expect(msg.HTML.length).toBeGreaterThan(0);
      expect(msg.Text.length).toBeGreaterThan(0);
    });
  });

  describe('Email Delivery and Error Handling', () => {
    it('should handle invalid email addresses gracefully', async () => {
      const invalidData = {
        to: 'invalid-email',
        link: 'https://app.local/test'
      };

      const response = await request(app.getHttpServer())
        .post('/api/test-notify/password-reset')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid email');
    });

    it('should log email delivery attempts', async () => {
      const testData = {
        to: 'test@example.com',
        link: 'https://app.local/test'
      };

      await request(app.getHttpServer())
        .post('/api/test-notify/password-reset')
        .send(testData)
        .expect(201);

      // Check email log was created
      const emailLog = await prismaService.emailLog.findFirst({
        where: { to: testData.to }
      });

      expect(emailLog).toBeDefined();
      expect(emailLog?.template).toBe('password-reset');
      expect(emailLog?.status).toBe('SENT');
    });

    it('should handle SMTP connection failures', async () => {
      // Mock SMTP failure by changing configuration
      const originalSmtpHost = process.env.SMTP_HOST;
      process.env.SMTP_HOST = 'nonexistent-smtp-server';

      const testData = {
        to: 'test@example.com',
        link: 'https://app.local/test'
      };

      const response = await request(app.getHttpServer())
        .post('/api/test-notify/password-reset')
        .send(testData)
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Email service unavailable');

      // Restore original configuration
      process.env.SMTP_HOST = originalSmtpHost;
    });
  });

  describe('Email Rate Limiting', () => {
    it('should respect rate limits for email sending', async () => {
      const testData = {
        to: 'test@example.com',
        link: 'https://app.local/test'
      };

      // Send multiple emails rapidly
      const promises = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/test-notify/password-reset')
          .send(testData)
      );

      const responses = await Promise.allSettled(promises);
      
      // Some should succeed, some should be rate limited
      const successCount = responses.filter(r => r.status === 'fulfilled' && r.value.status === 201).length;
      const rateLimitedCount = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429).length;
      
      expect(successCount).toBeGreaterThan(0);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Email Analytics and Tracking', () => {
    it('should track email opens', async () => {
      const testData = {
        to: 'tracking@test.local',
        link: 'https://app.local/test'
      };

      await request(app.getHttpServer())
        .post('/api/test-notify/password-reset')
        .send(testData)
        .expect(201);

      const msg = await waitForMailByHeader('X-Template', 'password-reset');
      
      // Simulate email open by accessing tracking pixel
      const trackingPixelUrl = `http://localhost:3000/api/email/track/open/${msg.ID}`;
      
      const trackingResponse = await request(app.getHttpServer())
        .get(`/api/email/track/open/${msg.ID}`)
        .expect(200);

      expect(trackingResponse.headers['content-type']).toContain('image/png');

      // Verify tracking was recorded
      const emailLog = await prismaService.emailLog.findFirst({
        where: { messageId: msg.ID }
      });

      expect(emailLog).toBeDefined();
      expect(emailLog?.openedAt).toBeDefined();
    });

    it('should track email clicks', async () => {
      const testData = {
        to: 'clicking@test.local',
        link: 'https://app.local/test'
      };

      await request(app.getHttpServer())
        .post('/api/test-notify/password-reset')
        .send(testData)
        .expect(201);

      const msg = await waitForMailByHeader('X-Template', 'password-reset');
      
      // Simulate link click
      const clickResponse = await request(app.getHttpServer())
        .get(`/api/email/track/click/${msg.ID}`)
        .query({ url: 'https://app.local/test' })
        .expect(302);

      expect(clickResponse.headers.location).toBe('https://app.local/test');

      // Verify click was tracked
      const emailLog = await prismaService.emailLog.findFirst({
        where: { messageId: msg.ID }
      });

      expect(emailLog).toBeDefined();
      expect(emailLog?.clickedAt).toBeDefined();
    });
  });
});