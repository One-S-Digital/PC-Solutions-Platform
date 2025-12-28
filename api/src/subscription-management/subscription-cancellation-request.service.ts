import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger.service';
import { SubscriptionManagementService } from './subscription-management.service';
import {
  CancellationRequestFiltersDto,
  CreateSubscriptionCancellationRequestDto,
  ProcessCancellationRequestDto,
  SubscriptionCancellationRequestStatus,
} from './dto/subscription-cancellation-request.dto';

export interface SubscriptionCancellationRequest {
  id: string;
  subscriptionId: string;
  userId?: string;
  organizationId?: string;
  reason?: string;
  status: SubscriptionCancellationRequestStatus;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  notes?: string;
  user?: any;
  organization?: any;
  subscription?: any;
}

@Injectable()
export class SubscriptionCancellationRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly subscriptionService: SubscriptionManagementService,
  ) {}

  // =====================================
  // USER-FACING
  // =====================================

  async createCancellationRequest(params: {
    subscriptionId: string;
    userId?: string;
    organizationId?: string;
    data: CreateSubscriptionCancellationRequestDto;
  }): Promise<SubscriptionCancellationRequest> {
    const { subscriptionId, userId, organizationId, data } = params;

    if (!subscriptionId) {
      throw new BadRequestException('Subscription ID is required');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true, organization: true, plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Basic ownership guard: ensure request is for the caller's user/org subscription context
    const ownsSubscription =
      (userId && subscription.userId === userId) ||
      (organizationId && subscription.organizationId === organizationId);
    if (!ownsSubscription) {
      throw new BadRequestException('Not authorized to request cancellation for this subscription');
    }

    const existing = await this.prisma.subscriptionCancellationRequest.findFirst({
      where: {
        subscriptionId,
        status: 'PENDING',
      },
    });
    if (existing) {
      throw new BadRequestException('A cancellation request is already pending for this subscription');
    }

    const created = await this.prisma.subscriptionCancellationRequest.create({
      data: {
        subscriptionId,
        userId: subscription.userId ?? null,
        organizationId: subscription.organizationId ?? null,
        reason: data.reason,
        status: 'PENDING',
      },
      include: {
        user: true,
        organization: true,
        subscription: { include: { plan: true } },
      },
    });

    this.logger.log(`Created subscription cancellation request ${created.id} for subscription ${subscriptionId}`);
    return created as unknown as SubscriptionCancellationRequest;
  }

  // =====================================
  // ADMIN
  // =====================================

  async getAllCancellationRequests(filters: CancellationRequestFiltersDto): Promise<{
    requests: SubscriptionCancellationRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.subscriptionId) {
      where.subscriptionId = filters.subscriptionId;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.requestedAt = {};
      if (filters.dateFrom) {
        const dateFrom = new Date(filters.dateFrom);
        if (!Number.isNaN(dateFrom.getTime())) where.requestedAt.gte = dateFrom;
      }
      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        if (!Number.isNaN(dateTo.getTime())) where.requestedAt.lte = dateTo;
      }
    }
    if (filters.search) {
      where.OR = [
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { organization: { name: { contains: filters.search, mode: 'insensitive' } } },
        { subscriptionId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filter by role (derived from the subscription's plan.allowedRoles)
    if (filters.role) {
      where.subscription = {
        plan: {
          allowedRoles: {
            has: filters.role,
          },
        },
      };
    }

    const [requests, total] = await Promise.all([
      this.prisma.subscriptionCancellationRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: true,
          organization: true,
          subscription: { include: { plan: true } },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.subscriptionCancellationRequest.count({ where }),
    ]);

    return {
      requests: requests as unknown as SubscriptionCancellationRequest[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveCancellationRequest(id: string, data: ProcessCancellationRequestDto, performedBy: string) {
    const req = await this.prisma.subscriptionCancellationRequest.findUnique({
      where: { id },
    });
    if (!req) throw new NotFoundException('Cancellation request not found');
    if (req.status !== 'PENDING') {
      throw new BadRequestException('Only pending cancellation requests can be approved');
    }

    const immediate = !!data.immediate;
    const reason = (data.reason || req.reason || 'Cancellation requested').toString();

    // Cancel the subscription (immediate or at period end)
    await this.subscriptionService.cancelSubscription(
      req.subscriptionId,
      {
        immediate,
        reason,
        notes: data.notes,
      },
      performedBy,
    );

    const updated = await this.prisma.subscriptionCancellationRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        processedAt: new Date(),
        processedBy: performedBy,
        notes: data.notes || undefined,
      },
      include: {
        user: true,
        organization: true,
        subscription: { include: { plan: true } },
      },
    });

    return updated;
  }

  async declineCancellationRequest(id: string, data: ProcessCancellationRequestDto, performedBy: string) {
    const req = await this.prisma.subscriptionCancellationRequest.findUnique({
      where: { id },
    });
    if (!req) throw new NotFoundException('Cancellation request not found');
    if (req.status !== 'PENDING') {
      throw new BadRequestException('Only pending cancellation requests can be declined');
    }

    const updated = await this.prisma.subscriptionCancellationRequest.update({
      where: { id },
      data: {
        status: 'DECLINED',
        processedAt: new Date(),
        processedBy: performedBy,
        notes: data.notes || undefined,
      },
      include: {
        user: true,
        organization: true,
        subscription: { include: { plan: true } },
      },
    });

    return updated;
  }
}

