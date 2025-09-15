import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger.service';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionManagementService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  async createSubscription(data: {
    organizationId: string;
    planId: string;
    stripeSubscriptionId?: string;
    tier: SubscriptionTier;
  }) {
    try {
      const subscription = await this.prisma.subscription.create({
        data: {
          organizationId: data.organizationId,
          planId: data.planId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          tier: data.tier,
          status: 'ACTIVE',
        },
        include: {
          organization: true,
          plan: true,
        },
      });

      this.logger.log(`Created subscription for organization ${data.organizationId} with plan ${data.planId}`);
      return subscription;
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
          organization: true,
          plan: true,
        },
      });

      this.logger.log(`Updated subscription ${subscriptionId} status to ${status}`);
      return subscription;
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
          organization: true,
          plan: true,
        },
      });

      return subscription;
    } catch (error) {
      this.logger.error(`Failed to get subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async getSubscriptionsByOrganization(organizationId: string) {
    try {
      const subscriptions = await this.prisma.subscription.findMany({
        where: { organizationId },
        include: {
          organization: true,
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return subscriptions;
    } catch (error) {
      this.logger.error(`Failed to get subscriptions for organization: ${(error as Error).message}`);
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

  async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'CANCELLED' },
        include: {
          organization: true,
          plan: true,
        },
      });

      this.logger.log(`Cancelled subscription ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${(error as Error).message}`);
      throw error;
    }
  }
}