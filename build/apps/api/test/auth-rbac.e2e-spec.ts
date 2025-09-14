import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Authentication & Authorization Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  // Test JWT tokens for different roles
  let superAdminToken: string;
  let adminToken: string;
  let managerToken: string;
  let educatorToken: string;
  let parentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Generate test JWT tokens for different roles
    superAdminToken = jwtService.sign({
      sub: 'user_superadmin_demo',
      email: 'superadmin@demo.ch',
      role: 'SUPER_ADMIN'
    });

    adminToken = jwtService.sign({
      sub: 'user_admin_foundationA',
      email: 'admin@foundationA.ch',
      role: 'ADMIN'
    });

    managerToken = jwtService.sign({
      sub: 'user_manager_branchA',
      email: 'manager@branchA.ch',
      role: 'FOUNDATION'
    });

    educatorToken = jwtService.sign({
      sub: 'user_educator_branchA',
      email: 'educator@branchA.ch',
      role: 'EDUCATOR'
    });

    parentToken = jwtService.sign({
      sub: 'user_parent_demo',
      email: 'parent@demo.ch',
      role: 'PARENT'
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('JWT Bearer Authentication Flow', () => {
    it('should authenticate with valid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe('admin@foundationA.ch');
    });

    it('should reject invalid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject malformed Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should reject request without Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/me')
        .expect(401);
    });

    it('should reject expired JWT token', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'test', email: 'test@example.com' },
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    describe('Super Admin Access', () => {
      it('should allow super admin to access admin endpoints', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should allow super admin to list all tenants', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/organizations')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should allow super admin to create branches', async () => {
        const branchData = {
          name: 'Test Branch',
          type: 'FOUNDATION',
          region: 'Test Region',
          description: 'Test branch for RBAC testing'
        };

        const response = await request(app.getHttpServer())
          .post('/api/admin/organizations')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send(branchData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(branchData.name);
      });
    });

    describe('Foundation Admin Access', () => {
      it('should allow foundation admin to access admin endpoints', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should prevent foundation admin from accessing super admin endpoints', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/system-configuration')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(403);
      });
    });

    describe('Branch Manager Access', () => {
      it('should allow branch manager to access their branch data', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/organizations/my-organization')
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should prevent branch manager from accessing other branches', async () => {
        // Get a different organization ID
        const otherOrg = await prismaService.organization.findFirst({
          where: { 
            name: { not: { contains: 'Pully' } }
          }
        });

        if (otherOrg) {
          await request(app.getHttpServer())
            .get(`/api/organizations/${otherOrg.id}`)
            .set('Authorization', `Bearer ${managerToken}`)
            .expect(403);
        }
      });

      it('should prevent IDOR attacks by branch manager', async () => {
        // Try to access another organization by altering the ID
        const maliciousId = '00000000-0000-0000-0000-000000000000';
        
        await request(app.getHttpServer())
          .get(`/api/organizations/${maliciousId}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(403);
      });
    });

    describe('Educator Access', () => {
      it('should allow educator to access their profile', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/me')
          .set('Authorization', `Bearer ${educatorToken}`)
          .expect(200);

        expect(response.body.email).toBe('educator@branchA.ch');
      });

      it('should prevent educator from accessing admin APIs', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${educatorToken}`)
          .expect(403);
      });

      it('should allow educator to access messaging features', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/messaging/conversations')
          .set('Authorization', `Bearer ${educatorToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('Parent Access', () => {
      it('should allow parent to access their profile', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/me')
          .set('Authorization', `Bearer ${parentToken}`)
          .expect(200);

        expect(response.body.email).toBe('parent@demo.ch');
      });

      it('should prevent parent from accessing admin APIs', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${parentToken}`)
          .expect(403);
      });

      it('should prevent parent from accessing foundation management', async () => {
        await request(app.getHttpServer())
          .get('/api/organizations/my-organization')
          .set('Authorization', `Bearer ${parentToken}`)
          .expect(403);
      });

      it('should allow parent to access messaging features', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/messaging/conversations')
          .set('Authorization', `Bearer ${parentToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('Tenant Isolation', () => {
    it('should prevent cross-tenant data access', async () => {
      // Get organizations for different tenants
      const orgs = await prismaService.organization.findMany({
        take: 2,
        where: { type: 'FOUNDATION' }
      });

      if (orgs.length >= 2) {
        const [org1, org2] = orgs;

        // Try to access org2 data with org1 credentials
        await request(app.getHttpServer())
          .get(`/api/organizations/${org2.id}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(403);
      }
    });

    it('should prevent cross-branch data leakage', async () => {
      // Get different branch organizations
      const branches = await prismaService.organization.findMany({
        where: { 
          name: { contains: 'Sunrise Group' },
          name: { not: { contains: 'Pully' } }
        },
        take: 1
      });

      if (branches.length > 0) {
        const otherBranch = branches[0];
        
        // Try to access other branch with Pully manager token
        await request(app.getHttpServer())
          .get(`/api/organizations/${otherBranch.id}`)
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(403);
      }
    });
  });

  describe('Session Management', () => {
    it('should handle concurrent requests with same token', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/api/me')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.email).toBe('admin@foundationA.ch');
      });
    });

    it('should maintain user context across requests', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${educatorToken}`);

      const response2 = await request(app.getHttpServer())
        .get('/api/messaging/conversations')
        .set('Authorization', `Bearer ${educatorToken}`);

      expect(response1.body.email).toBe('educator@branchA.ch');
      expect(response2.status).toBe(200);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should not expose sensitive information in error responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('error');
    });
  });
});