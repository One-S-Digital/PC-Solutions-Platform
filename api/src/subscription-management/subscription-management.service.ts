import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger.service';
import { SubscriptionTier, SubscriptionStatus } from '@workspace/types';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  features: string[];
  limits: any;
  isActive: boolean;
  isPopular: boolean;
  stripePriceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId?: string;
  organizationId?: string;
  planId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: any;
  organization?: any;
  plan: SubscriptionPlan;
}

@Injectable()
export class SubscriptionManagementService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  // Subscription Plan Management
  async createSubscriptionPlan(planData: {
    name: string;
    description: string;
    price: number;
    currency?: string;
    billingPeriod?: string;
    features: string[];
    limits: any;
    isPopular?: boolean;
    stripePriceId?: string;
  }) {
    try {
      const plan = await this.prisma.subscriptionPlan.create({
        data: {
          name: planData.name,
          description: planData.description,
          price: planData.price,
          currency: planData.currency || 'CHF',
          billingPeriod: planData.billingPeriod || 'monthly',
          features: planData.features,
          limits: planData.limits,
          isPopular: planData.isPopular || false,
          stripePriceId: planData.stripePriceId,
        },
      });

      this.logger.log(`Created subscription plan: ${plan.name}`);
      return plan;
    } catch (error) {
      this.logger.error(`Failed to create subscription plan: ${(error as Error).message}`);
      throw error;
    }
  }

  async getAllSubscriptionPlans() {
    try {
      return await this.prisma.subscriptionPlan.findMany({
        orderBy: { price: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get subscription plans: ${(error as Error).message}`);
      throw error;
    }
  }

  async getActiveSubscriptionPlans() {
    try {
      return await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get active subscription plans: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateSubscriptionPlan(id: string, planData: Partial<SubscriptionPlan>) {
    try {
      const plan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: planData,
      });

      this.logger.log(`Updated subscription plan: ${plan.name}`);
      return plan;
    } catch (error) {
      this.logger.error(`Failed to update subscription plan: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteSubscriptionPlan(id: string) {
    try {
      await this.prisma.subscriptionPlan.delete({
        where: { id },
      });

      this.logger.log(`Deleted subscription plan: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete subscription plan: ${(error as Error).message}`);
      throw error;
    }
  }

  // Subscription Management
  async createSubscription(data: {
    userId?: string;
    organizationId?: string;
    planId: string;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    tier: SubscriptionTier;
  }) {
    try {
      // Calculate period dates
      const now = new Date();
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: data.planId },
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      const periodEnd = new Date(now);
      if (plan.billingPeriod === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const subscription = await this.prisma.subscription.create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          planId: data.planId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          stripeCustomerId: data.stripeCustomerId,
          tier: data.tier,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      this.logger.log(`Created subscription ${subscription.id} for ${data.userId ? 'user' : 'organization'}`);
      return subscription as Subscription;
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus) {
    try {
      const subscription = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      this.logger.log(`Updated subscription ${subscriptionId} status to ${status}`);
      return subscription as Subscription;
    } catch (error) {
      this.logger.error(`Failed to update subscription status: ${(error as Error).message}`);
      throw error;
    }
  }

  async getSubscriptionById(subscriptionId: string) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      return subscription as Subscription | null;
    } catch (error) {
      this.logger.error(`Failed to get subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async getAllSubscriptions(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [subscriptions, total] = await Promise.all([
        this.prisma.subscription.findMany({
          skip,
          take: limit,
          include: {
            user: true,
            organization: true,
            plan: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.subscription.count(),
      ]);

      return {
        subscriptions: subscriptions as Subscription[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get subscriptions: ${(error as Error).message}`);
      throw error;
    }
  }

  async getUserSubscription(userId: string) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { userId },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return subscription as Subscription | null;
    } catch (error) {
      this.logger.error(`Failed to get user subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async getOrganizationSubscription(organizationId: string) {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: { organizationId },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return subscription as Subscription | null;
    } catch (error) {
      this.logger.error(`Failed to get organization subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true) {
    try {
      const subscription = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          cancelAtPeriodEnd,
          canceledAt: cancelAtPeriodEnd ? null : new Date(),
          status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELLED',
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      this.logger.log(`Cancelled subscription ${subscriptionId}`);
      return subscription as Subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async getSubscriptionStats() {
    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        revenueByPlan,
      ] = await Promise.all([
        this.prisma.subscription.count(),
        this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        this.prisma.subscription.count({ where: { status: 'CANCELLED' } }),
        this.prisma.subscription.groupBy({
          by: ['planId'],
          _count: { id: true },
        }),
      ]);

      return {
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        revenueByPlan,
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription stats: ${(error as Error).message}`);
      throw error;
    }
  }

  async getSubscriptionAnalytics(timeRange: string = '30d') {
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        newSubscriptions,
        cancelledSubscriptions,
        revenue,
        subscriptionsByPlan,
      ] = await Promise.all([
        this.prisma.subscription.count({
          where: {
            createdAt: { gte: startDate },
            status: 'ACTIVE',
          },
        }),
        this.prisma.subscription.count({
          where: {
            canceledAt: { gte: startDate },
          },
        }),
        this.prisma.subscription.aggregate({
          where: {
            createdAt: { gte: startDate },
            status: 'ACTIVE',
          },
          _count: { id: true },
        }),
        this.prisma.subscription.groupBy({
          by: ['planId'],
          where: {
            createdAt: { gte: startDate },
            status: 'ACTIVE',
          },
          _count: { id: true },
        }),
      ]);

      return {
        newSubscriptions,
        cancelledSubscriptions,
        revenue: revenue._count.id || 0,
        subscriptionsByPlan,
        timeRange,
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription analytics: ${(error as Error).message}`);
      throw error;
    }
  }

  async checkFeatureAccess(userId: string, feature: string) {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return false;
      }

      const plan = subscription.plan;
      return plan.features.includes(feature);
    } catch (error) {
      this.logger.error(`Failed to check feature access: ${(error as Error).message}`);
      return false;
    }
  }

  async processBillingCycle() {
    try {
      const now = new Date();
      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: { lte: now },
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      for (const subscription of subscriptions) {
        if (subscription.cancelAtPeriodEnd) {
          // Cancel the subscription
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'CANCELLED',
              canceledAt: now,
            },
          });
        } else {
          // Renew the subscription
          const newPeriodEnd = new Date(now);
          if (subscription.plan.billingPeriod === 'monthly') {
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
          } else {
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
          }

          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              currentPeriodStart: now,
              currentPeriodEnd: newPeriodEnd,
            },
          });
        }
      }

      this.logger.log(`Processed billing cycle for ${subscriptions.length} subscriptions`);
    } catch (error) {
      this.logger.error(`Failed to process billing cycle: ${(error as Error).message}`);
      throw error;
    }
  }
}