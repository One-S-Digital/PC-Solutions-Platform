import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { wrapResponse } from '../common/utils/response.util';

@Controller('admin/analytics')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getDashboardOverview() {
    const data = await this.analyticsService.getDashboardOverview();
    return wrapResponse(data);
  }

  @Get('counts')
  async getDashboardCounts() {
    const data = await this.analyticsService.getAdminDashboardCounts();
    return wrapResponse(data);
  }

  @Get('users')
  async getUserGrowthMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const data = await this.analyticsService.getUserGrowthMetrics(timeRange);
    return wrapResponse(data);
  }

  @Get('organizations')
  async getOrganizationActivityMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const data = await this.analyticsService.getOrganizationActivityMetrics(timeRange);
    return wrapResponse(data);
  }

  @Get('products')
  async getProductPerformanceMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const data = await this.analyticsService.getProductPerformanceMetrics(timeRange);
    return wrapResponse(data);
  }

  @Get('jobs')
  async getJobMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const data = await this.analyticsService.getJobMetrics(timeRange);
    return wrapResponse(data);
  }

  @Get('revenue')
  async getRevenueMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const data = await this.analyticsService.getRevenueMetrics(timeRange);
    return wrapResponse(data);
  }

  @Get('system')
  async getSystemUsageMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    const data = await this.analyticsService.getSystemUsageMetrics(timeRange);
    return wrapResponse(data);
  }
}
