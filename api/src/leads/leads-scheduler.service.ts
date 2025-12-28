import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationService } from '../email-notification/email-notification.service';

/**
 * LeadsSchedulerService handles automated lead distribution and notifications.
 * 
 * Features:
 * - Automatically distributes new leads to matching foundations
 * - Sends notifications to foundations about new leads
 * - Runs on a configurable schedule (default: every 10 minutes)
 */
@Injectable()
export class LeadsSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(LeadsSchedulerService.name);
  private isProcessing = false;
  private isEnabled = true;

  constructor(
    private readonly leadsService: LeadsService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailNotificationService,
  ) {}

  onModuleInit() {
    // Validate required environment variable
    if (!process.env.FRONTEND_URL) {
      const message = 'FRONTEND_URL environment variable is not set - email links will not work correctly';
      this.logger.error(message);
      // Disable the service but don't crash the application
      // The FRONTEND_URL should be configured in the deployment environment
      this.isEnabled = false;
      this.logger.warn('LeadsSchedulerService is disabled due to missing FRONTEND_URL configuration');
      return;
    }
    this.logger.log('LeadsSchedulerService initialized - automated lead distribution enabled');
  }

  /**
   * Distribute new leads to matching foundations every 10 minutes.
   * This finds unassigned leads and matches them with appropriate foundations.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async processNewLeads(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    if (this.isProcessing) {
      this.logger.warn('Lead distribution already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    try {
      this.logger.log('Starting automated lead distribution...');

      // Get all new/unassigned leads
      const newLeads = await this.prisma.parentLead.findMany({
        where: {
          status: 'NEW',
          foundationId: null,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (newLeads.length === 0) {
        this.logger.log('No new leads to distribute');
        return;
      }

      this.logger.log(`Found ${newLeads.length} new leads to distribute`);

      let distributed = 0;
      let failed = 0;

      for (const lead of newLeads) {
        try {
          // Find matching foundations
          const matchingFoundations = await this.leadsService.findMatchingFoundations(lead.id);

          if (matchingFoundations.length === 0) {
            this.logger.warn(`No matching foundations found for lead ${lead.id}`);
            continue;
          }

          // Notify top matching foundations (up to 5)
          const topMatches = matchingFoundations.slice(0, 5);
          
          for (const foundation of topMatches) {
            try {
              // Notify foundation of new lead
              await this.notifyFoundationOfLead(foundation.id, lead);
            } catch (notifyError) {
              this.logger.error(
                `Failed to notify foundation ${foundation.id} of lead ${lead.id}: ${(notifyError as Error).message}`,
              );
            }
          }

          // Update lead status to indicate it's been processed
          await this.prisma.parentLead.update({
            where: { id: lead.id },
            data: {
              status: 'PROCESSING',
            },
          });

          distributed++;
          this.logger.log(`Distributed lead ${lead.id} to ${topMatches.length} foundations`);
        } catch (error) {
          failed++;
          this.logger.error(`Failed to distribute lead ${lead.id}: ${(error as Error).message}`);
        }
      }

      this.logger.log(`Lead distribution complete: ${distributed} distributed, ${failed} failed`);
    } catch (error) {
      this.logger.error(`Lead distribution failed: ${(error as Error).message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send notification to a foundation about a new lead.
   */
  private async notifyFoundationOfLead(
    foundationId: string,
    lead: {
      id: string;
      parentName: string | null;
      childAge: number | null;
      preferredLocation: string | null;
      message: string | null;
    },
  ): Promise<void> {
    // Get foundation details
    const foundation = await this.prisma.organization.findUnique({
      where: { id: foundationId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!foundation) {
      throw new Error(`Foundation ${foundationId} not found`);
    }

    // Get foundation admin/contact emails
    const adminEmails = foundation.members
      .filter((m) => m.user.email)
      .map((m) => m.user.email!)
      .slice(0, 3); // Limit to 3 contacts

    if (adminEmails.length === 0) {
      this.logger.warn(`No contact emails found for foundation ${foundationId}`);
      return;
    }

    // Send notification email to each admin
    for (const email of adminEmails) {
      try {
        await this.emailService.sendNotification({
          event: 'new_lead',
          recipient: email,
          payload: {
            foundationName: foundation.name,
            parentName: lead.parentName,
            childAge: lead.childAge,
            location: lead.preferredLocation || 'Not specified',
            message: lead.message || 'No additional message',
            leadUrl: `${process.env.FRONTEND_URL}/foundation/leads`,
          },
        });
        this.logger.log(`Sent lead notification to ${email} for foundation ${foundationId}`);
      } catch (emailError) {
        this.logger.error(`Failed to send email to ${email}: ${(emailError as Error).message}`);
      }
    }
  }

  /**
   * Clean up old leads that have been pending for too long.
   * Includes both NEW leads that were never distributed and PROCESSING leads
   * that were distributed but never received a response.
   * Runs daily at 3 AM.
   */
  @Cron('0 3 * * *')
  async cleanupOldLeads(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Mark very old leads as closed if no activity (includes both NEW and PROCESSING)
      const result = await this.prisma.parentLead.updateMany({
        where: {
          status: { in: ['NEW', 'PROCESSING'] },
          createdAt: { lt: thirtyDaysAgo },
        },
        data: {
          status: 'CLOSED_NO_RESPONSE',
        },
      });

      if (result.count > 0) {
        this.logger.log(`Marked ${result.count} stale leads (NEW/PROCESSING) as closed due to no response`);
      }
    } catch (error) {
      this.logger.error(`Lead cleanup failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate lead statistics report.
   * Runs daily at 6 AM.
   */
  @Cron('0 6 * * *')
  async generateDailyStats(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      const stats = await this.leadsService.getLeadsStats();
      this.logger.log(
        `Daily Lead Stats: Total=${stats.totalLeads}, New=${stats.newLeads}, ` +
        `Assigned=${stats.assignedLeads}, Converted=${stats.convertedLeads}, ` +
        `Conversion Rate=${stats.conversionRate.toFixed(2)}%`,
      );
    } catch (error) {
      this.logger.error(`Failed to generate daily stats: ${(error as Error).message}`);
    }
  }

  /**
   * Manual trigger for lead distribution (for admin/testing purposes).
   * Returns information about the distribution run.
   */
  async triggerLeadDistribution(): Promise<{
    remainingNew: number;
    totalProcessing: number;
    distributionRan: boolean;
  }> {
    // Check if service is enabled
    if (!this.isEnabled) {
      this.logger.warn('Lead distribution is disabled due to missing configuration');
      const [remainingNew, totalProcessing] = await Promise.all([
        this.prisma.parentLead.count({ where: { status: 'NEW' } }),
        this.prisma.parentLead.count({ where: { status: 'PROCESSING' } }),
      ]);
      return {
        remainingNew,
        totalProcessing,
        distributionRan: false,
      };
    }

    // Check if already processing to avoid race condition
    if (this.isProcessing) {
      const [remainingNew, totalProcessing] = await Promise.all([
        this.prisma.parentLead.count({ where: { status: 'NEW' } }),
        this.prisma.parentLead.count({ where: { status: 'PROCESSING' } }),
      ]);

      return {
        remainingNew,
        totalProcessing,
        distributionRan: false,
      };
    }

    await this.processNewLeads();

    // Return counts after distribution
    const [remainingNew, totalProcessing] = await Promise.all([
      this.prisma.parentLead.count({ where: { status: 'NEW' } }),
      this.prisma.parentLead.count({ where: { status: 'PROCESSING' } }),
    ]);

    return {
      remainingNew,
      totalProcessing,
      distributionRan: true,
    };
  }
}
