import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';
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

  /**
   * Cascade deactivation/suspension to related organizations and subscriptions.
   * Shared by the 'deactivate' and 'suspend' bulk operations.
   *
   * Runs inside the caller-provided transaction client (`tx`) so all changes
   * are atomic with the user status update.
   */
  private async cascadeDeactivation(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    userIds: string[],
    label: string,
    cancellationReason: string,
  ) {
    const orgLinks = await tx.userOrganization.findMany({
      where: { userId: { in: userIds } },
      select: { organizationId: true },
    });
    const orgIds = [...new Set(orgLinks.map((link) => link.organizationId))];

    const liveStatuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIAL,
      SubscriptionStatus.GRACE_PERIOD,
      SubscriptionStatus.PAST_DUE,
    ];

    if (orgIds.length > 0) {
      await tx.organization.updateMany({
        where: { id: { in: orgIds } },
        data: { isActive: false },
      });
      this.logger.log(`🏢 [BULK ${label}] Cascaded deactivation to ${orgIds.length} organization(s)`);

      // Cancel org-based subscriptions
      await tx.subscription.updateMany({
        where: {
          organizationId: { in: orgIds },
          status: { in: liveStatuses },
        },
        data: { status: SubscriptionStatus.CANCELLED, canceledAt: new Date(), cancellationReason },
      });
    }

    // Cancel user-based subscriptions
    await tx.subscription.updateMany({
      where: {
        userId: { in: userIds },
        status: { in: liveStatuses },
      },
      data: { status: SubscriptionStatus.CANCELLED, canceledAt: new Date(), cancellationReason },
    });
  }

  async bulkUpdateUsers(operation: BulkUserOperation) {
    const { userIds, operation: op, newRole } = operation;

    switch (op) {
      case 'activate': {
        return this.prisma.$transaction(async (tx) => {
          const activateResult = await tx.user.updateMany({
            where: { id: { in: userIds } },
            data: { isActive: true, deactivatedAt: null, deactivatedReasonCode: null, deactivatedReasonText: null },
          });

          // Only reactivate orgs where ALL member users are now active.
          // This prevents blindly reactivating an org that another inactive member
          // originally caused to be deactivated.
          const orgLinks = await tx.userOrganization.findMany({
            where: { userId: { in: userIds } },
            select: { organizationId: true },
          });
          const orgIds = [...new Set(orgLinks.map((link) => link.organizationId))];

          if (orgIds.length > 0) {
            // Find orgs that still have at least one inactive member — skip those.
            const orgsWithInactiveMembers = await tx.userOrganization.findMany({
              where: {
                organizationId: { in: orgIds },
                user: { isActive: false },
              },
              select: { organizationId: true },
            });
            const blockedOrgIds = new Set(orgsWithInactiveMembers.map((l) => l.organizationId));
            const safeToReactivate = orgIds.filter((id) => !blockedOrgIds.has(id));

            if (safeToReactivate.length > 0) {
              await tx.organization.updateMany({
                where: { id: { in: safeToReactivate } },
                data: { isActive: true },
              });
              this.logger.log(
                `🏢 [BULK ACTIVATE] Cascaded activation to ${safeToReactivate.length} organization(s)` +
                  (blockedOrgIds.size > 0 ? ` (skipped ${blockedOrgIds.size} with other inactive members)` : ''),
              );
            }
          }

          return activateResult;
        });
      }

      case 'deactivate': {
        return this.prisma.$transaction(async (tx) => {
          const result = await tx.user.updateMany({
            where: { id: { in: userIds } },
            data: {
              isActive: false,
              deactivatedAt: new Date(),
              deactivatedReasonCode: 'ADMIN_DEACTIVATED',
              deactivatedReasonText: 'User account deactivated by admin (bulk)',
            },
          });
          await this.cascadeDeactivation(tx, userIds, 'DEACTIVATE', 'User account deactivated by admin');
          return result;
        });
      }

      case 'suspend': {
        return this.prisma.$transaction(async (tx) => {
          const result = await tx.user.updateMany({
            where: { id: { in: userIds } },
            data: {
              isActive: false,
              deactivatedAt: new Date(),
              deactivatedReasonCode: 'ADMIN_SUSPENDED',
              deactivatedReasonText: 'User account suspended by admin (bulk)',
            },
          });
          await this.cascadeDeactivation(tx, userIds, 'SUSPEND', 'User account suspended by admin');
          return result;
        });
      }

      case 'delete': {
        // Cascade cleanup before deleting user rows, otherwise orgs
        // remain active and subscriptions become orphaned.
        return this.prisma.$transaction(async (tx) => {
          await this.cascadeDeactivation(tx, userIds, 'DELETE', 'User account deleted by admin');
          return tx.user.deleteMany({
            where: { id: { in: userIds } },
          });
        });
      }

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