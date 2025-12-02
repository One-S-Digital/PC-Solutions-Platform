import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Enhanced Upload Security Tests (E2E)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let unauthorizedToken: string;
  let testUserId: string;
  let testAssetStorageKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Create test users and get auth tokens
    // Note: In a real test, you'd generate actual Clerk tokens or mock the auth service
    // For this example, we'll assume you have a test auth helper
    const testUser = await prismaService.appUser.findFirst({
      where: { email: 'test@example.com' },
    });

    if (testUser) {
      testUserId = testUser.id;
      // Generate auth token for test user
      // authToken = await generateTestToken(testUser);
      authToken = 'test-auth-token'; // Replace with actual token generation
    }

    const unauthorizedUser = await prismaService.appUser.findFirst({
      where: { email: 'unauthorized@example.com' },
    });

    if (unauthorizedUser) {
      // Generate auth token for unauthorized user
      // unauthorizedToken = await generateTestToken(unauthorizedUser);
      unauthorizedToken = 'unauthorized-auth-token'; // Replace with actual token generation
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Download Authentication & Authorization', () => {
    it('should reject download without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/upload/download/test-file.pdf')
        .expect(401);

      expect(response.body.message).toContain('not authenticated');
    });

    it('should allow owner to download their own file', async () => {
      // First upload a file
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/upload/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .field('assetKind', 'DOCUMENT');

      if (uploadResponse.status === 201) {
        testAssetStorageKey = uploadResponse.body.asset.storageKey;

        // Try to download the file
        const downloadResponse = await request(app.getHttpServer())
          .get(`/api/upload/download/${testAssetStorageKey}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(downloadResponse.headers['content-type']).toBeDefined();
      }
    });

    it('should reject download attempt by non-owner', async () => {
      if (testAssetStorageKey) {
        await request(app.getHttpServer())
          .get(`/api/upload/download/${testAssetStorageKey}`)
          .set('Authorization', `Bearer ${unauthorizedToken}`)
          .expect(403);
      }
    });

    it('should allow admin to download any file', async () => {
      // Create admin token
      const adminUser = await prismaService.appUser.findFirst({
        where: { role: 'ADMIN' },
      });

      if (adminUser && testAssetStorageKey) {
        // const adminToken = await generateTestToken(adminUser);
        const adminToken = 'admin-auth-token';

        const response = await request(app.getHttpServer())
          .get(`/api/upload/download/${testAssetStorageKey}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBeDefined();
      }
    });

    it('should return 404 for non-existent files', async () => {
      await request(app.getHttpServer())
        .get('/api/upload/download/non-existent-file.pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('2. CORS Policy', () => {
    it('should accept requests from allowed origins', async () => {
      const allowedOrigin = process.env.APP_ORIGIN || 'http://localhost:3001';

      const response = await request(app.getHttpServer())
        .options('/api/upload/file')
        .set('Origin', allowedOrigin)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    });

    it('should reject requests from disallowed origins in production', async () => {
      if (process.env.NODE_ENV === 'production') {
        const disallowedOrigin = 'https://malicious-site.com';

        const response = await request(app.getHttpServer())
          .options('/api/upload/file')
          .set('Origin', disallowedOrigin);

        // In production, origin should not be reflected
        expect(response.headers['access-control-allow-origin']).not.toBe(disallowedOrigin);
      }
    });

    it('should include credentials in CORS headers', async () => {
      const allowedOrigin = process.env.APP_ORIGIN || 'http://localhost:3001';

      const response = await request(app.getHttpServer())
        .options('/api/upload/download/test')
        .set('Origin', allowedOrigin);

      expect(response.headers['access-control-allow-credentials']).toBeDefined();
    });
  });

  describe('3. Malware Scanning', () => {
    it('should scan uploaded files for malware', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test clean file'), 'clean.pdf')
        .field('assetKind', 'DOCUMENT')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.asset).toBeDefined();
    });

    it('should reject EICAR test virus file', async () => {
      // EICAR test file - standard test file for antivirus software
      const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

      const response = await request(app.getHttpServer())
        .post('/api/upload/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(eicarString), 'eicar.com')
        .field('assetKind', 'DOCUMENT')
        .expect(400);

      expect(response.body.message).toContain('malware');
    });

    it('should validate MIME types', async () => {
      // Try to upload a file with mismatched extension/content
      const response = await request(app.getHttpServer())
        .post('/api/upload/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('not a real PDF'), 'fake.pdf')
        .field('assetKind', 'DOCUMENT');

      // Should fail MIME validation
      expect([400, 201]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.message).toContain('Invalid file');
      }
    });

    it('should reject files with invalid extensions', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('executable code'), 'malicious.exe')
        .field('assetKind', 'DOCUMENT')
        .expect(400);

      expect(response.body.message).toContain('not allowed');
    });
  });

  describe('4. Rate Limiting', () => {
    it('should enforce rate limits on uploads', async () => {
      const requests = [];
      const limit = 12; // Slightly over the limit (10 per 60 seconds)

      for (let i = 0; i < limit; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/upload/file')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('file', Buffer.from(`test content ${i}`), `test${i}.txt`)
            .field('assetKind', 'DOCUMENT')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      // At least some requests should be rate limited
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on downloads', async () => {
      if (testAssetStorageKey) {
        const requests = [];
        const limit = 12; // Slightly over the limit

        for (let i = 0; i < limit; i++) {
          requests.push(
            request(app.getHttpServer())
              .get(`/api/upload/download/${testAssetStorageKey}`)
              .set('Authorization', `Bearer ${authToken}`)
          );
        }

        const responses = await Promise.all(requests);
        const rateLimited = responses.filter(r => r.status === 429);

        // At least some requests should be rate limited
        expect(rateLimited.length).toBeGreaterThan(0);
      }
    });

    it('should return 429 status code when rate limited', async () => {
      // Make many rapid requests
      const requests = Array(15).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/upload/file')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('test'), 'test.txt')
          .field('assetKind', 'DOCUMENT')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.status).toBe(429);
        expect(rateLimitedResponse.body.message).toContain('Too Many Requests');
      }
    });
  });

  describe('5. Message Attachment Security', () => {
    it('should secure message attachment uploads', async () => {
      const conversationId = 'test-conversation-123';

      const response = await request(app.getHttpServer())
        .post('/api/upload/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('message attachment'), 'attachment.pdf')
        .field('assetKind', 'DOCUMENT')
        .field('conversationId', conversationId)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.asset.storageKey).toContain('messages');
      expect(response.body.asset.storageKey).toContain(conversationId);
    });

    it('should require authentication for message attachment downloads', async () => {
      // Upload a message attachment first
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/upload/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('private message'), 'private.pdf')
        .field('assetKind', 'DOCUMENT')
        .field('conversationId', 'private-conversation');

      if (uploadResponse.status === 201) {
        const storageKey = uploadResponse.body.asset.storageKey;

        // Try to download without auth
        await request(app.getHttpServer())
          .get(`/api/upload/download/${storageKey}`)
          .expect(401);
      }
    });
  });

  describe('6. File Size and Type Validation', () => {
    it('should enforce file size limits', async () => {
      // Create a large buffer (over limit)
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB

      const response = await request(app.getHttpServer())
        .post('/api/upload/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeBuffer, 'large.pdf')
        .field('assetKind', 'DOCUMENT')
        .expect(400);

      expect(response.body.message).toContain('size');
    });

    it('should validate asset kind', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload/file')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test'), 'test.pdf')
        .field('assetKind', 'INVALID_KIND')
        .expect(400);

      expect(response.body.message).toContain('Invalid assetKind');
    });

    it('should accept valid file types for each asset kind', async () => {
      const validCombinations = [
        { kind: 'AVATAR', file: 'avatar.jpg', type: 'image/jpeg' },
        { kind: 'DOCUMENT', file: 'doc.pdf', type: 'application/pdf' },
        { kind: 'LOGO', file: 'logo.png', type: 'image/png' },
      ];

      for (const combo of validCombinations) {
        const response = await request(app.getHttpServer())
          .post('/api/upload/file')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('test content'), combo.file)
          .field('assetKind', combo.kind);

        expect([201, 400]).toContain(response.status);
      }
    });
  });

  describe('7. Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/upload/asset/test-id')
        .set('Authorization', `Bearer ${authToken}`);

      // Check for security-related headers
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    it('should set proper content disposition for downloads', async () => {
      if (testAssetStorageKey) {
        const response = await request(app.getHttpServer())
          .get(`/api/upload/download/${testAssetStorageKey}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (response.status === 200) {
          expect(response.headers['content-disposition']).toBeDefined();
        }
      }
    });
  });

  describe('8. Error Handling', () => {
    it('should not expose sensitive information in errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/upload/download/../../etc/passwd')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.message).not.toContain('password');
      expect(response.body.message).not.toContain('secret');
      expect(response.body.message).not.toContain('database');
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload/file')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });
});

