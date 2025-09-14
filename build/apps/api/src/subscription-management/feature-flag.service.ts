import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  key: string; // Unique identifier for the feature
  isActive: boolean;
  rolloutPercentage: number; // 0-100, percentage of users who get this feature
  targetSegments: string[]; // User segments that get this feature
  conditions: {
    subscriptionPlans?: string[]; // Which subscription plans get this feature
    userRoles?: string[]; // Which user roles get this feature
    regions?: string[]; // Which regions get this feature
    customConditions?: any; // Custom conditions as JSON
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureAccess {
  hasAccess: boolean;
  reason?: string;
  rolloutPercentage?: number;
  conditions?: any;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(private prisma: PrismaService) {}

  async createFeatureFlag(flagData: Partial<FeatureFlag>): Promise<FeatureFlag> {
    try {
      const flag = await this.prisma.featureFlag.create({
        data: {
          name: flagData.name!,
          description: flagData.description!,
          key: flagData.key!,
          isActive: flagData.isActive ?? true,
          rolloutPercentage: flagData.rolloutPercentage || 0,
          targetSegments: flagData.targetSegments || [],
          conditions: flagData.conditions || {},
        },
      });

      this.logger.log(`Created feature flag: ${flag.name}`);
      return flag as FeatureFlag;
    } catch (error) {
      this.logger.error(`Failed to create feature flag: ${error.message}`);
      throw error;
    }
  }

  async updateFeatureFlag(flagId: string, flagData: Partial<FeatureFlag>): Promise<FeatureFlag> {
    try {
      const flag = await this.prisma.featureFlag.update({
        where: { id: flagId },
        data: {
          ...flagData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated feature flag: ${flag.name}`);
      return flag as FeatureFlag;
    } catch (error) {
      this.logger.error(`Failed to update feature flag: ${error.message}`);
      throw error;
    }
  }

  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({
      orderBy: { createdAt: 'desc' },
    }) as Promise<FeatureFlag[]>;
  }

  async getActiveFeatureFlags(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }) as Promise<FeatureFlag[]>;
  }

  async deleteFeatureFlag(flagId: string): Promise<void> {
    try {
      await this.prisma.featureFlag.delete({
        where: { id: flagId },
      });

      this.logger.log(`Deleted feature flag: ${flagId}`);
    } catch (error) {
      this.logger.error(`Failed to delete feature flag: ${error.message}`);
      throw error;
    }
  }

  async checkFeatureAccess(planId: string, featureKey: string): Promise<boolean> {
    try {
      const flag = await this.prisma.featureFlag.findFirst({
        where: {
          key: featureKey,
          isActive: true,
        },
      });

      if (!flag) {
        return false; // Feature flag doesn't exist or is inactive
      }

      // Check if the subscription plan has access to this feature
      if (flag.conditions.subscriptionPlans && flag.conditions.subscriptionPlans.length > 0) {
        return flag.conditions.subscriptionPlans.includes(planId);
      }

      // If no specific plan restrictions, check rollout percentage
      if (flag.rolloutPercentage < 100) {
        // For now, return true if rollout percentage > 0
        // In production, you'd want to use a consistent hash based on user ID
        return flag.rolloutPercentage > 0;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to check feature access: ${error.message}`);
      return false;
    }
  }

  async checkFeatureAccessDetailed(
    userId: string,
    featureKey: string,
    userContext?: {
      subscriptionPlanId?: string;
      userRole?: string;
      region?: string;
      organizationId?: string;
    },
  ): Promise<FeatureAccess> {
    try {
      const flag = await this.prisma.featureFlag.findFirst({
        where: {
          key: featureKey,
          isActive: true,
        },
      });

      if (!flag) {
        return {
          hasAccess: false,
          reason: 'Feature flag not found or inactive',
        };
      }

      // Check subscription plan access
      if (flag.conditions.subscriptionPlans && flag.conditions.subscriptionPlans.length > 0) {
        if (!userContext?.subscriptionPlanId || !flag.conditions.subscriptionPlans.includes(userContext.subscriptionPlanId)) {
          return {
            hasAccess: false,
            reason: 'Subscription plan does not have access to this feature',
            conditions: flag.conditions,
          };
        }
      }

      // Check user role access
      if (flag.conditions.userRoles && flag.conditions.userRoles.length > 0) {
        if (!userContext?.userRole || !flag.conditions.userRoles.includes(userContext.userRole)) {
          return {
            hasAccess: false,
            reason: 'User role does not have access to this feature',
            conditions: flag.conditions,
          };
        }
      }

      // Check region access
      if (flag.conditions.regions && flag.conditions.regions.length > 0) {
        if (!userContext?.region || !flag.conditions.regions.includes(userContext.region)) {
          return {
            hasAccess: false,
            reason: 'Region does not have access to this feature',
            conditions: flag.conditions,
          };
        }
      }

      // Check rollout percentage
      if (flag.rolloutPercentage < 100) {
        // Use consistent hash based on user ID for rollout
        const hash = this.hashUserId(userId);
        const userRolloutPercentage = hash % 100;
        
        if (userRolloutPercentage >= flag.rolloutPercentage) {
          return {
            hasAccess: false,
            reason: 'User not included in rollout percentage',
            rolloutPercentage: flag.rolloutPercentage,
            conditions: flag.conditions,
          };
        }
      }

      return {
        hasAccess: true,
        rolloutPercentage: flag.rolloutPercentage,
        conditions: flag.conditions,
      };
    } catch (error) {
      this.logger.error(`Failed to check detailed feature access: ${error.message}`);
      return {
        hasAccess: false,
        reason: 'Error checking feature access',
      };
    }
  }

  async getUserFeatureFlags(
    userId: string,
    userContext?: {
      subscriptionPlanId?: string;
      userRole?: string;
      region?: string;
      organizationId?: string;
    },
  ): Promise<Array<{ key: string; hasAccess: boolean; reason?: string }>> {
    try {
      const flags = await this.getActiveFeatureFlags();
      const userFlags = [];

      for (const flag of flags) {
        const access = await this.checkFeatureAccessDetailed(userId, flag.key, userContext);
        userFlags.push({
          key: flag.key,
          hasAccess: access.hasAccess,
          reason: access.reason,
        });
      }

      return userFlags;
    } catch (error) {
      this.logger.error(`Failed to get user feature flags: ${error.message}`);
      return [];
    }
  }

  async updateFeatureFlagRollout(flagId: string, rolloutPercentage: number): Promise<FeatureFlag> {
    try {
      const flag = await this.prisma.featureFlag.update({
        where: { id: flagId },
        data: {
          rolloutPercentage: Math.max(0, Math.min(100, rolloutPercentage)),
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated feature flag rollout: ${flag.name} to ${rolloutPercentage}%`);
      return flag as FeatureFlag;
    } catch (error) {
      this.logger.error(`Failed to update feature flag rollout: ${error.message}`);
      throw error;
    }
  }

  async getFeatureFlagAnalytics(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<{
    totalFlags: number;
    activeFlags: number;
    inactiveFlags: number;
    rolloutDistribution: Array<{ percentage: string; count: number }>;
    usageStats: Array<{ featureKey: string; accessCount: number; denialCount: number }>;
  }> {
    const flags = await this.prisma.featureFlag.findMany();

    const totalFlags = flags.length;
    const activeFlags = flags.filter(flag => flag.isActive).length;
    const inactiveFlags = totalFlags - activeFlags;

    // Rollout distribution
    const rolloutRanges = [
      { min: 0, max: 25, label: '0-25%' },
      { min: 26, max: 50, label: '26-50%' },
      { min: 51, max: 75, label: '51-75%' },
      { min: 76, max: 100, label: '76-100%' },
    ];

    const rolloutDistribution = rolloutRanges.map(range => ({
      percentage: range.label,
      count: flags.filter(flag => 
        flag.rolloutPercentage >= range.min && flag.rolloutPercentage <= range.max
      ).length,
    }));

    // Usage stats (simplified - would need actual usage tracking)
    const usageStats = flags.map(flag => ({
      featureKey: flag.key,
      accessCount: 0, // Would be populated from actual usage data
      denialCount: 0, // Would be populated from actual usage data
    }));

    return {
      totalFlags,
      activeFlags,
      inactiveFlags,
      rolloutDistribution,
      usageStats,
    };
  }

  async toggleFeatureFlag(flagId: string): Promise<FeatureFlag> {
    try {
      const flag = await this.prisma.featureFlag.findUnique({
        where: { id: flagId },
      });

      if (!flag) {
        throw new Error('Feature flag not found');
      }

      const updatedFlag = await this.prisma.featureFlag.update({
        where: { id: flagId },
        data: {
          isActive: !flag.isActive,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Toggled feature flag: ${flag.name} to ${updatedFlag.isActive ? 'active' : 'inactive'}`);
      return updatedFlag as FeatureFlag;
    } catch (error) {
      this.logger.error(`Failed to toggle feature flag: ${error.message}`);
      throw error;
    }
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}