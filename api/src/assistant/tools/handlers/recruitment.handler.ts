import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AssistantPrincipal,
  resolveLimit,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/** Educator-facing recruitment reads. */
@Injectable()
export class RecruitmentReadHandler implements ToolHandler {
  readonly toolNames = ['get_my_applications'];

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    _toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const limit = resolveLimit(args.limit);
    const where: Record<string, unknown> = { candidateId: principal.userId };
    if (args.status) where.status = args.status;
    const applications = await this.prisma.jobApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        createdAt: true,
        jobListing: { select: { title: true, location: true, contractType: true } },
      },
    });
    return { data: { applications }, total: applications.length };
  }
}
