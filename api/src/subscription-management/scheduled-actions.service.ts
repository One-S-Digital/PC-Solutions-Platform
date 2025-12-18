import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger.service';
import { SubscriptionManagementService } from './subscription-management.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScheduledActionsService implements OnModuleInit {
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly subscriptionService: SubscriptionManagementService,
  ) {}

  onModuleInit() {
    this.logger.log('ScheduledActionsService initialized');
  }

  /**
   * Process scheduled subscription actions every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledActions(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Scheduled actions processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    try {
      const now = new Date();
      
      // Find all due scheduled actions
      const dueSchedules = await this.prisma.subscriptionSchedule.findMany({
        where: {
          isProcessed: false,
          scheduledDate: { lte: now },
        },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
        orderBy: { scheduledDate: 'asc' },
      });

      this.logger.log(`Found ${dueSchedules.length} scheduled actions to process`);

      for (const schedule of dueSchedules) {
        try {
          await this.executeScheduledAction(schedule);
          
          // Mark as processed
          await this.prisma.subscriptionSchedule.update({
            where: { id: schedule.id },
            data: {
              isProcessed: true,
              processedAt: new Date(),
            },
          });

          this.logger.log(
            `Processed scheduled action ${schedule.id}: ${schedule.scheduledAction} for subscription ${schedule.subscriptionId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process scheduled action ${schedule.id}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process scheduled actions: ${(error as Error).message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single scheduled action
   */
  private async executeScheduledAction(schedule: any): Promise<void> {
    const { subscriptionId, scheduledAction, targetPlanId, createdBy } = schedule;

    switch (scheduledAction) {
      case 'ACTIVATE':
        await this.subscriptionService.activateSubscription(
          subscriptionId,
          {},
          createdBy,
        );
        break;

      case 'CANCEL':
        await this.subscriptionService.cancelSubscription(
          subscriptionId,
          { immediate: true, reason: 'Scheduled cancellation' },
          createdBy,
        );
        break;

      case 'PAUSE':
        await this.subscriptionService.pauseSubscription(
          subscriptionId,
          { reason: 'Scheduled pause' },
          createdBy,
        );
        break;

      case 'RESUME':
        await this.subscriptionService.resumeSubscription(
          subscriptionId,
          {},
          createdBy,
        );
        break;

      case 'UPGRADE':
        if (!targetPlanId) {
          throw new Error('Target plan ID required for upgrade');
        }
        await this.subscriptionService.upgradeSubscription(
          subscriptionId,
          { newPlanId: targetPlanId, immediate: true },
          createdBy,
        );
        break;

      case 'DOWNGRADE':
        if (!targetPlanId) {
          throw new Error('Target plan ID required for downgrade');
        }
        await this.subscriptionService.downgradeSubscription(
          subscriptionId,
          { newPlanId: targetPlanId, immediate: true },
          createdBy,
        );
        break;

      default:
        throw new Error(`Unknown scheduled action: ${scheduledAction}`);
    }
  }

  /**
   * Process trial expirations daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processTrialExpirations(): Promise<void> {
    try {
      const now = new Date();

      // Find all expired trials
      const expiredTrials = await this.prisma.subscription.findMany({
        where: {
          status: 'TRIAL',
          trialEnd: { lte: now },
        },
        include: { plan: true },
      });

      this.logger.log(`Found ${expiredTrials.length} expired trials to process`);

      for (const subscription of expiredTrials) {
        try {
          // Activate the subscription (move from trial to active)
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'ACTIVE',
              currentPeriodStart: now,
              currentPeriodEnd: this.calculatePeriodEnd(now, subscription.plan.billingPeriod),
            },
          });

          // Log the action
          await this.prisma.subscriptionAction.create({
            data: {
              subscriptionId: subscription.id,
              action: 'TRIAL_END',
              previousStatus: 'TRIAL',
              newStatus: 'ACTIVE',
              performedBy: 'system',
              reason: 'Trial period ended',
            },
          });

          this.logger.log(`Trial ended for subscription ${subscription.id}, moved to ACTIVE`);
        } catch (error) {
          this.logger.error(
            `Failed to process trial expiration for ${subscription.id}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process trial expirations: ${(error as Error).message}`);
    }
  }

  /**
   * Process subscription expirations daily at 1 AM
   */
  @Cron('0 1 * * *')
  async processSubscriptionExpirations(): Promise<void> {
    try {
      const now = new Date();

      // Find all expired subscriptions
      const expiredSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: { lte: now },
          cancelAtPeriodEnd: true,
        },
      });

      this.logger.log(`Found ${expiredSubscriptions.length} subscriptions to expire`);

      for (const subscription of expiredSubscriptions) {
        try {
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'EXPIRED',
            },
          });

          // Log the action
          await this.prisma.subscriptionAction.create({
            data: {
              subscriptionId: subscription.id,
              action: 'EXPIRE',
              previousStatus: 'ACTIVE',
              newStatus: 'EXPIRED',
              performedBy: 'system',
              reason: 'Subscription period ended with cancellation scheduled',
            },
          });

          this.logger.log(`Expired subscription ${subscription.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to expire subscription ${subscription.id}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process subscription expirations: ${(error as Error).message}`);
    }
  }

  /**
   * Process automatic renewals daily at 2 AM
   */
  @Cron('0 2 * * *')
  async processAutoRenewals(): Promise<void> {
    try {
      const now = new Date();

      // Find all subscriptions that need renewal
      const toRenew = await this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: { lte: now },
          cancelAtPeriodEnd: false,
          isManual: true, // Only process manual subscriptions (Stripe handles its own)
        },
        include: { plan: true },
      });

      this.logger.log(`Found ${toRenew.length} subscriptions to auto-renew`);

      for (const subscription of toRenew) {
        try {
          const newPeriodEnd = this.calculatePeriodEnd(now, subscription.plan.billingPeriod);

          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              currentPeriodStart: now,
              currentPeriodEnd: newPeriodEnd,
            },
          });

          // Log the action
          await this.prisma.subscriptionAction.create({
            data: {
              subscriptionId: subscription.id,
              action: 'AUTO_RENEW',
              previousStatus: 'ACTIVE',
              newStatus: 'ACTIVE',
              performedBy: 'system',
              reason: 'Automatic renewal',
            },
          });

          this.logger.log(`Auto-renewed subscription ${subscription.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to auto-renew subscription ${subscription.id}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process auto-renewals: ${(error as Error).message}`);
    }
  }

  /**
   * Process paused subscriptions that should auto-resume
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processAutoResume(): Promise<void> {
    try {
      const now = new Date();

      // Find all paused subscriptions with resumeUntil date passed
      const toResume = await this.prisma.subscription.findMany({
        where: {
          status: 'PAUSED',
          pausedUntil: { lte: now },
        },
      });

      this.logger.log(`Found ${toResume.length} subscriptions to auto-resume`);

      for (const subscription of toResume) {
        try {
          await this.subscriptionService.resumeSubscription(
            subscription.id,
            { extendPeriod: true },
            'system',
          );

          this.logger.log(`Auto-resumed subscription ${subscription.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to auto-resume subscription ${subscription.id}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process auto-resume: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate period end date based on billing period
   */
  private calculatePeriodEnd(startDate: Date, billingPeriod: string): Date {
    const endDate = new Date(startDate);
    
    switch (billingPeriod) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }
    
    return endDate;
  }

  /**
   * Manual trigger for processing scheduled actions (for testing/admin use)
   */
  async triggerProcessScheduledActions(): Promise<{ processed: number }> {
    await this.processScheduledActions();
    return { processed: 0 }; // Would need to track actual count
  }
}
