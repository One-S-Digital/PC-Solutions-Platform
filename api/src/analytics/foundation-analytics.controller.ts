import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FoundationAnalyticsService } from './foundation-analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { wrapResponse } from '../common/utils/response.util';

@ApiTags('analytics')
@Controller('analytics/foundation')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.FOUNDATION)
@ApiBearerAuth()
export class FoundationAnalyticsController {
  constructor(
    private readonly analyticsService: FoundationAnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to get user's organization IDs
   */
  private async getUserOrganizationIds(userId: string): Promise<string[]> {
    const userOrganizations = await this.prisma.userOrganization.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return userOrganizations.map((uo) => uo.organizationId);
  }

  @Get('spending')
  @ApiOperation({ summary: 'Get spending analytics by category' })
  @ApiResponse({ status: 200, description: 'Spending data retrieved successfully' })
  async getSpendingAnalytics(
    @Request() req,
    @Query('timeRange') timeRange: '7d' | '30d' | '90d' | '6m' | '1y' = '30d',
  ) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    const data = await this.analyticsService.getSpendingByCategory(organizationIds, timeRange);
    return wrapResponse(data);
  }

  @Get('leads')
  @ApiOperation({ summary: 'Get lead funnel analytics' })
  @ApiResponse({ status: 200, description: 'Lead funnel data retrieved successfully' })
  async getLeadAnalytics(
    @Request() req,
    @Query('timeRange') timeRange: '7d' | '30d' | '90d' | '6m' | '1y' = '30d',
  ) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    const data = await this.analyticsService.getLeadFunnel(organizationIds, timeRange);
    return wrapResponse(data);
  }

  @Get('training')
  @ApiOperation({ summary: 'Get staff training/e-learning analytics' })
  @ApiResponse({ status: 200, description: 'Training data retrieved successfully' })
  async getTrainingAnalytics(@Request() req) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    const data = await this.analyticsService.getTrainingStatus(organizationIds);
    return wrapResponse(data);
  }

  @Get('enrollment')
  @ApiOperation({ summary: 'Get enrollment trend over time' })
  @ApiResponse({ status: 200, description: 'Enrollment trend data retrieved successfully' })
  async getEnrollmentTrend(
    @Request() req,
    @Query('timeRange') timeRange: '3m' | '6m' | '12m' = '12m',
  ) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    const data = await this.analyticsService.getEnrollmentTrend(organizationIds, timeRange);
    return wrapResponse(data);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get complete analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics overview retrieved successfully' })
  async getAnalyticsOverview(
    @Request() req,
    @Query('timeRange') timeRange: '7d' | '30d' | '90d' | '6m' | '1y' = '30d',
  ) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);
    const data = await this.analyticsService.getAnalyticsOverview(organizationIds, timeRange);
    return wrapResponse(data);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export analytics data as CSV' })
  @ApiResponse({ status: 200, description: 'CSV data generated successfully' })
  async exportAnalytics(
    @Request() req,
    @Query('type') type: 'spending' | 'leads' | 'training' | 'enrollment' = 'spending',
    @Query('timeRange') timeRange: '7d' | '30d' | '90d' | '6m' | '1y' = '30d',
  ) {
    const userId = req.context.userId;
    const organizationIds = await this.getUserOrganizationIds(userId);

    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'spending': {
        const data = await this.analyticsService.getSpendingByCategory(organizationIds, timeRange);
        csvContent = 'Category,Amount (CHF),Percentage,Order Count\n';
        csvContent += data
          .map((d) => `"${d.category}",${d.amount},${d.percentage}%,${d.orderCount}`)
          .join('\n');
        filename = `spending-analytics-${timeRange}.csv`;
        break;
      }
      case 'leads': {
        const data = await this.analyticsService.getLeadFunnel(organizationIds, timeRange);
        csvContent = 'Stage,Count,Conversion Rate\n';
        csvContent += data.map((d) => `"${d.stage}",${d.count},${d.conversionRate}%`).join('\n');
        filename = `lead-funnel-${timeRange}.csv`;
        break;
      }
      case 'training': {
        const data = await this.analyticsService.getTrainingStatus(organizationIds);
        csvContent = 'Course Name,Completed,In Progress,Not Started,Total,Completion Rate\n';
        csvContent += data
          .map(
            (d) =>
              `"${d.courseName}",${d.completedCount},${d.inProgressCount},${d.notStartedCount},${d.totalEnrolled},${d.completionRate}%`,
          )
          .join('\n');
        filename = 'training-analytics.csv';
        break;
      }
      case 'enrollment': {
        // Map timeRange to enrollment-compatible format
        const enrollmentTimeRange = timeRange === '1y' ? '12m' : timeRange === '6m' ? '6m' : '3m';
        const data = await this.analyticsService.getEnrollmentTrend(organizationIds, enrollmentTimeRange);
        csvContent = 'Month,Total Enrolled,New Leads,Conversions\n';
        csvContent += data
          .map((d) => `"${d.monthLabel}",${d.enrolled},${d.newLeads},${d.converted}`)
          .join('\n');
        filename = `enrollment-trend-${enrollmentTimeRange}.csv`;
        break;
      }
    }

    return wrapResponse({
      filename,
      contentType: 'text/csv',
      content: csvContent,
    });
  }
}
