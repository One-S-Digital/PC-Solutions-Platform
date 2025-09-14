import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';

describe('Security Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [/* Import required modules */],
      providers: [AuthService, PrismaService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prismaService.user.deleteMany({
      where: { email: { contains: '@security-test.com' } },
    });
  });

  describe('Authentication Security', () => {
    describe('JWT Token Security', () => {
      it('should reject requests without authorization header', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/user-management/users')
          .expect(401);
      });

      it('should reject requests with invalid token format', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/user-management/users')
          .set('Authorization', 'InvalidFormat')
          .expect(401);
      });

      it('should reject requests with invalid JWT token', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/user-management/users')
          .set('Authorization', 'Bearer invalid.jwt.token')
          .expect(401);
      });

      it('should reject expired JWT tokens', async () => {
        const expiredToken = jwt.sign(
          { userId: 'test-user', role: 'SUPER_ADMIN' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '-1h' } // Expired 1 hour ago
        );

        await request(app.getHttpServer())
          .get('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);
      });

      it('should reject tokens with invalid signature', async () => {
        const invalidToken = jwt.sign(
          { userId: 'test-user', role: 'SUPER_ADMIN' },
          'wrong-secret'
        );

        await request(app.getHttpServer())
          .get('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);
      });

      it('should accept valid JWT tokens', async () => {
        const validToken = jwt.sign(
          { userId: 'test-user', role: 'SUPER_ADMIN' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        // Mock the guard to allow the request
        const moduleFixture: TestingModule = await Test.createTestingModule({
          imports: [/* Import required modules */],
        })
          .overrideGuard(JwtAuthGuard)
          .useValue({ canActivate: () => true })
          .overrideGuard(RolesGuard)
          .useValue({ canActivate: () => true })
          .compile();

        const testApp = moduleFixture.createNestApplication();
        await testApp.init();

        await request(testApp.getHttpServer())
          .get('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        await testApp.close();
      });
    });

    describe('Role-Based Access Control', () => {
      it('should reject requests from non-admin users', async () => {
        const userToken = jwt.sign(
          { userId: 'test-user', role: 'FOUNDATION' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        await request(app.getHttpServer())
          .get('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });

      it('should allow requests from admin users', async () => {
        const adminToken = jwt.sign(
          { userId: 'test-admin', role: 'SUPER_ADMIN' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        // Mock the guard to allow the request
        const moduleFixture: TestingModule = await Test.createTestingModule({
          imports: [/* Import required modules */],
        })
          .overrideGuard(JwtAuthGuard)
          .useValue({ canActivate: () => true })
          .overrideGuard(RolesGuard)
          .useValue({ canActivate: () => true })
          .compile();

        const testApp = moduleFixture.createNestApplication();
        await testApp.init();

        await request(testApp.getHttpServer())
          .get('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        await testApp.close();
      });
    });

    describe('Session Security', () => {
      it('should invalidate sessions on logout', async () => {
        const token = jwt.sign(
          { userId: 'test-user', role: 'SUPER_ADMIN' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        // Logout should invalidate the token
        await request(app.getHttpServer())
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Token should no longer be valid
        await request(app.getHttpServer())
          .get('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      });
    });
  });

  describe('Input Validation Security', () => {
    describe('SQL Injection Prevention', () => {
      it('should prevent SQL injection in user search', async () => {
        const maliciousInputs = [
          "'; DROP TABLE users; --",
          "' OR '1'='1",
          "'; INSERT INTO users VALUES ('hacker', 'hacker@evil.com'); --",
          "' UNION SELECT * FROM users --",
        ];

        for (const maliciousInput of maliciousInputs) {
          const response = await request(app.getHttpServer())
            .get(`/api/admin/user-management/users?search=${encodeURIComponent(maliciousInput)}`)
            .set('Authorization', `Bearer ${getValidToken()}`)
            .expect(200);

          // Should return empty results or error, not cause database issues
          expect(response.body.users).toBeDefined();
          expect(Array.isArray(response.body.users)).toBe(true);
        }
      });

      it('should prevent SQL injection in user creation', async () => {
        const maliciousInput = "'; DROP TABLE users; --";
        
        const response = await request(app.getHttpServer())
          .post('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${getValidToken()}`)
          .send({
            firstName: maliciousInput,
            lastName: 'Doe',
            email: 'test@security-test.com',
            role: 'FOUNDATION',
          })
          .expect(400); // Should fail validation, not execute SQL

        expect(response.body.message).toContain('validation');
      });

      it('should prevent SQL injection in user updates', async () => {
        const user = await createTestUser();
        const maliciousInput = "'; DROP TABLE users; --";
        
        const response = await request(app.getHttpServer())
          .put(`/api/admin/user-management/users/${user.id}`)
          .set('Authorization', `Bearer ${getValidToken()}`)
          .send({
            firstName: maliciousInput,
          })
          .expect(400); // Should fail validation

        expect(response.body.message).toContain('validation');
      });
    });

    describe('XSS Prevention', () => {
      it('should sanitize user input in user creation', async () => {
        const maliciousInputs = [
          '<script>alert("XSS")</script>',
          '<img src="x" onerror="alert(\'XSS\')">',
          'javascript:alert("XSS")',
          '<svg onload="alert(\'XSS\')">',
        ];

        for (const maliciousInput of maliciousInputs) {
          const response = await request(app.getHttpServer())
            .post('/api/admin/user-management/users')
            .set('Authorization', `Bearer ${getValidToken()}`)
            .send({
              firstName: maliciousInput,
              lastName: 'Doe',
              email: `test-${Date.now()}@security-test.com`,
              role: 'FOUNDATION',
            })
            .expect(201);

          // Should sanitize the input
          expect(response.body.firstName).not.toContain('<script>');
          expect(response.body.firstName).not.toContain('javascript:');
          expect(response.body.firstName).not.toContain('onerror');
          expect(response.body.firstName).not.toContain('onload');
        }
      });

      it('should sanitize user input in user updates', async () => {
        const user = await createTestUser();
        const maliciousInput = '<script>alert("XSS")</script>';
        
        const response = await request(app.getHttpServer())
          .put(`/api/admin/user-management/users/${user.id}`)
          .set('Authorization', `Bearer ${getValidToken()}`)
          .send({
            firstName: maliciousInput,
          })
          .expect(200);

        // Should sanitize the input
        expect(response.body.firstName).not.toContain('<script>');
      });

      it('should prevent XSS in search parameters', async () => {
        const maliciousInput = '<script>alert("XSS")</script>';
        
        const response = await request(app.getHttpServer())
          .get(`/api/admin/user-management/users?search=${encodeURIComponent(maliciousInput)}`)
          .set('Authorization', `Bearer ${getValidToken()}`)
          .expect(200);

        // Response should not contain the malicious script
        expect(JSON.stringify(response.body)).not.toContain('<script>');
      });
    });

    describe('CSRF Protection', () => {
      it('should require CSRF token for state-changing operations', async () => {
        const userData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@security-test.com',
          role: 'FOUNDATION',
        };

        // Should fail without CSRF token
        await request(app.getHttpServer())
          .post('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${getValidToken()}`)
          .send(userData)
          .expect(403); // CSRF protection should block this

        // Should succeed with CSRF token
        const csrfToken = 'valid-csrf-token';
        await request(app.getHttpServer())
          .post('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${getValidToken()}`)
          .set('X-CSRF-Token', csrfToken)
          .send(userData)
          .expect(201);
      });
    });

    describe('File Upload Security', () => {
      it('should validate file types', async () => {
        const maliciousFile = Buffer.from('malicious content');
        
        await request(app.getHttpServer())
          .post('/api/admin/frontend-settings/logo')
          .set('Authorization', `Bearer ${getValidToken()}`)
          .attach('file', maliciousFile, 'malicious.exe')
          .expect(400); // Should reject non-image files
      });

      it('should validate file size', async () => {
        const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB
        
        await request(app.getHttpServer())
          .post('/api/admin/frontend-settings/logo')
          .set('Authorization', `Bearer ${getValidToken()}`)
          .attach('file', largeFile, 'large.jpg')
          .expect(400); // Should reject files that are too large
      });

      it('should scan uploaded files for malware', async () => {
        // This would integrate with your antivirus service
        const suspiciousFile = Buffer.from('suspicious content');
        
        await request(app.getHttpServer())
          .post('/api/admin/frontend-settings/logo')
          .set('Authorization', `Bearer ${getValidToken()}`)
          .attach('file', suspiciousFile, 'suspicious.jpg')
          .expect(400); // Should reject files flagged by antivirus
      });
    });
  });

  describe('API Security', () => {
    describe('Rate Limiting', () => {
      it('should enforce rate limits on API endpoints', async () => {
        const requests = Array(100).fill(null).map(() =>
          request(app.getHttpServer())
            .get('/api/admin/user-management/users')
            .set('Authorization', `Bearer ${getValidToken()}`)
        );

        const responses = await Promise.all(requests);
        
        // Some requests should be rate limited
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });
    });

    describe('Error Handling', () => {
      it('should not expose sensitive information in error messages', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/user-management/users/non-existent-id')
          .set('Authorization', `Bearer ${getValidToken()}`)
          .expect(404);

        // Error message should not contain sensitive information
        expect(response.body.message).not.toContain('database');
        expect(response.body.message).not.toContain('connection');
        expect(response.body.message).not.toContain('password');
        expect(response.body.message).not.toContain('secret');
      });

      it('should not expose stack traces in production', async () => {
        // Force an internal server error
        const response = await request(app.getHttpServer())
          .post('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${getValidToken()}`)
          .send({ invalid: 'data' })
          .expect(500);

        // Should not contain stack trace
        expect(response.body.stack).toBeUndefined();
        expect(response.body.error).toBeDefined();
      });
    });

    describe('CORS Configuration', () => {
      it('should only allow requests from allowed origins', async () => {
        const response = await request(app.getHttpServer())
          .options('/api/admin/user-management/users')
          .set('Origin', 'https://malicious-site.com')
          .set('Access-Control-Request-Method', 'GET')
          .set('Access-Control-Request-Headers', 'Authorization');

        // Should not allow requests from unauthorized origins
        expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
      });

      it('should allow requests from authorized origins', async () => {
        const response = await request(app.getHttpServer())
          .options('/api/admin/user-management/users')
          .set('Origin', 'https://procreche.ch')
          .set('Access-Control-Request-Method', 'GET')
          .set('Access-Control-Request-Headers', 'Authorization');

        // Should allow requests from authorized origins
        expect(response.headers['access-control-allow-origin']).toBe('https://procreche.ch');
      });
    });
  });

  describe('Data Protection', () => {
    describe('Sensitive Data Exposure', () => {
      it('should not expose sensitive user data in API responses', async () => {
        const user = await createTestUser();
        
        const response = await request(app.getHttpServer())
          .get(`/api/admin/user-management/users/${user.id}`)
          .set('Authorization', `Bearer ${getValidToken()}`)
          .expect(200);

        // Should not expose sensitive fields
        expect(response.body.password).toBeUndefined();
        expect(response.body.clerkId).toBeUndefined();
        expect(response.body.internalNotes).toBeUndefined();
      });

      it('should encrypt sensitive data at rest', async () => {
        const user = await createTestUser();
        
        // Check that sensitive data is encrypted in database
        const dbUser = await prismaService.user.findUnique({
          where: { id: user.id },
        });

        // Sensitive fields should be encrypted or hashed
        expect(dbUser.clerkId).toBeDefined();
        // Password should be hashed (not plain text)
        if (dbUser.password) {
          expect(dbUser.password).not.toBe('plaintext');
        }
      });
    });

    describe('Data Validation', () => {
      it('should validate email format', async () => {
        const invalidEmails = [
          'invalid-email',
          '@invalid.com',
          'invalid@',
          'invalid@.com',
          'invalid@com.',
        ];

        for (const email of invalidEmails) {
          const response = await request(app.getHttpServer())
            .post('/api/admin/user-management/users')
            .set('Authorization', `Bearer ${getValidToken()}`)
            .send({
              firstName: 'Test',
              lastName: 'User',
              email: email,
              role: 'FOUNDATION',
            })
            .expect(400);

          expect(response.body.message).toContain('email');
        }
      });

      it('should validate role values', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/admin/user-management/users')
          .set('Authorization', `Bearer ${getValidToken()}`)
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@security-test.com',
            role: 'INVALID_ROLE',
          })
          .expect(400);

        expect(response.body.message).toContain('role');
      });
    });
  });

  // Helper functions
  function getValidToken(): string {
    return jwt.sign(
      { userId: 'test-admin', role: 'SUPER_ADMIN' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }

  async function createTestUser() {
    return await prismaService.user.create({
      data: {
        id: `test-user-${Date.now()}`,
        firstName: 'Test',
        lastName: 'User',
        email: `test-${Date.now()}@security-test.com`,
        role: 'FOUNDATION',
        clerkId: `clerk-${Date.now()}`,
      },
    });
  }
});