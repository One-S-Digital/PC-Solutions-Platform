import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { EducatorApprovalStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../../../users/users.service';
import { EducatorApprovalsService } from '../../../admin/educator-approvals.service';
import { BriefingService } from '../../briefing.service';
import {
  AssistantPrincipal,
  isAdminRole,
  resolveLimit,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/**
 * Admin-ops tools for the admin assistant workspace: educator approvals,
 * support-ticket overview, platform staffing signals, and user invites.
 * Thin wrappers over existing services — no new domain logic
 * (ADMIN_ASSISTANT_WORKSPACE_PLAN §3.2).
 */
@Injectable()
export class AdminOpsHandler implements ToolHandler {
  readonly toolNames = [
    'get_pending_educator_approvals',
    'approve_educator',
    'reject_educator',
    'get_open_support_tickets',
    'get_staffing_signals',
    'draft_user_invite',
    'send_user_invite',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly educatorApprovals: EducatorApprovalsService,
    private readonly briefing: BriefingService,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    // Defense in depth: these tools are gated to ADMIN_ONLY in the tool registry,
    // but every one of them acts platform-wide, so re-check the role here too
    // (same pattern as AdminHandler).
    if (!isAdminRole(principal.role)) {
      throw new ForbiddenException('This action is restricted to administrators.');
    }

    switch (toolName) {
      case 'get_pending_educator_approvals':
        return this.getPendingEducatorApprovals(args);
      case 'approve_educator':
        return this.approveEducator(args);
      case 'reject_educator':
        return this.rejectEducator(args);
      case 'get_open_support_tickets':
        return this.getOpenSupportTickets(args);
      case 'get_staffing_signals':
        return this.getStaffingSignals();
      case 'draft_user_invite':
        return this.draftUserInvite(args);
      case 'send_user_invite':
        return this.sendUserInvite(args, principal);
      default:
        throw new Error(`AdminOpsHandler cannot handle tool "${toolName}"`);
    }
  }

  // ── Educator approvals ─────────────────────────────────────────────────────

  private async getPendingEducatorApprovals(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = resolveLimit(args.limit);
    const result = await this.educatorApprovals.listEducators(
      EducatorApprovalStatus.PENDING_REVIEW,
      1,
      limit,
    );

    // Shaped as `candidates` so the existing candidate result cards render the rows.
    const candidates = result.educators.map((e) => ({
      id: e.id,
      name: [e.firstName, e.lastName].filter(Boolean).join(' ') || e.email,
      role: e.jobRole ?? e.jobRoles?.[0] ?? null,
      region: e.region ?? null,
      skills: e.skills ?? [],
    }));

    return {
      data: { candidates },
      total: result.total,
      hasMore: result.total > candidates.length,
      scope: 'platform-wide',
      suggestions:
        result.total === 0
          ? [{ label: 'No educator profiles are awaiting approval right now.', actionType: 'navigate' as const, payload: { route: '/educator-approvals' } }]
          : undefined,
    };
  }

  private async approveEducator(args: Record<string, unknown>): Promise<ToolResult> {
    const educatorId = (args.educatorId as string) || (args.userId as string);
    if (!educatorId) {
      throw new BadRequestException('educatorId is required');
    }
    const updated = await this.educatorApprovals.approveEducator(educatorId);
    return {
      data: {
        educatorId: updated.id,
        name: [updated.firstName, updated.lastName].filter(Boolean).join(' '),
        approvalStatus: updated.approvalStatus,
      },
      total: 1,
    };
  }

  private async rejectEducator(args: Record<string, unknown>): Promise<ToolResult> {
    const educatorId = (args.educatorId as string) || (args.userId as string);
    const notes = (args.notes as string) || (args.reason as string);
    if (!educatorId) {
      throw new BadRequestException('educatorId is required');
    }
    if (!notes?.trim()) {
      throw new BadRequestException('Rejection notes are required — ask the admin for the reason first.');
    }
    const updated = await this.educatorApprovals.rejectEducator(educatorId, notes);
    return {
      data: {
        educatorId: updated.id,
        name: [updated.firstName, updated.lastName].filter(Boolean).join(' '),
        approvalStatus: updated.approvalStatus,
      },
      total: 1,
    };
  }

  // ── Support tickets ────────────────────────────────────────────────────────

  private async getOpenSupportTickets(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = resolveLimit(args.limit);
    const [tickets, total] = await this.prisma.$transaction([
      // Tight select: subject + metadata only — no message bodies or emails,
      // so the result stays lean for the LLM context and the PII scrubber.
      this.prisma.supportTicket.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          subject: true,
          category: true,
          priority: true,
          status: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, role: true } },
        },
      }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);

    return {
      data: {
        tickets: tickets.map((ticket) => ({
          id: ticket.id,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.createdAt.toISOString(),
          requester: [ticket.user?.firstName, ticket.user?.lastName].filter(Boolean).join(' ') || null,
          requesterRole: ticket.user?.role ?? null,
        })),
      },
      total,
      hasMore: total > tickets.length,
      scope: 'platform-wide',
    };
  }

  // ── Staffing signals ───────────────────────────────────────────────────────

  private async getStaffingSignals(): Promise<ToolResult> {
    const signals = await this.briefing.computeAdminSignals();
    return { data: signals, total: 1, scope: 'platform-wide' };
  }

  // ── User invites ───────────────────────────────────────────────────────────

  private draftUserInvite(args: Record<string, unknown>): ToolResult {
    return {
      data: {
        modal: 'invite_user_modal',
        prefill: {
          email: args.email,
          role: this.coerceInviteRole(args.role),
        },
      },
      total: 1,
    };
  }

  private async sendUserInvite(
    args: Record<string, unknown>,
    principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    const email = (args.email as string)?.trim();
    const role = this.coerceInviteRole(args.role);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('A valid email address is required');
    }
    if (!role) {
      throw new BadRequestException(
        'A valid role is required (PARENT, EDUCATOR, FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER, ADMIN)',
      );
    }

    // UsersService.inviteUser re-applies the ADMIN-cannot-invite-SUPER_ADMIN rule.
    const invitation = await this.users.inviteUser({
      email,
      role,
      callerRole: principal.role,
    });

    return {
      data: { invitationId: invitation?.id ?? null, email, role, status: 'sent' },
      total: 1,
    };
  }

  private coerceInviteRole(raw: unknown): UserRole | undefined {
    if (typeof raw !== 'string') return undefined;
    const upper = raw.toUpperCase();
    return (Object.values(UserRole) as string[]).includes(upper) ? (upper as UserRole) : undefined;
  }
}
