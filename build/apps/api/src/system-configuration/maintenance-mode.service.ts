import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationService } from '../email-notification/email-notification.service';

export interface MaintenanceMode {
  id: string;
  isEnabled: boolean;
  message: string;
  allowedPaths: string[];
  allowedRoles: string[];
  estimatedEndTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceSchedule {
  id: string;
  name: string;
  description: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  isActive: boolean;
  notificationSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MaintenanceModeService {
  private readonly logger = new Logger(MaintenanceModeService.name);

  constructor(
    private prisma: PrismaService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  async getMaintenanceMode(): Promise<MaintenanceMode | null> {
    const maintenance = await this.prisma.maintenanceMode.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return maintenance as MaintenanceMode | null;
  }

  async enableMaintenanceMode(maintenanceData: {
    message: string;
    allowedPaths?: string[];
    allowedRoles?: string[];
    estimatedEndTime?: Date;
  }): Promise<MaintenanceMode> {
    try {
      // Disable any existing maintenance mode
      await this.prisma.maintenanceMode.updateMany({
        where: { isEnabled: true },
        data: { isEnabled: false },
      });

      const maintenance = await this.prisma.maintenanceMode.create({
        data: {
          isEnabled: true,
          message: maintenanceData.message,
          allowedPaths: maintenanceData.allowedPaths || ['/api/health', '/api/maintenance'],
          allowedRoles: maintenanceData.allowedRoles || ['SUPER_ADMIN'],
          estimatedEndTime: maintenanceData.estimatedEndTime,
        },
      });

      // Send maintenance notification to all users
      await this.sendMaintenanceNotification(maintenance);

      this.logger.warn(`Maintenance mode enabled: ${maintenance.message}`);
      return maintenance as MaintenanceMode;
    } catch (error) {
      this.logger.error(`Failed to enable maintenance mode: ${(error as Error).message}`);
      throw error;
    }
  }

  async disableMaintenanceMode(): Promise<MaintenanceMode> {
    try {
      const maintenance = await this.prisma.maintenanceMode.findFirst({
        where: { isEnabled: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!maintenance) {
        throw new Error('No active maintenance mode found');
      }

      const updatedMaintenance = await this.prisma.maintenanceMode.update({
        where: { id: maintenance.id },
        data: { isEnabled: false },
      });

      // Send maintenance end notification
      await this.sendMaintenanceEndNotification(updatedMaintenance);

      this.logger.log('Maintenance mode disabled');
      return updatedMaintenance as MaintenanceMode;
    } catch (error) {
      this.logger.error(`Failed to disable maintenance mode: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateMaintenanceMode(
    maintenanceId: string,
    updateData: {
      message?: string;
      allowedPaths?: string[];
      allowedRoles?: string[];
      estimatedEndTime?: Date;
    }
  ): Promise<MaintenanceMode> {
    try {
      const maintenance = await this.prisma.maintenanceMode.update({
        where: { id: maintenanceId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated maintenance mode: ${maintenance.id}`);
      return maintenance as MaintenanceMode;
    } catch (error) {
      this.logger.error(`Failed to update maintenance mode: ${(error as Error).message}`);
      throw error;
    }
  }

  async isMaintenanceModeEnabled(): Promise<boolean> {
    const maintenance = await this.prisma.maintenanceMode.findFirst({
      where: { isEnabled: true },
      orderBy: { createdAt: 'desc' },
    });

    return !!maintenance;
  }

  async canAccessPath(path: string, userRole?: string): Promise<boolean> {
    const maintenance = await this.prisma.maintenanceMode.findFirst({
      where: { isEnabled: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!maintenance) {
      return true; // No maintenance mode active
    }

    // Check if path is allowed
    if (maintenance.allowedPaths.includes(path)) {
      return true;
    }

    // Check if user role is allowed
    if (userRole && maintenance.allowedRoles.includes(userRole)) {
      return true;
    }

    return false;
  }

  async getMaintenanceMessage(): Promise<string | null> {
    const maintenance = await this.prisma.maintenanceMode.findFirst({
      where: { isEnabled: true },
      orderBy: { createdAt: 'desc' },
    });

    return maintenance?.message || null;
  }

  // Maintenance Scheduling
  async createMaintenanceSchedule(scheduleData: {
    name: string;
    description: string;
    scheduledStart: Date;
    scheduledEnd: Date;
  }): Promise<MaintenanceSchedule> {
    try {
      const schedule = await this.prisma.maintenanceSchedule.create({
        data: {
          name: scheduleData.name,
          description: scheduleData.description,
          scheduledStart: scheduleData.scheduledStart,
          scheduledEnd: scheduleData.scheduledEnd,
          isActive: true,
          notificationSent: false,
        },
      });

      this.logger.log(`Created maintenance schedule: ${schedule.name}`);
      return schedule as MaintenanceSchedule;
    } catch (error) {
      this.logger.error(`Failed to create maintenance schedule: ${(error as Error).message}`);
      throw error;
    }
  }

  async getAllMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    return this.prisma.maintenanceSchedule.findMany({
      orderBy: { scheduledStart: 'asc' },
    }) as Promise<MaintenanceSchedule[]>;
  }

  async getUpcomingMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    const now = new Date();
    return this.prisma.maintenanceSchedule.findMany({
      where: {
        scheduledStart: { gte: now },
        isActive: true,
      },
      orderBy: { scheduledStart: 'asc' },
    }) as Promise<MaintenanceSchedule[]>;
  }

  async updateMaintenanceSchedule(
    scheduleId: string,
    updateData: Partial<MaintenanceSchedule>
  ): Promise<MaintenanceSchedule> {
    try {
      const schedule = await this.prisma.maintenanceSchedule.update({
        where: { id: scheduleId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated maintenance schedule: ${schedule.name}`);
      return schedule as MaintenanceSchedule;
    } catch (error) {
      this.logger.error(`Failed to update maintenance schedule: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteMaintenanceSchedule(scheduleId: string): Promise<void> {
    try {
      await this.prisma.maintenanceSchedule.delete({
        where: { id: scheduleId },
      });

      this.logger.log(`Deleted maintenance schedule: ${scheduleId}`);
    } catch (error) {
      this.logger.error(`Failed to delete maintenance schedule: ${(error as Error).message}`);
      throw error;
    }
  }

  async processScheduledMaintenance(): Promise<void> {
    try {
      const now = new Date();
      
      // Check for maintenance schedules that should start
      const startingSchedules = await this.prisma.maintenanceSchedule.findMany({
        where: {
          scheduledStart: { lte: now },
          scheduledEnd: { gte: now },
          isActive: true,
        },
      });

      for (const schedule of startingSchedules) {
        // Enable maintenance mode for this schedule
        await this.enableMaintenanceMode({
          message: schedule.description,
          estimatedEndTime: schedule.scheduledEnd,
        });

        // Mark schedule as processed
        await this.prisma.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: { isActive: false },
        });

        this.logger.log(`Started scheduled maintenance: ${schedule.name}`);
      }

      // Check for maintenance schedules that should end
      const endingSchedules = await this.prisma.maintenanceSchedule.findMany({
        where: {
          scheduledEnd: { lte: now },
          isActive: true,
        },
      });

      for (const schedule of endingSchedules) {
        // Disable maintenance mode
        await this.disableMaintenanceMode();

        // Mark schedule as completed
        await this.prisma.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: { isActive: false },
        });

        this.logger.log(`Completed scheduled maintenance: ${schedule.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process scheduled maintenance: ${(error as Error).message}`);
      throw error;
    }
  }

  async sendMaintenanceNotifications(): Promise<void> {
    try {
      const upcomingSchedules = await this.getUpcomingMaintenanceSchedules();
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      for (const schedule of upcomingSchedules) {
        // Send notification if maintenance starts within 1 hour and notification not sent
        if (schedule.scheduledStart <= oneHourFromNow && !schedule.notificationSent) {
          await this.sendMaintenanceScheduleNotification(schedule);
          
          // Mark notification as sent
          await this.prisma.maintenanceSchedule.update({
            where: { id: schedule.id },
            data: { notificationSent: true },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send maintenance notifications: ${(error as Error).message}`);
      throw error;
    }
  }

  private async sendMaintenanceNotification(maintenance: MaintenanceMode): Promise<void> {
    try {
      // Get all users (in production, you'd want to paginate this)
      const users = await this.prisma.user.findMany({
        select: { id: true, email: true, firstName: true },
      });

      for (const user of users) {
        await this.emailNotificationService.sendNotification({
          event: 'system_maintenance',
          recipient: user.email,
          recipientName: user.firstName,
          payload: {
            firstName: user.firstName,
            maintenanceMessage: maintenance.message,
            estimatedEndTime: maintenance.estimatedEndTime?.toLocaleString(),
            maintenanceDate: new Date().toLocaleDateString(),
            maintenanceTime: new Date().toLocaleTimeString(),
            duration: maintenance.estimatedEndTime ? 
              Math.ceil((maintenance.estimatedEndTime.getTime() - Date.now()) / (1000 * 60)) + ' minutes' : 
              'Unknown',
            impact: 'Platform will be temporarily unavailable',
          },
        });
      }

      this.logger.log(`Sent maintenance notifications to ${users.length} users`);
    } catch (error) {
      this.logger.error(`Failed to send maintenance notifications: ${(error as Error).message}`);
    }
  }

  private async sendMaintenanceEndNotification(maintenance: MaintenanceMode): Promise<void> {
    try {
      // Get all users
      const users = await this.prisma.user.findMany({
        select: { id: true, email: true, firstName: true },
      });

      for (const user of users) {
        await this.emailNotificationService.sendNotification({
          event: 'system_maintenance',
          recipient: user.email,
          recipientName: user.firstName,
          payload: {
            firstName: user.firstName,
            maintenanceMessage: 'Maintenance completed successfully',
            maintenanceDate: new Date().toLocaleDateString(),
            maintenanceTime: new Date().toLocaleTimeString(),
            impact: 'Platform is now fully operational',
          },
        });
      }

      this.logger.log(`Sent maintenance end notifications to ${users.length} users`);
    } catch (error) {
      this.logger.error(`Failed to send maintenance end notifications: ${(error as Error).message}`);
    }
  }

  private async sendMaintenanceScheduleNotification(schedule: MaintenanceSchedule): Promise<void> {
    try {
      // Get all users
      const users = await this.prisma.user.findMany({
        select: { id: true, email: true, firstName: true },
      });

      for (const user of users) {
        await this.emailNotificationService.sendNotification({
          event: 'system_maintenance',
          recipient: user.email,
          recipientName: user.firstName,
          payload: {
            firstName: user.firstName,
            maintenanceMessage: schedule.description,
            maintenanceDate: schedule.scheduledStart.toLocaleDateString(),
            maintenanceTime: schedule.scheduledStart.toLocaleTimeString(),
            duration: Math.ceil((schedule.scheduledEnd.getTime() - schedule.scheduledStart.getTime()) / (1000 * 60)) + ' minutes',
            impact: 'Platform will be temporarily unavailable',
          },
        });
      }

      this.logger.log(`Sent maintenance schedule notifications to ${users.length} users`);
    } catch (error) {
      this.logger.error(`Failed to send maintenance schedule notifications: ${(error as Error).message}`);
    }
  }

  async getMaintenanceAnalytics(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<{
    totalMaintenanceEvents: number;
    averageDuration: number;
    scheduledMaintenance: number;
    emergencyMaintenance: number;
    userNotificationsSent: number;
    maintenanceHistory: Array<{
      date: string;
      duration: number;
      type: string;
      usersAffected: number;
    }>;
  }> {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [maintenanceEvents, schedules] = await Promise.all([
      this.prisma.maintenanceMode.findMany({
        where: {
          createdAt: { gte: startDate },
        },
      }),
      this.prisma.maintenanceSchedule.findMany({
        where: {
          createdAt: { gte: startDate },
        },
      }),
    ]);

    const totalMaintenanceEvents = maintenanceEvents.length;
    const scheduledMaintenance = schedules.length;
    const emergencyMaintenance = totalMaintenanceEvents - scheduledMaintenance;

    // Calculate average duration (simplified)
    const averageDuration = maintenanceEvents.reduce((sum, event) => {
      if (event.estimatedEndTime) {
        return sum + (event.estimatedEndTime.getTime() - event.createdAt.getTime());
      }
      return sum;
    }, 0) / totalMaintenanceEvents || 0;

    // Maintenance history (simplified)
    const maintenanceHistory = maintenanceEvents.map(event => ({
      date: event.createdAt.toLocaleDateString(),
      duration: event.estimatedEndTime ? 
        Math.ceil((event.estimatedEndTime.getTime() - event.createdAt.getTime()) / (1000 * 60)) : 
        0,
      type: 'maintenance',
      usersAffected: 0, // Would need to calculate actual affected users
    }));

    return {
      totalMaintenanceEvents,
      averageDuration: Math.ceil(averageDuration / (1000 * 60)), // Convert to minutes
      scheduledMaintenance,
      emergencyMaintenance,
      userNotificationsSent: totalMaintenanceEvents * 100, // Simplified
      maintenanceHistory,
    };
  }
}