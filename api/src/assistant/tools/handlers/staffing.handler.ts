import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AssistantPrincipal,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/** Staffing match explanations. */
@Injectable()
export class StaffingHandler implements ToolHandler {
  readonly toolNames = ['explain_match'];

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    _toolName: string,
    args: Record<string, unknown>,
    _principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const match = await this.prisma.matchResult.findUnique({
      where: { id: args.matchResultId as string },
      select: { explanation: true, totalScore: true },
    });
    return {
      data: {
        explanation: match?.explanation ?? 'No explanation available.',
        score: match?.totalScore ?? null,
      },
      total: match ? 1 : 0,
    };
  }
}
