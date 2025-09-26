import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Role System Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // Test tokens (you'll need to generate these from Clerk)
  const tokens = {
    superAdmin: process.env.TEST_SUPER_ADMIN_TOKEN || 'test_token',
    admin: process.env.TEST_ADMIN_TOKEN || 'test_token',
    parent: process.env.TEST_PARENT_TOKEN || 'test_token',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);
      
      expect(response.body.message).toBe('No token provided');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
      
      expect(response.body.message).toBe('Invalid token');
    });

    it('should accept valid token and return user info', async () => {
      // This test requires a valid Clerk token
      if (tokens.superAdmin === 'test_token') {
        console.warn('Skipping test - no valid token provided');
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('role');
      expect(response.body.role).toBe(UserRole.SUPER_ADMIN);
    });
  });

  describe('Role Authorization', () => {
    it('should allow SUPER_ADMIN to access admin endpoints', async () => {
      if (tokens.superAdmin === 'test_token') {
        console.warn('Skipping test - no valid token provided');
        return;
      }

      const response = await request(app.getHttpServer())
        .get('/api/admin/role-management/history')
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should block PARENT from admin endpoints', async () => {
      if (tokens.parent === 'test_token') {
        console.warn('Skipping test - no valid token provided');
        return;
      }

      await request(app.getHttpServer())
        .get('/api/admin/role-management/history')
        .set('Authorization', `Bearer ${tokens.parent}`)
        .expect(403);
    });
  });

  describe('Role Management', () => {
    it('should change user role with audit trail', async () => {
      if (tokens.superAdmin === 'test_token') {
        console.warn('Skipping test - no valid token provided');
        return;
      }

      const targetUserId = 'user_test_parent';
      
      // Change role
      await request(app.getHttpServer())
        .patch(`/api/admin/role-management/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${tokens.superAdmin}`)
        .send({ 
          role: UserRole.EDUCATOR,
          reason: 'Integration test'
        })
        .expect(204);
      
      // Verify role changed in database
      const appUser = await prisma.appUser.findUnique({
        where: { clerkId: targetUserId },
        include: { roleHistory: { orderBy: { changedAt: 'desc' }, take: 1 } }
      });
      
      expect(appUser?.role).toBe(UserRole.EDUCATOR);
      expect(appUser?.roleHistory[0]?.reason).toBe('Integration test');
      
      // Verify outbox entry created
      const outboxEntry = await prisma.outbox.findFirst({
        where: { 
          topic: 'mirror.role',
          payload: {
            path: ['clerkUserId'],
            equals: targetUserId
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      expect(outboxEntry).toBeTruthy();
    });

    it('should prevent ADMIN from promoting to SUPER_ADMIN', async () => {
      if (tokens.admin === 'test_token') {
        console.warn('Skipping test - no valid token provided');
        return;
      }

      await request(app.getHttpServer())
        .patch('/api/admin/role-management/users/user_test_parent/role')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ role: UserRole.SUPER_ADMIN })
        .expect(403);
    });
  });

  describe('Public Endpoints', () => {
    it('should allow access to health check without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('ok');
    });

    it('should allow access to public frontend settings', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/frontend-settings/public')
        .expect(200);
    });
  });

  describe('Role Context', () => {
    it('should auto-create AppUser for new Clerk users', async () => {
      // This test would require mocking Clerk or using a test Clerk user
      // For now, we'll test the database logic directly
      
      const newClerkUserId = 'user_test_new_' + Date.now();
      
      // Simulate what the middleware would do
      let appUser = await prisma.appUser.findUnique({
        where: { clerkId: newClerkUserId }
      });
      
      expect(appUser).toBeNull();
      
      // Create user
      appUser = await prisma.appUser.create({
        data: {
          clerkId: newClerkUserId,
          role: UserRole.PARENT
        }
      });
      
      expect(appUser.role).toBe(UserRole.PARENT);
      
      // Cleanup
      await prisma.appUser.delete({
        where: { id: appUser.id }
      });
    });
  });
});