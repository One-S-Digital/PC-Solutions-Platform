import { Test } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

describe('SettingsController with PrincipalService (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testClerkId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.context = {
            ...(req.context ?? {}),
            clerkUserId: testClerkId,
            userId: testClerkId,
            role: UserRole.FOUNDATION,
          };
          req.user = {
            ...(req.user ?? {}),
            clerkId: testClerkId,
            role: UserRole.FOUNDATION,
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);

    await app.init();

    testClerkId = `test_clerk_${Date.now()}`;

    await prisma.appUser.create({
      data: {
        clerkId: testClerkId,
        email: `settings-test-${Date.now()}@example.com`,
        role: UserRole.FOUNDATION,
      },
    });
  });

  afterAll(async () => {
    await prisma.userNotificationPreferences.deleteMany({
      where: { user: { clerkId: testClerkId } },
    });
    await prisma.user.deleteMany({ where: { clerkId: testClerkId } });
    await prisma.appUser.deleteMany({ where: { clerkId: testClerkId } });
    await app.close();
  });

  it('bootstraps missing user profile when hitting privacy settings', async () => {
    await prisma.user.deleteMany({ where: { clerkId: testClerkId } });

    const response = await request(app.getHttpServer())
      .get('/api/settings/privacy')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('hidePubliclyToggle');
    expect(response.body.data).toHaveProperty('gdprDataDeletionRequestMade');

    const user = await prisma.user.findUnique({ where: { clerkId: testClerkId } });
    expect(user).toBeTruthy();
    expect(user?.email).toBeTruthy();
  });

  it('handles concurrent bootstrap calls safely', async () => {
    await prisma.user.deleteMany({ where: { clerkId: testClerkId } });

    const responses = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        request(app.getHttpServer()).get('/api/settings/notifications'),
      ),
    );

    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    const users = await prisma.user.findMany({ where: { clerkId: testClerkId } });
    expect(users).toHaveLength(1);
  });

  it('returns notification defaults on first access', async () => {
    await prisma.userNotificationPreferences.deleteMany({
      where: { user: { clerkId: testClerkId } },
    });

    const response = await request(app.getHttpServer())
      .get('/api/settings/notifications')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      digestRadio: 'Daily',
      promoRedemptionAlertsToggle: false,
    });
  });

  it('persists notification updates', async () => {
    await request(app.getHttpServer())
      .patch('/api/settings/notifications')
      .send({
        newRequestEmailToggle: true,
        digestRadio: 'Weekly',
        promoRedemptionAlertsToggle: true,
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/settings/notifications')
      .expect(200);

    expect(response.body.data).toMatchObject({
      digestRadio: 'Weekly',
      promoRedemptionAlertsToggle: true,
      newRequestEmailToggle: true,
    });
  });
});
