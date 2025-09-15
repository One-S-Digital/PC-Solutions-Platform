import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PricingTier {
  id: string;
  name: string;
  basePrice: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  discounts: {
    yearlyDiscount: number; // Percentage discount for yearly billing
    volumeDiscounts: Array<{
      minQuantity: number;
      discountPercentage: number;
    }>;
  };
  isActive: boolean;
}

export interface DynamicPricingRule {
  id: string;
  name: string;
  conditions: {
    userSegment?: string;
    organizationSize?: 'small' | 'medium' | 'large';
    region?: string;
    industry?: string;
  };
  pricingAdjustments: {
    priceMultiplier: number; // 1.0 = no change, 1.2 = 20% increase, 0.8 = 20% decrease
    discountPercentage?: number;
  };
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private prisma: PrismaService) {}

  async createPricingTier(tierData: Partial<PricingTier>): Promise<PricingTier> {
    try {
      const tier = await this.prisma.pricingTier.create({
        data: {
          name: tierData.name!,
          basePrice: tierData.basePrice!,
          currency: tierData.currency || 'CHF',
          billingPeriod: tierData.billingPeriod || 'monthly',
          discounts: tierData.discounts || {
            yearlyDiscount: 0,
            volumeDiscounts: [],
          },
          isActive: tierData.isActive ?? true,
        },
      });

      this.logger.log(`Created pricing tier: ${tier.name}`);
      return tier as unknown as PricingTier;
    } catch (error) {
      this.logger.error(`Failed to create pricing tier: ${(error as Error).message}`);
      throw error;
    }
  }

  async updatePricingTier(tierId: string, tierData: Partial<PricingTier>): Promise<PricingTier> {
    try {
      const tier = await this.prisma.pricingTier.update({
        where: { id: tierId },
        data: {
          ...tierData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated pricing tier: ${tier.name}`);
      return tier as unknown as PricingTier;
    } catch (error) {
      this.logger.error(`Failed to update pricing tier: ${(error as Error).message}`);
      throw error;
    }
  }

  async getAllPricingTiers(): Promise<PricingTier[]> {
    return this.prisma.pricingTier.findMany({
      where: { isActive: true },
      orderBy: { basePrice: 'asc' },
    }) as unknown as Promise<PricingTier[]>;
  }

  async calculatePrice(
    tierId: string,
    billingPeriod: 'monthly' | 'yearly',
    quantity: number = 1,
    userContext?: {
      segment?: string;
      organizationSize?: string;
      region?: string;
      industry?: string;
    },
  ): Promise<{
    basePrice: number;
    finalPrice: number;
    discounts: Array<{ type: string; amount: number; percentage: number }>;
    appliedRules: string[];
  }> {
    try {
      const tier = await this.prisma.pricingTier.findUnique({
        where: { id: tierId },
      });

      if (!tier) {
        throw new Error('Pricing tier not found');
      }

      let finalPrice = tier.basePrice;
      const discounts: Array<{ type: string; amount: number; percentage: number }> = [];
      const appliedRules: string[] = [];

      // Apply yearly discount
      if (billingPeriod === 'yearly' && (tier.discounts as any).yearlyDiscount > 0) {
        const yearlyDiscountAmount = (finalPrice * (tier.discounts as any).yearlyDiscount) / 100;
        finalPrice -= yearlyDiscountAmount;
        discounts.push({
          type: 'Yearly Billing',
          amount: yearlyDiscountAmount,
          percentage: (tier.discounts as any).yearlyDiscount,
        });
      }

      // Apply volume discounts
      const volumeDiscount = (tier.discounts as any).volumeDiscounts.find(
        discount => quantity >= discount.minQuantity
      );
      if (volumeDiscount) {
        const volumeDiscountAmount = (finalPrice * volumeDiscount.discountPercentage) / 100;
        finalPrice -= volumeDiscountAmount;
        discounts.push({
          type: 'Volume Discount',
          amount: volumeDiscountAmount,
          percentage: volumeDiscount.discountPercentage,
        });
      }

      // Apply dynamic pricing rules
      if (userContext) {
        const dynamicRules = await this.prisma.dynamicPricingRule.findMany({
          where: {
            isActive: true,
            validFrom: { lte: new Date() },
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } },
            ],
          },
        });

        for (const rule of dynamicRules) {
          if (this.matchesRuleConditions(rule, userContext)) {
            if ((rule.pricingAdjustments as any).priceMultiplier !== 1.0) {
              const originalPrice = finalPrice;
              finalPrice *= (rule.pricingAdjustments as any).priceMultiplier;
              const adjustmentAmount = finalPrice - originalPrice;
              
              discounts.push({
                type: `Dynamic Pricing (${rule.name})`,
                amount: adjustmentAmount,
                percentage: (((rule.pricingAdjustments as any).priceMultiplier - 1) * 100),
              });
              
              appliedRules.push(rule.name);
            }

            if ((rule.pricingAdjustments as any).discountPercentage) {
              const discountAmount = (finalPrice * (rule.pricingAdjustments as any).discountPercentage) / 100;
              finalPrice -= discountAmount;
              discounts.push({
                type: `Rule Discount (${rule.name})`,
                amount: discountAmount,
                percentage: (rule.pricingAdjustments as any).discountPercentage,
              });
            }
          }
        }
      }

      return {
        basePrice: tier.basePrice,
        finalPrice: Math.max(0, finalPrice), // Ensure price is not negative
        discounts,
        appliedRules,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate price: ${(error as Error).message}`);
      throw error;
    }
  }

  async createDynamicPricingRule(ruleData: Partial<DynamicPricingRule>): Promise<DynamicPricingRule> {
    try {
      const rule = await this.prisma.dynamicPricingRule.create({
        data: {
          name: ruleData.name!,
          conditions: ruleData.conditions || {},
          pricingAdjustments: ruleData.pricingAdjustments || {
            priceMultiplier: 1.0,
          },
          isActive: ruleData.isActive ?? true,
          validFrom: ruleData.validFrom || new Date(),
          validUntil: ruleData.validUntil,
        },
      });

      this.logger.log(`Created dynamic pricing rule: ${rule.name}`);
      return rule as unknown as DynamicPricingRule;
    } catch (error) {
      this.logger.error(`Failed to create dynamic pricing rule: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateDynamicPricingRule(ruleId: string, ruleData: Partial<DynamicPricingRule>): Promise<DynamicPricingRule> {
    try {
      const rule = await this.prisma.dynamicPricingRule.update({
        where: { id: ruleId },
        data: {
          ...ruleData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated dynamic pricing rule: ${rule.name}`);
      return rule as unknown as DynamicPricingRule;
    } catch (error) {
      this.logger.error(`Failed to update dynamic pricing rule: ${(error as Error).message}`);
      throw error;
    }
  }

  async getAllDynamicPricingRules(): Promise<DynamicPricingRule[]> {
    return this.prisma.dynamicPricingRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<DynamicPricingRule[]>;
  }

  async deleteDynamicPricingRule(ruleId: string): Promise<void> {
    try {
      await this.prisma.dynamicPricingRule.delete({
        where: { id: ruleId },
      });

      this.logger.log(`Deleted dynamic pricing rule: ${ruleId}`);
    } catch (error) {
      this.logger.error(`Failed to delete dynamic pricing rule: ${(error as Error).message}`);
      throw error;
    }
  }

  async getPricingAnalytics(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<{
    totalRevenue: number;
    averagePrice: number;
    priceDistribution: Array<{ priceRange: string; count: number; revenue: number }>;
    discountUsage: Array<{ discountType: string; usage: number; savings: number }>;
    dynamicPricingImpact: {
      rulesApplied: number;
      totalAdjustments: number;
      averageAdjustment: number;
    };
  }> {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.plan.price, 0);
    const averagePrice = subscriptions.length > 0 ? totalRevenue / subscriptions.length : 0;

    // Price distribution
    const priceRanges = [
      { min: 0, max: 50, label: 'CHF 0-50' },
      { min: 51, max: 100, label: 'CHF 51-100' },
      { min: 101, max: 200, label: 'CHF 101-200' },
      { min: 201, max: 500, label: 'CHF 201-500' },
      { min: 501, max: Infinity, label: 'CHF 500+' },
    ];

    const priceDistribution = priceRanges.map(range => {
      const matchingSubs = subscriptions.filter(sub => 
        sub.plan.price >= range.min && sub.plan.price <= range.max
      );
      return {
        priceRange: range.label,
        count: matchingSubs.length,
        revenue: matchingSubs.reduce((sum, sub) => sum + sub.plan.price, 0),
      };
    });

    // Discount usage (simplified - would need more detailed tracking)
    const discountUsage = [
      { discountType: 'Yearly Billing', usage: 0, savings: 0 },
      { discountType: 'Volume Discount', usage: 0, savings: 0 },
      { discountType: 'Dynamic Pricing', usage: 0, savings: 0 },
    ];

    return {
      totalRevenue,
      averagePrice,
      priceDistribution,
      discountUsage,
      dynamicPricingImpact: {
        rulesApplied: 0,
        totalAdjustments: 0,
        averageAdjustment: 0,
      },
    };
  }

  private matchesRuleConditions(rule: any, userContext: any): boolean {
    const conditions = rule.conditions;
    
    if (conditions.userSegment && userContext.segment !== conditions.userSegment) {
      return false;
    }
    
    if (conditions.organizationSize && userContext.organizationSize !== conditions.organizationSize) {
      return false;
    }
    
    if (conditions.region && userContext.region !== conditions.region) {
      return false;
    }
    
    if (conditions.industry && userContext.industry !== conditions.industry) {
      return false;
    }
    
    return true;
  }
}