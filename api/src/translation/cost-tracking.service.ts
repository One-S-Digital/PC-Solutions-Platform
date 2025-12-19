import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

// DeepL pricing (as of 2024): ~€20 per 1M characters
const DEEPL_COST_PER_CHAR = 0.00002; // €0.00002 per character

// Alert thresholds
const ALERT_THRESHOLD_WARNING = 80; // 80% of budget
const ALERT_THRESHOLD_CRITICAL = 100; // 100% of budget

// Cooldown to avoid spam (1 alert per threshold per day)
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

interface BudgetAlert {
  type: 'warning' | 'critical';
  percentage: number;
  used: number;
  budget: number;
  timestamp: Date;
}

@Injectable()
export class CostTrackingService {
  private readonly logger = new Logger(CostTrackingService.name);
  private readonly monthlyBudget: number;
  private readonly alertEmail: string | undefined;
  private lastAlertTime: { warning?: Date; critical?: Date } = {};

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.monthlyBudget = parseFloat(
      this.configService.get<string>('MT_MONTHLY_BUDGET_CHF', '500'),
    );
    this.alertEmail = this.configService.get<string>('MT_ALERT_EMAIL');
    
    if (this.alertEmail) {
      this.logger.log(`Budget alerts will be sent to: ${this.alertEmail}`);
    } else {
      this.logger.warn('MT_ALERT_EMAIL not configured - budget alerts will only be logged');
    }
  }

  /**
   * Track MT API usage and cost
   */
  async trackUsage(
    provider: string,
    sourceLang: string,
    targetLang: string,
    characters: number,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cost = this.calculateCost(provider, characters);

    await this.prisma.mTCostTracking.upsert({
      where: {
        date_provider_sourceLang_targetLang: {
          date: today,
          provider,
          sourceLang,
          targetLang,
        },
      },
      update: {
        characters: { increment: characters },
        cost: { increment: cost },
        jobCount: { increment: 1 },
      },
      create: {
        date: today,
        provider,
        sourceLang,
        targetLang,
        characters,
        cost,
        jobCount: 1,
      },
    });

    // Check budget and alert if needed
    await this.checkBudget();
  }

  /**
   * Get monthly usage and cost
   */
  async getMonthlyUsage(month?: Date): Promise<{
    totalCharacters: number;
    totalCost: number;
    byProvider: Record<string, { characters: number; cost: number }>;
  }> {
    const startDate = month || new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const records = await this.prisma.mTCostTracking.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    const totalCharacters = records.reduce((sum, r) => sum + r.characters, 0);
    const totalCost = records.reduce((sum, r) => sum + Number(r.cost), 0);

    const byProvider = records.reduce(
      (acc, r) => {
        if (!acc[r.provider]) {
          acc[r.provider] = { characters: 0, cost: 0 };
        }
        acc[r.provider].characters += r.characters;
        acc[r.provider].cost += Number(r.cost);
        return acc;
      },
      {} as Record<string, { characters: number; cost: number }>,
    );

    return { totalCharacters, totalCost, byProvider };
  }

  /**
   * Check if monthly budget is exceeded and send alerts
   */
  private async checkBudget(): Promise<void> {
    const usage = await this.getMonthlyUsage();
    const percentage = (usage.totalCost / this.monthlyBudget) * 100;

    if (percentage >= ALERT_THRESHOLD_CRITICAL) {
      await this.sendBudgetAlert({
        type: 'critical',
        percentage,
        used: usage.totalCost,
        budget: this.monthlyBudget,
        timestamp: new Date(),
      });
    } else if (percentage >= ALERT_THRESHOLD_WARNING) {
      await this.sendBudgetAlert({
        type: 'warning',
        percentage,
        used: usage.totalCost,
        budget: this.monthlyBudget,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Send budget alert with cooldown to avoid spam
   */
  private async sendBudgetAlert(alert: BudgetAlert): Promise<void> {
    // Check cooldown
    const lastAlert = this.lastAlertTime[alert.type];
    if (lastAlert && Date.now() - lastAlert.getTime() < ALERT_COOLDOWN_MS) {
      return; // Still in cooldown period
    }

    // Update last alert time
    this.lastAlertTime[alert.type] = new Date();

    const message = alert.type === 'critical'
      ? `🚨 CRITICAL: MT budget EXCEEDED! Used: CHF ${alert.used.toFixed(2)} / CHF ${alert.budget} (${alert.percentage.toFixed(1)}%)`
      : `⚠️ WARNING: MT budget at ${alert.percentage.toFixed(1)}%. Used: CHF ${alert.used.toFixed(2)} / CHF ${alert.budget}`;

    // Always log
    if (alert.type === 'critical') {
      this.logger.error(message);
    } else {
      this.logger.warn(message);
    }

    // Save alert to database for admin dashboard
    await this.saveBudgetAlert(alert);

    // Write to alert file (can be monitored by external systems)
    await this.writeAlertToFile(alert, message);

    // If email is configured, queue it (would need email service integration)
    if (this.alertEmail) {
      this.logger.log(`📧 Budget alert would be sent to: ${this.alertEmail}`);
      // TODO: Integrate with your email service
      // await this.emailService.sendBudgetAlert(this.alertEmail, alert);
    }
  }

  /**
   * Save budget alert to database
   */
  private async saveBudgetAlert(alert: BudgetAlert): Promise<void> {
    try {
      await this.prisma.translationAuditLog.create({
        data: {
          type: 'static',
          action: `budget_${alert.type}`,
          lang: 'all',
          userId: 'system',
          oldValue: JSON.stringify({
            percentage: alert.percentage,
            used: alert.used,
            budget: alert.budget,
          }),
          newValue: null,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to save budget alert: ${error.message}`);
    }
  }

  /**
   * Write alert to file for external monitoring
   */
  private async writeAlertToFile(alert: BudgetAlert, message: string): Promise<void> {
    try {
      const alertsDir = path.join(process.cwd(), 'logs');
      const alertsFile = path.join(alertsDir, 'budget-alerts.log');
      
      // Ensure logs directory exists
      if (!fs.existsSync(alertsDir)) {
        fs.mkdirSync(alertsDir, { recursive: true });
      }
      
      const logEntry = `[${alert.timestamp.toISOString()}] ${message}\n`;
      fs.appendFileSync(alertsFile, logEntry, 'utf8');
    } catch (error: any) {
      this.logger.warn(`Failed to write alert to file: ${error.message}`);
    }
  }

  /**
   * Get budget status for admin dashboard
   */
  async getBudgetStatus(): Promise<{
    used: number;
    budget: number;
    percentage: number;
    status: 'ok' | 'warning' | 'critical';
    recentAlerts: any[];
  }> {
    const usage = await this.getMonthlyUsage();
    const percentage = (usage.totalCost / this.monthlyBudget) * 100;
    
    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (percentage >= ALERT_THRESHOLD_CRITICAL) {
      status = 'critical';
    } else if (percentage >= ALERT_THRESHOLD_WARNING) {
      status = 'warning';
    }

    // Get recent budget alerts from audit log
    const recentAlerts = await this.prisma.translationAuditLog.findMany({
      where: {
        action: { startsWith: 'budget_' },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      used: usage.totalCost,
      budget: this.monthlyBudget,
      percentage,
      status,
      recentAlerts,
    };
  }

  private calculateCost(provider: string, characters: number): number {
    // Convert to CHF (assuming 1 EUR = 0.95 CHF)
    if (provider === 'deepl') {
      return characters * DEEPL_COST_PER_CHAR * 0.95;
    }
    // Add other providers as needed
    return 0;
  }
}

