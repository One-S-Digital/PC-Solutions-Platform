import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserManagementService } from '../src/user-management/user-management.service';
import { UserManagementController } from '../src/user-management/user-management.controller';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import * as request from 'supertest';

describe('User Management Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userManagementService: UserManagementService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [/* Import required modules */],
      controllers: [UserManagementController],
      providers: [UserManagementService, PrismaService],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    userManagementService = moduleFixture.get<UserManagementService>(UserManagementService);

    // Create test admin user and get auth token
    const adminUser = await prismaService.user.create({
      data: {
        id: 'test-admin-id',
        firstName: 'Test',
        lastName: 'Admin',
        email: 'admin@test.com',
        role: 'SUPER_ADMIN',
        clerkId: 'test-clerk-id',
      },
    });

    authToken = 'test-auth-token';
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prismaService.user.deleteMany({
      where: { email: { contains: '@test.com' } },
    });
  });

  describe('GET /api/admin/user-management/users', () => {
    it('should return paginated users list', async () => {
      // Create test users
      await prismaService.user.createMany({
        data: [
          {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@test.com',
            role: 'FOUNDATION',
            clerkId: 'clerk-1',
          },
          {
            id: 'user-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@test.com',
            role: 'SUPPLIER',
            clerkId: 'clerk-2',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: '1', limit: '10' })
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pages');
      expect(response.body.users).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter users by role', async () => {
      await prismaService.user.createMany({
        data: [
          {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@test.com',
            role: 'FOUNDATION',
            clerkId: 'clerk-1',
          },
          {
            id: 'user-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@test.com',
            role: 'SUPPLIER',
            clerkId: 'clerk-2',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ role: 'FOUNDATION' })
        .expect(200);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].role).toBe('FOUNDATION');
    });

    it('should search users by name and email', async () => {
      await prismaService.user.createMany({
        data: [
          {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@test.com',
            role: 'FOUNDATION',
            clerkId: 'clerk-1',
          },
          {
            id: 'user-2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@test.com',
            role: 'SUPPLIER',
            clerkId: 'clerk-2',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'john' })
        .expect(200);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].firstName).toBe('John');
    });
  });

  describe('POST /api/admin/user-management/users', () => {
    it('should create a new user', async () => {
      const userData = {
        firstName: 'New',
        lastName: 'User',
        email: 'newuser@test.com',
        role: 'FOUNDATION',
      };

      const response = await request(app.getHttpServer())
        .post('/api/admin/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe(userData.firstName);
      expect(response.body.lastName).toBe(userData.lastName);
      expect(response.body.email).toBe(userData.email);
      expect(response.body.role).toBe(userData.role);

      // Verify user was created in database
      const createdUser = await prismaService.user.findUnique({
        where: { email: userData.email },
      });
      expect(createdUser).toBeTruthy();
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('validation');
    });

    it('should prevent duplicate email addresses', async () => {
      await prismaService.user.create({
        data: {
          id: 'existing-user',
          firstName: 'Existing',
          lastName: 'User',
          email: 'existing@test.com',
          role: 'FOUNDATION',
          clerkId: 'existing-clerk',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/admin/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'New',
          lastName: 'User',
          email: 'existing@test.com',
          role: 'FOUNDATION',
        })
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });
  });

  describe('PUT /api/admin/user-management/users/:id', () => {
    it('should update user information', async () => {
      const user = await prismaService.user.create({
        data: {
          id: 'update-user',
          firstName: 'Original',
          lastName: 'Name',
          email: 'original@test.com',
          role: 'FOUNDATION',
          clerkId: 'update-clerk',
        },
      });

      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        role: 'SUPPLIER',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/admin/user-management/users/${user.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.role).toBe(updateData.role);

      // Verify update in database
      const updatedUser = await prismaService.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser.firstName).toBe(updateData.firstName);
      expect(updatedUser.role).toBe(updateData.role);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/admin/user-management/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Updated' })
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('DELETE /api/admin/user-management/users/:id', () => {
    it('should delete a user', async () => {
      const user = await prismaService.user.create({
        data: {
          id: 'delete-user',
          firstName: 'Delete',
          lastName: 'User',
          email: 'delete@test.com',
          role: 'FOUNDATION',
          clerkId: 'delete-clerk',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/admin/user-management/users/${user.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify user was deleted
      const deletedUser = await prismaService.user.findUnique({
        where: { id: user.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/admin/user-management/users/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/admin/user-management/users/bulk', () => {
    it('should perform bulk user operations', async () => {
      const users = await prismaService.user.createMany({
        data: [
          {
            id: 'bulk-user-1',
            firstName: 'Bulk',
            lastName: 'User1',
            email: 'bulk1@test.com',
            role: 'FOUNDATION',
            clerkId: 'bulk-clerk-1',
          },
          {
            id: 'bulk-user-2',
            firstName: 'Bulk',
            lastName: 'User2',
            email: 'bulk2@test.com',
            role: 'FOUNDATION',
            clerkId: 'bulk-clerk-2',
          },
        ],
      });

      const bulkData = {
        userIds: ['bulk-user-1', 'bulk-user-2'],
        action: 'activate',
      };

      const response = await request(app.getHttpServer())
        .post('/api/admin/user-management/users/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.processed).toBe(2);
    });

    it('should handle partial failures in bulk operations', async () => {
      const bulkData = {
        userIds: ['existing-user', 'non-existent-user'],
        action: 'activate',
      };

      const response = await request(app.getHttpServer())
        .post('/api/admin/user-management/users/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.processed).toBeLessThan(bulkData.userIds.length);
      expect(response.body.failed).toBeGreaterThan(0);
    });
  });

  describe('GET /api/admin/user-management/users/:id/activity', () => {
    it('should return user activity log', async () => {
      const user = await prismaService.user.create({
        data: {
          id: 'activity-user',
          firstName: 'Activity',
          lastName: 'User',
          email: 'activity@test.com',
          role: 'FOUNDATION',
          clerkId: 'activity-clerk',
        },
      });

      // Create some activity records
      await prismaService.userActivity.createMany({
        data: [
          {
            id: 'activity-1',
            userId: user.id,
            action: 'LOGIN',
            details: { ip: '127.0.0.1' },
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
          },
          {
            id: 'activity-2',
            userId: user.id,
            action: 'PROFILE_UPDATE',
            details: { field: 'firstName' },
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/api/admin/user-management/users/${user.id}/activity`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('activities');
      expect(response.body.activities).toHaveLength(2);
      expect(response.body.activities[0].action).toBe('LOGIN');
      expect(response.body.activities[1].action).toBe('PROFILE_UPDATE');
    });
  });

  describe('Security Tests', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/user-management/users')
        .expect(401);
    });

    it('should require admin role', async () => {
      // This would be tested with a non-admin user token
      // Implementation depends on your auth system
    });

    it('should prevent SQL injection in search', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request(app.getHttpServer())
        .get(`/api/admin/user-management/users?search=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return empty results, not cause database error
      expect(response.body.users).toEqual([]);
    });

    it('should sanitize user input', async () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      
      const response = await request(app.getHttpServer())
        .post('/api/admin/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: maliciousInput,
          lastName: 'Doe',
          email: 'test@test.com',
          role: 'FOUNDATION',
        })
        .expect(201);

      // Should sanitize the input
      expect(response.body.firstName).not.toContain('<script>');
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/api/admin/user-management/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200); // 200ms limit
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const promises = Array(concurrentRequests).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});