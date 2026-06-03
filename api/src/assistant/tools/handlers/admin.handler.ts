import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../../../users/users.service';
import {
  AssistantPrincipal,
  CONTACT_ADMIN_SUGGESTION as CONTACT_ADMIN,
  resolveLimit,
  ToolHandler,
  ToolResult,
} from '../tool-handler.interface';

/**
 * Admin-only read tools: user lookup and platform-wide stats. Used to answer
 * operational questions and to resolve a user ID before messaging them.
 */
@Injectable()
export class AdminHandler implements ToolHandler {
  readonly toolNames = ['find_user', 'get_platform_stats'];

  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    _principal: AssistantPrincipal,
  ): Promise<ToolResult> {
    if (toolName === 'find_user') {
      return this.findUser(args);
    }
    return this.getPlatformStats();
  }

  // ── find_user ─────────────────────────────────────────────────────────────
  private async findUser(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = resolveLimit(args.limit);
    const role = this.coerceRole(args.role);
    const search = (args.search as string) || (args.query as string) || undefined;

    const result = await this.users.findAll({ page: 1, limit, role, search });
    const users = ((result as any)?.data ?? []).map((u: any) => ({
      // profileId is the User.id used by messaging; expose it for send_message.
      id: u.profileId ?? u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      orgName: u.orgName ?? null,
    }));
    return {
      data: { users },
      total: users.length,
      suggestions: users.length === 0 ? [CONTACT_ADMIN] : undefined,
    };
  }

  private coerceRole(raw: unknown): UserRole | undefined {
    if (typeof raw !== 'string') return undefined;
    const upper = raw.toUpperCase();
    return (Object.values(UserRole) as string[]).includes(upper) ? (upper as UserRole) : undefined;
  }

  // ── get_platform_stats ────────────────────────────────────────────────────
  private async getPlatformStats(): Promise<ToolResult> {
    const [activeUsers, openLeads, pendingApplications] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.parentLead.count({ where: { status: 'NEW' } }),
      this.prisma.jobApplication.count({ where: { status: 'PENDING' } }),
    ]);
    return {
      data: { activeUsers, openLeads, pendingApplications },
      total: 1,
      scope: 'platform-wide',
    };
  }
}
