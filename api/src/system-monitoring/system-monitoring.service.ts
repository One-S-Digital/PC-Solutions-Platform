import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHealthCheckDto, CreateSystemAlertDto, CreateSystemMetricsDto } from './dto/system-monitoring.dto';
import { SystemHealthCheck, SystemAlert, SystemMetrics } from '@prisma/client';

@Injectable()
export class SystemMonitoringService {
  constructor(private prisma: PrismaService) {}

  async getSystemHealth(): Promise<any> {
    const healthChecks = await this.prisma.systemHealthCheck.findMany({
      orderBy: { lastChecked: 'desc' },
      take: 50,
    });

    const overallStatus = this.calculateOverallHealth(healthChecks);

    return {
      overallStatus,
      services: healthChecks,
      lastChecked: new Date(),
    };
  }

  async getServiceHealth(serviceName: string): Promise<SystemHealthCheck | null> {
    return this.prisma.systemHealthCheck.findFirst({
      where: { serviceName },
      orderBy: { lastChecked: 'desc' },
    });
  }

  async createHealthCheck(createDto: CreateHealthCheckDto): Promise<SystemHealthCheck> {
    return this.prisma.systemHealthCheck.create({
      data: createDto,
    });
  }

  async getSystemMetrics(timeRange?: string): Promise<SystemMetrics[]> {
    const where: any = {};
    
    if (timeRange) {
      const hours = this.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      where.timestamp = { gte: startTime };
    }

    return this.prisma.systemMetrics.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });
  }

  async createSystemMetrics(createDto: CreateSystemMetricsDto): Promise<SystemMetrics> {
    return this.prisma.systemMetrics.create({
      data: createDto,
    });
  }

  async getSystemAlerts(status?: string): Promise<SystemAlert[]> {
    const where: any = {};
    
    if (status === 'active') {
      where.isResolved = false;
    } else if (status === 'resolved') {
      where.isResolved = true;
    }

    return this.prisma.systemAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createSystemAlert(createDto: CreateSystemAlertDto): Promise<SystemAlert> {
    return this.prisma.systemAlert.create({
      data: createDto,
    });
  }

  async resolveAlert(id: string, resolvedBy: string): Promise<SystemAlert> {
    const alert = await this.prisma.systemAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return this.prisma.systemAlert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  async deleteAlert(id: string): Promise<void> {
    const alert = await this.prisma.systemAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    await this.prisma.systemAlert.delete({
      where: { id },
    });
  }

  async getMonitoringDashboard(): Promise<any> {
    const [healthChecks, alerts, metrics] = await Promise.all([
      this.getSystemHealth(),
      this.getSystemAlerts('active'),
      this.getSystemMetrics('24h'),
    ]);

    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
    const warningAlerts = alerts.filter(alert => alert.severity === 'high');
    
    const systemStats = this.calculateSystemStats(metrics);
    const uptime = this.calculateUptime(healthChecks.services);

    return {
      overallHealth: healthChecks.overallStatus,
      uptime,
      activeAlerts: alerts.length,
      criticalAlerts: criticalAlerts.length,
      warningAlerts: warningAlerts.length,
      systemStats,
      recentAlerts: alerts.slice(0, 5),
      serviceStatus: healthChecks.services,
    };
  }

  private calculateOverallHealth(healthChecks: SystemHealthCheck[]): string {
    if (healthChecks.length === 0) return 'unknown';
    
    const downServices = healthChecks.filter(check => check.status === 'down');
    const degradedServices = healthChecks.filter(check => check.status === 'degraded');
    
    if (downServices.length > 0) return 'down';
    if (degradedServices.length > 0) return 'degraded';
    return 'healthy';
  }

  private parseTimeRange(timeRange: string): number {
    const ranges: { [key: string]: number } = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168,
      '30d': 720,
    };
    
    return ranges[timeRange] || 24;
  }

  private calculateSystemStats(metrics: SystemMetrics[]): any {
    if (metrics.length === 0) {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkLatency: 0,
      };
    }

    const latestMetrics = metrics.slice(0, 10); // Get latest 10 metrics
    
    const cpuMetrics = latestMetrics.filter(m => m.metricName === 'cpu_usage');
    const memoryMetrics = latestMetrics.filter(m => m.metricName === 'memory_usage');
    const diskMetrics = latestMetrics.filter(m => m.metricName === 'disk_usage');
    const networkMetrics = latestMetrics.filter(m => m.metricName === 'network_latency');

    return {
      cpuUsage: this.calculateAverage(cpuMetrics),
      memoryUsage: this.calculateAverage(memoryMetrics),
      diskUsage: this.calculateAverage(diskMetrics),
      networkLatency: this.calculateAverage(networkMetrics),
    };
  }

  private calculateAverage(metrics: SystemMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.metricValue, 0);
    return sum / metrics.length;
  }

  private calculateUptime(services: SystemHealthCheck[]): number {
    if (services.length === 0) return 0;
    
    const healthyServices = services.filter(service => service.status === 'healthy');
    return (healthyServices.length / services.length) * 100;
  }
}