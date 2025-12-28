import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger.service';
import { SubscriptionTier, SubscriptionStatus } from '@workspace/types';
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
import { Prisma, SubscriptionRequestStatus } from '@prisma/client';
import { resolveBillingPeriod } from './billing-period.util';

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string | null;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  features: string[];
  limits: any;
  allowedRoles: string[];
  trialDays: number;
  isActive: boolean;
  isPopular: boolean;
  displayOrder: number;
  stripePriceId?: string;
  stripeProductId?: string;
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
  trialStart?: Date;
  trialEnd?: Date;
  pausedAt?: Date;
  pausedUntil?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  cancellationReason?: string;
  isManual: boolean;
  activatedBy?: string;
  activatedAt?: Date;
  gracePeriodEnd?: Date;
  notes?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  user?: any;
  organization?: any;
  plan: SubscriptionPlan;
}

export interface SubscriptionAction {
  id: string;
  subscriptionId: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
  reason?: string;
  notes?: string;
  performedBy: string;
  performedAt: Date;
  metadata?: any;
}

export interface SubscriptionSchedule {
  id: string;
  subscriptionId: string;
  scheduledAction: string;
  scheduledDate: Date;
  targetPlanId?: string;
  isProcessed: boolean;
  processedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface SubscriptionNote {
  id: string;
  subscriptionId: string;
  note: string;
  isInternal: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  pendingSubscriptions: number;
  expiringWithin30Days: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  subscriptionsByPlan: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  growthRate: number;
  churnRate: number;
  averageSubscriptionLength: number;
}

@Injectable()
export class SubscriptionManagementService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Keep SubscriptionRequest in sync when a Subscription is activated.
   *
   * Why: admins can activate subscriptions from the subscription editor, but the request
   * status only flips to ACTIVATED when using the request workflow. This makes requests
   * appear stuck in UNDER_REVIEW even though the subscription is active.
   */
  private async syncSubscriptionRequestOnActivation(
    subscription: { id: string; userId?: string | null; organizationId?: string | null; planId: string; tier: SubscriptionTier },
    performedBy: string,
  ): Promise<void> {
    const now = new Date();

    try {
      // 1) If the request is already linked, just ensure status is ACTIVATED.
      const linked = await this.prisma.subscriptionRequest.findUnique({
        where: { subscriptionId: subscription.id },
        select: { id: true, status: true },
      });

      if (linked) {
        if (linked.status !== SubscriptionRequestStatus.ACTIVATED) {
          await this.prisma.subscriptionRequest.update({
            where: { id: linked.id },
            data: {
              status: SubscriptionRequestStatus.ACTIVATED,
              processedAt: now,
              processedBy: performedBy,
            },
          });
        }
        return;
      }

      // 2) If not linked, try to find the most recent "open" matching request for this owner + plan + tier.
      // This covers the common admin flow where a subscription is created/activated manually from the subscription UI.
      const ownerWhere = subscription.userId
        ? { userId: subscription.userId }
        : subscription.organizationId
          ? { organizationId: subscription.organizationId }
          : null;

      if (!ownerWhere) return;

      const candidate = await this.prisma.subscriptionRequest.findFirst({
        where: {
          ...ownerWhere,
          planId: subscription.planId,
          tier: subscription.tier as any,
          subscriptionId: null,
          status: {
            in: [
              SubscriptionRequestStatus.PENDING,
              SubscriptionRequestStatus.UNDER_REVIEW,
              SubscriptionRequestStatus.INVOICE_SENT,
              SubscriptionRequestStatus.PAYMENT_PENDING,
              SubscriptionRequestStatus.PAYMENT_RECEIVED,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (!candidate) return;

      await this.prisma.subscriptionRequest.update({
        where: { id: candidate.id },
        data: {
          status: SubscriptionRequestStatus.ACTIVATED,
          subscriptionId: subscription.id,
          processedAt: now,
          processedBy: performedBy,
        },
      });
    } catch (error: any) {
      // Best-effort sync: do not block subscription activation if request update fails.
      this.logger.warn(
        `Failed to sync subscription request for activated subscription ${subscription.id}: ${error?.message || error}`,
      );
    }
  }

  // =====================================
  // SUBSCRIPTION PLAN MANAGEMENT
  // =====================================

  async createSubscriptionPlan(data: CreatePlanDto): Promise<SubscriptionPlan> {
    try {
      const plan = await this.prisma.subscriptionPlan.create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          price: data.price,
          currency: data.currency || 'CHF',
          billingPeriod: data.billingPeriod || 'monthly',
          features: data.features,
          limits: data.limits,
          allowedRoles: data.allowedRoles || [],
          trialDays: data.trialDays || 0,
          isActive: data.isActive ?? true,
          isPopular: data.isPopular ?? false,
          displayOrder: data.displayOrder || 0,
          stripePriceId: data.stripePriceId,
          stripeProductId: data.stripeProductId,
        },
      });

      this.logger.log(`Created subscription plan: ${plan.name}`);
      return plan as unknown as SubscriptionPlan;
    } catch (error) {
      this.logger.error(`Failed to create subscription plan: ${(error as Error).message}`);
      throw error;
    }
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      let plans = await this.prisma.subscriptionPlan.findMany({
        orderBy: { displayOrder: 'asc' },
      });

      // Auto-seed default plans if no plans exist
      if (plans.length === 0) {
        this.logger.log('No subscription plans found (admin view), seeding default plans...');
        await this.seedDefaultSubscriptionPlans();
        plans = await this.prisma.subscriptionPlan.findMany({
          orderBy: { displayOrder: 'asc' },
        });
      }

      return plans as unknown as SubscriptionPlan[];
    } catch (error) {
      this.logger.error(`Failed to get subscription plans: ${(error as Error).message}`);
      throw error;
    }
  }

  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      let plans = await this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });

      // Auto-seed default plans if no plans exist
      if (plans.length === 0) {
        this.logger.log('No subscription plans found, seeding default plans...');
        await this.seedDefaultSubscriptionPlans();
        plans = await this.prisma.subscriptionPlan.findMany({
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        });
      }

      return plans as unknown as SubscriptionPlan[];
    } catch (error) {
      this.logger.error(`Failed to get active subscription plans: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Seeds the default subscription plans if they don't exist.
   * This ensures the 5 subscription plans (Basic, Essential, Professional, Suppliers, Service Providers)
   * are always available for subscription requests.
   */
  private async seedDefaultSubscriptionPlans(): Promise<void> {
    const defaultPlans = [
      {
        name: 'Basic',
        code: 'BASIC',
        description: 'Perfect for small daycares who want essential tools without complexity. Get immediate access to suppliers, compliance info, and support.',
        price: 69.00,
        currency: 'CHF',
        billingPeriod: 'monthly',
        features: [
          'Supplier & service provider marketplace',
          'State policy hub (by canton)',
          'Multilingual interface (EN/FR/DE)',
          'Email support',
        ],
        limits: {
          parentEnquiries: 0,
          marketplace: true,
          policyHub: true,
          multiLanguage: true,
        },
        allowedRoles: ['FOUNDATION'],
        trialDays: 14,
        isActive: true,
        isPopular: false,
        displayOrder: 1,
      },
      {
        name: 'Essential',
        code: 'ESSENTIAL',
        description: 'Perfect for single-site daycares who want to save time with parent leads and compliant HR tools. Win parents faster, stay compliant, and manage enquiries with ease.',
        price: 129.00,
        currency: 'CHF',
        billingPeriod: 'monthly',
        features: [
          'Everything in Basic',
          'Parent leads inbox + auto-matching system',
          'HR & compliance document library (Swiss-validated)',
          'Parent enquiry tracker with quick replies',
        ],
        limits: {
          parentEnquiries: 15,
          marketplace: true,
          policyHub: true,
          multiLanguage: true,
          hrLibrary: true,
          parentLeads: true,
        },
        allowedRoles: ['FOUNDATION'],
        trialDays: 14,
        isActive: true,
        isPopular: true,
        displayOrder: 2,
      },
      {
        name: 'Professional',
        code: 'PROFESSIONAL',
        description: 'Perfect for medium-sized daycares ready to grow and professionalize operations. Recruit and train staff, handle unlimited parent enquiries, and deliver excellence.',
        price: 259.00,
        currency: 'CHF',
        billingPeriod: 'monthly',
        features: [
          'Everything in Essential',
          'Recruitment module',
          'Unlimited parent enquiries',
          'E-learning for staff',
          'Team management & tools',
          'Priority support',
        ],
        limits: {
          parentEnquiries: -1,
          marketplace: true,
          policyHub: true,
          multiLanguage: true,
          hrLibrary: true,
          parentLeads: true,
          recruitment: true,
          eLearning: true,
          teamManagement: true,
        },
        allowedRoles: ['FOUNDATION'],
        trialDays: 14,
        isActive: true,
        isPopular: false,
        displayOrder: 3,
      },
      {
        name: 'Suppliers',
        code: 'SUPPLIERS',
        description: 'Perfect for suppliers focused on daycare market growth. Pricing based on enquiry.',
        price: 0,
        currency: 'CHF',
        billingPeriod: 'enquiry',
        features: [
          'Product listings & marketplace access',
          'Lead management system',
          'Order tracking & fulfillment',
          'Multi-language support',
          'Sales analytics dashboard',
          'Email support',
        ],
        limits: {
          productListings: -1,
          marketplace: true,
          leadManagement: true,
          orderTracking: true,
          analytics: true,
        },
        allowedRoles: ['PRODUCT_SUPPLIER'],
        trialDays: 0,
        isActive: true,
        isPopular: false,
        displayOrder: 4,
      },
      {
        name: 'Service Providers',
        code: 'SERVICE_PROVIDERS',
        description: 'Perfect for service providers targeting professional daycare partnerships. Pricing based on enquiry.',
        price: 0,
        currency: 'CHF',
        billingPeriod: 'enquiry',
        features: [
          'Service listings & marketplace access',
          'Appointment scheduling system',
          'Client relationship management',
          'Revenue tracking & reporting',
          'Multi-language support',
          'Priority support',
        ],
        limits: {
          serviceListings: -1,
          marketplace: true,
          scheduling: true,
          crm: true,
          revenueTracking: true,
        },
        allowedRoles: ['SERVICE_PROVIDER'],
        trialDays: 0,
        isActive: true,
        isPopular: false,
        displayOrder: 5,
      },
    ];

    for (const plan of defaultPlans) {
      try {
        await this.prisma.subscriptionPlan.upsert({
          where: { code: plan.code },
          update: plan,
          create: plan,
        });
        this.logger.log(`Seeded subscription plan: ${plan.name}`);
      } catch (error) {
        this.logger.error(`Failed to seed plan ${plan.name}: ${(error as Error).message}`);
      }
    }
  }

  async getSubscriptionPlanById(id: string): Promise<SubscriptionPlan | null> {
    try {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id },
      });
      return plan as unknown as SubscriptionPlan | null;
    } catch (error) {
      this.logger.error(`Failed to get subscription plan: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateSubscriptionPlan(id: string, data: UpdatePlanDto): Promise<SubscriptionPlan> {
    try {
      const plan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: data as Prisma.SubscriptionPlanUpdateInput,
      });

      this.logger.log(`Updated subscription plan: ${plan.name}`);
      return plan as unknown as SubscriptionPlan;
    } catch (error) {
      this.logger.error(`Failed to update subscription plan: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    try {
      // Check if any active subscriptions use this plan
      const activeSubscriptions = await this.prisma.subscription.count({
        where: {
          planId: id,
          status: { in: ['ACTIVE', 'TRIAL', 'PAUSED'] },
        },
      });

      if (activeSubscriptions > 0) {
        throw new BadRequestException(
          `Cannot delete plan with ${activeSubscriptions} active subscriptions`,
        );
      }

      await this.prisma.subscriptionPlan.delete({
        where: { id },
      });

      this.logger.log(`Deleted subscription plan: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete subscription plan: ${(error as Error).message}`);
      throw error;
    }
  }

  // =====================================
  // SUBSCRIPTION CRUD
  // =====================================

  async createSubscription(
    data: CreateSubscriptionDto,
    performedBy: string,
  ): Promise<Subscription> {
    try {
      // Validate that either userId or organizationId is provided
      if (!data.userId && !data.organizationId) {
        throw new BadRequestException('Either userId or organizationId must be provided');
      }

      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: data.planId },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      const now = new Date();
      const startDate = data.startDate ? new Date(data.startDate) : now;
      const resolved = resolveBillingPeriod(plan.billingPeriod);

      // Calculate period end
      // - If durationMonths explicitly provided, keep existing behavior (months-based override)
      // - Otherwise, use plan billingPeriod as real duration logic (days/months/years)
      const periodEnd = data.durationMonths
        ? (() => {
            const d = new Date(startDate);
            d.setUTCMonth(d.getUTCMonth() + data.durationMonths!);
            return d;
          })()
        : resolved.addPeriod(startDate);

      // Calculate trial dates if applicable
      let trialStart: Date | null = null;
      let trialEnd: Date | null = null;
      let status: SubscriptionStatus = 'PENDING';

      if (data.includeTrial && plan.trialDays > 0) {
        trialStart = startDate;
        trialEnd = new Date(startDate);
        trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
        status = 'TRIAL';
      }

      const subscription = await this.prisma.subscription.create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          planId: data.planId,
          tier: data.tier,
          status: status as any,
          currentPeriodStart: startDate,
          currentPeriodEnd: periodEnd,
          trialStart,
          trialEnd,
          isManual: true,
          notes: data.notes,
          cancelAtPeriodEnd: false,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      // Log the action
      await this.logAction(subscription.id, 'CREATE', null, status, performedBy, 'Subscription created', data.notes);

      this.logger.log(`Created subscription ${subscription.id} for ${data.userId ? 'user' : 'organization'}`);
      return subscription as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async getSubscriptionById(id: string): Promise<Subscription | null> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
        include: {
          user: true,
          organization: true,
          plan: true,
          actions: {
            orderBy: { performedAt: 'desc' },
            take: 10,
          },
          subscriptionNotes: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          schedules: {
            where: { isProcessed: false },
            orderBy: { scheduledDate: 'asc' },
          },
        },
      });

      return subscription as unknown as Subscription | null;
    } catch (error) {
      this.logger.error(`Failed to get subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async getAllSubscriptions(filters: SubscriptionFiltersDto): Promise<{
    subscriptions: Subscription[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.planId) {
        where.planId = filters.planId;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.organizationId) {
        where.organizationId = filters.organizationId;
      }

      if (filters.isManual !== undefined) {
        where.isManual = filters.isManual;
      }

      if (filters.expiringBefore) {
        where.currentPeriodEnd = {
          lte: new Date(filters.expiringBefore),
        };
      }

      if (filters.createdAfter || filters.createdBefore) {
        where.createdAt = {};
        if (filters.createdAfter) {
          where.createdAt.gte = new Date(filters.createdAfter);
        }
        if (filters.createdBefore) {
          where.createdAt.lte = new Date(filters.createdBefore);
        }
      }

      if (filters.search) {
        where.OR = [
          { user: { email: { contains: filters.search, mode: 'insensitive' } } },
          { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
          { organization: { name: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }

      const [subscriptions, total] = await Promise.all([
        this.prisma.subscription.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: true,
            organization: true,
            plan: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.subscription.count({ where }),
      ]);

      return {
        subscriptions: subscriptions as unknown as Subscription[],
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

  async updateSubscription(
    id: string,
    data: UpdateSubscriptionDto,
    performedBy: string,
  ): Promise<Subscription> {
    try {
      const existing = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Subscription not found');
      }

      const updateData: any = {};

      if (data.planId) updateData.planId = data.planId;
      if (data.tier) updateData.tier = data.tier;
      if (data.currentPeriodEnd) updateData.currentPeriodEnd = new Date(data.currentPeriodEnd);
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.metadata) updateData.metadata = data.metadata;

      const subscription = await this.prisma.subscription.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      await this.logAction(
        id,
        'UPDATE',
        existing.status as string,
        subscription.status as string,
        performedBy,
        'Subscription updated',
        data.notes,
      );

      this.logger.log(`Updated subscription ${id}`);
      return subscription as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to update subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteSubscription(id: string, performedBy: string): Promise<void> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      // Soft delete by setting status to CANCELLED
      await this.prisma.subscription.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          canceledAt: new Date(),
          cancellationReason: 'Deleted by admin',
        },
      });

      await this.logAction(
        id,
        'DELETE',
        subscription.status as string,
        'CANCELLED',
        performedBy,
        'Subscription deleted',
      );

      this.logger.log(`Deleted subscription ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  // =====================================
  // SUBSCRIPTION STATUS MANAGEMENT
  // =====================================

  async activateSubscription(
    id: string,
    data: ActivateSubscriptionDto,
    performedBy: string,
  ): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
        include: { plan: true },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.status === 'ACTIVE') {
        throw new BadRequestException('Subscription is already active');
      }

      const now = new Date();
      const startDate = data.startDate ? new Date(data.startDate) : now;
      const resolved = resolveBillingPeriod(subscription.plan.billingPeriod);
      const periodEnd = data.periodMonths
        ? (() => {
            const d = new Date(startDate);
            d.setUTCMonth(d.getUTCMonth() + data.periodMonths!);
            return d;
          })()
        : resolved.addPeriod(startDate);

      const updated = await this.prisma.subscription.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: startDate,
          currentPeriodEnd: periodEnd,
          activatedBy: performedBy,
          activatedAt: now,
          pausedAt: null,
          pausedUntil: null,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      await this.logAction(
        id,
        'ACTIVATE',
        subscription.status as string,
        'ACTIVE',
        performedBy,
        'Subscription activated',
        data.notes,
      );

      // Best-effort: if this subscription came from a request (or matches an open request),
      // mark that request as ACTIVATED so it doesn't remain stuck in UNDER_REVIEW.
      await this.syncSubscriptionRequestOnActivation(
        {
          id: updated.id,
          userId: updated.userId,
          organizationId: updated.organizationId,
          planId: updated.planId,
          tier: updated.tier as unknown as SubscriptionTier,
        },
        performedBy,
      );

      this.logger.log(`Activated subscription ${id}`);
      return updated as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to activate subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async pauseSubscription(
    id: string,
    data: PauseSubscriptionDto,
    performedBy: string,
  ): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
        throw new BadRequestException('Can only pause active or trial subscriptions');
      }

      const now = new Date();
      const pausedUntil = data.pauseUntil ? new Date(data.pauseUntil) : null;

      // If extending end date, calculate pause duration and add to period end
      let newPeriodEnd = subscription.currentPeriodEnd;
      if (data.extendEndDate && pausedUntil && subscription.currentPeriodEnd) {
        const pauseDays = Math.ceil(
          (pausedUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        newPeriodEnd = new Date(subscription.currentPeriodEnd);
        newPeriodEnd.setDate(newPeriodEnd.getDate() + pauseDays);
      }

      const updated = await this.prisma.subscription.update({
        where: { id },
        data: {
          status: 'PAUSED',
          pausedAt: now,
          pausedUntil,
          currentPeriodEnd: newPeriodEnd,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      await this.logAction(
        id,
        'PAUSE',
        subscription.status as string,
        'PAUSED',
        performedBy,
        data.reason,
      );

      this.logger.log(`Paused subscription ${id}`);
      return updated as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to pause subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async resumeSubscription(
    id: string,
    data: ResumeSubscriptionDto,
    performedBy: string,
  ): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.status !== 'PAUSED') {
        throw new BadRequestException('Can only resume paused subscriptions');
      }

      const now = new Date();

      // If extending period, calculate pause duration and add to period end
      let newPeriodEnd = subscription.currentPeriodEnd;
      if (data.extendPeriod && subscription.pausedAt && subscription.currentPeriodEnd) {
        const pauseDays = Math.ceil(
          (now.getTime() - subscription.pausedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        newPeriodEnd = new Date(subscription.currentPeriodEnd);
        newPeriodEnd.setDate(newPeriodEnd.getDate() + pauseDays);
      }

      const updated = await this.prisma.subscription.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          pausedAt: null,
          pausedUntil: null,
          currentPeriodEnd: newPeriodEnd,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      await this.logAction(
        id,
        'RESUME',
        'PAUSED',
        'ACTIVE',
        performedBy,
        'Subscription resumed',
        data.notes,
      );

      this.logger.log(`Resumed subscription ${id}`);
      return updated as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to resume subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async cancelSubscription(
    id: string,
    data: CancelSubscriptionDto,
    performedBy: string,
  ): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.status === 'CANCELLED') {
        throw new BadRequestException('Subscription is already cancelled');
      }

      const now = new Date();

      const updateData: any = {
        canceledAt: now,
        cancellationReason: data.reason,
      };

      if (data.immediate) {
        updateData.status = 'CANCELLED';
        updateData.cancelAtPeriodEnd = false;
      } else {
        updateData.cancelAtPeriodEnd = true;
      }

      const updated = await this.prisma.subscription.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      await this.logAction(
        id,
        'CANCEL',
        subscription.status as string,
        data.immediate ? 'CANCELLED' : subscription.status as string,
        performedBy,
        data.reason,
        data.notes,
      );

      this.logger.log(`Cancelled subscription ${id}`);
      return updated as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async renewSubscription(
    id: string,
    data: RenewSubscriptionDto,
    performedBy: string,
  ): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
        include: { plan: true },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      const now = new Date();
      const startDate = subscription.currentPeriodEnd || now;
      const periodEnd = new Date(startDate);
      periodEnd.setMonth(periodEnd.getMonth() + data.periodMonths);

      const updated = await this.prisma.subscription.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: startDate,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          cancellationReason: null,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      await this.logAction(
        id,
        'RENEW',
        subscription.status as string,
        'ACTIVE',
        performedBy,
        `Renewed for ${data.periodMonths} months`,
        data.notes,
      );

      this.logger.log(`Renewed subscription ${id}`);
      return updated as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to renew subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async extendSubscription(
    id: string,
    data: ExtendSubscriptionDto,
    performedBy: string,
  ): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (!subscription.currentPeriodEnd) {
        throw new BadRequestException('Subscription has no period end date');
      }

      const newPeriodEnd = new Date(subscription.currentPeriodEnd);
      newPeriodEnd.setDate(newPeriodEnd.getDate() + data.additionalDays);

      const updated = await this.prisma.subscription.update({
        where: { id },
        data: {
          currentPeriodEnd: newPeriodEnd,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      await this.logAction(
        id,
        'EXTEND',
        subscription.status as string,
        subscription.status as string,
        performedBy,
        `Extended by ${data.additionalDays} days: ${data.reason}`,
        data.notes,
      );

      this.logger.log(`Extended subscription ${id}`);
      return updated as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to extend subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async upgradeSubscription(
    id: string,
    data: UpgradeDowngradeDto,
    performedBy: string,
  ): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
        include: { plan: true },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      const newPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: data.newPlanId },
      });

      if (!newPlan) {
        throw new NotFoundException('New plan not found');
      }

      // Validate this is actually an upgrade by comparing prices
      if (newPlan.price <= subscription.plan.price) {
        throw new BadRequestException('New plan is not an upgrade - price must be higher than current plan');
      }

      const updateData: any = {
        planId: data.newPlanId,
      };

      if (data.immediate) {
        updateData.currentPeriodStart = new Date();
      }

      const updated = await this.prisma.subscription.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      await this.logAction(
        id,
        'UPGRADE',
        subscription.status as string,
        updated.status as string,
        performedBy,
        `Upgraded from ${subscription.plan.name} to ${newPlan.name}`,
        data.notes,
        { oldPlanId: subscription.planId, newPlanId: data.newPlanId },
      );

      this.logger.log(`Upgraded subscription ${id}`);
      return updated as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to upgrade subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async downgradeSubscription(
    id: string,
    data: UpgradeDowngradeDto,
    performedBy: string,
  ): Promise<Subscription> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
        include: { plan: true },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      const newPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: data.newPlanId },
      });

      if (!newPlan) {
        throw new NotFoundException('New plan not found');
      }

      // Validate this is actually a downgrade by comparing prices
      if (newPlan.price >= subscription.plan.price) {
        throw new BadRequestException('New plan is not a downgrade - price must be lower than current plan');
      }

      const updateData: any = {
        planId: data.newPlanId,
      };

      // If immediate, apply now. Otherwise, schedule for end of period
      if (data.immediate) {
        updateData.currentPeriodStart = new Date();
      }

      const updated = await this.prisma.subscription.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      await this.logAction(
        id,
        'DOWNGRADE',
        subscription.status as string,
        updated.status as string,
        performedBy,
        `Downgraded from ${subscription.plan.name} to ${newPlan.name}`,
        data.notes,
        { oldPlanId: subscription.planId, newPlanId: data.newPlanId },
      );

      this.logger.log(`Downgraded subscription ${id}`);
      return updated as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to downgrade subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  // =====================================
  // SUBSCRIPTION HISTORY & NOTES
  // =====================================

  async getSubscriptionHistory(id: string): Promise<SubscriptionAction[]> {
    try {
      const actions = await this.prisma.subscriptionAction.findMany({
        where: { subscriptionId: id },
        orderBy: { performedAt: 'desc' },
      });
      return actions as unknown as SubscriptionAction[];
    } catch (error) {
      this.logger.error(`Failed to get subscription history: ${(error as Error).message}`);
      throw error;
    }
  }

  async addSubscriptionNote(
    id: string,
    data: AddNoteDto,
    createdBy: string,
  ): Promise<SubscriptionNote> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      const note = await this.prisma.subscriptionNote.create({
        data: {
          subscriptionId: id,
          note: data.note,
          isInternal: data.isInternal ?? true,
          createdBy,
        },
      });

      return note as unknown as SubscriptionNote;
    } catch (error) {
      this.logger.error(`Failed to add subscription note: ${(error as Error).message}`);
      throw error;
    }
  }

  async getSubscriptionNotes(id: string): Promise<SubscriptionNote[]> {
    try {
      const notes = await this.prisma.subscriptionNote.findMany({
        where: { subscriptionId: id },
        orderBy: { createdAt: 'desc' },
      });
      return notes as unknown as SubscriptionNote[];
    } catch (error) {
      this.logger.error(`Failed to get subscription notes: ${(error as Error).message}`);
      throw error;
    }
  }

  // =====================================
  // SCHEDULED ACTIONS
  // =====================================

  async scheduleAction(
    id: string,
    data: ScheduleActionDto,
    createdBy: string,
  ): Promise<SubscriptionSchedule> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      const schedule = await this.prisma.subscriptionSchedule.create({
        data: {
          subscriptionId: id,
          scheduledAction: data.action,
          scheduledDate: new Date(data.scheduledDate),
          targetPlanId: data.targetPlanId,
          createdBy,
        },
      });

      this.logger.log(`Scheduled ${data.action} for subscription ${id}`);
      return schedule as unknown as SubscriptionSchedule;
    } catch (error) {
      this.logger.error(`Failed to schedule action: ${(error as Error).message}`);
      throw error;
    }
  }

  async getSubscriptionSchedules(id: string): Promise<SubscriptionSchedule[]> {
    try {
      const schedules = await this.prisma.subscriptionSchedule.findMany({
        where: { subscriptionId: id, isProcessed: false },
        orderBy: { scheduledDate: 'asc' },
      });
      return schedules as unknown as SubscriptionSchedule[];
    } catch (error) {
      this.logger.error(`Failed to get subscription schedules: ${(error as Error).message}`);
      throw error;
    }
  }

  async cancelScheduledAction(scheduleId: string): Promise<void> {
    try {
      await this.prisma.subscriptionSchedule.delete({
        where: { id: scheduleId },
      });
      this.logger.log(`Cancelled scheduled action ${scheduleId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel scheduled action: ${(error as Error).message}`);
      throw error;
    }
  }

  // =====================================
  // BULK OPERATIONS
  // =====================================

  async bulkPauseSubscriptions(
    data: BulkSubscriptionActionDto,
    performedBy: string,
  ): Promise<{ success: boolean; count: number }> {
    try {
      let count = 0;

      for (const id of data.subscriptionIds) {
        try {
          await this.pauseSubscription(
            id,
            { reason: data.reason || 'Bulk pause' },
            performedBy,
          );
          count++;
        } catch (error) {
          this.logger.warn(`Failed to pause subscription ${id}: ${(error as Error).message}`);
        }
      }

      this.logger.log(`Bulk paused ${count} subscriptions`);
      return { success: true, count };
    } catch (error) {
      this.logger.error(`Failed to bulk pause subscriptions: ${(error as Error).message}`);
      throw error;
    }
  }

  async bulkCancelSubscriptions(
    data: BulkSubscriptionActionDto,
    performedBy: string,
  ): Promise<{ success: boolean; count: number }> {
    try {
      let count = 0;

      for (const id of data.subscriptionIds) {
        try {
          await this.cancelSubscription(
            id,
            { immediate: true, reason: data.reason || 'Bulk cancel' },
            performedBy,
          );
          count++;
        } catch (error) {
          this.logger.warn(`Failed to cancel subscription ${id}: ${(error as Error).message}`);
        }
      }

      this.logger.log(`Bulk cancelled ${count} subscriptions`);
      return { success: true, count };
    } catch (error) {
      this.logger.error(`Failed to bulk cancel subscriptions: ${(error as Error).message}`);
      throw error;
    }
  }

  // =====================================
  // ANALYTICS & REPORTING
  // =====================================

  async getSubscriptionAnalytics(timeRange: string = '30d'): Promise<SubscriptionAnalytics> {
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const [
        totalSubscriptions,
        activeSubscriptions,
        pausedSubscriptions,
        trialSubscriptions,
        cancelledSubscriptions,
        expiredSubscriptions,
        pendingSubscriptions,
        expiringWithin30Days,
        subscriptionsByPlan,
        subscriptionsByStatus,
        previousPeriodActive,
        previousPeriodCancelled,
        activePlans,
      ] = await Promise.all([
        this.prisma.subscription.count(),
        this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        this.prisma.subscription.count({ where: { status: 'PAUSED' } }),
        this.prisma.subscription.count({ where: { status: 'TRIAL' } }),
        this.prisma.subscription.count({ where: { status: 'CANCELLED' } }),
        this.prisma.subscription.count({ where: { status: 'EXPIRED' } }),
        this.prisma.subscription.count({ where: { status: 'PENDING' } }),
        this.prisma.subscription.count({
          where: {
            status: 'ACTIVE',
            currentPeriodEnd: { lte: thirtyDaysFromNow },
          },
        }),
        this.prisma.subscription.groupBy({
          by: ['planId'],
          _count: { id: true },
        }),
        this.prisma.subscription.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.subscription.count({
          where: {
            status: 'ACTIVE',
            createdAt: {
              gte: new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000),
              lt: startDate,
            },
          },
        }),
        this.prisma.subscription.count({
          where: {
            status: 'CANCELLED',
            canceledAt: {
              gte: new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000),
              lt: startDate,
            },
          },
        }),
        this.prisma.subscription.findMany({
          where: { status: 'ACTIVE' },
          include: { plan: true },
        }),
      ]);

      // Calculate MRR and ARR
      let monthlyRecurringRevenue = 0;
      for (const sub of activePlans) {
        const planPrice = sub.plan.price;
        const resolved = resolveBillingPeriod(sub.plan.billingPeriod);

        // Only count recurring plans towards MRR/ARR.
        // Fixed-term plans ("30 days", "1 year") are not treated as recurring revenue.
        if (!resolved.isRecurring) continue;

        monthlyRecurringRevenue += planPrice / resolved.monthsPerPeriod;
      }

      const annualRecurringRevenue = monthlyRecurringRevenue * 12;

      // Calculate growth and churn rates
      const currentActive = activeSubscriptions + trialSubscriptions;
      const growthRate = previousPeriodActive > 0
        ? ((currentActive - previousPeriodActive) / previousPeriodActive) * 100
        : 0;
      const churnRate = previousPeriodActive > 0
        ? (previousPeriodCancelled / previousPeriodActive) * 100
        : 0;

      // Format subscriptions by plan
      const byPlan: Record<string, number> = {};
      for (const group of subscriptionsByPlan) {
        byPlan[group.planId] = group._count.id;
      }

      // Format subscriptions by status
      const byStatus: Record<string, number> = {};
      for (const group of subscriptionsByStatus) {
        byStatus[group.status] = group._count.id;
      }

      return {
        totalSubscriptions,
        activeSubscriptions,
        pausedSubscriptions,
        trialSubscriptions,
        cancelledSubscriptions,
        expiredSubscriptions,
        pendingSubscriptions,
        expiringWithin30Days,
        monthlyRecurringRevenue,
        annualRecurringRevenue,
        subscriptionsByPlan: byPlan,
        subscriptionsByStatus: byStatus,
        growthRate,
        churnRate,
        averageSubscriptionLength: 0, // Would need more complex calculation
      };
    } catch (error) {
      this.logger.error(`Failed to get subscription analytics: ${(error as Error).message}`);
      throw error;
    }
  }

  async getExpiringSubscriptions(daysAhead: number): Promise<Subscription[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: { lte: futureDate },
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
        orderBy: { currentPeriodEnd: 'asc' },
      });

      return subscriptions as unknown as Subscription[];
    } catch (error) {
      this.logger.error(`Failed to get expiring subscriptions: ${(error as Error).message}`);
      throw error;
    }
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    try {
      // First, let's check ALL subscriptions for this user to see what exists
      const allUserSubscriptions = await this.prisma.subscription.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          userId: true,
          organizationId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(`🔍 All subscriptions for userId ${userId}:`, JSON.stringify(allUserSubscriptions, null, 2));

      const subscription = await this.prisma.subscription.findFirst({
        where: { 
          userId,
          status: { in: ['ACTIVE', 'TRIAL'] } // Only return active or trial subscriptions
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return subscription as unknown as Subscription | null;
    } catch (error) {
      this.logger.error(`Failed to get user subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  async getOrganizationSubscription(organizationId: string): Promise<Subscription | null> {
    try {
      // First, let's check ALL subscriptions for this organization to see what exists
      const allOrgSubscriptions = await this.prisma.subscription.findMany({
        where: { organizationId },
        select: {
          id: true,
          status: true,
          userId: true,
          organizationId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(`🔍 All subscriptions for organizationId ${organizationId}:`, JSON.stringify(allOrgSubscriptions, null, 2));

      const subscription = await this.prisma.subscription.findFirst({
        where: { 
          organizationId,
          status: { in: ['ACTIVE', 'TRIAL'] } // Only return active or trial subscriptions
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return subscription as unknown as Subscription | null;
    } catch (error) {
      this.logger.error(`Failed to get organization subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * UNIFIED SUBSCRIPTION LOOKUP - Single source of truth for all subscription checks
   * 
   * This method handles ALL subscription lookup scenarios consistently:
   * 1. Checks user-based subscription (by userId)
   * 2. Checks organization-based subscription (by organizationId)
   * 3. If userId provided but no organizationId, looks up user's organization
   * 
   * For business roles (Foundation, Supplier, Service Provider), the subscription
   * is typically linked to the organization, not the individual user.
   * 
   * @param userId - The User.id (profile UUID, not Clerk ID)
   * @param organizationId - Optional organization ID (will be looked up if not provided)
   * @returns The active subscription or null
   */
  async getActiveSubscriptionForUser(
    userId?: string,
    organizationId?: string,
  ): Promise<Subscription | null> {
    try {
      let subscription: Subscription | null = null;

      this.logger.log(`🔍 Looking up subscription - userId: ${userId}, organizationId: ${organizationId}`);

      // If we have organizationId, check organization subscription FIRST
      // (business subscriptions are organization-based)
      if (organizationId) {
        this.logger.log(`🔍 Checking organization subscription for organizationId: ${organizationId}`);
        subscription = await this.getOrganizationSubscription(organizationId);
        if (subscription) {
          this.logger.log(`✅ Found active subscription via organizationId: ${organizationId} - subscriptionId: ${subscription.id}, status: ${subscription.status}`);
          return subscription;
        } else {
          this.logger.log(`❌ No active subscription found for organizationId: ${organizationId}`);
        }
      }

      // Check user-based subscription
      if (userId) {
        this.logger.log(`🔍 Checking user subscription for userId: ${userId}`);
        subscription = await this.getUserSubscription(userId);
        if (subscription) {
          this.logger.log(`✅ Found active subscription via userId: ${userId} - subscriptionId: ${subscription.id}, status: ${subscription.status}`);
          return subscription;
        } else {
          this.logger.log(`❌ No active subscription found for userId: ${userId}`);
        }

        // If no organizationId was provided, look up user's organization and check
        // Note: This fallback exists for direct service calls (e.g., background jobs, admin operations)
        // where organizationId may not be available from request context
        if (!organizationId) {
          this.logger.log(`🔍 No organizationId provided, looking up user's organization...`);
          const userOrg = await this.prisma.userOrganization.findFirst({
            where: { userId },
            orderBy: { createdAt: 'asc' },
          });

          if (userOrg?.organizationId) {
            this.logger.log(`🔍 Found user's organization: ${userOrg.organizationId}, checking for subscription...`);
            subscription = await this.getOrganizationSubscription(userOrg.organizationId);
            if (subscription) {
              this.logger.log(`✅ Found active subscription via user's organization: ${userOrg.organizationId} - subscriptionId: ${subscription.id}, status: ${subscription.status}`);
              return subscription;
            } else {
              this.logger.log(`❌ No active subscription found for user's organization: ${userOrg.organizationId}`);
            }
          } else {
            this.logger.log(`❌ No organization found for userId: ${userId}`);
          }
        }
      }

      this.logger.log(`❌ No active subscription found for userId: ${userId}, organizationId: ${organizationId}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to get active subscription: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Check if user has access to a specific feature
   * Uses the UNIFIED subscription lookup for consistency
   */
  async checkFeatureAccess(
    userId?: string,
    feature?: string,
    organizationId?: string,
  ): Promise<boolean> {
    try {
      if (!feature) {
        return false;
      }

      // Use unified lookup
      const subscription = await this.getActiveSubscriptionForUser(userId, organizationId);

      if (!subscription) {
        return false;
      }

      if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
        return false;
      }

      const plan = subscription.plan;
      return plan.features.includes(feature) || plan.features.includes('*');
    } catch (error) {
      this.logger.error(`Failed to check feature access: ${(error as Error).message}`);
      return false;
    }
  }

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    cancelAtPeriodEnd?: boolean,
    performedBy: string = 'system',
  ): Promise<Subscription> {
    try {
      const existing = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!existing) {
        throw new NotFoundException('Subscription not found');
      }

      const subscription = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: status as any,
          ...(cancelAtPeriodEnd !== undefined && { cancelAtPeriodEnd }),
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      await this.logAction(
        subscriptionId,
        'STATUS_UPDATE',
        existing.status as string,
        status,
        performedBy,
        'Status updated directly',
      );

      // If status is set to ACTIVE/TRIAL via direct status update, keep any related request in sync.
      if (status === 'ACTIVE' || status === 'TRIAL') {
        await this.syncSubscriptionRequestOnActivation(
          {
            id: subscription.id,
            userId: subscription.userId,
            organizationId: subscription.organizationId,
            planId: subscription.planId,
            tier: subscription.tier as unknown as SubscriptionTier,
          },
          performedBy,
        );
      }

      this.logger.log(`Updated subscription ${subscriptionId} status to ${status}`);
      return subscription as unknown as Subscription;
    } catch (error) {
      this.logger.error(`Failed to update subscription status: ${(error as Error).message}`);
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

  async processBillingCycle(): Promise<void> {
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
        const resolved = resolveBillingPeriod(subscription.plan.billingPeriod);

        if (subscription.cancelAtPeriodEnd) {
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'CANCELLED',
              canceledAt: now,
            },
          });
          continue;
        }

        // Non-recurring plans end when their period ends.
        if (!resolved.isRecurring) {
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'EXPIRED',
            },
          });
          continue;
        }

        // Recurring plans: advance one period.
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodStart: now,
            currentPeriodEnd: resolved.addPeriod(now),
          },
        });
      }

      this.logger.log(`Processed billing cycle for ${subscriptions.length} subscriptions`);
    } catch (error) {
      this.logger.error(`Failed to process billing cycle: ${(error as Error).message}`);
      throw error;
    }
  }

  // =====================================
  // PRIVATE HELPERS
  // =====================================

  private async logAction(
    subscriptionId: string,
    action: string,
    previousStatus: string | null,
    newStatus: string,
    performedBy: string,
    reason?: string,
    notes?: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.prisma.subscriptionAction.create({
        data: {
          subscriptionId,
          action,
          previousStatus,
          newStatus,
          reason,
          notes,
          performedBy,
          metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log subscription action: ${(error as Error).message}`);
    }
  }
}
