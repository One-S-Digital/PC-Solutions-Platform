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

// Standard API response wrapper
function wrapResponse<T>(data: T, message = 'OK') {
  return { success: true, message, data };
}

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
    const plan = await this.subscriptionService.createSubscriptionPlan(planData);
    return wrapResponse(plan, 'Subscription plan created successfully');
  }

  @Get('plans')
  async getAllSubscriptionPlans() {
    const plans = await this.subscriptionService.getAllSubscriptionPlans();
    return wrapResponse(plans);
  }

  @Get('plans/active')
  async getActiveSubscriptionPlans() {
    const plans = await this.subscriptionService.getActiveSubscriptionPlans();
    return wrapResponse(plans);
  }

  @Get('plans/:id')
  async getSubscriptionPlanById(@Param('id') id: string) {
    const plan = await this.subscriptionService.getSubscriptionPlanById(id);
    return wrapResponse(plan);
  }

  @Put('plans/:id')
  async updateSubscriptionPlan(@Param('id') id: string, @Body() planData: UpdatePlanDto) {
    const plan = await this.subscriptionService.updateSubscriptionPlan(id, planData);
    return wrapResponse(plan, 'Subscription plan updated successfully');
  }

  @Delete('plans/:id')
  async deleteSubscriptionPlan(@Param('id') id: string) {
    await this.subscriptionService.deleteSubscriptionPlan(id);
    return wrapResponse(null, 'Subscription plan deleted successfully');
  }

  // =====================================
  // SUBSCRIPTION CRUD
  // =====================================

  @Post('subscriptions')
  async createSubscription(@Body() body: CreateSubscriptionDto, @Request() req: any) {
    const performedBy = req.user?.clerkId || 'system';
    const subscription = await this.subscriptionService.createSubscription(body, performedBy);
    return wrapResponse(subscription, 'Subscription created successfully');
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
    const result = await this.subscriptionService.getAllSubscriptions(filters);
    return wrapResponse(result);
  }

  @Get('subscriptions/expiring')
  async getExpiringSubscriptions(@Query('daysAhead') daysAhead: string = '30') {
    const subscriptions = await this.subscriptionService.getExpiringSubscriptions(parseInt(daysAhead));
    return wrapResponse(subscriptions);
  }

  @Get('subscriptions/user/:userId')
  async getUserSubscription(@Param('userId') userId: string) {
    const subscription = await this.subscriptionService.getUserSubscription(userId);
    return wrapResponse(subscription);
  }

  @Get('subscriptions/organization/:organizationId')
  async getOrganizationSubscription(@Param('organizationId') organizationId: string) {
    const subscription = await this.subscriptionService.getOrganizationSubscription(organizationId);
    return wrapResponse(subscription);
  }

  @Get('subscriptions/:id')
  async getSubscriptionById(@Param('id') id: string) {
    const subscription = await this.subscriptionService.getSubscriptionById(id);
    return wrapResponse(subscription);
  }

  @Put('subscriptions/:id')
  async updateSubscription(
    @Param('id') id: string,
    @Body() body: UpdateSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    const subscription = await this.subscriptionService.updateSubscription(id, body, performedBy);
    return wrapResponse(subscription, 'Subscription updated successfully');
  }

  @Delete('subscriptions/:id')
  async deleteSubscription(@Param('id') id: string, @Request() req: any) {
    const performedBy = req.user?.clerkId || 'system';
    await this.subscriptionService.deleteSubscription(id, performedBy);
    return wrapResponse(null, 'Subscription deleted successfully');
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
    const subscription = await this.subscriptionService.activateSubscription(id, body, performedBy);
    return wrapResponse(subscription, 'Subscription activated successfully');
  }

  @Post('subscriptions/:id/pause')
  async pauseSubscription(
    @Param('id') id: string,
    @Body() body: PauseSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    const subscription = await this.subscriptionService.pauseSubscription(id, body, performedBy);
    return wrapResponse(subscription, 'Subscription paused successfully');
  }

  @Post('subscriptions/:id/resume')
  async resumeSubscription(
    @Param('id') id: string,
    @Body() body: ResumeSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    const subscription = await this.subscriptionService.resumeSubscription(id, body, performedBy);
    return wrapResponse(subscription, 'Subscription resumed successfully');
  }

  @Post('subscriptions/:id/cancel')
  async cancelSubscription(
    @Param('id') id: string,
    @Body() body: CancelSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    const subscription = await this.subscriptionService.cancelSubscription(id, body, performedBy);
    return wrapResponse(subscription, 'Subscription cancelled successfully');
  }

  @Post('subscriptions/:id/renew')
  async renewSubscription(
    @Param('id') id: string,
    @Body() body: RenewSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    const subscription = await this.subscriptionService.renewSubscription(id, body, performedBy);
    return wrapResponse(subscription, 'Subscription renewed successfully');
  }

  @Post('subscriptions/:id/extend')
  async extendSubscription(
    @Param('id') id: string,
    @Body() body: ExtendSubscriptionDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    const subscription = await this.subscriptionService.extendSubscription(id, body, performedBy);
    return wrapResponse(subscription, 'Subscription extended successfully');
  }

  @Post('subscriptions/:id/upgrade')
  async upgradeSubscription(
    @Param('id') id: string,
    @Body() body: UpgradeDowngradeDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    const subscription = await this.subscriptionService.upgradeSubscription(id, body, performedBy);
    return wrapResponse(subscription, 'Subscription upgraded successfully');
  }

  @Post('subscriptions/:id/downgrade')
  async downgradeSubscription(
    @Param('id') id: string,
    @Body() body: UpgradeDowngradeDto,
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    const subscription = await this.subscriptionService.downgradeSubscription(id, body, performedBy);
    return wrapResponse(subscription, 'Subscription downgraded successfully');
  }

  @Put('subscriptions/:id/status')
  async updateSubscriptionStatus(
    @Param('id') id: string,
    @Body() body: { status: Subscription['status']; cancelAtPeriodEnd?: boolean },
    @Request() req: any,
  ) {
    const performedBy = req.user?.clerkId || 'system';
    const subscription = await this.subscriptionService.updateSubscriptionStatus(
      id,
      body.status,
      body.cancelAtPeriodEnd,
      performedBy,
    );
    return wrapResponse(subscription, 'Subscription status updated successfully');
  }

  // =====================================
  // SUBSCRIPTION HISTORY & NOTES
  // =====================================

  @Get('subscriptions/:id/history')
  async getSubscriptionHistory(@Param('id') id: string) {
    const history = await this.subscriptionService.getSubscriptionHistory(id);
    return wrapResponse(history);
  }

  @Get('subscriptions/:id/notes')
  async getSubscriptionNotes(@Param('id') id: string) {
    const notes = await this.subscriptionService.getSubscriptionNotes(id);
    return wrapResponse(notes);
  }

  @Post('subscriptions/:id/notes')
  async addSubscriptionNote(
    @Param('id') id: string,
    @Body() body: AddNoteDto,
    @Request() req: any,
  ) {
    const createdBy = req.user?.clerkId || 'system';
    const note = await this.subscriptionService.addSubscriptionNote(id, body, createdBy);
    return wrapResponse(note, 'Note added successfully');
  }

  // =====================================
  // SCHEDULED ACTIONS
  // =====================================

  @Get('subscriptions/:id/schedules')
  async getSubscriptionSchedules(@Param('id') id: string) {
    const schedules = await this.subscriptionService.getSubscriptionSchedules(id);
    return wrapResponse(schedules);
  }

  @Post('subscriptions/:id/schedule')
  async scheduleSubscriptionAction(
    @Param('id') id: string,
    @Body() body: ScheduleActionDto,
    @Request() req: any,
  ) {
    const createdBy = req.user?.clerkId || 'system';
    const schedule = await this.subscriptionService.scheduleAction(id, body, createdBy);
    return wrapResponse(schedule, 'Action scheduled successfully');
  }

  @Delete('subscriptions/schedules/:scheduleId')
  async cancelScheduledAction(@Param('scheduleId') scheduleId: string) {
    await this.subscriptionService.cancelScheduledAction(scheduleId);
    return wrapResponse(null, 'Scheduled action cancelled successfully');
  }

  // =====================================
  // BULK OPERATIONS
  // =====================================

  @Post('subscriptions/bulk/pause')
  async bulkPauseSubscriptions(@Body() body: BulkSubscriptionActionDto, @Request() req: any) {
    const performedBy = req.user?.clerkId || 'system';
    const result = await this.subscriptionService.bulkPauseSubscriptions(body, performedBy);
    return wrapResponse(result, 'Bulk pause completed');
  }

  @Post('subscriptions/bulk/cancel')
  async bulkCancelSubscriptions(@Body() body: BulkSubscriptionActionDto, @Request() req: any) {
    const performedBy = req.user?.clerkId || 'system';
    const result = await this.subscriptionService.bulkCancelSubscriptions(body, performedBy);
    return wrapResponse(result, 'Bulk cancel completed');
  }

  // =====================================
  // ANALYTICS
  // =====================================

  @Get('analytics')
  async getSubscriptionAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const analytics = await this.subscriptionService.getSubscriptionAnalytics(timeRange);
    return wrapResponse(analytics);
  }

  @Get('stats')
  async getSubscriptionStats() {
    const stats = await this.subscriptionService.getSubscriptionStats();
    return wrapResponse(stats);
  }

  // =====================================
  // FEATURE ACCESS CONTROL
  // =====================================

  @Get('feature-access/:userId/:feature')
  async checkFeatureAccess(@Param('userId') userId: string, @Param('feature') feature: string) {
    const hasAccess = await this.subscriptionService.checkFeatureAccess(userId, feature);
    return wrapResponse({ hasAccess });
  }

  @Get('feature-flags/:userId')
  async getUserFeatureFlags(
    @Param('userId') userId: string,
    @Query('subscriptionPlanId') subscriptionPlanId?: string,
    @Query('userRole') userRole?: string,
    @Query('region') region?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const flags = await this.featureFlagService.getUserFeatureFlags(userId, {
      subscriptionPlanId,
      userRole,
      region,
      organizationId,
    });
    return wrapResponse(flags);
  }

  // =====================================
  // BILLING MANAGEMENT
  // =====================================

  @Post('billing/process-cycle')
  async processBillingCycle() {
    await this.subscriptionService.processBillingCycle();
    return wrapResponse(null, 'Billing cycle processed successfully');
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
    const transactions = await this.billingService.getAllTransactions(parseInt(page), parseInt(limit), {
      status,
      subscriptionId,
      userId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
    return wrapResponse(transactions);
  }

  @Get('billing/transactions/:id')
  async getTransactionById(@Param('id') id: string) {
    const transaction = await this.billingService.getTransactionById(id);
    return wrapResponse(transaction);
  }

  @Post('billing/transactions/:id/refund')
  async processRefund(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    const refund = await this.billingService.processRefund(id, body.amount, body.reason);
    return wrapResponse(refund, 'Refund processed successfully');
  }

  @Get('billing/analytics')
  async getBillingAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const analytics = await this.billingService.getBillingAnalytics(timeRange);
    return wrapResponse(analytics);
  }

  @Post('billing/payment-reminder/:subscriptionId')
  async sendPaymentReminder(@Param('subscriptionId') subscriptionId: string) {
    await this.billingService.sendPaymentReminder(subscriptionId);
    return wrapResponse(null, 'Payment reminder sent successfully');
  }

  @Post('billing/process-failed-payments')
  async processFailedPayments() {
    await this.billingService.processFailedPayments();
    return wrapResponse(null, 'Failed payments processed successfully');
  }

  // =====================================
  // PRICING MANAGEMENT
  // =====================================

  @Post('pricing/tiers')
  async createPricingTier(@Body() tierData: any) {
    const tier = await this.pricingService.createPricingTier(tierData);
    return wrapResponse(tier, 'Pricing tier created successfully');
  }

  @Get('pricing/tiers')
  async getAllPricingTiers() {
    const tiers = await this.pricingService.getAllPricingTiers();
    return wrapResponse(tiers);
  }

  @Put('pricing/tiers/:id')
  async updatePricingTier(@Param('id') id: string, @Body() tierData: any) {
    const tier = await this.pricingService.updatePricingTier(id, tierData);
    return wrapResponse(tier, 'Pricing tier updated successfully');
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
    const price = await this.pricingService.calculatePrice(
      body.tierId,
      body.billingPeriod,
      body.quantity,
      body.userContext,
    );
    return wrapResponse(price);
  }

  @Post('pricing/dynamic-rules')
  async createDynamicPricingRule(@Body() ruleData: any) {
    const rule = await this.pricingService.createDynamicPricingRule(ruleData);
    return wrapResponse(rule, 'Dynamic pricing rule created successfully');
  }

  @Get('pricing/dynamic-rules')
  async getAllDynamicPricingRules() {
    const rules = await this.pricingService.getAllDynamicPricingRules();
    return wrapResponse(rules);
  }

  @Put('pricing/dynamic-rules/:id')
  async updateDynamicPricingRule(@Param('id') id: string, @Body() ruleData: any) {
    const rule = await this.pricingService.updateDynamicPricingRule(id, ruleData);
    return wrapResponse(rule, 'Dynamic pricing rule updated successfully');
  }

  @Delete('pricing/dynamic-rules/:id')
  async deleteDynamicPricingRule(@Param('id') id: string) {
    await this.pricingService.deleteDynamicPricingRule(id);
    return wrapResponse(null, 'Dynamic pricing rule deleted successfully');
  }

  @Get('pricing/analytics')
  async getPricingAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' = '30d') {
    const analytics = await this.pricingService.getPricingAnalytics(timeRange);
    return wrapResponse(analytics);
  }

  // =====================================
  // FEATURE FLAG MANAGEMENT
  // =====================================

  @Post('feature-flags')
  async createFeatureFlag(@Body() flagData: any) {
    const flag = await this.featureFlagService.createFeatureFlag(flagData);
    return wrapResponse(flag, 'Feature flag created successfully');
  }

  @Get('feature-flags')
  async getAllFeatureFlags() {
    const flags = await this.featureFlagService.getAllFeatureFlags();
    return wrapResponse(flags);
  }

  @Get('feature-flags/active')
  async getActiveFeatureFlags() {
    const flags = await this.featureFlagService.getActiveFeatureFlags();
    return wrapResponse(flags);
  }

  @Put('feature-flags/:id')
  async updateFeatureFlag(@Param('id') id: string, @Body() flagData: any) {
    const flag = await this.featureFlagService.updateFeatureFlag(id, flagData);
    return wrapResponse(flag, 'Feature flag updated successfully');
  }

  @Delete('feature-flags/:id')
  async deleteFeatureFlag(@Param('id') id: string) {
    await this.featureFlagService.deleteFeatureFlag(id);
    return wrapResponse(null, 'Feature flag deleted successfully');
  }

  @Put('feature-flags/:id/rollout')
  async updateFeatureFlagRollout(
    @Param('id') id: string,
    @Body() body: { rolloutPercentage: number },
  ) {
    const flag = await this.featureFlagService.updateFeatureFlagRollout(id, body.rolloutPercentage);
    return wrapResponse(flag, 'Feature flag rollout updated successfully');
  }

  @Post('feature-flags/:id/toggle')
  async toggleFeatureFlag(@Param('id') id: string) {
    const flag = await this.featureFlagService.toggleFeatureFlag(id);
    return wrapResponse(flag, 'Feature flag toggled successfully');
  }

  @Get('feature-flags/analytics')
  async getFeatureFlagAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' = '30d') {
    const analytics = await this.featureFlagService.getFeatureFlagAnalytics(timeRange);
    return wrapResponse(analytics);
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
    const plans = await this.subscriptionService.getActiveSubscriptionPlans();
    return wrapResponse(plans);
  }

  @Get('plans/:id')
  async getPlanById(@Param('id') id: string) {
    const plan = await this.subscriptionService.getSubscriptionPlanById(id);
    return wrapResponse(plan);
  }
}
