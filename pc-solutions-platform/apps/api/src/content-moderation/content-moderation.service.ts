import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ContentModerationFilters {
  contentType?: 'PRODUCT' | 'JOB_LISTING' | 'SERVICE' | 'ORGANIZATION' | 'USER_PROFILE';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ModerationAction {
  contentId: string;
  contentType: string;
  action: 'APPROVE' | 'REJECT' | 'FLAG' | 'REQUEST_CHANGES';
  reason?: string;
  moderatorId: string;
  notes?: string;
}

export interface ContentFlag {
  contentId: string;
  contentType: string;
  reason: string;
  description: string;
  reporterId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

@Injectable()
export class ContentModerationService {
  constructor(private prisma: PrismaService) {}

  async getModerationQueue(
    page: number = 1,
    limit: number = 20,
    filters: ContentModerationFilters = {},
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {};

    if (filters.contentType) {
      where.contentType = filters.contentType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.contentModeration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          moderator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.contentModeration.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getContentDetails(contentId: string, contentType: string) {
    switch (contentType) {
      case 'PRODUCT':
        return this.prisma.product.findUnique({
          where: { id: contentId },
          include: {
            supplier: true,
            imageAsset: true,
          },
        });
      
      case 'JOB_LISTING':
        return this.prisma.jobListing.findUnique({
          where: { id: contentId },
          include: {
            foundation: true,
            applications: {
              include: {
                candidate: true,
              },
            },
          },
        });
      
      case 'SERVICE':
        return this.prisma.service.findUnique({
          where: { id: contentId },
          include: {
            provider: {
              include: {
                organization: true,
              },
            },
          },
        });
      
      case 'ORGANIZATION':
        return this.prisma.organization.findUnique({
          where: { id: contentId },
          include: {
            logoAsset: true,
            coverAsset: true,
            members: {
              include: {
                user: true,
              },
            },
          },
        });
      
      case 'USER_PROFILE':
        return this.prisma.user.findUnique({
          where: { id: contentId },
          include: {
            profile: true,
            organization: true,
          },
        });
      
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }

  async moderateContent(action: ModerationAction) {
    const { contentId, contentType, action: moderationAction, reason, moderatorId, notes } = action;

    // Update the moderation record
    const moderationRecord = await this.prisma.contentModeration.update({
      where: { contentId },
      data: {
        status: moderationAction === 'APPROVE' ? 'APPROVED' : 
               moderationAction === 'REJECT' ? 'REJECTED' : 'FLAGGED',
        moderatorId,
        reason,
        notes,
        moderatedAt: new Date(),
      },
    });

    // Update the actual content based on the action
    if (moderationAction === 'APPROVE') {
      await this.approveContent(contentId, contentType);
    } else if (moderationAction === 'REJECT') {
      await this.rejectContent(contentId, contentType);
    }

    // Log the moderation action
    await this.logModerationAction(action);

    return moderationRecord;
  }

  private async approveContent(contentId: string, contentType: string) {
    switch (contentType) {
      case 'PRODUCT':
        await this.prisma.product.update({
          where: { id: contentId },
          data: { status: 'ACTIVE' },
        });
        break;
      
      case 'JOB_LISTING':
        await this.prisma.jobListing.update({
          where: { id: contentId },
          data: { status: 'PUBLISHED' },
        });
        break;
      
      case 'SERVICE':
        await this.prisma.service.update({
          where: { id: contentId },
          data: { isActive: true },
        });
        break;
      
      case 'ORGANIZATION':
        await this.prisma.organization.update({
          where: { id: contentId },
          data: { isActive: true },
        });
        break;
      
      case 'USER_PROFILE':
        await this.prisma.user.update({
          where: { id: contentId },
          data: { status: 'ACTIVE' },
        });
        break;
    }
  }

  private async rejectContent(contentId: string, contentType: string) {
    switch (contentType) {
      case 'PRODUCT':
        await this.prisma.product.update({
          where: { id: contentId },
          data: { status: 'REJECTED' },
        });
        break;
      
      case 'JOB_LISTING':
        await this.prisma.jobListing.update({
          where: { id: contentId },
          data: { status: 'REJECTED' },
        });
        break;
      
      case 'SERVICE':
        await this.prisma.service.update({
          where: { id: contentId },
          data: { isActive: false },
        });
        break;
      
      case 'ORGANIZATION':
        await this.prisma.organization.update({
          where: { id: contentId },
          data: { isActive: false },
        });
        break;
      
      case 'USER_PROFILE':
        await this.prisma.user.update({
          where: { id: contentId },
          data: { status: 'SUSPENDED' },
        });
        break;
    }
  }

  async flagContent(flag: ContentFlag) {
    // Check if content already exists in moderation queue
    const existingModeration = await this.prisma.contentModeration.findUnique({
      where: { contentId: flag.contentId },
    });

    if (existingModeration) {
      // Update existing record with new flag
      return this.prisma.contentModeration.update({
        where: { contentId: flag.contentId },
        data: {
          status: 'FLAGGED',
          priority: flag.priority,
          reason: flag.reason,
          flaggedAt: new Date(),
        },
      });
    } else {
      // Create new moderation record
      return this.prisma.contentModeration.create({
        data: {
          contentId: flag.contentId,
          contentType: flag.contentType,
          status: 'FLAGGED',
          priority: flag.priority,
          reason: flag.reason,
          reporterId: flag.reporterId,
          flaggedAt: new Date(),
        },
      });
    }
  }

  async getModerationStats() {
    const [
      totalPending,
      totalApproved,
      totalRejected,
      totalFlagged,
      pendingByType,
      pendingByPriority,
    ] = await Promise.all([
      this.prisma.contentModeration.count({ where: { status: 'PENDING' } }),
      this.prisma.contentModeration.count({ where: { status: 'APPROVED' } }),
      this.prisma.contentModeration.count({ where: { status: 'REJECTED' } }),
      this.prisma.contentModeration.count({ where: { status: 'FLAGGED' } }),
      this.prisma.contentModeration.groupBy({
        by: ['contentType'],
        where: { status: 'PENDING' },
        _count: { id: true },
      }),
      this.prisma.contentModeration.groupBy({
        by: ['priority'],
        where: { status: 'PENDING' },
        _count: { id: true },
      }),
    ]);

    return {
      totalPending,
      totalApproved,
      totalRejected,
      totalFlagged,
      pendingByType: pendingByType.map(item => ({
        contentType: item.contentType,
        count: item._count.id,
      })),
      pendingByPriority: pendingByPriority.map(item => ({
        priority: item.priority,
        count: item._count.id,
      })),
    };
  }

  async getModerationHistory(contentId: string) {
    return this.prisma.moderationAction.findMany({
      where: { contentId },
      include: {
        moderator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async logModerationAction(action: ModerationAction) {
    return this.prisma.moderationAction.create({
      data: {
        contentId: action.contentId,
        contentType: action.contentType,
        action: action.action,
        reason: action.reason,
        moderatorId: action.moderatorId,
        notes: action.notes,
      },
    });
  }

  async getAutomatedRules() {
    // This would return automated filtering rules
    // For now, we'll return some example rules
    return [
      {
        id: '1',
        name: 'Inappropriate Language Filter',
        description: 'Automatically flag content containing inappropriate language',
        isActive: true,
        triggerCount: 15,
      },
      {
        id: '2',
        name: 'Spam Detection',
        description: 'Detect and flag potential spam content',
        isActive: true,
        triggerCount: 8,
      },
      {
        id: '3',
        name: 'Duplicate Content',
        description: 'Flag duplicate or similar content',
        isActive: true,
        triggerCount: 3,
      },
    ];
  }

  async updateAutomatedRule(ruleId: string, updates: any) {
    // This would update automated filtering rules
    // For now, we'll just return success
    return {
      success: true,
      message: 'Rule updated successfully',
    };
  }
}