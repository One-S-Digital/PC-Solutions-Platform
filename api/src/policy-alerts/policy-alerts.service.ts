import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePolicyAlertDto, UpdatePolicyAlertDto } from './dto/policy-alerts.dto';
import { PolicyAlert } from '@prisma/client';

@Injectable()
export class PolicyAlertsService {
  constructor(private prisma: PrismaService) {}

  async getPolicyAlerts(options: {
    page: number;
    limit: number;
    region?: string;
    alertType?: string;
    isActive?: boolean;
  }): Promise<{ alerts: PolicyAlert[]; total: number; page: number; limit: number }> {
    const { page, limit, region, alertType, isActive } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Treat "All" as a UI sentinel meaning "no region filter".
    // When a specific region is selected, also include alerts that apply to all regions.
    if (region && region !== 'All') {
      where.regions = { hasSome: [region, 'All'] };
    }

    if (alertType) {
      where.alertType = alertType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [alerts, total] = await Promise.all([
      this.prisma.policyAlert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.policyAlert.count({ where }),
    ]);

    return {
      alerts,
      total,
      page,
      limit,
    };
  }

  async getPolicyAlert(id: string): Promise<PolicyAlert> {
    const alert = await this.prisma.policyAlert.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!alert) {
      throw new NotFoundException('Policy alert not found');
    }

    return alert;
  }

  async createPolicyAlert(createDto: CreatePolicyAlertDto): Promise<PolicyAlert> {
    return this.prisma.policyAlert.create({
      data: createDto,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async updatePolicyAlert(id: string, updateDto: UpdatePolicyAlertDto): Promise<PolicyAlert> {
    const alert = await this.prisma.policyAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('Policy alert not found');
    }

    return this.prisma.policyAlert.update({
      where: { id },
      data: updateDto,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async deletePolicyAlert(id: string): Promise<void> {
    const alert = await this.prisma.policyAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('Policy alert not found');
    }

    await this.prisma.policyAlert.delete({
      where: { id },
    });
  }

  async togglePolicyAlert(id: string): Promise<PolicyAlert> {
    const alert = await this.prisma.policyAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      throw new NotFoundException('Policy alert not found');
    }

    return this.prisma.policyAlert.update({
      where: { id },
      data: { isActive: !alert.isActive },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async getPolicyAlertsByRegion(region: string): Promise<PolicyAlert[]> {
    return this.prisma.policyAlert.findMany({
      where: {
        ...(region && region !== 'All'
          ? { regions: { hasSome: [region, 'All'] } }
          : {}),
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async getPolicyAlertsSummary(): Promise<any> {
    const [totalAlerts, activeAlerts, criticalAlerts, warningAlerts, infoAlerts] = await Promise.all([
      this.prisma.policyAlert.count(),
      this.prisma.policyAlert.count({ where: { isActive: true } }),
      this.prisma.policyAlert.count({ where: { alertType: 'critical' } }),
      this.prisma.policyAlert.count({ where: { alertType: 'warning' } }),
      this.prisma.policyAlert.count({ where: { alertType: 'info' } }),
    ]);

    const recentAlerts = await this.prisma.policyAlert.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const regionStats = await this.prisma.policyAlert.findMany({
      select: {
        regions: true,
        alertType: true,
        isActive: true,
      },
    });

    // Process region statistics
    const regionCounts: { [key: string]: number } = {};
    regionStats.forEach(alert => {
      alert.regions.forEach(region => {
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      });
    });

    return {
      totalAlerts,
      activeAlerts,
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      recentAlerts,
      regionStats: Object.entries(regionCounts).map(([region, count]) => ({
        region,
        count,
      })),
    };
  }
}