import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger.service';
import { SubscriptionTier } from '@workspace/types';
import {
  CreateSubscriptionRequestDto,
  SubscriptionRequestFiltersDto,
  SubscriptionRequestStatus,
  ReviewSubscriptionRequestDto,
  SendInvoiceDto,
  ConfirmPaymentDto,
  ActivateFromRequestDto,
  DeclineSubscriptionRequestDto,
  AddRequestNoteDto,
  UpdateSubscriptionSettingsDto,
} from './dto';
import { SubscriptionManagementService } from './subscription-management.service';

export interface SubscriptionRequest {
  id: string;
  userId?: string;
  organizationId?: string;
  planId: string;
  tier: SubscriptionTier;
  billingPeriod: string;
  contactName?: string;
  contactEmail: string;
  contactPhone?: string;
  preferredContact?: string;
  message?: string;
  notes?: string;
  status: SubscriptionRequestStatus;
  invoiceNumber?: string;
  invoiceSentAt?: Date;
  invoiceAmount?: number;
  invoiceCurrency?: string;
  paymentReceivedAt?: Date;
  paymentReference?: string;
  subscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  processedAt?: Date;
  processedBy?: string;
  declinedAt?: Date;
  declinedBy?: string;
  declineReason?: string;
  user?: any;
  organization?: any;
  plan?: any;
  subscription?: any;
}

