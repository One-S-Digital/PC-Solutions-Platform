import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { SystemConfigurationService } from './system-configuration.service';
import { IntegrationManagementService } from './integration-management.service';
import { MaintenanceModeService } from './maintenance-mode.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@repo/types';

@Controller('admin/system-configuration')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class SystemConfigurationController {
  constructor(
    private readonly systemConfigService: SystemConfigurationService,
    private readonly integrationService: IntegrationManagementService,
    private readonly maintenanceService: MaintenanceModeService,
  ) {}

  // System Settings Management
  @Get('settings')
  async getSystemSettings(@Query('category') category?: string) {
    return this.systemConfigService.getSystemSettings(category);
  }

  @Get('settings/:key')
  async getSystemSetting(@Param('key') key: string) {
    return this.systemConfigService.getSystemSetting(key);
  }

  @Put('settings/:key')
  async updateSystemSetting(
    @Param('key') key: string,
    @Body() body: { value: any; description?: string }
  ) {
    return this.systemConfigService.updateSystemSetting(key, body.value, body.description);
  }

  @Post('settings')
  async createSystemSetting(@Body() settingData: {
    key: string;
    value: any;
    description: string;
    category: string;
    isEncrypted?: boolean;
    isPublic?: boolean;
  }) {
    return this.systemConfigService.createSystemSetting(settingData);
  }

  @Delete('settings/:key')
  async deleteSystemSetting(@Param('key') key: string) {
    await this.systemConfigService.deleteSystemSetting(key);
    return { success: true, message: 'System setting deleted successfully' };
  }

  @Get('settings/public')
  async getPublicSettings() {
    return this.systemConfigService.getPublicSettings();
  }

  @Put('settings/bulk')
  async updateBulkSettings(@Body() settings: Array<{ key: string; value: any }>) {
    await this.systemConfigService.updateBulkSettings(settings);
    return { success: true, message: 'Bulk settings updated successfully' };
  }

  @Post('settings/reset')
  async resetSystemSettings() {
    await this.systemConfigService.resetSystemSettings();
    return { success: true, message: 'System settings reset successfully' };
  }

  // Email Template Management
  @Get('email-templates')
  async getEmailTemplates() {
    return this.systemConfigService.getEmailTemplates();
  }

  @Post('email-templates')
  async createEmailTemplate(@Body() templateData: {
    name: string;
    event: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    variables: string[];
    category: string;
    isActive?: boolean;
  }) {
    return this.systemConfigService.createEmailTemplate(templateData);
  }

  @Put('email-templates/:id')
  async updateEmailTemplate(
    @Param('id') id: string,
    @Body() templateData: {
      name?: string;
      subject?: string;
      htmlContent?: string;
      textContent?: string;
      variables?: string[];
      category?: string;
      isActive?: boolean;
    }
  ) {
    return this.systemConfigService.updateEmailTemplate(id, templateData);
  }

  @Delete('email-templates/:id')
  async deleteEmailTemplate(@Param('id') id: string) {
    await this.systemConfigService.deleteEmailTemplate(id);
    return { success: true, message: 'Email template deleted successfully' };
  }

  // System Health Monitoring
  @Get('health')
  async getSystemHealth() {
    return this.systemConfigService.getSystemHealth();
  }

  @Get('settings/categories')
  async getSettingsByCategory() {
    return this.systemConfigService.getSettingsByCategory();
  }

  @Post('backup')
  async createConfigurationBackup() {
    return this.systemConfigService.createConfigurationBackup();
  }

  @Post('restore')
  async restoreConfiguration(@Body() backup: {
    settings: any[];
    templates: any[];
  }) {
    await this.systemConfigService.restoreConfiguration(backup);
    return { success: true, message: 'Configuration restored successfully' };
  }

  // Integration Management
  @Post('integrations')
  async createIntegration(@Body() integrationData: {
    name: string;
    type: 'auth' | 'payment' | 'email' | 'storage' | 'analytics' | 'other';
    provider: string;
    configuration: any;
    credentials: any;
    webhookUrl?: string;
  }) {
    return this.integrationService.createIntegration(integrationData);
  }

  @Get('integrations')
  async getAllIntegrations() {
    return this.integrationService.getAllIntegrations();
  }

  @Get('integrations/type/:type')
  async getIntegrationsByType(@Param('type') type: string) {
    return this.integrationService.getIntegrationsByType(type as any);
  }

  @Get('integrations/active')
  async getActiveIntegrations() {
    return this.integrationService.getActiveIntegrations();
  }

  @Put('integrations/:id')
  async updateIntegration(
    @Param('id') id: string,
    @Body() updateData: any
  ) {
    return this.integrationService.updateIntegration(id, updateData);
  }

  @Delete('integrations/:id')
  async deleteIntegration(@Param('id') id: string) {
    await this.integrationService.deleteIntegration(id);
    return { success: true, message: 'Integration deleted successfully' };
  }

  @Post('integrations/:id/toggle')
  async toggleIntegration(@Param('id') id: string) {
    return this.integrationService.toggleIntegration(id);
  }

  @Post('integrations/:id/test')
  async testIntegration(@Param('id') id: string) {
    return this.integrationService.testIntegration(id);
  }

  @Get('integrations/status')
  async getAllIntegrationStatuses() {
    return this.integrationService.getAllIntegrationStatuses();
  }

  @Post('integrations/:id/sync')
  async syncIntegration(@Param('id') id: string) {
    return this.integrationService.syncIntegration(id);
  }

  @Get('integrations/analytics')
  async getIntegrationAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' = '30d') {
    return this.integrationService.getIntegrationAnalytics(timeRange);
  }

  // Maintenance Mode Management
  @Get('maintenance')
  async getMaintenanceMode() {
    return this.maintenanceService.getMaintenanceMode();
  }

  @Post('maintenance/enable')
  async enableMaintenanceMode(@Body() maintenanceData: {
    message: string;
    allowedPaths?: string[];
    allowedRoles?: string[];
    estimatedEndTime?: string;
  }) {
    return this.maintenanceService.enableMaintenanceMode({
      ...maintenanceData,
      estimatedEndTime: maintenanceData.estimatedEndTime ? new Date(maintenanceData.estimatedEndTime) : undefined,
    });
  }

  @Post('maintenance/disable')
  async disableMaintenanceMode() {
    return this.maintenanceService.disableMaintenanceMode();
  }

  @Put('maintenance/:id')
  async updateMaintenanceMode(
    @Param('id') id: string,
    @Body() updateData: {
      message?: string;
      allowedPaths?: string[];
      allowedRoles?: string[];
      estimatedEndTime?: string;
    }
  ) {
    return this.maintenanceService.updateMaintenanceMode(id, {
      ...updateData,
      estimatedEndTime: updateData.estimatedEndTime ? new Date(updateData.estimatedEndTime) : undefined,
    });
  }

  @Get('maintenance/status')
  async isMaintenanceModeEnabled() {
    const isEnabled = await this.maintenanceService.isMaintenanceModeEnabled();
    return { isEnabled };
  }

  @Get('maintenance/message')
  async getMaintenanceMessage() {
    const message = await this.maintenanceService.getMaintenanceMessage();
    return { message };
  }

  // Maintenance Scheduling
  @Post('maintenance/schedules')
  async createMaintenanceSchedule(@Body() scheduleData: {
    name: string;
    description: string;
    scheduledStart: string;
    scheduledEnd: string;
  }) {
    return this.maintenanceService.createMaintenanceSchedule({
      ...scheduleData,
      scheduledStart: new Date(scheduleData.scheduledStart),
      scheduledEnd: new Date(scheduleData.scheduledEnd),
    });
  }

  @Get('maintenance/schedules')
  async getAllMaintenanceSchedules() {
    return this.maintenanceService.getAllMaintenanceSchedules();
  }

  @Get('maintenance/schedules/upcoming')
  async getUpcomingMaintenanceSchedules() {
    return this.maintenanceService.getUpcomingMaintenanceSchedules();
  }

  @Put('maintenance/schedules/:id')
  async updateMaintenanceSchedule(
    @Param('id') id: string,
    @Body() updateData: any
  ) {
    return this.maintenanceService.updateMaintenanceSchedule(id, updateData);
  }

  @Delete('maintenance/schedules/:id')
  async deleteMaintenanceSchedule(@Param('id') id: string) {
    await this.maintenanceService.deleteMaintenanceSchedule(id);
    return { success: true, message: 'Maintenance schedule deleted successfully' };
  }

  @Post('maintenance/process-scheduled')
  async processScheduledMaintenance() {
    await this.maintenanceService.processScheduledMaintenance();
    return { success: true, message: 'Scheduled maintenance processed successfully' };
  }

  @Post('maintenance/send-notifications')
  async sendMaintenanceNotifications() {
    await this.maintenanceService.sendMaintenanceNotifications();
    return { success: true, message: 'Maintenance notifications sent successfully' };
  }

  @Get('maintenance/analytics')
  async getMaintenanceAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' = '30d') {
    return this.maintenanceService.getMaintenanceAnalytics(timeRange);
  }
}