import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/analytics')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getDashboardOverview() {
    return this.analyticsService.getDashboardOverview();
  }

  @Get('users')
  getUserGrowthMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    return this.analyticsService.getUserGrowthMetrics(timeRange);
  }

  @Get('organizations')
  getOrganizationActivityMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    return this.analyticsService.getOrganizationActivityMetrics(timeRange);
  }

  @Get('products')
  getProductPerformanceMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    return this.analyticsService.getProductPerformanceMetrics(timeRange);
  }

  @Get('jobs')
  getJobMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    return this.analyticsService.getJobMetrics(timeRange);
  }

  @Get('revenue')
  getRevenueMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    return this.analyticsService.getRevenueMetrics(timeRange);
  }

  @Get('system')
  getSystemUsageMetrics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d') {
    return this.analyticsService.getSystemUsageMetrics(timeRange);
  }
}