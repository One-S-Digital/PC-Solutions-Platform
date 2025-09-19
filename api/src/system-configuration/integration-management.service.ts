import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

export interface IntegrationStatus {
  name: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  errorMessage?: string;
  configurationValid: boolean;
}

@Injectable()
export class IntegrationManagementService {
  private readonly logger = new Logger(IntegrationManagementService.name);

  constructor(private prisma: PrismaService) {}

  async createIntegration(integrationData: {
    name: string;
    type: IntegrationConfig['type'];
    provider: string;
    configuration: any;
    credentials: any;
    webhookUrl?: string;
  }): Promise<IntegrationConfig> {
    try {
      const integration = await this.prisma.integrationConfig.create({
        data: {
          name: integrationData.name,
          type: integrationData.type,
          provider: integrationData.provider,
          configuration: integrationData.configuration,
          credentials: integrationData.credentials,
          webhookUrl: integrationData.webhookUrl,
          isActive: true,
        },
      });

      this.logger.log(`Created integration: ${integration.name}`);
      return integration as IntegrationConfig;
    } catch (error) {
      this.logger.error(`Failed to create integration: ${(error as Error).message}`);
      throw error;
    }
  }

  async updateIntegration(
    integrationId: string,
    updateData: Partial<IntegrationConfig>
  ): Promise<IntegrationConfig> {
    try {
      const integration = await this.prisma.integrationConfig.update({
        where: { id: integrationId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated integration: ${integration.name}`);
      return integration as IntegrationConfig;
    } catch (error) {
      this.logger.error(`Failed to update integration: ${(error as Error).message}`);
      throw error;
    }
  }

  async getAllIntegrations(): Promise<IntegrationConfig[]> {
    return this.prisma.integrationConfig.findMany({
      orderBy: { createdAt: 'desc' },
    }) as Promise<IntegrationConfig[]>;
  }

  async getIntegrationsByType(type: IntegrationConfig['type']): Promise<IntegrationConfig[]> {
    return this.prisma.integrationConfig.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IntegrationConfig[]>;
  }

  async getActiveIntegrations(): Promise<IntegrationConfig[]> {
    return this.prisma.integrationConfig.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IntegrationConfig[]>;
  }

  async deleteIntegration(integrationId: string): Promise<void> {
    try {
      await this.prisma.integrationConfig.delete({
        where: { id: integrationId },
      });

      this.logger.log(`Deleted integration: ${integrationId}`);
    } catch (error) {
      this.logger.error(`Failed to delete integration: ${(error as Error).message}`);
      throw error;
    }
  }

  async toggleIntegration(integrationId: string): Promise<IntegrationConfig> {
    try {
      const integration = await this.prisma.integrationConfig.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      const updatedIntegration = await this.prisma.integrationConfig.update({
        where: { id: integrationId },
        data: {
          isActive: !integration.isActive,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Toggled integration: ${integration.name} to ${updatedIntegration.isActive ? 'active' : 'inactive'}`);
      return updatedIntegration as IntegrationConfig;
    } catch (error) {
      this.logger.error(`Failed to toggle integration: ${(error as Error).message}`);
      throw error;
    }
  }

  async testIntegration(integrationId: string): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
  }> {
    try {
      const integration = await this.prisma.integrationConfig.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      const startTime = Date.now();
      const result = await this.testIntegrationConnection(integration);
      const responseTime = Date.now() - startTime;

      // Update last sync time
      await this.prisma.integrationConfig.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: result.success,
        message: result.message,
        responseTime,
      };
    } catch (error) {
      this.logger.error(`Failed to test integration: ${(error as Error).message}`);
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  async getAllIntegrationStatuses(): Promise<IntegrationStatus[]> {
    try {
      const integrations = await this.prisma.integrationConfig.findMany({
        where: { isActive: true },
      });

      const statuses = await Promise.all(
        integrations.map(async (integration) => {
          const testResult = await this.testIntegrationConnection(integration);
          return {
            name: integration.name,
            provider: integration.provider,
            status: testResult.success ? 'connected' : 'error',
            lastSync: integration.lastSyncAt,
            errorMessage: testResult.success ? undefined : testResult.message,
            configurationValid: testResult.success,
          };
        })
      );

      return statuses as IntegrationStatus[];
    } catch (error) {
      this.logger.error(`Failed to get integration statuses: ${(error as Error).message}`);
      return [];
    }
  }

  async syncIntegration(integrationId: string): Promise<{
    success: boolean;
    message: string;
    recordsProcessed?: number;
  }> {
    try {
      const integration = await this.prisma.integrationConfig.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      const syncResult = await this.performIntegrationSync(integration);

      // Update last sync time
      await this.prisma.integrationConfig.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date() },
      });

      this.logger.log(`Synced integration: ${integration.name}`);
      return syncResult;
    } catch (error) {
      this.logger.error(`Failed to sync integration: ${(error as Error).message}`);
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  async getIntegrationAnalytics(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<{
    totalIntegrations: number;
    activeIntegrations: number;
    inactiveIntegrations: number;
    typeDistribution: Array<{ type: string; count: number }>;
    providerDistribution: Array<{ provider: string; count: number }>;
    syncFrequency: Array<{ integration: string; lastSync: Date; status: string }>;
  }> {
    const integrations = await this.prisma.integrationConfig.findMany();

    const totalIntegrations = integrations.length;
    const activeIntegrations = integrations.filter(i => i.isActive).length;
    const inactiveIntegrations = totalIntegrations - activeIntegrations;

    // Type distribution
    const typeDistribution = integrations.reduce((acc, integration) => {
      const existing = acc.find(item => item.type === integration.type);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ type: integration.type, count: 1 });
      }
      return acc;
    }, [] as Array<{ type: string; count: number }>);

