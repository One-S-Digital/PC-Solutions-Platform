import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AssistantPrincipal,
  isAdminRole,
  resolveLimit,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/** Foundation parent-lead reads and parent enquiry reads. */
@Injectable()
export class LeadsHandler implements ToolHandler {
  readonly toolNames = ['get_my_leads', 'get_my_enquiries'];

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const limit = resolveLimit(args.limit);

    if (toolName === 'get_my_leads') {
      const adminRole = isAdminRole(principal.role);
      // Admins without an org get a platform-wide view of recent leads
      const where: Record<string, unknown> | null =
        !principal.organizationId && adminRole
          ? {}
          : principal.organizationId
            ? { foundationId: principal.organizationId }
            : null;
      if (!where) {
        return { data: { leads: [] }, total: 0, suggestions: [contactAdminSuggestion('leads')] };
      }
      if (args.status) (where as Record<string, unknown>).status = args.status;
      const leads = await this.prisma.parentLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          parentName: true,
          childAge: true,
          status: true,
          preferredLocation: true,
          createdAt: true,
        },
      });
      return {
        data: { leads },
        total: leads.length,
        scope: !principal.organizationId ? 'platform-wide' : 'organization',
      };
    }

    // get_my_enquiries (parent)
    const enquiries = await this.prisma.parentLead.findMany({
      where: { parentUserId: principal.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        preferredLocation: true,
        createdAt: true,
        foundationId: true,
      },
    });
    return { data: { enquiries }, total: enquiries.length };
  }
}

function contactAdminSuggestion(topic: string) {
  return {
    label: 'Contact the admin team',
    actionType: 'contact_admin' as const,
    payload: { topic },
  };
}
