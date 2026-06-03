import { Injectable } from '@nestjs/common';
import { UrgencyLevel } from '@prisma/client';
import { ReplacementsService } from '../../../replacements/replacements.service';
import {
  AssistantPrincipal,
  resolveOnBehalfOrgId,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/**
 * L3 replacement request creation. A foundation (or admin on its behalf) opens a
 * replacement request for a date range/role. Executes only after confirmation.
 */
@Injectable()
export class ReplacementsHandler implements ToolHandler {
  readonly toolNames = ['create_replacement_request'];

  constructor(private readonly replacements: ReplacementsService) {}

  async execute(
    _toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const foundationId = resolveOnBehalfOrgId(args, principal);
    if (!foundationId) {
      throw new Error('A foundationId is required to create a replacement request.');
    }
    const startDate = (args.startDate as string) || undefined;
    const endDate = (args.endDate as string) || startDate;
    const role = (args.role as string) || undefined;
    if (!startDate) throw new Error('A start date is required.');
    if (!role) throw new Error('A role is required.');

    // Validate the optional urgency against the enum so a bad LLM value yields a
    // clear message instead of an opaque Prisma error.
    let urgency: UrgencyLevel | undefined;
    if (args.urgency != null && String(args.urgency).trim() !== '') {
      const raw = String(args.urgency).toUpperCase();
      const valid = Object.values(UrgencyLevel) as string[];
      if (!valid.includes(raw)) {
        throw new Error(`Invalid urgency "${raw}". Must be one of: ${valid.join(', ')}.`);
      }
      urgency = raw as UrgencyLevel;
    }

    const request = await this.replacements.createRequest(
      {
        startDate,
        endDate: endDate as string,
        role,
        shiftStart: (args.shiftStart as string) || undefined,
        shiftEnd: (args.shiftEnd as string) || undefined,
        description: (args.description as string) || undefined,
        location: (args.location as string) || undefined,
        urgency,
      },
      foundationId,
      principal.userId,
    );
    return {
      data: { id: request.id, status: request.status, role, startDate, endDate },
      total: 1,
    };
  }
}