export interface SubscriptionSettings {
  id: string;
  notificationEmail?: string;
  enableEmailNotifications: boolean;
  defaultTrialDays: number;
  defaultGracePeriodDays: number;
  invoicePrefix: string;
  invoiceNextNumber: number;
  paymentTermsDays: number;
  estimatedResponseHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRequestAnalytics {
  totalRequests: number;
  // UI-aligned field names
  pending: number;
  underReview: number;
  invoiceSent: number;
  paymentReceived: number;
  activated: number;
  declined: number;
  cancelled: number;
  requestsByStatus: Record<string, number>;
  averageProcessingDays: number;
  conversionRate: number;
}

@Injectable()
export class SubscriptionRequestService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly subscriptionService: SubscriptionManagementService,
  ) {}

  // =====================================
  // USER-FACING METHODS
  // =====================================

  /**
   * Create a new subscription request (user-facing)
   */
  async createRequest(
    data: CreateSubscriptionRequestDto,
    userId?: string,
    organizationId?: string,
  ): Promise<SubscriptionRequest> {
    try {
      // Validate that either userId or organizationId is provided
      if (!userId && !organizationId) {
        throw new BadRequestException('User or organization ID required');
      }

      // Check if plan exists
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: data.planId },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // Check for existing pending request
      // Build owner conditions properly to avoid matching all requests when IDs are missing
      const ownerConditions = [
        userId ? { userId } : null,
        organizationId ? { organizationId } : null,
      ].filter(Boolean) as Array<{ userId?: string; organizationId?: string }>;

      if (ownerConditions.length > 0) {
        const existingRequest = await this.prisma.subscriptionRequest.findFirst({
          where: {
            OR: ownerConditions,
            status: {
              in: ['PENDING', 'UNDER_REVIEW', 'INVOICE_SENT', 'PAYMENT_PENDING'],
            },
          },
        });

        if (existingRequest) {
          throw new BadRequestException(
            'You already have a pending subscription request. Please wait for it to be processed.',
          );
        }
      }

      // Determine tier from plan code if not provided
      const tier = data.tier || this.getTierFromPlanCode(plan.code);

      // Create the request
      const request = await this.prisma.subscriptionRequest.create({
        data: {
          userId,
          organizationId,
          planId: data.planId,
          tier: tier as any,
          billingPeriod: data.billingPeriod || plan.billingPeriod || 'monthly',
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          preferredContact: data.preferredContact || 'email',
          message: data.message,
          status: 'PENDING',
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      this.logger.log(`Created subscription request ${request.id}`);

      // TODO: Send notification email to admin if configured
      await this.sendAdminNotification(request);

      // TODO: Send confirmation email to user
      await this.sendUserConfirmation(request);

      return request as unknown as SubscriptionRequest;
    } catch (error) {
      this.logger.error(`Failed to create subscription request: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get user's subscription requests
   */
  async getUserRequests(userId?: string, organizationId?: string): Promise<SubscriptionRequest[]> {
    try {
      const requests = await this.prisma.subscriptionRequest.findMany({
        where: {
          OR: [
            { userId: userId || undefined },
            { organizationId: organizationId || undefined },
          ].filter(c => Object.values(c).some(v => v !== undefined)),
        },
        include: {
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return requests as unknown as SubscriptionRequest[];
    } catch (error) {
      this.logger.error(`Failed to get user requests: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Cancel a pending request (user-facing)
   */
  async cancelRequest(id: string, userId?: string, organizationId?: string): Promise<void> {
    try {
      const request = await this.prisma.subscriptionRequest.findUnique({
        where: { id },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      // Verify ownership
      if (request.userId !== userId && request.organizationId !== organizationId) {
        throw new BadRequestException('You are not authorized to cancel this request');
      }

      // Only allow cancellation of pending/under review requests
      if (!['PENDING', 'UNDER_REVIEW'].includes(request.status)) {
        throw new BadRequestException('This request cannot be cancelled at this stage');
      }

      await this.prisma.subscriptionRequest.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      this.logger.log(`User cancelled subscription request ${id}`);
    } catch (error) {
      this.logger.error(`Failed to cancel request: ${(error as Error).message}`);
      throw error;
    }
  }

  // =====================================
  // ADMIN METHODS
  // =====================================

  /**
   * Get all subscription requests with filters
   */
  async getAllRequests(filters: SubscriptionRequestFiltersDto): Promise<{
    requests: SubscriptionRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.createdAt.lte = new Date(filters.dateTo);
        }
      }

      if (filters.search) {
        where.OR = [
          { contactEmail: { contains: filters.search, mode: 'insensitive' } },
          { contactName: { contains: filters.search, mode: 'insensitive' } },
          { user: { email: { contains: filters.search, mode: 'insensitive' } } },
          { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
          { organization: { name: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }

      const [requests, total] = await Promise.all([
        this.prisma.subscriptionRequest.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: true,
            organization: true,
            plan: true,
            subscription: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.subscriptionRequest.count({ where }),
      ]);

      return {
        requests: requests as unknown as SubscriptionRequest[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get all requests: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get a single request by ID
   */
  async getRequestById(id: string): Promise<SubscriptionRequest | null> {
    try {
      const request = await this.prisma.subscriptionRequest.findUnique({
        where: { id },
        include: {
          user: true,
          organization: true,
          plan: true,
          subscription: true,
        },
      });

      return request as unknown as SubscriptionRequest | null;
    } catch (error) {
      this.logger.error(`Failed to get request: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Mark request as under review
   */
  async reviewRequest(
    id: string,
    data: ReviewSubscriptionRequestDto,
    performedBy: string,
  ): Promise<SubscriptionRequest> {
    try {
      const request = await this.prisma.subscriptionRequest.findUnique({
        where: { id },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (request.status !== 'PENDING') {
        throw new BadRequestException('Only pending requests can be marked as under review');
      }

      const updated = await this.prisma.subscriptionRequest.update({
        where: { id },
        data: {
          status: 'UNDER_REVIEW',
          reviewedAt: new Date(),
          reviewedBy: performedBy,
          notes: data.notes ? (request.notes ? `${request.notes}\n${data.notes}` : data.notes) : request.notes,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      this.logger.log(`Request ${id} marked as under review by ${performedBy}`);
      return updated as unknown as SubscriptionRequest;
    } catch (error) {
      this.logger.error(`Failed to review request: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Send invoice for a request
   */
  async sendInvoice(
    id: string,
    data: SendInvoiceDto,
    performedBy: string,
  ): Promise<SubscriptionRequest> {
    try {
      const request = await this.prisma.subscriptionRequest.findUnique({
        where: { id },
        include: { plan: true },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (!['PENDING', 'UNDER_REVIEW'].includes(request.status)) {
        throw new BadRequestException('Invoice can only be sent for pending or under review requests');
      }

      const updated = await this.prisma.subscriptionRequest.update({
        where: { id },
        data: {
          status: 'INVOICE_SENT',
          invoiceNumber: data.invoiceNumber,
          invoiceAmount: data.invoiceAmount,
          invoiceCurrency: data.invoiceCurrency || 'CHF',
          invoiceSentAt: new Date(),
          notes: data.notes ? (request.notes ? `${request.notes}\n${data.notes}` : data.notes) : request.notes,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      // Increment invoice number in settings
      await this.incrementInvoiceNumber();

      // TODO: Send invoice email if configured
      if (data.sendEmail) {
        await this.sendInvoiceEmail(updated);
      }

      this.logger.log(`Invoice ${data.invoiceNumber} sent for request ${id}`);
      return updated as unknown as SubscriptionRequest;
    } catch (error) {
      this.logger.error(`Failed to send invoice: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Confirm payment received
   */
  async confirmPayment(
    id: string,
    data: ConfirmPaymentDto,
    performedBy: string,
  ): Promise<SubscriptionRequest> {
    try {
      const request = await this.prisma.subscriptionRequest.findUnique({
        where: { id },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      // Manual/off-platform invoicing: allow recording payment even if no invoice was sent via platform.
      // This keeps the request workflow usable when billing is handled externally.
      const allowedStatuses = ['INVOICE_SENT', 'PAYMENT_PENDING', 'PENDING', 'UNDER_REVIEW'];
      if (!allowedStatuses.includes(request.status)) {
        throw new BadRequestException('Payment cannot be confirmed from current status');
      }

      const updated = await this.prisma.subscriptionRequest.update({
        where: { id },
        data: {
          status: 'PAYMENT_RECEIVED',
          paymentReceivedAt: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          paymentReference: data.paymentReference,
          notes: data.notes ? (request.notes ? `${request.notes}\n${data.notes}` : data.notes) : request.notes,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      this.logger.log(`Payment confirmed for request ${id}`);

      // Auto-activate if requested
      if (data.autoActivate) {
        return this.activateRequest(id, {}, performedBy);
      }

      return updated as unknown as SubscriptionRequest;
    } catch (error) {
      this.logger.error(`Failed to confirm payment: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Activate subscription from request
   */
  async activateRequest(
    id: string,
    data: ActivateFromRequestDto,
    performedBy: string,
  ): Promise<SubscriptionRequest> {
    try {
      const request = await this.prisma.subscriptionRequest.findUnique({
        where: { id },
        include: { plan: true },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      // Allow activation from PAYMENT_RECEIVED or directly from PENDING/UNDER_REVIEW (for free trials, etc.)
      const allowedStatuses = ['PAYMENT_RECEIVED', 'PENDING', 'UNDER_REVIEW', 'INVOICE_SENT'];
      if (!allowedStatuses.includes(request.status)) {
        throw new BadRequestException('Request cannot be activated from current status');
      }

      // Create the subscription
      const subscription = await this.subscriptionService.createSubscription(
        {
          userId: request.userId || undefined,
          organizationId: request.organizationId || undefined,
          planId: request.planId,
          tier: request.tier as SubscriptionTier,
          startDate: data.startDate,
          durationMonths: data.periodMonths,
          includeTrial: data.includeTrial,
          notes: data.notes || `Created from subscription request ${id}`,
        },
        performedBy,
      );

      // Activate the subscription
      await this.subscriptionService.activateSubscription(
        subscription.id,
        {
          startDate: data.startDate,
          periodMonths: data.periodMonths,
          notes: data.notes,
        },
        performedBy,
      );

      // Update the request
      const updated = await this.prisma.subscriptionRequest.update({
        where: { id },
        data: {
          status: 'ACTIVATED',
          subscriptionId: subscription.id,
          processedAt: new Date(),
          processedBy: performedBy,
          notes: data.notes ? (request.notes ? `${request.notes}\n${data.notes}` : data.notes) : request.notes,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
          subscription: true,
        },
      });

      // TODO: Send activation email if configured
      if (data.sendEmail) {
        await this.sendActivationEmail(updated);
      }

      this.logger.log(`Request ${id} activated, subscription ${subscription.id} created`);
      return updated as unknown as SubscriptionRequest;
    } catch (error) {
      this.logger.error(`Failed to activate request: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Decline a subscription request
   */
  async declineRequest(
    id: string,
    data: DeclineSubscriptionRequestDto,
    performedBy: string,
  ): Promise<SubscriptionRequest> {
    try {
      const request = await this.prisma.subscriptionRequest.findUnique({
        where: { id },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      if (['ACTIVATED', 'DECLINED', 'CANCELLED'].includes(request.status)) {
        throw new BadRequestException('Request cannot be declined');
      }

      const updated = await this.prisma.subscriptionRequest.update({
        where: { id },
        data: {
          status: 'DECLINED',
          declinedAt: new Date(),
          declinedBy: performedBy,
          declineReason: data.reason,
          notes: data.notes ? (request.notes ? `${request.notes}\n${data.notes}` : data.notes) : request.notes,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      // TODO: Send decline email if configured
      if (data.sendEmail) {
        await this.sendDeclineEmail(updated);
      }

      this.logger.log(`Request ${id} declined by ${performedBy}: ${data.reason}`);
      return updated as unknown as SubscriptionRequest;
    } catch (error) {
      this.logger.error(`Failed to decline request: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Add a note to a request
   */
  async addNote(id: string, data: AddRequestNoteDto, createdBy: string): Promise<SubscriptionRequest> {
    try {
      const request = await this.prisma.subscriptionRequest.findUnique({
        where: { id },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      const timestamp = new Date().toISOString();
      const noteEntry = `[${timestamp}] ${createdBy}: ${data.note}`;
      const newNotes = request.notes ? `${request.notes}\n${noteEntry}` : noteEntry;

      const updated = await this.prisma.subscriptionRequest.update({
        where: { id },
        data: {
          notes: newNotes,
        },
        include: {
          user: true,
          organization: true,
          plan: true,
        },
      });

      return updated as unknown as SubscriptionRequest;
    } catch (error) {
      this.logger.error(`Failed to add note: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get request analytics
   */
  async getRequestAnalytics(): Promise<SubscriptionRequestAnalytics> {
    try {
      const [
        totalRequests,
        pending,
        underReview,
        invoiceSent,
        paymentReceived,
        activated,
        declined,
        cancelled,
        requestsByStatus,
      ] = await Promise.all([
        this.prisma.subscriptionRequest.count(),
        this.prisma.subscriptionRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.subscriptionRequest.count({ where: { status: 'UNDER_REVIEW' } }),
        this.prisma.subscriptionRequest.count({ where: { status: 'INVOICE_SENT' } }),
        this.prisma.subscriptionRequest.count({ where: { status: 'PAYMENT_RECEIVED' } }),
        this.prisma.subscriptionRequest.count({ where: { status: 'ACTIVATED' } }),
        this.prisma.subscriptionRequest.count({ where: { status: 'DECLINED' } }),
        this.prisma.subscriptionRequest.count({ where: { status: 'CANCELLED' } }),
        this.prisma.subscriptionRequest.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
      ]);

      // Format by status
      const byStatus: Record<string, number> = {};
      for (const group of requestsByStatus) {
        byStatus[group.status] = group._count.id;
      }

      // Calculate conversion rate
      const conversionRate = totalRequests > 0 ? (activated / totalRequests) * 100 : 0;

      return {
        totalRequests,
        pending,
        underReview,
        invoiceSent,
        paymentReceived,
        activated,
        declined,
        cancelled,
        requestsByStatus: byStatus,
        averageProcessingDays: 0, // TODO: Calculate
        conversionRate,
      };
    } catch (error) {
      this.logger.error(`Failed to get request analytics: ${(error as Error).message}`);
      throw error;
    }
  }

  // =====================================
  // SETTINGS METHODS
  // =====================================

  /**
   * Get subscription settings
   */
  async getSettings(): Promise<SubscriptionSettings> {
    try {
      let settings = await this.prisma.subscriptionSettings.findFirst();

      if (!settings) {
        // Create default settings
        settings = await this.prisma.subscriptionSettings.create({
          data: {},
        });
      }

      return settings as unknown as SubscriptionSettings;
    } catch (error) {
      this.logger.error(`Failed to get settings: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Update subscription settings
   */
  async updateSettings(data: UpdateSubscriptionSettingsDto): Promise<SubscriptionSettings> {
    try {
      let settings = await this.prisma.subscriptionSettings.findFirst();

      if (!settings) {
        settings = await this.prisma.subscriptionSettings.create({
          data: data as any,
        });
      } else {
        settings = await this.prisma.subscriptionSettings.update({
          where: { id: settings.id },
          data: data as any,
        });
      }

      this.logger.log('Updated subscription settings');
      return settings as unknown as SubscriptionSettings;
    } catch (error) {
      this.logger.error(`Failed to update settings: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get next invoice number
   */
  async getNextInvoiceNumber(): Promise<string> {
    const settings = await this.getSettings();
    return `${settings.invoicePrefix}${settings.invoiceNextNumber}`;
  }

  // =====================================
  // PRIVATE HELPERS
  // =====================================

  private getTierFromPlanCode(code: string | null): SubscriptionTier {
    if (!code) return SubscriptionTier.BASIC;
    
    const upperCode = code.toUpperCase();
    if (Object.values(SubscriptionTier).includes(upperCode as SubscriptionTier)) {
      return upperCode as SubscriptionTier;
    }
    return SubscriptionTier.BASIC;
  }

  private async incrementInvoiceNumber(): Promise<void> {
    try {
      const settings = await this.prisma.subscriptionSettings.findFirst();
      if (settings) {
        await this.prisma.subscriptionSettings.update({
          where: { id: settings.id },
          data: {
            invoiceNextNumber: settings.invoiceNextNumber + 1,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to increment invoice number: ${(error as Error).message}`);
    }
  }

  // Email notification placeholders - to be implemented with email service
  private async sendAdminNotification(request: any): Promise<void> {
    // TODO: Implement with EmailService
    this.logger.log(`[EMAIL] Would send admin notification for request ${request.id}`);
  }

  private async sendUserConfirmation(request: any): Promise<void> {
    // TODO: Implement with EmailService
    this.logger.log(`[EMAIL] Would send user confirmation for request ${request.id}`);
  }

  private async sendInvoiceEmail(request: any): Promise<void> {
    // TODO: Implement with EmailService
    this.logger.log(`[EMAIL] Would send invoice email for request ${request.id}`);
  }

  private async sendActivationEmail(request: any): Promise<void> {
    // TODO: Implement with EmailService
    this.logger.log(`[EMAIL] Would send activation email for request ${request.id}`);
  }

  private async sendDeclineEmail(request: any): Promise<void> {
    // TODO: Implement with EmailService
    this.logger.log(`[EMAIL] Would send decline email for request ${request.id}`);
  }
}
