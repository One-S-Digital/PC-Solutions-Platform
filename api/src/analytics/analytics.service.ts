import { Injectable } from '@nestjs/common';
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