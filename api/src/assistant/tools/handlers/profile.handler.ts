import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AssistantPrincipal,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/** Universal profile / navigation tools available to every role. */
@Injectable()
export class ProfileHandler implements ToolHandler {
  readonly toolNames = ['get_my_profile', 'navigate_to', 'open_modal'];

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    switch (toolName) {
      case 'get_my_profile': {
        const user = await this.prisma.user.findUnique({
          where: { id: principal.userId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            approvalStatus: true,
            isActive: true,
            createdAt: true,
          },
        });
        return { data: user ?? { error: 'Profile not found' }, total: user ? 1 : 0 };
      }

      case 'navigate_to':
        return { data: { route: args.route, label: args.label }, total: 1 };

      case 'open_modal':
        return { data: { modal: args.modal, prefill: args.prefill }, total: 1 };

      default:
        throw new Error(`ProfileHandler cannot handle tool "${toolName}"`);
    }
  }
}
