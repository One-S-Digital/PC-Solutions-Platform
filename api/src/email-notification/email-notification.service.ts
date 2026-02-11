import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailTemplateService } from './email-template.service';
import * as sgMail from '@sendgrid/mail';

export interface EmailNotification {
  event: string;
  recipient: string;
  recipientName?: string;
  payload: any;
  templateId?: string;
  scheduledAt?: Date;
  priority?: 'low' | 'normal' | 'high';
  /**
   * Allows sending to recipients that are not yet platform users.
   * Useful for transactional emails sent before account creation.
   */
  allowUnknownRecipient?: boolean;
  /**
   * When true, skips user notification preference checks.
   * Intended for mandatory transactional communications.
   */
  bypassPreferences?: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  category: string;
  isActive: boolean;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  categories: {
    authentication: boolean;
    userManagement: boolean;
    jobRecruitment: boolean;
    messaging: boolean;
    marketplace: boolean;
    leadManagement: boolean;
    subscription: boolean;
    contentModeration: boolean;
    systemAdmin: boolean;
    marketing: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private emailTemplateService: EmailTemplateService,
  ) {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  async sendNotification(notification: EmailNotification): Promise<boolean> {
    let user: any = null;
    let template: any = null;
    
    try {
      // Check if user has email notifications enabled
      user = await this.prisma.user.findUnique({
        where: { email: notification.recipient },
        include: { notificationPreferences: true },
      });

      if (!user) {
        if (!notification.allowUnknownRecipient) {
          this.logger.warn(`User not found for email: ${notification.recipient}`);
          return false;
        }
        this.logger.log(`Sending transactional email to non-user recipient: ${notification.recipient}`);
      }

      // Check notification preferences
      if (user && !notification.bypassPreferences && !this.shouldSendNotification(user, notification.event)) {
        this.logger.log(`Notification skipped for user ${user.id} due to preferences`);
        return false;
      }

      // Get email template
      template = await this.emailTemplateService.getTemplate(notification.event);
      if (!template) {
        this.logger.error(`No template found for event: ${notification.event}`);
        return false;
      }

      // Prepare email data
      const emailData = {
        to: notification.recipient,
        from: {
          email: process.env.FROM_EMAIL || 'noreply@procreche.ch',
          name: process.env.FROM_NAME || 'Pro Crèche Solutions',
        },
        subject: this.processTemplate(template.subject, notification.payload),
        html: this.processTemplate(template.htmlContent, notification.payload),
        text: this.processTemplate(template.textContent, notification.payload),
        templateId: template.id,
        categories: [notification.event],
        customArgs: {
          event: notification.event,
          ...(user?.id ? { userId: user.id } : {}),
        },
      };

      // Send email via SendGrid
      const response = await sgMail.send(emailData);
      
      // Log the email
      await this.logEmail({
        userId: user?.id,
        event: notification.event,
        recipient: notification.recipient,
        templateId: template.id,
        messageId: response[0].headers['x-message-id'] as string,
        status: 'sent',
        payload: notification.payload,
      });

      this.logger.log(`Email sent successfully to ${notification.recipient} for event ${notification.event}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to send email notification: ${(error as Error).message}`, (error as Error).stack);
      
      // Log failed email
      await this.logEmail({
        userId: user?.id || null,
        event: notification.event,
        recipient: notification.recipient,
        templateId: template?.id || null,
        messageId: null,
        status: 'failed',
        payload: notification.payload,
        error: (error as Error).message,
      });

      return false;
    }
  }

  async sendBulkNotification(
    recipients: string[],
    event: string,
    payload: any,
    scheduledAt?: Date
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const success = await this.sendNotification({
        event,
        recipient,
        payload,
        scheduledAt,
      });
      
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  }

  async scheduleNotification(
    notification: EmailNotification,
    scheduledAt: Date
  ): Promise<void> {
    await this.prisma.scheduledEmail.create({
      data: {
        event: notification.event,
        recipient: notification.recipient,
        payload: notification.payload,
        scheduledAt,
        status: 'pending',
      },
    });
  }

  async processScheduledEmails(): Promise<void> {
    const now = new Date();
    const scheduledEmails = await this.prisma.scheduledEmail.findMany({
      where: {
        scheduledAt: { lte: now },
        status: 'pending',
      },
    });

    for (const email of scheduledEmails) {
      await this.sendNotification({
        event: email.event,
        recipient: email.recipient,
        payload: email.payload,
      });

      await this.prisma.scheduledEmail.update({
        where: { id: email.id },
        data: { status: 'sent' },
      });
    }
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    await this.prisma.userNotificationPreferences.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences,
      },
    });
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    const preferences = await this.prisma.userNotificationPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Return default preferences
      return {
        userId,
        emailNotifications: true,
        categories: {
          authentication: true, // Mandatory
          userManagement: true,
          jobRecruitment: true,
          messaging: true,
          marketplace: true,
          leadManagement: true,
          subscription: true, // Mandatory
          contentModeration: true,
          systemAdmin: true,
          marketing: true,
        },
        frequency: 'immediate',
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
      };
    }

    return preferences as unknown as NotificationPreferences;
  }

  async getEmailAnalytics(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<any> {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalSent, totalDelivered, totalOpened, totalClicked, eventsBreakdown] = await Promise.all([
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: startDate },
          status: 'sent',
        },
      }),
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: startDate },
          status: 'delivered',
        },
      }),
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: startDate },
          status: 'opened',
        },
      }),
      this.prisma.emailLog.count({
        where: {
          createdAt: { gte: startDate },
          status: 'clicked',
        },
      }),
      this.prisma.emailLog.groupBy({
        by: ['event'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: { id: true },
      }),
    ]);

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      eventsBreakdown: eventsBreakdown.map(item => ({
        event: item.event,
        count: item._count.id,
      })),
    };
  }

  private shouldSendNotification(user: any, event: string): boolean {
    if (!user.notificationPreferences?.emailNotifications) {
      return false;
    }

    // Mandatory notifications (authentication, subscription, security)
    const mandatoryEvents = [
      'account_verification',
      'password_reset',
      'login_alert',
      'security_breach',
      'subscription_payment_failed',
      'subscription_cancellation',
    ];

    if (mandatoryEvents.includes(event)) {
      return true;
    }

    // Check category preferences
    const categoryMap = {
      authentication: ['account_verification', 'password_reset', 'login_alert', 'security_breach'],
      userManagement: ['welcome_email', 'profile_update', 'role_change', 'account_suspension'],
      jobRecruitment: ['job_application_received', 'application_status_update', 'job_match'],
      messaging: ['new_message', 'group_message', 'message_mention'],
      marketplace: ['order_confirmation', 'order_status_update', 'payment_confirmation'],
      leadManagement: ['lead_assignment', 'lead_status_update', 'follow_up_reminder', 'parent_lead_confirmation'],
      subscription: ['subscription_activation', 'payment_reminder', 'subscription_change'],
      contentModeration: ['content_approval', 'content_flagged', 'moderation_required'],
      systemAdmin: ['system_maintenance', 'system_alert', 'security_alert'],
      marketing: ['newsletter', 'promotion', 'feature_update'],
    };

    for (const [category, events] of Object.entries(categoryMap)) {
      if (events.includes(event)) {
        return user.notificationPreferences?.categories?.[category] !== false;
      }
    }

    return true; // Default to sending if category not found
  }

  private processTemplate(template: string, payload: any): string {
    let processed = template;
    
    // Replace template variables
    Object.keys(payload).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, payload[key] || '');
    });

    return processed;
  }

  private async logEmail(data: {
    userId?: string;
    event: string;
    recipient: string;
    templateId?: string;
    messageId?: string;
    status: string;
    payload: any;
    error?: string;
  }): Promise<void> {
    await this.prisma.emailLog.create({
      data: {
        userId: data.userId,
        event: data.event,
        recipient: data.recipient,
        templateId: data.templateId,
        messageId: data.messageId,
        status: data.status,
        payload: data.payload,
        error: data.error,
      },
    });
  }
}