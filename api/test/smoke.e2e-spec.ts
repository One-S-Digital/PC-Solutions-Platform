import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Smoke Tests - Platform v2.0', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Application Boot Tests', () => {
    it('should start the application successfully', () => {
      expect(app).toBeDefined();
      expect(app.getHttpServer()).toBeDefined();
    });

    it('should have database connection', async () => {
      await expect(prismaService.$connect()).resolves.not.toThrow();
    });

    it('should be able to query database', async () => {
      const result = await prismaService.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });
  });

  describe('Health Endpoints', () => {
    it('GET /health should return basic health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('GET /health/clamav should return ClamAV status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/clamav')
        .expect(200);

      expect(response.body).toHaveProperty('healthy');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('GET /health/upload should return upload system status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/upload')
        .expect(200);

      expect(response.body).toHaveProperty('healthy');
      expect(response.body).toHaveProperty('config');
      expect(response.body.config).toHaveProperty('maxFileSize');
      expect(response.body.config).toHaveProperty('allowedExtensions');
      expect(response.body.config).toHaveProperty('allowedMimeTypes');
    });

    it('GET /health/security should return security system status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/security')
        .expect(200);

      expect(response.body).toHaveProperty('healthy');
      expect(response.body).toHaveProperty('components');
      expect(response.body.components).toHaveProperty('clamav');
      expect(response.body.components).toHaveProperty('mimeValidation');
      expect(response.body.components).toHaveProperty('quarantineStorage');
    });
  });

  describe('API Endpoints Availability', () => {
    it('should serve Swagger documentation in non-production', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs')
        .expect(200);

      expect(response.text).toContain('swagger');
    });

    it('should have CORS headers configured', async () => {
      const response = await request(app.getHttpServer())
        .options('/health')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Database Schema Validation', () => {
    it('should have required tables', async () => {
      const tables = await prismaService.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;

      const tableNames = (tables as any[]).map(t => t.table_name);
      
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('organizations');
      expect(tableNames).toContain('plans');
      expect(tableNames).toContain('plan_prices');
      expect(tableNames).toContain('assets');
    });

    it('should have seeded test data', async () => {
      const userCount = await prismaService.user.count();
      const orgCount = await prismaService.organization.count();
      const planCount = await prismaService.plan.count();

      expect(userCount).toBeGreaterThan(0);
      expect(orgCount).toBeGreaterThan(0);
      expect(planCount).toBeGreaterThan(0);
    });

    it('should have required test users', async () => {
      const testEmails = [
        'superadmin@demo.ch',
        'admin@foundationA.ch',
        'manager@branchA.ch',
        'educator@branchA.ch',
        'supplier@vendor.ch',
        'service@vendor.ch',
        'parent@demo.ch'
      ];

      for (const email of testEmails) {
        const user = await prismaService.user.findUnique({
          where: { email }
        });
        expect(user).toBeDefined();
        expect(user?.email).toBe(email);
      }
    });

    it('should have enterprise tenant structure', async () => {
      const sunriseGroup = await prismaService.organization.findFirst({
        where: { name: 'Sunrise Group' }
      });
      expect(sunriseGroup).toBeDefined();

      const branches = await prismaService.organization.findMany({
        where: { 
          name: {
            contains: 'Sunrise Group'
          }
        }
      });
      expect(branches.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Environment Configuration', () => {
    it('should have required environment variables', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.NODE_ENV).toBeDefined();
    });

    it('should have ClamAV configuration', () => {
      expect(process.env.CLAMAV_HOST).toBeDefined();
      expect(process.env.CLAMAV_PORT).toBeDefined();
    });

    it('should have upload configuration', () => {
      expect(process.env.UPLOAD_MAX_MB).toBeDefined();
      expect(process.env.UPLOAD_ALLOWED_EXT).toBeDefined();
      expect(process.env.UPLOAD_ALLOWED_MIME).toBeDefined();
    });
  });

  describe('Response Time Validation', () => {
    it('health endpoints should respond within 300ms', async () => {
      const start = Date.now();
      await request(app.getHttpServer()).get('/health');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(300);
    });

    it('database queries should be fast', async () => {
      const start = Date.now();
      await prismaService.user.findMany({ take: 1 });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body.statusCode).toBe(404);
    });

    it('should have proper error response format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({}) // Invalid data
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
    });
  });
});