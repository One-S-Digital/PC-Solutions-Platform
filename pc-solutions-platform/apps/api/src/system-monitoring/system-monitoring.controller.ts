import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { SystemMonitoringService } from './system-monitoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class SystemMonitoringController {
  constructor(private readonly systemMonitoringService: SystemMonitoringService) {}

  @Get('host-metrics')
  async getHostMetrics() {
    return this.systemMonitoringService.getHostMetrics();
  }

  @Get('application-metrics')
  async getApplicationMetrics() {
    return this.systemMonitoringService.getApplicationMetrics();
  }

  @Get('database-metrics')
  async getDatabaseMetrics() {
    return this.systemMonitoringService.getDatabaseMetrics();
  }

  @Get('health')
  async getSystemHealth() {
    return this.systemMonitoringService.getSystemHealth();
  }

  @Get('alerts')
  async getSystemAlerts() {
    return this.systemMonitoringService.getSystemAlerts();
  }

  @Post('alerts/:alertId/resolve')
  async resolveAlert(@Param('alertId') alertId: string) {
    await this.systemMonitoringService.resolveAlert(alertId);
    return { success: true, message: 'Alert resolved successfully' };
  }

  @Get('logs')
  async getLogs(
    @Query('level') level?: string,
    @Query('service') service?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('limit') limit: string = '100',
  ) {
    return this.systemMonitoringService.getLogs(
      level,
      service,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
      parseInt(limit),
    );
  }

  @Get('metrics-history/:metricType')
  async getMetricsHistory(
    @Param('metricType') metricType: 'host' | 'application' | 'database',
    @Query('timeRange') timeRange: '1h' | '6h' | '24h' | '7d' = '24h',
  ) {
    return this.systemMonitoringService.getMetricsHistory(metricType, timeRange);
  }
}