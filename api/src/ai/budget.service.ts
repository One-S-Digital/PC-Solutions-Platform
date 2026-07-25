import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentConfig } from './ai-agents.config';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkAndEnforce(config: AgentConfig): Promise<void> {
    if (!config.dailyTokenBudget) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const rows = await this.prisma.aiAuditLog.findMany({
      where: { agentName: config.name, createdAt: { gte: todayStart }, cacheHit: false },
      select: { tokenUsage: true },
    });

    const totalTokens = rows.reduce((sum, r) => {
      const usage = r.tokenUsage as { input?: number; output?: number };
      return sum + (usage.input || 0) + (usage.output || 0);
    }, 0);

    const ratio = totalTokens / config.dailyTokenBudget;

    if (ratio >= 1.0) {
      this.logger.error(
        `Agent "${config.name}" daily token budget exhausted (${totalTokens}/${config.dailyTokenBudget})`,
      );
      throw new ServiceUnavailableException(
        `AI agent "${config.name}" has reached its daily token budget. Please try again tomorrow.`,
      );
    }

    if (ratio >= 0.7) {
      this.logger.warn(
        `Agent "${config.name}" at ${Math.round(ratio * 100)}% of daily token budget`,
      );
    }
  }
}
