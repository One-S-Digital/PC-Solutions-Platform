import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateCostUsd } from './model-costs';

export interface AuditEntry {
  agentName: string;
  promptVersion: string;
  model: string;
  fallbackUsed: boolean;
  inputHash: string;
  outputHash?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  cacheHit: boolean;
  principalId?: string;
  organizationId?: string;
  entityRef?: string;
  retrievedDocIds?: string[];
  agentRunId?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    const costUsd = calculateCostUsd(entry.model, entry.inputTokens, entry.outputTokens);
    await this.prisma.aiAuditLog.create({
      data: {
        agentName: entry.agentName,
        promptVersion: entry.promptVersion,
        model: entry.model,
        fallbackUsed: entry.fallbackUsed,
        inputHash: entry.inputHash,
        outputHash: entry.outputHash,
        tokenUsage: { input: entry.inputTokens, output: entry.outputTokens },
        costUsd,
        latencyMs: entry.latencyMs,
        cacheHit: entry.cacheHit,
        principalId: entry.principalId,
        organizationId: entry.organizationId,
        entityRef: entry.entityRef,
        retrievedDocIds: entry.retrievedDocIds || [],
        agentRunId: entry.agentRunId,
      },
    });
  }

  async startRun(
    orchestration: string,
    principalId?: string,
    organizationId?: string,
    entityRef?: string,
  ): Promise<string> {
    const run = await this.prisma.aiAgentRun.create({
      data: { orchestration, principalId, organizationId, entityRef, status: 'running' },
    });
    return run.id;
  }

  async completeRun(id: string, status: 'completed' | 'failed' = 'completed'): Promise<void> {
    await this.prisma.aiAgentRun.update({
      where: { id },
      data: { status, completedAt: new Date() },
    });
  }
}
