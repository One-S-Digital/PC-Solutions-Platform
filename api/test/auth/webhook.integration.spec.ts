import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Webhook } from 'svix';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Webhook Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let webhook: Webhook;
  
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || 'whsec_test';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    webhook = new Webhook(webhookSecret);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Webhook Security', () => {
    it('should reject webhook without Svix headers', async () => {
      await request(app.getHttpServer())
        .post('/api/webhooks/clerk')
        .send({ type: 'user.created', data: {} })
        .expect(400);
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = { type: 'user.created', data: { id: 'test' } };
      
      await request(app.getHttpServer())
        .post('/api/webhooks/clerk')
        .set('svix-id', 'test_id')
        .set('svix-timestamp', Date.now().toString())
        .set('svix-signature', 'invalid_signature')
        .send(payload)
        .expect(400);
    });

    it('should accept webhook with valid signature', async () => {
      const payload = { 
        type: 'user.created', 
        data: { 
          id: 'user_webhook_test_' + Date.now(),
          unsafe_metadata: { role: 'PARENT' }
        } 
      };
      
      const svixId = 'msg_' + Date.now();
      const svixTimestamp = Math.floor(Date.now() / 1000).toString();
      const signature = webhook.sign(
        svixId,
        svixTimestamp,
        JSON.stringify(payload)
      );
      
      await request(app.getHttpServer())
        .post('/api/webhooks/clerk')
        .set('svix-id', svixId)
        .set('svix-timestamp', svixTimestamp)
        .set('svix-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(204);
    });
  });

  describe('User Creation', () => {
    it('should create AppUser on user.created event', async () => {
      const userId = 'user_webhook_created_' + Date.now();
      const payload = { 
        type: 'user.created', 
        data: { 
          id: userId,
          unsafe_metadata: { role: 'EDUCATOR' },
          email_addresses: [{ email_address: 'test@example.com' }]
        } 
      };
      
      const svixId = 'msg_create_' + Date.now();
      const svixTimestamp = Math.floor(Date.now() / 1000).toString();
      const signature = webhook.sign(
        svixId,
        svixTimestamp,
        JSON.stringify(payload)
      );
      
      await request(app.getHttpServer())
        .post('/api/webhooks/clerk')
        .set('svix-id', svixId)
        .set('svix-timestamp', svixTimestamp)
        .set('svix-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(204);
      
      // Verify user created
      const appUser = await prisma.appUser.findUnique({
        where: { clerkId: userId }
      });
      
      expect(appUser).toBeTruthy();
      expect(appUser?.role).toBe(UserRole.EDUCATOR);
      
      // Cleanup
      if (appUser) {
        await prisma.appUser.delete({ where: { id: appUser.id } });
        await prisma.user.delete({ where: { clerkId: userId } }).catch(() => {});
      }
    });

    it('should handle user.created with invalid role', async () => {
      const userId = 'user_webhook_invalid_' + Date.now();
      const payload = { 
        type: 'user.created', 
        data: { 
          id: userId,
          unsafe_metadata: { role: 'INVALID_ROLE' }
        } 
      };
      
      const svixId = 'msg_invalid_' + Date.now();
      const svixTimestamp = Math.floor(Date.now() / 1000).toString();
      const signature = webhook.sign(
        svixId,
        svixTimestamp,
        JSON.stringify(payload)
      );
      
      await request(app.getHttpServer())
        .post('/api/webhooks/clerk')
        .set('svix-id', svixId)
        .set('svix-timestamp', svixTimestamp)
        .set('svix-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(204);
      
      // Verify user created with default role
      const appUser = await prisma.appUser.findUnique({
        where: { clerkId: userId }
      });
      
      expect(appUser).toBeTruthy();
      expect(appUser?.role).toBe(UserRole.PARENT);
      
      // Cleanup
      if (appUser) {
        await prisma.appUser.delete({ where: { id: appUser.id } });
        await prisma.user.delete({ where: { clerkId: userId } }).catch(() => {});
      }
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate webhook events', async () => {
      const userId = 'user_webhook_duplicate_' + Date.now();
      const payload = { 
        type: 'user.created', 
        data: { 
          id: userId,
          unsafe_metadata: { role: 'PARENT' }
        } 
      };
      
      const svixId = 'msg_duplicate_' + Date.now();
      const svixTimestamp = Math.floor(Date.now() / 1000).toString();
      const signature = webhook.sign(
        svixId,
        svixTimestamp,
        JSON.stringify(payload)
      );
      
      // Send first request
      await request(app.getHttpServer())
        .post('/api/webhooks/clerk')
        .set('svix-id', svixId)
        .set('svix-timestamp', svixTimestamp)
        .set('svix-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(204);
      
      // Send duplicate request with same svix-id
      await request(app.getHttpServer())
        .post('/api/webhooks/clerk')
        .set('svix-id', svixId)
        .set('svix-timestamp', svixTimestamp)
        .set('svix-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(204);
      
      // Verify only one user created
      const count = await prisma.appUser.count({
        where: { clerkId: userId }
      });
      
      expect(count).toBe(1);
      
      // Cleanup
      await prisma.appUser.deleteMany({ where: { clerkId: userId } });
      await prisma.user.deleteMany({ where: { clerkId: userId } });
    });
  });
});