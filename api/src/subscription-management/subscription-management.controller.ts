import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubscriptionManagementService, SubscriptionPlan, Subscription } from './subscription-management.service';
import { PricingService } from './pricing.service';
import { FeatureFlagService } from './feature-flag.service';
import { BillingService } from './billing.service';
import { SubscriptionTier, SubscriptionStatus, UserRole } from '@workspace/types';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  ActivateSubscriptionDto,
  PauseSubscriptionDto,
  ResumeSubscriptionDto,
  CancelSubscriptionDto,
  RenewSubscriptionDto,
  ExtendSubscriptionDto,
  UpgradeDowngradeDto,
  ScheduleActionDto,
  AddNoteDto,
  BulkSubscriptionActionDto,
  SubscriptionFiltersDto,
  CreatePlanDto,
  UpdatePlanDto,
} from './dto';

@Controller('admin/subscription-management')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class SubscriptionManagementController {
  constructor(
    private readonly subscriptionService: SubscriptionManagementService,
    private readonly pricingService: PricingService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly billingService: BillingService,
  ) {}

  // =====================================
  // SUBSCRIPTION PLAN MANAGEMENT
  // =====================================

  @Post('plans')
  async createSubscriptionPlan(@Body() planData: CreatePlanDto) {
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

  @Get('plans/:id')
  async getSubscriptionPlanById(@Param('id') id: string) {
    return this.subscriptionService.getSubscriptionPlanById(id);
  }

  @Put('plans/:id')
  async updateSubscriptionPlan(@Param('id') id: string, @Body() planData: UpdatePlanDto) {
    return this.subscriptionService.updateSubscriptionPlan(id, planData);
  }

  @Delete('plans/:id')
  async deleteSubscriptionPlan(@Param('id') id: string) {
    await this.subscriptionService.deleteSubscriptionPlan(id);
    return { success: true, message: 'Subscription plan deleted successfully' };
  }

  // =====================================
  // SUBSCRIPTION CRUD
  // =====================================

  @Post('subscriptions')
  async createSubscription(@Body() body: CreateSubscriptionDto, @Request() req: any) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.createSubscription(body, performedBy);
  }

  @Get('subscriptions')
  async getAllSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('planId') planId?: string,
    @Query('userId') userId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('isManual') isManual?: string,
    @Query('search') search?: string,
    @Query('expiringBefore') expiringBefore?: string,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
  ) {
    const filters: SubscriptionFiltersDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status: status && Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)
        ? (status as SubscriptionStatus)
        : undefined,
      planId,
      userId,
      organizationId,
      isManual: isManual !== undefined ? isManual === 'true' : undefined,
      search,
      expiringBefore,
      createdAfter,
      createdBefore,
    };
    return this.subscriptionService.getAllSubscriptions(filters);
  }

  @Get('subscriptions/expiring')
  async getExpiringSubscriptions(@Query('daysAhead') daysAhead: string = '30') {
    return this.subscriptionService.getExpiringSubscriptions(parseInt(daysAhead));
  }

  @Get('subscriptions/user/:userId')
  async getUserSubscription(@Param('userId') userId: string) {
    return this.subscriptionService.getUserSubscription(userId);
  }

  @Get('subscriptions/organization/:organizationId')
  async getOrganizationSubscription(@Param('organizationId') organizationId: string) {
    return this.subscriptionService.getOrganizationSubscription(organizationId);
  }

  @Get('subscriptions/:id')
  async getSubscriptionById(@Param('id') id: string) {
    return this.subscriptionService.getSubscriptionById(id);
  }

  @Put('subscriptions/:id')
  async updateSubscription(
    @Param('id') id: string,
    @Body() body: UpdateSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.updateSubscription(id, body, performedBy);
  }

  @Delete('subscriptions/:id')
  async deleteSubscription(@Param('id') id: string, @Request() req: any) {
    const performedBy = req.user?.clerkId || 'system';
    await this.subscriptionService.deleteSubscription(id, performedBy);
    return { success: true, message: 'Subscription deleted successfully' };
  }

  // =====================================
  // SUBSCRIPTION STATUS MANAGEMENT
  // =====================================

  @Post('subscriptions/:id/activate')
  async activateSubscription(
    @Param('id') id: string,
    @Body() body: ActivateSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.activateSubscription(id, body, performedBy);
  }

  @Post('subscriptions/:id/pause')
  async pauseSubscription(
    @Param('id') id: string,
    @Body() body: PauseSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.pauseSubscription(id, body, performedBy);
  }

  @Post('subscriptions/:id/resume')
  async resumeSubscription(
    @Param('id') id: string,
    @Body() body: ResumeSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.resumeSubscription(id, body, performedBy);
  }

  @Post('subscriptions/:id/cancel')
  async cancelSubscription(
    @Param('id') id: string,
    @Body() body: CancelSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.cancelSubscription(id, body, performedBy);
  }

  @Post('subscriptions/:id/renew')
  async renewSubscription(
    @Param('id') id: string,
    @Body() body: RenewSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.renewSubscription(id, body, performedBy);
  }

  @Post('subscriptions/:id/extend')
  async extendSubscription(
    @Param('id') id: string,
    @Body() body: ExtendSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.extendSubscription(id, body, performedBy);
  }

  @Post('subscriptions/:id/upgrade')
  async upgradeSubscription(
    @Param('id') id: string,
    @Body() body: UpgradeDowngradeDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.upgradeSubscription(id, body, performedBy);
  }

  @Post('subscriptions/:id/downgrade')
  async downgradeSubscription(
    @Param('id') id: string,
    @Body() body: UpgradeDowngradeDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.downgradeSubscription(id, body, performedBy);
  }

  @Put('subscriptions/:id/status')
  async updateSubscriptionStatus(
    @Param('id') id: string,
    @Body() body: { status: Subscription['status']; cancelAtPeriodEnd?: boolean },
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.updateSubscriptionStatus(
      id,
      body.status,
      body.cancelAtPeriodEnd,
      performedBy,
    );
  }

  // =====================================
  // SUBSCRIPTION HISTORY & NOTES
  // =====================================

  @Get('subscriptions/:id/history')
  async getSubscriptionHistory(@Param('id') id: string) {
    return this.subscriptionService.getSubscriptionHistory(id);
  }

  @Get('subscriptions/:id/notes')
  async getSubscriptionNotes(@Param('id') id: string) {
    return this.subscriptionService.getSubscriptionNotes(id);
  }

  @Post('subscriptions/:id/notes')
  async addSubscriptionNote(
    @Param('id') id: string,
    @Body() body: AddNoteDto,
    @Request() req: any,
  ) {
    const createdBy = req.user?.clerkId || 'system';
    return this.subscriptionService.addSubscriptionNote(id, body, createdBy);
  }

  // =====================================
  // SCHEDULED ACTIONS
  // =====================================

  @Get('subscriptions/:id/schedules')
  async getSubscriptionSchedules(@Param('id') id: string) {
    return this.subscriptionService.getSubscriptionSchedules(id);
  }

  @Post('subscriptions/:id/schedule')
  async scheduleSubscriptionAction(
    @Param('id') id: string,
    @Body() body: ScheduleActionDto,
    @Request() req: any,
  ) {
    const createdBy = req.user?.clerkId || 'system';
    return this.subscriptionService.scheduleAction(id, body, createdBy);
  }

  @Delete('subscriptions/schedules/:scheduleId')
  async cancelScheduledAction(@Param('scheduleId') scheduleId: string) {
    await this.subscriptionService.cancelScheduledAction(scheduleId);
    return { success: true, message: 'Scheduled action cancelled successfully' };
  }

  // =====================================
  // BULK OPERATIONS
  // =====================================

  @Post('subscriptions/bulk/pause')
  async bulkPauseSubscriptions(@Body() body: BulkSubscriptionActionDto, @Request() req: any) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.bulkPauseSubscriptions(body, performedBy);
  }

  @Post('subscriptions/bulk/cancel')
  async bulkCancelSubscriptions(@Body() body: BulkSubscriptionActionDto, @Request() req: any) {
    const performedBy = req.user?.clerkId || 'system';
    return this.subscriptionService.bulkCancelSubscriptions(body, performedBy);
  }

  // =====================================
  // ANALYTICS
  // =====================================

  @Get('analytics')
  async getSubscriptionAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    return this.subscriptionService.getSubscriptionAnalytics(timeRange);
  }

  @Get('stats')
  async getSubscriptionStats() {
    return this.subscriptionService.getSubscriptionStats();
  }

  // =====================================
  // FEATURE ACCESS CONTROL
  // =====================================

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

  // =====================================
  // BILLING MANAGEMENT
  // =====================================

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
    return this.billingService.getAllTransactions(parseInt(page), parseInt(limit), {
      status,
      subscriptionId,
      userId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get('billing/transactions/:id')
  async getTransactionById(@Param('id') id: string) {
    return this.billingService.getTransactionById(id);
  }

  @Post('billing/transactions/:id/refund')
  async processRefund(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string },
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

  // =====================================
  // PRICING MANAGEMENT
  // =====================================

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
    @Body()
    body: {
      tierId: string;
      billingPeriod: 'monthly' | 'yearly';
      quantity?: number;
      userContext?: any;
    },
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

  // =====================================
  // FEATURE FLAG MANAGEMENT
  // =====================================

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
    @Body() body: { rolloutPercentage: number },
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

// =====================================
// PUBLIC SUBSCRIPTION CONTROLLER
// =====================================

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionManagementService) {}

  @Get('plans')
  async getActivePlans() {
    return this.subscriptionService.getActiveSubscriptionPlans();
  }

  @Get('plans/:id')
  async getPlanById(@Param('id') id: string) {
    return this.subscriptionService.getSubscriptionPlanById(id);
  }
}
