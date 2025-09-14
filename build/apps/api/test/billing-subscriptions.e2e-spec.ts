import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import Stripe from 'stripe';

describe('Billing & Subscription Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let stripe: Stripe;

  let testUserToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Initialize Stripe for testing
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2023-10-16',
    });

    // Get test user
    const testUser = await prismaService.user.findUnique({
      where: { email: 'parent@demo.ch' }
    });
    
    testUserId = testUser?.id || '';
    testUserToken = jwtService.sign({
      sub: testUser?.clerkId,
      email: testUser?.email,
      role: testUser?.role
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Subscription Plans', () => {
    it('should have all required plans in database', async () => {
      const plans = await prismaService.plan.findMany();
      
      expect(plans.length).toBeGreaterThanOrEqual(4);
      
      const planCodes = plans.map(p => p.code);
      expect(planCodes).toContain('BASIC');
      expect(planCodes).toContain('ESSENTIAL');
      expect(planCodes).toContain('PROFESSIONAL');
      expect(planCodes).toContain('ENTERPRISE');
    });

    it('should have pricing for all plans', async () => {
      const plans = await prismaService.plan.findMany();
      
      for (const plan of plans) {
        const prices = await prismaService.planPrice.findMany({
          where: { planId: plan.id }
        });
        
        expect(prices.length).toBeGreaterThanOrEqual(3); // monthly, annual recurring, annual one-time
        
        const cadences = prices.map(p => p.cadence);
        expect(cadences).toContain('monthly');
        expect(cadences).toContain('annual');
        
        const kinds = prices.map(p => p.kind);
        expect(kinds).toContain('recurring');
        expect(kinds).toContain('one_time');
      }
    });

    it('should return plans via API', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/billing/plans')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const plan = response.body[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('code');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('features');
      expect(plan).toHaveProperty('prices');
    });
  });

  describe('Monthly Subscription Flow', () => {
    it('should create checkout session for monthly subscription', async () => {
      const plan = await prismaService.plan.findFirst({
        where: { code: 'PROFESSIONAL' }
      });

      const monthlyPrice = await prismaService.planPrice.findFirst({
        where: { 
          planId: plan?.id,
          cadence: 'monthly',
          kind: 'recurring'
        }
      });

      const checkoutData = {
        priceId: monthlyPrice?.stripePriceId,
        planId: plan?.id,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel'
      };

      const response = await request(app.getHttpServer())
        .post('/api/billing/create-checkout-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('url');
    });

    it('should reject non-recurring price for monthly subscription', async () => {
      const plan = await prismaService.plan.findFirst({
        where: { code: 'PROFESSIONAL' }
      });

      const oneTimePrice = await prismaService.planPrice.findFirst({
        where: { 
          planId: plan?.id,
          cadence: 'annual',
          kind: 'one_time'
        }
      });

      const checkoutData = {
        priceId: oneTimePrice?.stripePriceId,
        planId: plan?.id,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel'
      };

      await request(app.getHttpServer())
        .post('/api/billing/create-checkout-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(checkoutData)
        .expect(400);
    });
  });

  describe('Annual Subscription Flow', () => {
    it('should create checkout session for annual recurring subscription', async () => {
      const plan = await prismaService.plan.findFirst({
        where: { code: 'PROFESSIONAL' }
      });

      const annualRecurringPrice = await prismaService.planPrice.findFirst({
        where: { 
          planId: plan?.id,
          cadence: 'annual',
          kind: 'recurring'
        }
      });

      const checkoutData = {
        priceId: annualRecurringPrice?.stripePriceId,
        planId: plan?.id,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel'
      };

      const response = await request(app.getHttpServer())
        .post('/api/billing/create-checkout-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('url');
    });

    it('should create checkout session for annual one-time payment', async () => {
      const plan = await prismaService.plan.findFirst({
        where: { code: 'PROFESSIONAL' }
      });

      const annualOneTimePrice = await prismaService.planPrice.findFirst({
        where: { 
          planId: plan?.id,
          cadence: 'annual',
          kind: 'one_time'
        }
      });

      const checkoutData = {
        priceId: annualOneTimePrice?.stripePriceId,
        planId: plan?.id,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel'
      };

      const response = await request(app.getHttpServer())
        .post('/api/billing/create-checkout-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('url');
    });

    it('should reject recurring price for annual one-time endpoint', async () => {
      const plan = await prismaService.plan.findFirst({
        where: { code: 'PROFESSIONAL' }
      });

      const recurringPrice = await prismaService.planPrice.findFirst({
        where: { 
          planId: plan?.id,
          cadence: 'monthly',
          kind: 'recurring'
        }
      });

      const checkoutData = {
        priceId: recurringPrice?.stripePriceId,
        planId: plan?.id,
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
        mode: 'payment' // One-time payment mode
      };

      await request(app.getHttpServer())
        .post('/api/billing/create-checkout-session')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(checkoutData)
        .expect(400);
    });
  });

  describe('Webhook Processing', () => {
    it('should handle invoice.paid webhook for subscription activation', async () => {
      const webhookPayload = {
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_test_invoice',
            subscription: 'sub_test_subscription',
            customer: 'cus_test_customer',
            amount_paid: 9900,
            currency: 'chf',
            status: 'paid'
          }
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/billing/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });

    it('should handle payment_intent.succeeded webhook for one-time payment', async () => {
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment_intent',
            customer: 'cus_test_customer',
            amount: 95040, // Annual one-time amount
            currency: 'chf',
            status: 'succeeded',
            metadata: {
              planId: 'test_plan_id',
              priceId: 'price_annual_professional_onetime'
            }
          }
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/billing/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });

    it('should handle subscription cancellation', async () => {
      const webhookPayload = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_subscription',
            customer: 'cus_test_customer',
            status: 'canceled',
            canceled_at: Math.floor(Date.now() / 1000)
          }
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/billing/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });

    it('should handle refund webhook', async () => {
      const webhookPayload = {
        type: 'charge.dispute.created',
        data: {
          object: {
            id: 'dp_test_dispute',
            charge: 'ch_test_charge',
            customer: 'cus_test_customer',
            amount: 95040,
            currency: 'chf',
            reason: 'fraudulent'
          }
        }
      };

      const response = await request(app.getHttpServer())
        .post('/api/billing/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });
  });

  describe('Entitlement Logic', () => {
    it('should check subscription access correctly', async () => {
      // Create a test subscription
      const plan = await prismaService.plan.findFirst({
        where: { code: 'PROFESSIONAL' }
      });

      const subscription = await prismaService.userSubscription.create({
        data: {
          userId: testUserId,
          planId: plan?.id || '',
          stripeSubscriptionId: 'sub_test_active',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      });

      const response = await request(app.getHttpServer())
        .get('/api/billing/entitlements')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('hasAccess');
      expect(response.body.hasAccess).toBe(true);
      expect(response.body).toHaveProperty('subscription');
      expect(response.body.subscription.status).toBe('ACTIVE');
    });

    it('should check license access correctly', async () => {
      // Create a test license
      const plan = await prismaService.plan.findFirst({
        where: { code: 'PROFESSIONAL' }
      });

      const license = await prismaService.license.create({
        data: {
          userId: testUserId,
          planId: plan?.id || '',
          stripePaymentIntentId: 'pi_test_license',
          accessExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        }
      });

      const response = await request(app.getHttpServer())
        .get('/api/billing/entitlements')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('hasAccess');
      expect(response.body.hasAccess).toBe(true);
      expect(response.body).toHaveProperty('license');
      expect(response.body.license).toBeDefined();
    });

    it('should deny access for expired subscription', async () => {
      // Create an expired subscription
      const plan = await prismaService.plan.findFirst({
        where: { code: 'PROFESSIONAL' }
      });

      await prismaService.userSubscription.create({
        data: {
          userId: testUserId,
          planId: plan?.id || '',
          stripeSubscriptionId: 'sub_test_expired',
          status: 'CANCELLED',
          currentPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          currentPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        }
      });

      const response = await request(app.getHttpServer())
        .get('/api/billing/entitlements')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('hasAccess');
      expect(response.body.hasAccess).toBe(false);
    });

    it('should deny access for expired license', async () => {
      // Create an expired license
      const plan = await prismaService.plan.findFirst({
        where: { code: 'PROFESSIONAL' }
      });

      await prismaService.license.create({
        data: {
          userId: testUserId,
          planId: plan?.id || '',
          stripePaymentIntentId: 'pi_test_expired_license',
          accessExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      });

      const response = await request(app.getHttpServer())
        .get('/api/billing/entitlements')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('hasAccess');
      expect(response.body.hasAccess).toBe(false);
    });
  });

  describe('Gated Content Access', () => {
    it('should allow access to gated content with active subscription', async () => {
      // Mock an active subscription
      const plan = await prismaService.plan.findFirst({
        where: { code: 'PROFESSIONAL' }
      });

      await prismaService.userSubscription.upsert({
        where: { userId: testUserId },
        update: {
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        create: {
          userId: testUserId,
          planId: plan?.id || '',
          stripeSubscriptionId: 'sub_test_gated',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      const response = await request(app.getHttpServer())
        .get('/api/gated-content/premium-features')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('access');
      expect(response.body.access).toBe(true);
    });

    it('should deny access to gated content without subscription', async () => {
      // Ensure no active subscription
      await prismaService.userSubscription.deleteMany({
        where: { userId: testUserId }
      });

      await prismaService.license.deleteMany({
        where: { userId: testUserId }
      });

      const response = await request(app.getHttpServer())
        .get('/api/gated-content/premium-features')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('subscription');
    });
  });

  describe('Audit Trail', () => {
    it('should create audit records for payment events', async () => {
      const paymentData = {
        userId: testUserId,
        amount: 9900,
        currency: 'chf',
        stripePaymentIntentId: 'pi_test_audit',
        status: 'succeeded'
      };

      const response = await request(app.getHttpServer())
        .post('/api/billing/audit-payment')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body).toHaveProperty('id');

      // Verify audit record was created
      const auditRecord = await prismaService.auditPayment.findFirst({
        where: { stripePaymentIntentId: 'pi_test_audit' }
      });

      expect(auditRecord).toBeDefined();
      expect(auditRecord?.userId).toBe(testUserId);
      expect(auditRecord?.amount).toBe(9900);
    });
  });
});