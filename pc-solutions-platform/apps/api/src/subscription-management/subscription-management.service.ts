import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationService } from '../email-notification/email-notification.service';
import { PricingService } from './pricing.service';
import { FeatureFlagService } from './feature-flag.service';
import { BillingService } from './billing.service';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  limits: {
    users: number;
    organizations: number;
    jobListings: number;
    productListings: number;
    storageGB: number;
    apiCalls: number;
  };
  isActive: boolean;
  isPopular: boolean;
  stripePriceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  organizationId?: string;
  planId: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
  plan: SubscriptionPlan;
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  churnRate: number;
  averageRevenuePerUser: number;
  planDistribution: Array<{
    planId: string;
    planName: string;
    count: number;
    revenue: number;
  }>;
  revenueGrowth: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
  }>;
  churnAnalysis: Array<{
    month: string;
    churned: number;
    churnRate: number;
  }>;
}

@Injectable()
export class SubscriptionManagementService {
  private readonly logger = new Logger(SubscriptionManagementService.name);

  constructor(
    private prisma: PrismaService,
    private emailNotificationService: EmailNotificationService,
    private pricingService: PricingService,
    private featureFlagService: FeatureFlagService,
    private billingService: BillingService,
  ) {}

  // Subscription Plan Management
  async createSubscriptionPlan(planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    try {
      const plan = await this.prisma.subscriptionPlan.create({
        data: {
          name: planData.name!,
          description: planData.description!,
          price: planData.price!,
          currency: planData.currency || 'CHF',
          billingPeriod: planData.billingPeriod || 'monthly',
          features: planData.features || [],
          limits: planData.limits || {
            users: 0,
            organizations: 0,
            jobListings: 0,
            productListings: 0,
            storageGB: 0,
            apiCalls: 0,
          },
          isActive: planData.isActive ?? true,
          isPopular: planData.isPopular ?? false,
          stripePriceId: planData.stripePriceId,
        },
      });

      this.logger.log(`Created subscription plan: ${plan.name}`);
      return plan as SubscriptionPlan;
    } catch (error) {
      this.logger.error(`Failed to create subscription plan: ${error.message}`);
      throw error;
    }
  }