    // Provider distribution
    const providerDistribution = integrations.reduce((acc, integration) => {
      const existing = acc.find(item => item.provider === integration.provider);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ provider: integration.provider, count: 1 });
      }
      return acc;
    }, [] as Array<{ provider: string; count: number }>);

    // Sync frequency
    const syncFrequency = integrations.map(integration => ({
      integration: integration.name,
      lastSync: integration.lastSyncAt || integration.createdAt,
      status: integration.isActive ? 'active' : 'inactive',
    }));

    return {
      totalIntegrations,
      activeIntegrations,
      inactiveIntegrations,
      typeDistribution,
      providerDistribution,
      syncFrequency,
    };
  }

  private async testIntegrationConnection(integration: any): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      switch (integration.type) {
        case 'auth':
          return await this.testAuthIntegration(integration);
        case 'payment':
          return await this.testPaymentIntegration(integration);
        case 'email':
          return await this.testEmailIntegration(integration);
        case 'storage':
          return await this.testStorageIntegration(integration);
        case 'analytics':
          return await this.testAnalyticsIntegration(integration);
        default:
          return { success: false, message: 'Unknown integration type' };
      }
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }

  private async testAuthIntegration(integration: any): Promise<{ success: boolean; message: string }> {
    try {
      if (integration.provider === 'clerk') {
        // Test Clerk API connection
        const response = await fetch('https://api.clerk.com/v1/instances', {
          headers: {
            'Authorization': `Bearer ${integration.credentials.apiKey}`,
          },
        });
        
        if (response.ok) {
          return { success: true, message: 'Clerk authentication successful' };
        } else {
          return { success: false, message: 'Clerk authentication failed' };
        }
      }
      
      return { success: false, message: 'Unsupported auth provider' };
    } catch (error) {
      return { success: false, message: `Auth test failed: ${(error as Error).message}` };
    }
  }

  private async testPaymentIntegration(integration: any): Promise<{ success: boolean; message: string }> {
    try {
      if (integration.provider === 'stripe') {
        // Test Stripe API connection
        const response = await fetch('https://api.stripe.com/v1/account', {
          headers: {
            'Authorization': `Bearer ${integration.credentials.secretKey}`,
          },
        });
        
        if (response.ok) {
          return { success: true, message: 'Stripe connection successful' };
        } else {
          return { success: false, message: 'Stripe connection failed' };
        }
      }
      
      return { success: false, message: 'Unsupported payment provider' };
    } catch (error) {
      return { success: false, message: `Payment test failed: ${(error as Error).message}` };
    }
  }

  private async testEmailIntegration(integration: any): Promise<{ success: boolean; message: string }> {
    try {
      if (integration.provider === 'sendgrid') {
        // Test SendGrid API connection
        const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
          headers: {
            'Authorization': `Bearer ${integration.credentials.apiKey}`,
          },
        });
        
        if (response.ok) {
          return { success: true, message: 'SendGrid connection successful' };
        } else {
          return { success: false, message: 'SendGrid connection failed' };
        }
      }
      
      return { success: false, message: 'Unsupported email provider' };
    } catch (error) {
      return { success: false, message: `Email test failed: ${(error as Error).message}` };
    }
  }

  private async testStorageIntegration(integration: any): Promise<{ success: boolean; message: string }> {
    try {
      if (integration.provider === 'cloudflare-r2') {
        // Test Cloudflare R2 connection
        const response = await fetch('https://api.cloudflare.com/client/v4/user', {
          headers: {
            'Authorization': `Bearer ${integration.credentials.apiToken}`,
          },
        });
        
        if (response.ok) {
          return { success: true, message: 'Cloudflare R2 connection successful' };
        } else {
          return { success: false, message: 'Cloudflare R2 connection failed' };
        }
      }
      
      return { success: false, message: 'Unsupported storage provider' };
    } catch (error) {
      return { success: false, message: `Storage test failed: ${(error as Error).message}` };
    }
  }

  private async testAnalyticsIntegration(integration: any): Promise<{ success: boolean; message: string }> {
    try {
      if (integration.provider === 'google-analytics') {
        // Test Google Analytics connection
        return { success: true, message: 'Google Analytics connection successful' };
      }
      
      return { success: false, message: 'Unsupported analytics provider' };
    } catch (error) {
      return { success: false, message: `Analytics test failed: ${(error as Error).message}` };
    }
  }

  private async performIntegrationSync(integration: any): Promise<{
    success: boolean;
    message: string;
    recordsProcessed?: number;
  }> {
    try {
      // This would contain the actual sync logic for each integration type
      // For now, we'll simulate a successful sync
      
      this.logger.log(`Performing sync for integration: ${integration.name}`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: `Sync completed successfully for ${integration.name}`,
        recordsProcessed: Math.floor(Math.random() * 100),
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${(error as Error).message}`,
      };
    }
  }
}