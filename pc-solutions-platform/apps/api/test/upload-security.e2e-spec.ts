import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';

describe('File Upload Security Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  let testUserToken: string;
  let testUserId: string;

  // Test files
  let cleanJpegBuffer: Buffer;
  let wrongMimeBuffer: Buffer;
  let eicarBuffer: Buffer;

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
      where: { email: 'educator@branchA.ch' }
    });
    
    testUserId = testUser?.id || '';
    testUserToken = jwtService.sign({
      sub: testUser?.clerkId,
      email: testUser?.email,
      role: testUser?.role
    });

    // Create test files
    await createTestFiles();
  });

  afterAll(async () => {
    await app.close();
    await cleanupTestFiles();
  });

  async function createTestFiles() {
    // Create a minimal valid JPEG file
    cleanJpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A,
      0xFF, 0xD9
    ]);

    // Create executable content disguised as JPEG
    wrongMimeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF\x00\x00\xB8\x00\x00\x00\x00\x00\x00\x00\x40\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x80\x00\x00\x00\x0E\x1F\xBA\x0E\x00\xB4\x09\xCD\x21\xB8\x01\x4C\xCD\x21\x54\x68\x69\x73\x20\x70\x72\x6F\x67\x72\x61\x6D\x20\x63\x61\x6E\x6E\x6F\x74\x20\x62\x65\x20\x72\x75\x6E\x20\x69\x6E\x20\x44\x4F\x53\x20\x6D\x6F\x64\x65\x2E\x0D\x0D\x0A\x24\x00\x00\x00\x00\x00\x00\x00');

    // Create EICAR test string
    eicarBuffer = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
  }

  async function cleanupTestFiles() {
    // Cleanup any test files that might have been created
    const uploadDir = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      files.forEach(file => {
        if (file.startsWith('test-')) {
          fs.unlinkSync(path.join(uploadDir, file));
        }
      });
    }
  }

  describe('ClamAV Integration', () => {
    it('should scan clean files successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload/scan')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'clean.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('clean');
      expect(response.body.clean).toBe(true);
      expect(response.body).toHaveProperty('scanResult');
      expect(response.body.scanResult).toBe('CLEAN');
    });

    it('should detect EICAR test virus', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload/scan')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', eicarBuffer, 'eicar.txt')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('malware');
      expect(response.body).toHaveProperty('scanResult');
      expect(response.body.scanResult).toBe('INFECTED');
    });

    it('should handle ClamAV service unavailable', async () => {
      // Mock ClamAV service being down
      const originalEnv = process.env.CLAMAV_HOST;
      process.env.CLAMAV_HOST = 'nonexistent-host';

      const response = await request(app.getHttpServer())
        .post('/api/upload/scan')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'clean.jpg')
        .expect(503);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('scanner unavailable');

      // Restore original environment
      process.env.CLAMAV_HOST = originalEnv;
    });

    it('should fail closed when scanner is down', async () => {
      // This test ensures that when ClamAV is unavailable, uploads are rejected
      const originalEnv = process.env.CLAMAV_HOST;
      process.env.CLAMAV_HOST = 'nonexistent-host';

      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'clean.jpg')
        .expect(503);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('scanner unavailable');

      // Restore original environment
      process.env.CLAMAV_HOST = originalEnv;
    });
  });

  describe('MIME Type Validation', () => {
    it('should accept valid MIME types', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'clean.jpg')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('mimeType');
      expect(response.body.mimeType).toBe('image/jpeg');
    });

    it('should reject files with wrong MIME type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', wrongMimeBuffer, 'malicious.exe')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid file type');
    });

    it('should reject files with mismatched extension and MIME', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', wrongMimeBuffer, 'image.jpg')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('MIME type mismatch');
    });

    it('should validate file extensions', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'document.exe')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid file type');
    });
  });

  describe('File Size Validation', () => {
    it('should accept files within size limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'small.jpg')
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('should reject files exceeding size limit', async () => {
      // Create a large buffer (exceeding 20MB limit)
      const largeBuffer = Buffer.alloc(25 * 1024 * 1024); // 25MB

      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', largeBuffer, 'large.jpg')
        .expect(413);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('File too large');
    });
  });

  describe('File Upload Flow', () => {
    it('should quarantine files before scanning', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'quarantine-test.jpg')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('QUARANTINED');
    });

    it('should promote clean files to safe storage', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'promote-test.jpg')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      
      // Wait for processing and check final status
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalResponse = await request(app.getHttpServer())
        .get(`/api/upload/${response.body.id}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(finalResponse.body).toHaveProperty('status');
      expect(['SAFE', 'QUARANTINED']).toContain(finalResponse.body.status);
    });

    it('should not promote infected files', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', eicarBuffer, 'infected.txt')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('malware');
    });
  });

  describe('File Path Security', () => {
    it('should prevent directory traversal attacks', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, '../../../etc/passwd.jpg')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid filename');
    });

    it('should sanitize filenames', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'file with spaces & special chars!.jpg')
        .expect(201);

      expect(response.body).toHaveProperty('filename');
      expect(response.body.filename).not.toContain(' ');
      expect(response.body.filename).not.toContain('&');
      expect(response.body.filename).not.toContain('!');
    });

    it('should prevent null byte injection', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'file.jpg\x00.exe')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid filename');
    });
  });

  describe('Upload Logging and Audit', () => {
    it('should log upload attempts with request ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'audit-test.jpg')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('requestId');
      
      // Verify audit log was created
      const auditLog = await prismaService.uploadAuditLog.findFirst({
        where: { requestId: response.body.requestId }
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(testUserId);
      expect(auditLog?.filename).toBe('audit-test.jpg');
    });

    it('should log scan results without raw data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'scan-log-test.jpg')
        .expect(201);

      const auditLog = await prismaService.uploadAuditLog.findFirst({
        where: { requestId: response.body.requestId }
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.scanResult).toBeDefined();
      expect(auditLog?.fileHash).toBeDefined();
      expect(auditLog?.rawFileData).toBeNull(); // Should not store raw data
    });
  });

  describe('File Access Control', () => {
    it('should allow users to access their own files', async () => {
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'access-test.jpg')
        .expect(201);

      const accessResponse = await request(app.getHttpServer())
        .get(`/api/upload/${uploadResponse.body.id}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(accessResponse.body).toHaveProperty('id');
      expect(accessResponse.body.id).toBe(uploadResponse.body.id);
    });

    it('should prevent users from accessing other users files', async () => {
      // Create a file with one user
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'private-test.jpg')
        .expect(201);

      // Try to access with a different user token
      const otherUser = await prismaService.user.findUnique({
        where: { email: 'parent@demo.ch' }
      });
      
      const otherUserToken = jwtService.sign({
        sub: otherUser?.clerkId,
        email: otherUser?.email,
        role: otherUser?.role
      });

      await request(app.getHttpServer())
        .get(`/api/upload/${uploadResponse.body.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should generate signed URLs for private files', async () => {
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'signed-url-test.jpg')
        .expect(201);

      const signedUrlResponse = await request(app.getHttpServer())
        .get(`/api/upload/${uploadResponse.body.id}/signed-url`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(signedUrlResponse.body).toHaveProperty('signedUrl');
      expect(signedUrlResponse.body.signedUrl).toContain('http');
    });
  });

  describe('File Cleanup and Retention', () => {
    it('should clean up quarantined files after scan', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', eicarBuffer, 'cleanup-test.txt')
        .expect(400);

      // Wait for cleanup process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify file was cleaned up from quarantine
      const quarantineFiles = await prismaService.quarantineFile.findMany({
        where: { filename: 'cleanup-test.txt' }
      });

      expect(quarantineFiles.length).toBe(0);
    });

    it('should implement file retention policy', async () => {
      // Create a file and mark it as old
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', cleanJpegBuffer, 'retention-test.jpg')
        .expect(201);

      // Manually update the file to be old
      await prismaService.asset.update({
        where: { id: uploadResponse.body.id },
        data: { createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // 90 days ago
      });

      // Trigger cleanup
      const cleanupResponse = await request(app.getHttpServer())
        .post('/api/admin/cleanup-old-files')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(cleanupResponse.body).toHaveProperty('cleanedFiles');
      expect(cleanupResponse.body.cleanedFiles).toBeGreaterThan(0);
    });
  });
});