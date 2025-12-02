import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SpendingData {
  category: string;
  amount: number;
  percentage: number;
  orderCount: number;
}

export interface LeadFunnelData {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface TrainingData {
  courseId: string;
  courseName: string;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  totalEnrolled: number;
  completionRate: number;
}

export interface EnrollmentTrendData {
  month: string;
  monthLabel: string;
  enrolled: number;
  newLeads: number;
  converted: number;
}

export interface AnalyticsOverview {
  spending: SpendingData[];
  leadFunnel: LeadFunnelData[];
  training: TrainingData[];
  enrollmentTrend: EnrollmentTrendData[];
  summary: {
    totalSpending: number;
    totalLeads: number;
    conversionRate: number;
    trainingCompletionRate: number;
  };
}

@Injectable()
export class FoundationAnalyticsService {
  constructor(private prisma: PrismaService) {}

  private getDaysFromRange(timeRange: string): number {
    switch (timeRange) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      case '6m':
        return 180;
      case '1y':
        return 365;
      default:
        return 30;
    }
  }

  /**
   * Get spending analytics by category
   */
  async getSpendingByCategory(
    organizationIds: string[],
    timeRange = '30d',
  ): Promise<SpendingData[]> {
    const days = this.getDaysFromRange(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all orders for the organization in the time range
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId: { in: organizationIds },
        createdAt: { gte: startDate },
      },
      include: {
        items: {
          include: {
            product: {
              select: { category: true, primaryCategory: true },
            },
          },
        },
      },
    });

    // Aggregate spending by category
    const categorySpending: Record<string, { amount: number; count: number }> = {};
    let totalSpending = 0;

    for (const order of orders) {
      for (const item of order.items) {
        const category = item.product?.primaryCategory || item.product?.category || 'Uncategorized';
        const itemTotal = item.price * item.quantity;
        totalSpending += itemTotal;

        if (!categorySpending[category]) {
          categorySpending[category] = { amount: 0, count: 0 };
        }
        categorySpending[category].amount += itemTotal;
        categorySpending[category].count += 1;
      }
    }

    // Convert to array with percentages
    const result: SpendingData[] = Object.entries(categorySpending)
      .map(([category, data]) => ({
        category,
        amount: Math.round(data.amount * 100) / 100,
        percentage: totalSpending > 0 ? Math.round((data.amount / totalSpending) * 1000) / 10 : 0,
        orderCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    return result;
  }

  /**
   * Get lead funnel analytics
   */
  async getLeadFunnel(organizationIds: string[], timeRange = '30d'): Promise<LeadFunnelData[]> {
    const days = this.getDaysFromRange(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all leads and responses for the foundation
    const [totalLeads, responses] = await Promise.all([
      this.prisma.parentLead.count({
        where: {
          createdAt: { gte: startDate },
          OR: [
            { foundationId: { in: organizationIds } },
            {
              foundationId: null,
              foundationResponses: {
                some: { foundationId: { in: organizationIds } },
              },
            },
          ],
        },
      }),
      this.prisma.foundationLeadResponse.groupBy({
        by: ['status'],
        where: {
          foundationId: { in: organizationIds },
          respondedAt: { gte: startDate },
        },
        _count: { id: true },
      }),
    ]);

    // Build funnel stages
    const statusCounts: Record<string, number> = {};
    for (const r of responses) {
      statusCounts[r.status] = r._count.id;
    }

    const newCount = totalLeads;
    const interestedCount = statusCounts['INTERESTED'] || 0;
    const contactedCount = interestedCount + (statusCounts['NEEDS_MORE_INFO'] || 0);
    const enrolledCount = statusCounts['ENROLLED'] || 0;

    const funnel: LeadFunnelData[] = [
      {
        stage: 'New Leads',
        count: newCount,
        conversionRate: 100,
      },
      {
        stage: 'Contacted',
        count: contactedCount,
        conversionRate: newCount > 0 ? Math.round((contactedCount / newCount) * 1000) / 10 : 0,
      },
      {
        stage: 'Interested',
        count: interestedCount,
        conversionRate: newCount > 0 ? Math.round((interestedCount / newCount) * 1000) / 10 : 0,
      },
      {
        stage: 'Enrolled',
        count: enrolledCount,
        conversionRate: newCount > 0 ? Math.round((enrolledCount / newCount) * 1000) / 10 : 0,
      },
    ];

    return funnel;
  }

  /**
   * Get training/e-learning analytics
   */
  async getTrainingStatus(organizationIds: string[]): Promise<TrainingData[]> {
    // Get organization members
    const members = await this.prisma.userOrganization.findMany({
      where: { organizationId: { in: organizationIds } },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);

    if (memberIds.length === 0) {
      return [];
    }

    // Get course enrollments for organization members
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        userId: { in: memberIds },
      },
      include: {
        course: {
          select: { id: true, title: true },
        },
      },
    });

    // Aggregate by course
    const courseData: Record<
      string,
      {
        name: string;
        completed: number;
        inProgress: number;
        notStarted: number;
      }
    > = {};

    for (const enrollment of enrollments) {
      const courseId = enrollment.courseId;
      const courseName = enrollment.course?.title || 'Unknown Course';

      if (!courseData[courseId]) {
        courseData[courseId] = {
          name: courseName,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
        };
      }

      const progress = Number(enrollment.progressPercentage);
      if (enrollment.completedAt || progress >= 100) {
        courseData[courseId].completed += 1;
      } else if (progress > 0) {
        courseData[courseId].inProgress += 1;
      } else {
        courseData[courseId].notStarted += 1;
      }
    }

    // Convert to array
    const result: TrainingData[] = Object.entries(courseData).map(([courseId, data]) => {
      const total = data.completed + data.inProgress + data.notStarted;
      return {
        courseId,
        courseName: data.name,
        completedCount: data.completed,
        inProgressCount: data.inProgress,
        notStartedCount: data.notStarted,
        totalEnrolled: total,
        completionRate: total > 0 ? Math.round((data.completed / total) * 1000) / 10 : 0,
      };
    });

    return result.sort((a, b) => b.totalEnrolled - a.totalEnrolled);
  }

  /**
   * Get enrollment trend over time
   */
  async getEnrollmentTrend(
    organizationIds: string[],
    timeRange = '12m',
  ): Promise<EnrollmentTrendData[]> {
    const months = timeRange === '12m' ? 12 : timeRange === '6m' ? 6 : 3;
    const result: EnrollmentTrendData[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const [newLeads, enrolledResponses] = await Promise.all([
        // New leads in this month
        this.prisma.parentLead.count({
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
            OR: [
              { foundationId: { in: organizationIds } },
              { foundationId: null },
            ],
          },
        }),
        // Enrolled responses in this month
        this.prisma.foundationLeadResponse.count({
          where: {
            foundationId: { in: organizationIds },
            status: 'ENROLLED',
            respondedAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),
      ]);

      // Calculate running total of enrolled
      const totalEnrolled = await this.prisma.foundationLeadResponse.count({
        where: {
          foundationId: { in: organizationIds },
          status: 'ENROLLED',
          respondedAt: { lte: endOfMonth },
        },
      });

      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

      result.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        monthLabel: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
        enrolled: totalEnrolled,
        newLeads,
        converted: enrolledResponses,
      });
    }

    return result;
  }

  /**
   * Get complete analytics overview
   */
  async getAnalyticsOverview(
    organizationIds: string[],
    timeRange = '30d',
  ): Promise<AnalyticsOverview> {
    const [spending, leadFunnel, training, enrollmentTrend] = await Promise.all([
      this.getSpendingByCategory(organizationIds, timeRange),
      this.getLeadFunnel(organizationIds, timeRange),
      this.getTrainingStatus(organizationIds),
      this.getEnrollmentTrend(organizationIds, '12m'),
    ]);

    // Calculate summary metrics
    const totalSpending = spending.reduce((sum, item) => sum + item.amount, 0);
    const totalLeads = leadFunnel[0]?.count || 0;
    const enrolledLeads = leadFunnel[3]?.count || 0;
    const conversionRate = totalLeads > 0 ? Math.round((enrolledLeads / totalLeads) * 1000) / 10 : 0;

    const totalEnrolled = training.reduce((sum, item) => sum + item.totalEnrolled, 0);
    const totalCompleted = training.reduce((sum, item) => sum + item.completedCount, 0);
    const trainingCompletionRate =
      totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 1000) / 10 : 0;

    return {
      spending,
      leadFunnel,
      training,
      enrollmentTrend,
      summary: {
        totalSpending: Math.round(totalSpending * 100) / 100,
        totalLeads,
        conversionRate,
        trainingCompletionRate,
      },
    };
  }
}
