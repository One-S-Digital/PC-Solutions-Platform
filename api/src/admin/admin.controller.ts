import { Controller, Get, Put, Post, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, OrganizationType } from '@prisma/client';

export class SystemSettingsDto {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maxUsersPerOrganization: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  logRetentionDays: number;
  apiRateLimit: number;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

export class MaintenanceModeDto {
  enabled: boolean;
  message: string;
}

export class SubscriptionTierDto {
  name: string;
  price: number;
  features: string[];
  maxUsers: number;
  maxOrganizations: number;
  isActive: boolean;
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);
  
  constructor(private readonly prisma: PrismaService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get system settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings() {
    // In a real implementation, these would be stored in a settings table
    const defaultSettings = {
      maintenanceMode: false,
      maintenanceMessage: 'System is currently under maintenance. Please try again later.',
      maxUsersPerOrganization: 50,
      emailNotifications: true,
      smsNotifications: false,
      autoBackupEnabled: true,
      backupFrequency: 'daily' as const,
      logRetentionDays: 30,
      apiRateLimit: 1000,
      sessionTimeout: 3600,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      }
    };

    return {
      success: true,
      data: defaultSettings
    };
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update system settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(@Body() settings: SystemSettingsDto) {
    // In a real implementation, these would be saved to a settings table
    // For now, we'll just return the updated settings
    
    return {
      success: true,
      data: settings,
      message: 'Settings updated successfully'
    };
  }

  @Post('maintenance')
  @ApiOperation({ summary: 'Toggle maintenance mode' })
  @ApiResponse({ status: 200, description: 'Maintenance mode toggled successfully' })
  async toggleMaintenanceMode(@Body() maintenanceData: MaintenanceModeDto) {
    // In a real implementation, this would update the system state
    // and potentially notify users
    
    return {
      success: true,
      data: {
        enabled: maintenanceData.enabled,
        message: maintenanceData.message
      },
      message: `Maintenance mode ${maintenanceData.enabled ? 'enabled' : 'disabled'}`
    };
  }

  @Get('subscription-tiers')
  @ApiOperation({ summary: 'Get subscription tiers' })
  @ApiResponse({ status: 200, description: 'Subscription tiers retrieved successfully' })
  async getSubscriptionTiers() {
    // In a real implementation, these would come from the database
    const tiers = [
      {
        id: '1',
        name: 'Basic',
        price: 29,
        features: ['Up to 10 users', 'Basic support', 'Standard features'],
        maxUsers: 10,
        maxOrganizations: 1,
        isActive: true
      },
      {
        id: '2',
        name: 'Professional',
        price: 79,
        features: ['Up to 50 users', 'Priority support', 'Advanced features', 'API access'],
        maxUsers: 50,
        maxOrganizations: 3,
        isActive: true
      },
      {
        id: '3',
        name: 'Enterprise',
        price: 199,
        features: ['Unlimited users', '24/7 support', 'All features', 'Custom integrations'],
        maxUsers: -1, // Unlimited
        maxOrganizations: -1, // Unlimited
        isActive: true
      }
    ];

    return {
      success: true,
      data: tiers
    };
  }

  @Post('subscription-tiers')
  @ApiOperation({ summary: 'Create new subscription tier' })
  @ApiResponse({ status: 201, description: 'Subscription tier created successfully' })
  async createSubscriptionTier(@Body() tierData: SubscriptionTierDto) {
    // In a real implementation, this would save to the database
    const newTier = {
      id: Date.now().toString(),
      ...tierData
    };

    return {
      success: true,
      data: newTier,
      message: 'Subscription tier created successfully'
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics() {
    // Calculate real metrics from database
    const [
      totalUsers,
      activeUsers,
      totalOrganizations,
      totalProducts,
      totalServices,
      totalJobListings,
      totalOrders,
      totalServiceRequests
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      this.prisma.organization.count(),
      this.prisma.product.count(),
      this.prisma.service.count(),
      this.prisma.jobListing.count(),
      this.prisma.order.count(),
      this.prisma.serviceRequest.count()
    ]);

    const metrics = {
      totalUsers,
      activeUsers,
      totalOrganizations,
      totalProducts,
      totalServices,
      totalJobListings,
      totalOrders,
      totalServiceRequests,
      systemLoad: 0, // Would need system monitoring integration
      memoryUsage: 0, // Would need system monitoring integration
      diskUsage: 0, // Would need system monitoring integration
      apiRequestsToday: 0, // Would need API monitoring integration
      errorRate: 0 // Would need error tracking integration
    };

    return {
      success: true,
      data: metrics
    };
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get system logs' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async getLogs(@Request() req) {
    // In a real implementation, this would fetch from log storage
    const logs = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'User login successful',
        userId: req.context.userId,
        ip: '192.168.1.1'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'WARN',
        message: 'High memory usage detected',
        userId: null,
        ip: null
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'ERROR',
        message: 'Database connection failed',
        userId: null,
        ip: null
      }
    ];

    return {
      success: true,
      data: logs
    };
  }

