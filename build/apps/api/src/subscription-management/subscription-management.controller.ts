import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { SubscriptionManagementService, SubscriptionPlan, Subscription } from './subscription-management.service';
import { PricingService } from './pricing.service';
import { FeatureFlagService } from './feature-flag.service';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/subscription-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class SubscriptionManagementController {
  constructor(
    private readonly subscriptionService: SubscriptionManagementService,
    private readonly pricingService: PricingService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly billingService: BillingService,
  ) {}

  // Subscription Plan Management
  @Post('plans')
  async createSubscriptionPlan(@Body() planData: Partial<SubscriptionPlan>) {
    return this.subscriptionService.createSubscriptionPlan(planData);
  }

  @Get('plans')
  async getAllSubscriptionPlans() {
    return this.subscriptionService.getAllSubscriptionPlans();
  }

  @Get('plans/active')
  async getActiveSubscriptionPlans() {
    return this.subscriptionService.getActiveSubscriptionPlans();
  }

  @Put('plans/:id')
  async updateSubscriptionPlan(@Param('id') id: string, @Body() planData: Partial<SubscriptionPlan>) {
    return this.subscriptionService.updateSubscriptionPlan(id, planData);
  }

  @Delete('plans/:id')
  async deleteSubscriptionPlan(@Param('id') id: string) {
    await this.subscriptionService.deleteSubscriptionPlan(id);
    return { success: true, message: 'Subscription plan deleted successfully' };
  }

  // Subscription Management
  @Post('subscriptions')
  async createSubscription(
    @Body() body: {
      userId: string;
      planId: string;
      organizationId?: string;
      stripeSubscriptionId?: string;
      stripeCustomerId?: string;
    }
  ) {
    return this.subscriptionService.createSubscription(
      body.userId,
      body.planId,
      body.organizationId,
      body.stripeSubscriptionId,
      body.stripeCustomerId,
    );
  }

  @Get('subscriptions')
  async getAllSubscriptions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('planId') planId?: string,
    @Query('userId') userId?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.subscriptionService.getAllSubscriptions(
      parseInt(page),
      parseInt(limit),
      { status, planId, userId, organizationId },
    );
  }

  @Get('subscriptions/user/:userId')
  async getUserSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.getUserSubscription(userId);
  }

  @Get('subscriptions/organization/:organizationId')
  async getOrganizationSubscription(@Param('organizationId') organizationId: string) {
    return this.subscriptionService.getOrganizationSubscription(organizationId);
  }

  @Put('subscriptions/:id/status')
  async updateSubscriptionStatus(
    @Param('id') id: string,
    @Body() body: { status: Subscription['status']; cancelAtPeriodEnd?: boolean }
  ) {
    return this.subscriptionService.updateSubscriptionStatus(
      id,
      body.status,
      body.cancelAtPeriodEnd,
    );
  }

  // Analytics
  @Get('analytics')
  async getSubscriptionAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    return this.subscriptionService.getSubscriptionAnalytics(timeRange);
  }

  // Feature Access Control
  @Get('feature-access/:userId/:feature')
  async checkFeatureAccess(@Param('userId') userId: string, @Param('feature') feature: string) {
    const hasAccess = await this.subscriptionService.checkFeatureAccess(userId, feature);
    return { hasAccess };
  }

  @Get('feature-flags/:userId')
  async getUserFeatureFlags(
    @Param('userId') userId: string,
    @Query('subscriptionPlanId') subscriptionPlanId?: string,
    @Query('userRole') userRole?: string,
    @Query('region') region?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.featureFlagService.getUserFeatureFlags(userId, {
      subscriptionPlanId,
      userRole,
      region,
      organizationId,
    });
  }

  // Billing Management
  @Post('billing/process-cycle')
  async processBillingCycle() {
    await this.subscriptionService.processBillingCycle();
    return { success: true, message: 'Billing cycle processed successfully' };
  }

  @Get('billing/transactions')
  async getAllTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('subscriptionId') subscriptionId?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.billingService.getAllTransactions(
      parseInt(page),
      parseInt(limit),
      {
        status,
        subscriptionId,
        userId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      },
    );
  }

  @Get('billing/transactions/:id')
  async getTransactionById(@Param('id') id: string) {
    return this.billingService.getTransactionById(id);
  }

  @Post('billing/transactions/:id/refund')
  async processRefund(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string }
  ) {
    return this.billingService.processRefund(id, body.amount, body.reason);
  }

  @Get('billing/analytics')
  async getBillingAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    return this.billingService.getBillingAnalytics(timeRange);
  }

  @Post('billing/payment-reminder/:subscriptionId')
  async sendPaymentReminder(@Param('subscriptionId') subscriptionId: string) {
    await this.billingService.sendPaymentReminder(subscriptionId);
    return { success: true, message: 'Payment reminder sent successfully' };
  }

  @Post('billing/process-failed-payments')
  async processFailedPayments() {
    await this.billingService.processFailedPayments();
    return { success: true, message: 'Failed payments processed successfully' };
  }

  // Pricing Management
  @Post('pricing/tiers')
  async createPricingTier(@Body() tierData: any) {
    return this.pricingService.createPricingTier(tierData);
  }

  @Get('pricing/tiers')
  async getAllPricingTiers() {
    return this.pricingService.getAllPricingTiers();
  }

  @Put('pricing/tiers/:id')
  async updatePricingTier(@Param('id') id: string, @Body() tierData: any) {
    return this.pricingService.updatePricingTier(id, tierData);
  }

  @Post('pricing/calculate')
  async calculatePrice(
    @Body() body: {
      tierId: string;
      billingPeriod: 'monthly' | 'yearly';
      quantity?: number;
      userContext?: any;
    }
  ) {
    return this.pricingService.calculatePrice(
      body.tierId,
      body.billingPeriod,
      body.quantity,
      body.userContext,
    );
  }

  @Post('pricing/dynamic-rules')
  async createDynamicPricingRule(@Body() ruleData: any) {
    return this.pricingService.createDynamicPricingRule(ruleData);
  }

  @Get('pricing/dynamic-rules')
  async getAllDynamicPricingRules() {
    return this.pricingService.getAllDynamicPricingRules();
  }

  @Put('pricing/dynamic-rules/:id')
  async updateDynamicPricingRule(@Param('id') id: string, @Body() ruleData: any) {
    return this.pricingService.updateDynamicPricingRule(id, ruleData);
  }

  @Delete('pricing/dynamic-rules/:id')
  async deleteDynamicPricingRule(@Param('id') id: string) {
    await this.pricingService.deleteDynamicPricingRule(id);
    return { success: true, message: 'Dynamic pricing rule deleted successfully' };
  }

  @Get('pricing/analytics')
  async getPricingAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' = '30d') {
    return this.pricingService.getPricingAnalytics(timeRange);
  }

  // Feature Flag Management
  @Post('feature-flags')
  async createFeatureFlag(@Body() flagData: any) {
    return this.featureFlagService.createFeatureFlag(flagData);
  }

  @Get('feature-flags')
  async getAllFeatureFlags() {
    return this.featureFlagService.getAllFeatureFlags();
  }

  @Get('feature-flags/active')
  async getActiveFeatureFlags() {
    return this.featureFlagService.getActiveFeatureFlags();
  }

  @Put('feature-flags/:id')
  async updateFeatureFlag(@Param('id') id: string, @Body() flagData: any) {
    return this.featureFlagService.updateFeatureFlag(id, flagData);
  }

  @Delete('feature-flags/:id')
  async deleteFeatureFlag(@Param('id') id: string) {
    await this.featureFlagService.deleteFeatureFlag(id);
    return { success: true, message: 'Feature flag deleted successfully' };
  }

  @Put('feature-flags/:id/rollout')
  async updateFeatureFlagRollout(
    @Param('id') id: string,
    @Body() body: { rolloutPercentage: number }
  ) {
    return this.featureFlagService.updateFeatureFlagRollout(id, body.rolloutPercentage);
  }

  @Post('feature-flags/:id/toggle')
  async toggleFeatureFlag(@Param('id') id: string) {
    return this.featureFlagService.toggleFeatureFlag(id);
  }

  @Get('feature-flags/analytics')
  async getFeatureFlagAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' = '30d') {
    return this.featureFlagService.getFeatureFlagAnalytics(timeRange);
  }
}