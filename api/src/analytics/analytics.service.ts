import { Injectable } from '@nestjs/common';
import { OrganizationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getUserGrowthMetrics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const days = this.getDaysFromRange(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user registrations by day from User table (actual platform users)
    const registrations = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get total users from User table (actual registered platform users)
    const totalUsers = await this.prisma.user.count();
    
    // Active users are defined as users active within the last 30 days
    const ACTIVE_USER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    const activeWindowStart = new Date(Date.now() - ACTIVE_USER_WINDOW_MS);
    
    // Get active users based on lastActiveAt or recent creation/update
    const activeUsers = await this.prisma.user.count({
      where: {
        OR: [
          { lastActiveAt: { gte: activeWindowStart } },
          { updatedAt: { gte: activeWindowStart } },
        ],
      },
    });

    // Get users by role from User table
    const usersByRole = await this.prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true,
      },
    });

    return {
      totalUsers,
      activeUsers,
      registrations: registrations.map(r => ({
        date: r.createdAt.toISOString().split('T')[0],
        count: r._count.id,
      })),
      usersByRole: usersByRole.map(r => ({
        role: r.role,
        count: r._count.id,
      })),
    };
  }

  async getOrganizationActivityMetrics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const days = this.getDaysFromRange(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get organization registrations
    const orgRegistrations = await this.prisma.organization.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get total organizations
    const totalOrganizations = await this.prisma.organization.count();
    
    // Get organizations by type
    const orgsByType = await this.prisma.organization.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    });

    // Get active organizations (updated within last 30 days)
    const activeOrganizations = await this.prisma.organization.count({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      totalOrganizations,
      activeOrganizations,
      registrations: orgRegistrations.map(r => ({
        date: r.createdAt.toISOString().split('T')[0],
        count: r._count.id,
      })),
      orgsByType: orgsByType.map(r => ({
        type: r.type,
        count: r._count.id,
      })),
    };
  }

  async getProductPerformanceMetrics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const days = this.getDaysFromRange(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total products
    const totalProducts = await this.prisma.product.count();
    
    // Get products by category
    const productsByCategory = await this.prisma.product.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    });

    // Get products by status
    const productsByStatus = await this.prisma.product.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Get new products in time range
    const newProducts = await this.prisma.product.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    return {
      totalProducts,
      newProducts,
      productsByCategory: productsByCategory.map(p => ({
        category: p.category,
        count: p._count.id,
      })),
      productsByStatus: productsByStatus.map(p => ({
        status: p.status,
        count: p._count.id,
      })),
    };
  }

  async getJobMetrics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const days = this.getDaysFromRange(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total job listings
    const totalJobs = await this.prisma.jobListing.count();
    
    // Get job applications
    const totalApplications = await this.prisma.jobApplication.count();
    
    // Get jobs by status
    const jobsByStatus = await this.prisma.jobListing.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Get new jobs in time range
    const newJobs = await this.prisma.jobListing.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Get new applications in time range
    const newApplications = await this.prisma.jobApplication.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    return {
      totalJobs,
      totalApplications,
      newJobs,
      newApplications,
      jobsByStatus: jobsByStatus.map(j => ({
        status: j.status,
        count: j._count.id,
      })),
    };
  }

  async getRevenueMetrics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const days = this.getDaysFromRange(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get subscription metrics
    const totalSubscriptions = await this.prisma.subscription.count();
    
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        status: 'ACTIVE',
      },
    });

    const subscriptionsByPlan = await this.prisma.subscription.groupBy({
      by: ['planId'],
      _count: {
        id: true,
      },
    });

    // Get subscription plans for revenue calculation
    const subscriptionPlans = await this.prisma.subscriptionPlan.findMany({
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    const revenueByPlan = subscriptionsByPlan.map(sub => {
      const plan = subscriptionPlans.find(p => p.id === sub.planId);
      return {
        planName: plan?.name || 'Unknown',
        count: sub._count.id,
        revenue: plan ? plan.price * sub._count.id : 0,
      };
    });

    const totalRevenue = revenueByPlan.reduce((sum, plan) => sum + plan.revenue, 0);

    return {
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue,
      revenueByPlan,
    };
  }

  async getSystemUsageMetrics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const days = this.getDaysFromRange(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get API usage (simulated - would need actual logging)
    const apiRequests = await this.prisma.user.count({
      where: {
        lastActiveAt: {
          gte: startDate,
        },
      },
    });

    // Get database metrics (simulated)
    const dbConnections = Math.floor(Math.random() * 50) + 10; // Simulated
    const slowQueries = Math.floor(Math.random() * 5); // Simulated

    // Get storage usage (simulated)
    const storageUsed = Math.floor(Math.random() * 1000) + 500; // Simulated GB

    return {
      apiRequests,
      dbConnections,
      slowQueries,
      storageUsed,
    };
  }

  async getDashboardOverview() {
    const [
      userMetrics,
      orgMetrics,
      productMetrics,
      jobMetrics,
      revenueMetrics,
      systemMetrics,
    ] = await Promise.all([
      this.getUserGrowthMetrics('30d'),
      this.getOrganizationActivityMetrics('30d'),
      this.getProductPerformanceMetrics('30d'),
      this.getJobMetrics('30d'),
      this.getRevenueMetrics('30d'),
      this.getSystemUsageMetrics('30d'),
    ]);

    return {
      users: userMetrics,
      organizations: orgMetrics,
      products: productMetrics,
      jobs: jobMetrics,
      revenue: revenueMetrics,
      system: systemMetrics,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getAdminDashboardCounts() {
    const safeCount = async (query: Promise<number>): Promise<number> => {
      try {
        return await query;
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
          return 0;
        }
        throw error;
      }
    };

    const [
      totalUsers,
      totalFoundations,
      totalProducts,
      totalParentLeads,
      totalJobs,
      totalApplications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count({ where: { type: OrganizationType.FOUNDATION } }),
      this.prisma.product.count(),
      safeCount(this.prisma.parentLead.count()),
      this.prisma.jobListing.count(),
      safeCount(this.prisma.jobApplication.count()),
    ]);

    return {
      totalUsers,
      totalFoundations,
      totalProducts,
      totalParentLeads,
      totalJobs,
      totalApplications,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getClerkStyleOverview() {
    if (this._clerkOverviewCache && Date.now() - this._clerkOverviewCacheAt < 5 * 60 * 1000) {
      return this._clerkOverviewCache;
    }

    const now = new Date();
    const currentWeekStart = this.getWeekStart(now);
    const thirteenWeeksAgo = new Date(currentWeekStart.getTime() - 13 * 7 * 24 * 60 * 60 * 1000);
    const nineWeeksAgo = new Date(currentWeekStart.getTime() - 9 * 7 * 24 * 60 * 60 * 1000);
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

    const [weeklySignups, weeklySignins, totalSignups, activityHeatmap, cohortUsers, activeThisWeek, newThisWeek, retainedThisWeek] = await Promise.all([
      this.prisma.$queryRaw<{ week: Date; count: bigint }[]>`
        SELECT DATE_TRUNC('week', "createdAt") AS week, COUNT(*)::bigint AS count
        FROM "User"
        WHERE "createdAt" >= ${thirteenWeeksAgo}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.$queryRaw<{ week: Date; count: bigint }[]>`
        SELECT DATE_TRUNC('week', "lastActiveAt") AS week, COUNT(*)::bigint AS count
        FROM "User"
        WHERE "lastActiveAt" >= ${thirteenWeeksAgo} AND "lastActiveAt" IS NOT NULL
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.user.count(),
      this.prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT TO_CHAR(DATE("lastActiveAt"), 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS count
        FROM "User"
        WHERE "lastActiveAt" >= ${yearStart} AND "lastActiveAt" IS NOT NULL
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.user.findMany({
        select: { id: true, createdAt: true, lastActiveAt: true },
        where: { createdAt: { gte: nineWeeksAgo } },
      }),
      // Stats counted from the full user table, not the cohort-limited subset
      this.prisma.user.count({ where: { lastActiveAt: { gte: currentWeekStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: currentWeekStart } } }),
      this.prisma.user.count({ where: { createdAt: { lt: currentWeekStart }, lastActiveAt: { gte: currentWeekStart } } }),
    ]);

    // Cohort retention (group users by sign-up week, check activity per subsequent week)
    const usersByCohort = new Map<string, typeof cohortUsers>();
    for (const user of cohortUsers) {
      const key = this.getWeekStart(user.createdAt).toISOString().split('T')[0];
      if (!usersByCohort.has(key)) usersByCohort.set(key, []);
      usersByCohort.get(key)!.push(user);
    }

    const cohortRetention: { week: string; size: number; retention: number[] }[] = [];
    for (const [weekKey, users] of usersByCohort.entries()) {
      const cohortWeekStart = new Date(weekKey);
      const retention: number[] = [];
      for (let w = 0; w <= 8; w++) {
        const wStart = new Date(cohortWeekStart.getTime() + w * 7 * 24 * 60 * 60 * 1000);
        const wEnd = new Date(wStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const active = users.filter(
          u => u.lastActiveAt && u.lastActiveAt >= wStart && u.lastActiveAt < wEnd,
        ).length;
        retention.push(users.length > 0 ? Math.round((active * 100) / users.length) : 0);
      }
      cohortRetention.push({ week: weekKey, size: users.length, retention });
    }
    cohortRetention.sort((a, b) => a.week.localeCompare(b.week));

    const result = {
      stats: { active: activeThisWeek, new: newThisWeek, retained: retainedThisWeek, total: totalSignups },
      weeklySignups: weeklySignups.map(r => ({ week: r.week.toISOString().split('T')[0], count: Number(r.count) })),
      weeklySignins: weeklySignins.map(r => ({ week: r.week.toISOString().split('T')[0], count: Number(r.count) })),
      activityHeatmap: activityHeatmap.map(r => ({ day: r.day, count: Number(r.count) })),
      cohortRetention,
      lastUpdated: now.toISOString(),
    };

    this._clerkOverviewCache = result;
    this._clerkOverviewCacheAt = Date.now();
    return result;
  }

  private _clerkOverviewCache: any = null;
  private _clerkOverviewCacheAt = 0;

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const dow = d.getUTCDay(); // 0=Sun … 6=Sat
    const daysFromMonday = dow === 0 ? 6 : dow - 1; // Monday-based, matching DATE_TRUNC('week')
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysFromMonday));
  }

  private getDaysFromRange(timeRange: string): number {
    switch (timeRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }
}