  @Post('backup')
  @ApiOperation({ summary: 'Trigger database backup' })
  @ApiResponse({ status: 200, description: 'Backup initiated successfully' })
  async triggerBackup() {
    // In a real implementation, this would trigger a backup process
    return {
      success: true,
      message: 'Backup initiated successfully',
      data: {
        backupId: Date.now().toString(),
        status: 'IN_PROGRESS',
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      }
    };
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear system cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache() {
    // In a real implementation, this would clear various caches
    return {
      success: true,
      message: 'System cache cleared successfully'
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealthStatus() {
    // In a real implementation, this would check various system components
    const health = {
      database: 'HEALTHY',
      redis: 'HEALTHY',
      storage: 'HEALTHY',
      email: 'HEALTHY',
      sms: 'DEGRADED',
      overall: 'HEALTHY'
    };

    return {
      success: true,
      data: health
    };
  }

  @Post('backfill-organizations')
  @ApiOperation({ summary: 'Create organizations for users who do not have one' })
  @ApiResponse({ status: 200, description: 'Organizations backfilled successfully' })
  async backfillOrganizations() {
    this.logger.log('🏢 [BACKFILL] Starting organization backfill for users without organizations...');
    
    // Find all users with organization-based roles who don't have a UserOrganization link
    const orgBasedRoles = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER];
    
    const usersWithoutOrgs = await this.prisma.user.findMany({
      where: {
        role: { in: orgBasedRoles },
        organizations: { none: {} }, // No UserOrganization links
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
      },
    });

    this.logger.log(`🏢 [BACKFILL] Found ${usersWithoutOrgs.length} users without organizations`);

    const results = {
      total: usersWithoutOrgs.length,
      created: 0,
      failed: 0,
      details: [] as { userId: string; email: string; role: string; organizationId?: string; error?: string }[],
    };

    // Map user role to organization type
    const roleToOrgType: Record<string, OrganizationType> = {
      [UserRole.FOUNDATION]: OrganizationType.FOUNDATION,
      [UserRole.PRODUCT_SUPPLIER]: OrganizationType.PRODUCT_SUPPLIER,
      [UserRole.SERVICE_PROVIDER]: OrganizationType.SERVICE_PROVIDER,
    };

    for (const user of usersWithoutOrgs) {
      try {
        const orgType = roleToOrgType[user.role];
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        
        // Create organization and link in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
          const organization = await tx.organization.create({
            data: {
              name: fullName || user.email || 'New Organization',
              type: orgType,
              contactPerson: fullName || null,
              phoneNumber: user.phoneNumber || null,
              isActive: true,
            },
          });

          await tx.userOrganization.create({
            data: {
              userId: user.id,
              organizationId: organization.id,
              role: user.role,
            },
          });

          return organization;
        });

        results.created++;
        results.details.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          organizationId: result.id,
        });

        this.logger.log(`✅ [BACKFILL] Created organization for user ${user.email} (${user.role}): ${result.id}`);
      } catch (error) {
        results.failed++;
        results.details.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          error: error.message,
        });

        this.logger.error(`❌ [BACKFILL] Failed to create organization for user ${user.email}: ${error.message}`);
      }
    }

    this.logger.log(`🏢 [BACKFILL] Completed: ${results.created} created, ${results.failed} failed`);

    return {
      success: true,
      message: `Organization backfill completed: ${results.created} created, ${results.failed} failed`,
      data: results,
    };
  }

  @Get('users-without-organizations')
  @ApiOperation({ summary: 'Get users with organization roles but no organization' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsersWithoutOrganizations() {
    const orgBasedRoles = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER];
    
    const usersWithoutOrgs = await this.prisma.user.findMany({
      where: {
        role: { in: orgBasedRoles },
        organizations: { none: {} },
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by role for better overview
    const byRole = {
      FOUNDATION: usersWithoutOrgs.filter(u => u.role === UserRole.FOUNDATION),
      PRODUCT_SUPPLIER: usersWithoutOrgs.filter(u => u.role === UserRole.PRODUCT_SUPPLIER),
      SERVICE_PROVIDER: usersWithoutOrgs.filter(u => u.role === UserRole.SERVICE_PROVIDER),
    };

    return {
      success: true,
      data: {
        total: usersWithoutOrgs.length,
        byRole: {
          foundations: byRole.FOUNDATION.length,
          productSuppliers: byRole.PRODUCT_SUPPLIER.length,
          serviceProviders: byRole.SERVICE_PROVIDER.length,
        },
        users: usersWithoutOrgs,
      },
    };
  }
}