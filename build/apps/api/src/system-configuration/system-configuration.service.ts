import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationService } from '../email-notification/email-notification.service';

export interface SystemSettings {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  isEncrypted: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'auth' | 'payment' | 'email' | 'storage' | 'analytics' | 'other';
  provider: string;
  isActive: boolean;
  configuration: any;
  credentials: any;
  webhookUrl?: string;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceMode {
  isEnabled: boolean;
  message: string;
  allowedPaths: string[];
  allowedRoles: string[];
  estimatedEndTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    lastCheck: Date;
  }>;
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
    connections: number;
  };
  storage: {
    status: 'available' | 'unavailable';
    usedSpace: number;
    totalSpace: number;
  };
  lastChecked: Date;
}

@Injectable()
export class SystemConfigurationService {
  private readonly logger = new Logger(SystemConfigurationService.name);

  constructor(
    private prisma: PrismaService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  // System Settings Management
  async getSystemSettings(category?: string): Promise<SystemSettings[]> {
    const where = category ? { category } : {};
    
    return this.prisma.systemSettings.findMany({
      where,
      orderBy: { category: 'asc' },
    }) as Promise<SystemSettings[]>;
  }

  async getSystemSetting(key: string): Promise<SystemSettings | null> {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key },
    });

    return setting as SystemSettings | null;
  }

  async updateSystemSetting(key: string, value: any, description?: string): Promise<SystemSettings> {
    try {
      const setting = await this.prisma.systemSettings.upsert({
        where: { key },
        update: {
          value,
          description: description || undefined,
          updatedAt: new Date(),
        },
        create: {
          key,
          value,
          description: description || '',
          category: 'general',
          isEncrypted: false,
          isPublic: false,
        },
      });

      this.logger.log(`Updated system setting: ${key}`);
      return setting as SystemSettings;
    } catch (error) {
      this.logger.error(`Failed to update system setting: ${error.message}`);
      throw error;
    }
  }

  async createSystemSetting(settingData: {
    key: string;
    value: any;
    description: string;
    category: string;
    isEncrypted?: boolean;
    isPublic?: boolean;
  }): Promise<SystemSettings> {
    try {
      const setting = await this.prisma.systemSettings.create({
        data: {
          key: settingData.key,
          value: settingData.value,
          description: settingData.description,
          category: settingData.category,
          isEncrypted: settingData.isEncrypted || false,
          isPublic: settingData.isPublic || false,
        },
      });

      this.logger.log(`Created system setting: ${setting.key}`);
      return setting as SystemSettings;
    } catch (error) {
      this.logger.error(`Failed to create system setting: ${error.message}`);
      throw error;
    }
  }

  async deleteSystemSetting(key: string): Promise<void> {
    try {
      await this.prisma.systemSettings.delete({
        where: { key },
      });

      this.logger.log(`Deleted system setting: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete system setting: ${error.message}`);
      throw error;
    }
  }

  async getPublicSettings(): Promise<Record<string, any>> {
    const settings = await this.prisma.systemSettings.findMany({
      where: { isPublic: true },
    });

    const publicSettings: Record<string, any> = {};
    settings.forEach(setting => {
      publicSettings[setting.key] = setting.value;
    });

    return publicSettings;
  }

  // Email Template Management
  async getEmailTemplates(): Promise<any[]> {
    return this.prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEmailTemplate(templateId: string, templateData: {
    name?: string;
    subject?: string;
    htmlContent?: string;
    textContent?: string;
    variables?: string[];
    category?: string;
    isActive?: boolean;
  }): Promise<any> {
    try {
      const template = await this.prisma.emailTemplate.update({
        where: { id: templateId },
        data: {
          ...templateData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated email template: ${template.name}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to update email template: ${error.message}`);
      throw error;
    }
  }

  async createEmailTemplate(templateData: {
    name: string;
    event: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    variables: string[];
    category: string;
    isActive?: boolean;
  }): Promise<any> {
    try {
      const template = await this.prisma.emailTemplate.create({
        data: {
          name: templateData.name,
          event: templateData.event,
          subject: templateData.subject,
          htmlContent: templateData.htmlContent,
          textContent: templateData.textContent,
          variables: templateData.variables,
          category: templateData.category,
          isActive: templateData.isActive ?? true,
        },
      });

      this.logger.log(`Created email template: ${template.name}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to create email template: ${error.message}`);
      throw error;
    }
  }

  async deleteEmailTemplate(templateId: string): Promise<void> {
    try {
      await this.prisma.emailTemplate.delete({
        where: { id: templateId },
      });

      this.logger.log(`Deleted email template: ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to delete email template: ${error.message}`);
      throw error;
    }
  }

  // System Health Monitoring
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const startTime = Date.now();
      
      // Check database connection
      const dbStartTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStartTime;

      // Get database connection count (simplified)
      const dbConnections = await this.prisma.$queryRaw`
        SELECT count(*) as connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      ` as any[];

      // Check external services
      const services = await this.checkExternalServices();

      // Check storage (simplified)
      const storage = await this.checkStorage();

      const overallStatus = this.determineOverallStatus(services, dbResponseTime);

      return {
        status: overallStatus,
        services,
        database: {
          status: 'connected',
          responseTime: dbResponseTime,
          connections: parseInt(dbConnections[0]?.connections || '0'),
        },
        storage,
        lastChecked: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get system health: ${error.message}`);
      return {
        status: 'critical',
        services: [],
        database: {
          status: 'disconnected',
          responseTime: 0,
          connections: 0,
        },
        storage: {
          status: 'unavailable',
          usedSpace: 0,
          totalSpace: 0,
        },
        lastChecked: new Date(),
      };
    }
  }

  private async checkExternalServices(): Promise<Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    lastCheck: Date;
  }>> {
    const services = [
      { name: 'SendGrid', url: 'https://api.sendgrid.com/v3/user/profile', timeout: 5000 },
      { name: 'Stripe', url: 'https://api.stripe.com/v1/account', timeout: 5000 },
      { name: 'Cloudflare R2', url: 'https://api.cloudflare.com/client/v4/user', timeout: 5000 },
    ];

    const results = await Promise.allSettled(
      services.map(async (service) => {
        const startTime = Date.now();
        try {
          const response = await fetch(service.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(service.timeout),
          });
          
          const responseTime = Date.now() - startTime;
          return {
            name: service.name,
            status: response.ok ? 'up' : 'degraded',
            responseTime,
            lastCheck: new Date(),
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'down',
            lastCheck: new Date(),
          };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: services[index].name,
          status: 'down' as const,
          lastCheck: new Date(),
        };
      }
    });
  }

  private async checkStorage(): Promise<{
    status: 'available' | 'unavailable';
    usedSpace: number;
    totalSpace: number;
  }> {
    try {
      // Simplified storage check - in production, you'd check actual storage
      return {
        status: 'available',
        usedSpace: 1024 * 1024 * 1024, // 1GB
        totalSpace: 10 * 1024 * 1024 * 1024, // 10GB
      };
    } catch (error) {
      return {
        status: 'unavailable',
        usedSpace: 0,
        totalSpace: 0,
      };
    }
  }

  private determineOverallStatus(
    services: Array<{ status: 'up' | 'down' | 'degraded' }>,
    dbResponseTime: number
  ): 'healthy' | 'degraded' | 'critical' {
    const downServices = services.filter(s => s.status === 'down').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;

    if (downServices > 0 || dbResponseTime > 5000) {
      return 'critical';
    } else if (degradedServices > 0 || dbResponseTime > 2000) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  // System Configuration Categories
  async getSettingsByCategory(): Promise<Record<string, SystemSettings[]>> {
    const settings = await this.prisma.systemSettings.findMany({
      orderBy: { category: 'asc' },
    });

    const groupedSettings: Record<string, SystemSettings[]> = {};
    settings.forEach(setting => {
      if (!groupedSettings[setting.category]) {
        groupedSettings[setting.category] = [];
      }
      groupedSettings[setting.category].push(setting as SystemSettings);
    });

    return groupedSettings;
  }

  // Bulk Settings Update
  async updateBulkSettings(settings: Array<{ key: string; value: any }>): Promise<void> {
    try {
      await Promise.all(
        settings.map(setting => 
          this.prisma.systemSettings.upsert({
            where: { key: setting.key },
            update: { value: setting.value, updatedAt: new Date() },
            create: {
              key: setting.key,
              value: setting.value,
              description: '',
              category: 'general',
              isEncrypted: false,
              isPublic: false,
            },
          })
        )
      );

      this.logger.log(`Updated ${settings.length} system settings`);
    } catch (error) {
      this.logger.error(`Failed to update bulk settings: ${error.message}`);
      throw error;
    }
  }

  // System Reset (Emergency)
  async resetSystemSettings(): Promise<void> {
    try {
      // Only reset non-critical settings
      await this.prisma.systemSettings.deleteMany({
        where: {
          category: {
            notIn: ['critical', 'security', 'database'],
          },
        },
      });

      this.logger.warn('System settings reset completed');
    } catch (error) {
      this.logger.error(`Failed to reset system settings: ${error.message}`);
      throw error;
    }
  }

  // Configuration Backup
  async createConfigurationBackup(): Promise<{
    settings: SystemSettings[];
    templates: any[];
    timestamp: Date;
  }> {
    try {
      const [settings, templates] = await Promise.all([
        this.prisma.systemSettings.findMany(),
        this.prisma.emailTemplate.findMany(),
      ]);

      const backup = {
        settings: settings as SystemSettings[],
        templates,
        timestamp: new Date(),
      };

      this.logger.log('Configuration backup created');
      return backup;
    } catch (error) {
      this.logger.error(`Failed to create configuration backup: ${error.message}`);
      throw error;
    }
  }

  // Configuration Restore
  async restoreConfiguration(backup: {
    settings: SystemSettings[];
    templates: any[];
  }): Promise<void> {
    try {
      // Clear existing data
      await Promise.all([
        this.prisma.systemSettings.deleteMany(),
        this.prisma.emailTemplate.deleteMany(),
      ]);

      // Restore settings
      await this.prisma.systemSettings.createMany({
        data: backup.settings.map(setting => ({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          category: setting.category,
          isEncrypted: setting.isEncrypted,
          isPublic: setting.isPublic,
        })),
      });

      // Restore templates
      await this.prisma.emailTemplate.createMany({
        data: backup.templates.map(template => ({
          name: template.name,
          event: template.event,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: template.variables,
          category: template.category,
          isActive: template.isActive,
        })),
      });

      this.logger.log('Configuration restored successfully');
    } catch (error) {
      this.logger.error(`Failed to restore configuration: ${error.message}`);
      throw error;
    }
  }
}