  async updateSubscriptionPlan(planId: string, planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    try {
      const plan = await this.prisma.subscriptionPlan.update({
        where: { id: planId },
        data: {
          ...planData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated subscription plan: ${plan.name}`);
      return plan as SubscriptionPlan;
    } catch (error) {
      this.logger.error(`Failed to update subscription plan: ${error.message}`);
      throw error;
    }
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    }) as Promise<SubscriptionPlan[]>;
  }

  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    }) as Promise<SubscriptionPlan[]>;
  }

  async deleteSubscriptionPlan(planId: string): Promise<void> {
    try {
      // Check if plan has active subscriptions
      const activeSubscriptions = await this.prisma.subscription.count({
        where: {
          planId,
          status: 'active',
        },
      });

      if (activeSubscriptions > 0) {
        throw new Error('Cannot delete plan with active subscriptions');
      }

      await this.prisma.subscriptionPlan.delete({
        where: { id: planId },
      });

      this.logger.log(`Deleted subscription plan: ${planId}`);
    } catch (error) {
      this.logger.error(`Failed to delete subscription plan: ${error.message}`);
      throw error;
    }
  }

  // Subscription Management
  async createSubscription(
    userId: string,
    planId: string,
    organizationId?: string,
    stripeSubscriptionId?: string,
    stripeCustomerId?: string,
  ): Promise<Subscription> {
    try {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Calculate period dates
      const now = new Date();
      const periodEnd = new Date(now);
      if (plan.billingPeriod === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          organizationId,
          planId,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          stripeSubscriptionId,
          stripeCustomerId,
        },
        include: {
          plan: true,
        },
      });

      // Send activation email
      await this.emailNotificationService.sendNotification({
        event: 'subscription_activation',
        recipient: subscription.user.email,
        recipientName: subscription.user.firstName,
        payload: {
          firstName: subscription.user.firstName,
          planName: plan.name,
          price: plan.price,
          billingPeriod: plan.billingPeriod,
          nextBillingDate: periodEnd.toLocaleDateString(),
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
        },
      });

      this.logger.log(`Created subscription for user ${userId} with plan ${planId}`);
      return subscription as Subscription;
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw error;
    }
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: Subscription['status'],
    cancelAtPeriodEnd?: boolean,
  ): Promise<Subscription> {
    try {
      const updateData: any = { status };
      
      if (cancelAtPeriodEnd !== undefined) {
        updateData.cancelAtPeriodEnd = cancelAtPeriodEnd;
        if (cancelAtPeriodEnd) {
          updateData.cancelledAt = new Date();
        }
      }

      const subscription = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: updateData,
        include: {
          plan: true,
          user: true,
        },
      });

      // Send appropriate email notification
      if (status === 'cancelled') {
        await this.emailNotificationService.sendNotification({
          event: 'subscription_cancellation',
          recipient: subscription.user.email,
          recipientName: subscription.user.firstName,
          payload: {
            firstName: subscription.user.firstName,
            planName: subscription.plan.name,
            cancellationDate: new Date().toLocaleDateString(),
            accessUntil: subscription.currentPeriodEnd.toLocaleDateString(),
          },
        });
      }

      this.logger.log(`Updated subscription ${subscriptionId} status to ${status}`);
      return subscription as Subscription;
    } catch (error) {
      this.logger.error(`Failed to update subscription status: ${error.message}`);
      throw error;
    }
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription as Subscription | null;
  }

  async getOrganizationSubscription(organizationId: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: 'active',
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription as Subscription | null;
  }

  async getAllSubscriptions(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: string;
      planId?: string;
      userId?: string;
      organizationId?: string;
    },
  ): Promise<{ subscriptions: Subscription[]; total: number; pages: number }> {
    const where: any = {};
    
    if (filters?.status) where.status = filters.status;
    if (filters?.planId) where.planId = filters.planId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.organizationId) where.organizationId = filters.organizationId;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          plan: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions: subscriptions as Subscription[],
      total,
      pages: Math.ceil(total / limit),
    };
  }

  // Analytics and Reporting
  async getSubscriptionAnalytics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<SubscriptionAnalytics> {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      planDistribution,
      revenueData,
      churnData,
    ] = await Promise.all([
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.subscription.count({ where: { status: 'cancelled' } }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: 'active' },
        _count: { id: true },
        _sum: { plan: { price: true } },
      }),
      this.prisma.subscription.findMany({
        where: {
          createdAt: { gte: startDate },
          status: 'active',
        },
        include: { plan: true },
      }),
      this.prisma.subscription.findMany({
        where: {
          cancelledAt: { gte: startDate },
          status: 'cancelled',
        },
        include: { plan: true },
      }),
    ]);

    // Calculate MRR and ARR
    const monthlyRevenue = revenueData.reduce((sum, sub) => {
      return sum + (sub.plan.billingPeriod === 'monthly' ? sub.plan.price : sub.plan.price / 12);
    }, 0);

    const annualRevenue = revenueData.reduce((sum, sub) => {
      return sum + (sub.plan.billingPeriod === 'yearly' ? sub.plan.price : sub.plan.price * 12);
    }, 0);

    // Calculate churn rate
    const churnRate = activeSubscriptions > 0 ? (cancelledSubscriptions / activeSubscriptions) * 100 : 0;

    // Calculate ARPU
    const averageRevenuePerUser = activeSubscriptions > 0 ? monthlyRevenue / activeSubscriptions : 0;

    // Plan distribution
    const planDistributionData = await Promise.all(
      planDistribution.map(async (plan) => {
        const planDetails = await this.prisma.subscriptionPlan.findUnique({
          where: { id: plan.planId },
        });
        return {
          planId: plan.planId,
          planName: planDetails?.name || 'Unknown',
          count: plan._count.id,
          revenue: plan._sum.plan?.price || 0,
        };
      })
    );

    // Revenue growth by month
    const revenueGrowth = this.calculateRevenueGrowth(revenueData, days);

    // Churn analysis by month
    const churnAnalysis = this.calculateChurnAnalysis(churnData, days);

    return {
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      monthlyRecurringRevenue: monthlyRevenue,
      annualRecurringRevenue: annualRevenue,
      churnRate,
      averageRevenuePerUser,
      planDistribution: planDistributionData,
      revenueGrowth,
      churnAnalysis,
    };
  }

  // Feature Access Control
  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      return false; // No subscription = no access to premium features
    }

    return this.featureFlagService.checkFeatureAccess(subscription.planId, feature);
  }

  async checkUsageLimit(userId: string, resource: string, currentUsage: number): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription) {
      return false;
    }

    const limit = subscription.plan.limits[resource as keyof typeof subscription.plan.limits];
    return currentUsage < limit;
  }

  // Billing Management
  async processBillingCycle(): Promise<void> {
    try {
      const now = new Date();
      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: { lte: now },
        },
        include: {
          plan: true,
          user: true,
        },
      });

      for (const subscription of subscriptions) {
        if (subscription.cancelAtPeriodEnd) {
          // Cancel the subscription
          await this.updateSubscriptionStatus(subscription.id, 'cancelled');
        } else {
          // Renew the subscription
          const newPeriodEnd = new Date(subscription.currentPeriodEnd);
          if (subscription.plan.billingPeriod === 'monthly') {
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
          } else {
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
          }

          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              currentPeriodStart: subscription.currentPeriodEnd,
              currentPeriodEnd: newPeriodEnd,
            },
          });

          // Process payment (integrate with Stripe)
          const paymentSuccess = await this.billingService.processPayment(subscription);

          if (paymentSuccess) {
            // Send payment confirmation
            await this.emailNotificationService.sendNotification({
              event: 'payment_confirmation',
              recipient: subscription.user.email,
              recipientName: subscription.user.firstName,
              payload: {
                firstName: subscription.user.firstName,
                planName: subscription.plan.name,
                amount: subscription.plan.price,
                currency: subscription.plan.currency,
                nextBillingDate: newPeriodEnd.toLocaleDateString(),
              },
            });
          } else {
            // Mark as past due
            await this.updateSubscriptionStatus(subscription.id, 'past_due');
            
            // Send payment reminder
            await this.emailNotificationService.sendNotification({
              event: 'payment_reminder',
              recipient: subscription.user.email,
              recipientName: subscription.user.firstName,
              payload: {
                firstName: subscription.user.firstName,
                planName: subscription.plan.name,
                amount: subscription.plan.price,
                currency: subscription.plan.currency,
                dueDate: subscription.currentPeriodEnd.toLocaleDateString(),
              },
            });
          }
        }
      }

      this.logger.log(`Processed billing cycle for ${subscriptions.length} subscriptions`);
    } catch (error) {
      this.logger.error(`Failed to process billing cycle: ${error.message}`);
      throw error;
    }
  }

  private calculateRevenueGrowth(revenueData: any[], days: number): Array<{ month: string; revenue: number; subscriptions: number }> {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < Math.ceil(days / 30); i++) {
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const monthData = revenueData.filter(sub => 
        sub.createdAt >= monthStart && sub.createdAt < monthEnd
      );
      
      const revenue = monthData.reduce((sum, sub) => sum + sub.plan.price, 0);
      
      months.unshift({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        subscriptions: monthData.length,
      });
    }
    
    return months;
  }

  private calculateChurnAnalysis(churnData: any[], days: number): Array<{ month: string; churned: number; churnRate: number }> {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < Math.ceil(days / 30); i++) {
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      
      const monthChurn = churnData.filter(sub => 
        sub.cancelledAt >= monthStart && sub.cancelledAt < monthEnd
      );
      
      months.unshift({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        churned: monthChurn.length,
        churnRate: monthChurn.length > 0 ? (monthChurn.length / 100) * 100 : 0, // Simplified calculation
      });
    }
    
    return months;
  }
}