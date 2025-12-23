import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Maintenance Mode (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Ensure maintenance is disabled after each test (best effort).
    const existing = await prisma.platformSettings.findFirst({ orderBy: { createdAt: 'desc' } });
    if (existing) {
      await prisma.platformSettings.update({
        where: { id: existing.id },
        data: { maintenanceMode: false, maintenanceMessage: null },
      });
    }
  });

  it('GET /api/maintenance is always accessible', async () => {
    const res = await request(app.getHttpServer()).get('/api/maintenance').expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('enabled');
  });

  it('returns 503 for non-admin requests when maintenance is enabled', async () => {
    // Enable maintenance in DB directly (no auth in tests)
    const existing = await prisma.platformSettings.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!existing) {
      await prisma.platformSettings.create({
        data: {
          platformName: 'Test',
          maintenanceMode: true,
          maintenanceMessage: 'Down for maintenance',
        },
      });
    } else {
      await prisma.platformSettings.update({
        where: { id: existing.id },
        data: { maintenanceMode: true, maintenanceMessage: 'Down for maintenance' },
      });
    }

    const res = await request(app.getHttpServer()).get('/api/partners/active').expect(503);
    expect(res.body).toHaveProperty('code', 'MAINTENANCE_MODE');
    expect(res.body).toHaveProperty('message');
  });
});

