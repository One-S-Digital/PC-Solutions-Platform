import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-08-27.basil',
    });
  }

  async createCheckoutSession(
    userId: string,
    cadence: 'monthly' | 'annual',
    kind: 'recurring' | 'one_time',
    planCode: string,
  ) {
    // Get user and ensure they have a Stripe customer ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create Stripe customer if doesn't exist
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: userId,
        },
      });
      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    // Get plan and price
    const plan = await this.prisma.plan.findUnique({
      where: { code: planCode },
      include: {
        planPrices: {
          where: {
            cadence,
            kind,
          },
        },
      },
    });

    if (!plan || !plan.planPrices.length) {
      throw new NotFoundException('Plan or price not found');
    }

    const price = plan.planPrices[0];
    const appUrl = this.configService.get('APP_URL');

    // Create checkout session based on kind
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancel`,
      line_items: [
        {
          price: price.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        planCode,
        cadence,
        kind,
      },
    };

    if (kind === 'recurring') {
      sessionConfig.mode = 'subscription';
    } else {
      sessionConfig.mode = 'payment';
    }

    const session = await this.stripe.checkout.sessions.create(sessionConfig, {
      idempotencyKey: `${kind}-${cadence}-${userId}-${Date.now()}`,
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  }

  async getSubscriptionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: {
            status: {
              in: ['active', 'trialing'],
            },
          },
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        licenses: {
          where: {
            status: 'active',
            accessExpiresAt: {
              gt: new Date(),
            },
          },
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeSubscription = user.subscriptions[0];
    const activeLicense = user.licenses[0];

    return {
      success: true,
      data: {
        hasActiveSubscription: !!activeSubscription,
        hasActiveLicense: !!activeLicense,
        subscription: activeSubscription,
        license: activeLicense,
        isEntitled: !!(activeSubscription || activeLicense),
      },
    };
  }

  async createPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.stripeCustomerId) {
      throw new NotFoundException('User or Stripe customer not found');
    }

    const appUrl = this.configService.get('APP_URL');
    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/billing/settings`,
    });

    return {
      success: true,
      url: session.url,
    };
  }

  async getPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      include: {
        planPrices: {
          orderBy: [
            { cadence: 'asc' },
            { kind: 'asc' },
          ],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      success: true,
      data: plans,
    };
  }

  // Webhook handlers
  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const { userId, planCode, cadence, kind } = session.metadata;

    if (!userId || !planCode || !cadence || !kind) {
      throw new BadRequestException('Missing required metadata');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { code: planCode },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (kind === 'recurring') {
      // Handle subscription
      const subscription = await this.stripe.subscriptions.retrieve(session.subscription as string);
      
      await this.prisma.userSubscription.create({
        data: {
          userId,
          planId: plan.id,
          cadence,
          stripeSubscriptionId: subscription.id,
          status: subscription.status as any,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        },
      });
    } else {
      // Handle one-time payment (license)
      const paymentIntent = await this.stripe.paymentIntents.retrieve(session.payment_intent as string);
      
      // Calculate access expiry (365 days from now)
      const accessExpiresAt = new Date();
      accessExpiresAt.setFullYear(accessExpiresAt.getFullYear() + 1);

      await this.prisma.license.create({
        data: {
          userId,
          planId: plan.id,
          stripePaymentIntentId: paymentIntent.id,
          status: 'active',
          accessExpiresAt,
        },
      });
    }
  }

  async handleInvoicePaid(invoice: Stripe.Invoice) {
    if ((invoice as any).subscription) {
      const subscription = await this.prisma.userSubscription.findUnique({
        where: { stripeSubscriptionId: (invoice as any).subscription as string },
      });

      if (subscription) {
        await this.prisma.userSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            currentPeriodStart: new Date(invoice.period_start * 1000),
            currentPeriodEnd: new Date(invoice.period_end * 1000),
          },
        });
      }
    }
  }

  async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    if ((invoice as any).subscription) {
      const subscription = await this.prisma.userSubscription.findUnique({
        where: { stripeSubscriptionId: (invoice as any).subscription as string },
      });

      if (subscription) {
        await this.prisma.userSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'past_due',
          },
        });
      }
    }
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const dbSubscription = await this.prisma.userSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (dbSubscription) {
      await this.prisma.userSubscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: subscription.status as any,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        },
      });
    }
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const dbSubscription = await this.prisma.userSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (dbSubscription) {
      await this.prisma.userSubscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'CANCELLED',
          canceledAt: new Date(),
        },
      });
    }
  }
}