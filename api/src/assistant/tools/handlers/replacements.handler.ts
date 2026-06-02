import { Injectable } from '@nestjs/common';
import { ReplacementsService } from '../../../replacements/replacements.service';
import {
  AssistantPrincipal,
  isAdminRole,
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
    const foundationId =
      (args.foundationId as string) ||
      (!isAdminRole(principal.role) ? principal.organizationId : undefined);
    if (!foundationId) {
      throw new Error('A foundationId is required to create a replacement request.');
    }
    const startDate = (args.startDate as string) || undefined;
    const endDate = (args.endDate as string) || startDate;
    const role = (args.role as string) || undefined;
    if (!startDate) throw new Error('A start date is required.');
    if (!role) throw new Error('A role is required.');

    const request = await this.replacements.createRequest(
      {
        startDate,
        endDate: endDate as string,
        role,
        shiftStart: (args.shiftStart as string) || undefined,
        shiftEnd: (args.shiftEnd as string) || undefined,
        description: (args.description as string) || undefined,
        location: (args.location as string) || undefined,
        urgency: (args.urgency as any) || undefined,
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
