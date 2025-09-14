import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { EmailNotificationService, EmailNotification, NotificationPreferences } from './email-notification.service';
import { EmailTemplateService } from './email-template.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/email-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class EmailNotificationController {
  constructor(
    private readonly emailNotificationService: EmailNotificationService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  @Post('send')
  async sendNotification(@Body() notification: EmailNotification) {
    const success = await this.emailNotificationService.sendNotification(notification);
    return { success, message: success ? 'Email sent successfully' : 'Failed to send email' };
  }

  @Post('bulk-send')
  async sendBulkNotification(
    @Body() body: {
      recipients: string[];
      event: string;
      payload: any;
      scheduledAt?: string;
    }
  ) {
    const result = await this.emailNotificationService.sendBulkNotification(
      body.recipients,
      body.event,
      body.payload,
      body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    );
    return result;
  }

  @Post('schedule')
  async scheduleNotification(
    @Body() body: {
      notification: EmailNotification;
      scheduledAt: string;
    }
  ) {
    await this.emailNotificationService.scheduleNotification(
      body.notification,
      new Date(body.scheduledAt),
    );
    return { success: true, message: 'Email scheduled successfully' };
  }

  @Post('process-scheduled')
  async processScheduledEmails() {
    await this.emailNotificationService.processScheduledEmails();
    return { success: true, message: 'Scheduled emails processed' };
  }

  @Get('analytics')
  async getEmailAnalytics(@Query('timeRange') timeRange: '7d' | '30d' | '90d' = '30d') {
    return this.emailNotificationService.getEmailAnalytics(timeRange);
  }

  @Get('templates')
  async getAllTemplates() {
    return this.emailTemplateService.getAllTemplates();
  }

  @Post('templates')
  async createTemplate(@Body() templateData: any) {
    return this.emailTemplateService.createTemplate(templateData);
  }

  @Put('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() templateData: any) {
    return this.emailTemplateService.updateTemplate(id, templateData);
  }

  @Get('preferences/:userId')
  async getNotificationPreferences(@Param('userId') userId: string) {
    return this.emailNotificationService.getNotificationPreferences(userId);
  }

  @Put('preferences/:userId')
  async updateNotificationPreferences(
    @Param('userId') userId: string,
    @Body() preferences: Partial<NotificationPreferences>,
  ) {
    await this.emailNotificationService.updateNotificationPreferences(userId, preferences);
    return { success: true, message: 'Preferences updated successfully' };
  }
}