import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// DeepL pricing (as of 2024): ~€20 per 1M characters
const DEEPL_COST_PER_CHAR = 0.00002; // €0.00002 per character

@Injectable()
export class CostTrackingService {
  private readonly logger = new Logger(CostTrackingService.name);
  private readonly monthlyBudget: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.monthlyBudget = parseFloat(
      this.configService.get<string>('MT_MONTHLY_BUDGET_CHF', '500'),
    );
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
   * Check if monthly budget is exceeded
   */
  private async checkBudget(): Promise<void> {
    const usage = await this.getMonthlyUsage();
    const percentage = (usage.totalCost / this.monthlyBudget) * 100;

    if (percentage >= 100) {
      this.logger.error(
        `MT budget exceeded! Used: CHF ${usage.totalCost.toFixed(2)} / CHF ${this.monthlyBudget}`,
      );
      // TODO: Send alert (email, Slack, etc.)
    } else if (percentage >= 80) {
      this.logger.warn(
        `MT budget at ${percentage.toFixed(1)}%: CHF ${usage.totalCost.toFixed(2)} / CHF ${this.monthlyBudget}`,
      );
      // TODO: Send warning alert
    }
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

