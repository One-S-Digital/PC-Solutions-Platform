import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@workspace/types';
import { AppLoggerService } from '../common/logger.service';

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  lastActiveFrom?: Date;
  lastActiveTo?: Date;
}

export interface BulkUserOperation {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'suspend' | 'delete' | 'changeRole';
  newRole?: UserRole;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

@Injectable()
export class UserManagementService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  async getUsers(
    page: number = 1,
    limit: number = 20,
    filters: UserFilters = {},
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
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

    if (filters.lastActiveFrom || filters.lastActiveTo) {
      where.lastActiveAt = {};
      if (filters.lastActiveFrom) {
        where.lastActiveAt.gte = filters.lastActiveFrom;
      }
      if (filters.lastActiveTo) {
        where.lastActiveAt.lte = filters.lastActiveTo;
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Enrich DB users with their AppUser id for admin UI mutations (/users/:id expects AppUser.id)
    const clerkIds = users.map((u) => u.clerkId).filter(Boolean);
    const appUsers = await this.prisma.appUser.findMany({
      where: { clerkId: { in: clerkIds } },
      select: { id: true, clerkId: true },
    });
    const appUserIdByClerkId = new Map(appUsers.map((u) => [u.clerkId, u.id]));

    const enrichedUsers = users.map((u) => ({
      ...u,
      appUserId: appUserIdByClerkId.get(u.clerkId) || null,
    }));

    return {
      users: enrichedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
        subscriptions: {
          include: {
            plan: true,
          },
        },
      },
    });
  }

  async updateUser(userId: string, updateData: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async bulkUpdateUsers(operation: BulkUserOperation) {
    const { userIds, operation: op, newRole } = operation;

    switch (op) {
      case 'activate': {
        const activateResult = await this.prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: true, deactivatedAt: null, deactivatedReasonCode: null, deactivatedReasonText: null },
        });
        // Cascade reactivation to user organizations
        const activateOrgLinks = await this.prisma.userOrganization.findMany({
          where: { userId: { in: userIds } },
          select: { organizationId: true },
        });
        const activateOrgIds = activateOrgLinks.map((link) => link.organizationId);
        if (activateOrgIds.length > 0) {
          await this.prisma.organization.updateMany({
            where: { id: { in: activateOrgIds } },
            data: { isActive: true },
          });
          this.logger.log(`🏢 [BULK ACTIVATE] Cascaded activation to ${activateOrgIds.length} organization(s)`);
        }
        return activateResult;
      }

      case 'deactivate': {
        const deactivateResult = await this.prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: false, deactivatedAt: new Date() },
        });
        // Cascade deactivation to user organizations
        const deactivateOrgLinks = await this.prisma.userOrganization.findMany({
          where: { userId: { in: userIds } },
          select: { organizationId: true },
        });
        const deactivateOrgIds = deactivateOrgLinks.map((link) => link.organizationId);
        if (deactivateOrgIds.length > 0) {
          await this.prisma.organization.updateMany({
            where: { id: { in: deactivateOrgIds } },
            data: { isActive: false },
          });
          this.logger.log(`🏢 [BULK DEACTIVATE] Cascaded deactivation to ${deactivateOrgIds.length} organization(s)`);
        }
        return deactivateResult;
      }

      case 'suspend': {
        const suspendResult = await this.prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: false, deactivatedAt: new Date() },
        });
        // Cascade suspension to user organizations
        const suspendOrgLinks = await this.prisma.userOrganization.findMany({
          where: { userId: { in: userIds } },
          select: { organizationId: true },
        });
        const suspendOrgIds = suspendOrgLinks.map((link) => link.organizationId);
        if (suspendOrgIds.length > 0) {
          await this.prisma.organization.updateMany({
            where: { id: { in: suspendOrgIds } },
            data: { isActive: false },
          });
          this.logger.log(`🏢 [BULK SUSPEND] Cascaded suspension to ${suspendOrgIds.length} organization(s)`);
        }
        return suspendResult;
      }

      case 'delete':
        return this.prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });

      case 'changeRole':
        if (!newRole) {
          throw new Error('New role is required for changeRole operation');
        }
        return this.prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { role: newRole },
        });

      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  }

  async getUserActivity(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userActivity.count({ where: { userId } }),
    ]);

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async logUserActivity(userId: string, action: string, details: any, ipAddress?: string, userAgent?: string) {
    return this.prisma.userActivity.create({
      data: {
        userId,
        action,
        details,
        ipAddress,
        userAgent,
      },
    });
  }

  async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
      recentRegistrations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole: usersByRole.map(r => ({
        role: r.role,
        count: r._count.id,
      })),
      recentRegistrations,
    };
  }

  async sendEmailNotification(userIds: string[], subject: string, content: string) {
    // This would integrate with your email service (e.g., SendGrid, AWS SES)
    // For now, we'll just log the notification
    this.logger.log(`Sending email notification to ${userIds.length} users`, 'UserManagementService', {
      subject,
      content,
      userIds,
    });

    // In a real implementation, you would:
    // 1. Get user emails from the database
    // 2. Send emails via your email service
    // 3. Log the notification in the database
    
    return {
      success: true,
      message: `Email notification queued for ${userIds.length} users`,
    };
  }

  async exportUsers(filters: UserFilters = {}) {
    const where: any = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
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

    const users = await this.prisma.user.findMany({
      where,
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Email',
      'First Name',
      'Last Name',
      'Role',
      'Is Active',
      'Created At',
      'Last Active',
      'Organization',
    ];

    const csvRows = users.map(user => [
      user.id,
      user.email,
      user.firstName || '',
      user.lastName || '',
      user.role,
      user.isActive,
      user.createdAt.toISOString(),
      user.lastActiveAt?.toISOString() || '',
      user.organizations[0]?.organization?.name || '',
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return {
      csvContent,
      filename: `users_export_${new Date().toISOString().split('T')[0]}.csv`,
      count: users.length,
    };
  }
}