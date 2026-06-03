import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Principal context passed to every tool handler. Mirrors
 * {@link AssistantPrincipalContext} in orchestrator.service.ts but is declared
 * here to keep the handler layer free of an orchestrator import cycle.
 */
export interface AssistantPrincipal {
  userId: string;
  role: UserRole;
  organizationId?: string;
}

/**
 * A concrete next-step the assistant can offer the user. Populated by search
 * handlers when {@link ToolResult.total} is 0 so the LLM never dead-ends.
 */
export interface ToolSuggestion {
  label: string;
  actionType: 'broaden_search' | 'post_job' | 'contact_admin' | 'navigate';
  /** Pre-fill data for the suggested follow-up action. */
  payload?: Record<string, unknown>;
}

/**
 * Standardised envelope every assistant tool must return.
 *
 * `total === 0` is the signal that drives the no-results path: handlers MUST
 * populate `suggestions` in that case, and the orchestrator prompt instructs
 * the LLM to present them as concrete offers (always ending with contact_admin).
 */
export interface ToolResult<T = unknown> {
  data: T;
  total: number;
  hasMore?: boolean;
  suggestions?: ToolSuggestion[];
  /** Optional scope marker (e.g. 'platform-wide' | 'organization'). */
  scope?: string;
}

/**
 * Contract for a single assistant tool. Handlers inject only the services they
 * need via constructor injection. Adding a new tool means adding a handler and
 * registering it — no editing of a monolithic switch.
 */
export interface ToolHandler<TArgs = Record<string, unknown>, TResult = unknown> {
  /** Tool name(s) this handler serves. Used by the registry for routing. */
  readonly toolNames: string[];
  execute(
    toolName: string,
    args: TArgs,
    principal: AssistantPrincipal,
    locale: 'fr' | 'de' | 'en',
    disabledFlags: Set<string>,
  ): Promise<ToolResult<TResult>>;
}

/** Roles that get a platform-wide (org-unscoped) view of data. */
export function isAdminRole(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

/** Clamp a caller-supplied limit to a sane range. */
export function resolveLimit(raw: unknown, def = 5, max = 10): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), max);
}

/**
 * Shared "contact the admin team" suggestion — the universal final fallback so a
 * search never dead-ends. Imported by every search/lookup handler rather than
 * re-declared, so the copy stays consistent.
 */
export const CONTACT_ADMIN_SUGGESTION: ToolSuggestion = {
  label: 'Contact the admin team for help',
  actionType: 'contact_admin',
};

/**
 * Resolve the organisation a write action runs against, honouring the
 * admin-on-behalf-of pattern — but ONLY admins may target another org.
 *
 * - **Admins:** an explicit `foundationId`/`organizationId` arg wins (resolved
 *   via find_foundation); without one they get `undefined`, so the handler
 *   rejects and forces the admin to name the org.
 * - **Non-admins:** always pinned to their own `principal.organizationId`. An
 *   explicit override is allowed only if it matches their own org; a mismatch is
 *   a cross-tenant attempt and is rejected. This closes the hole where a
 *   foundation user could pass another foundation's ID to act on its behalf.
 */
export function resolveOnBehalfOrgId(
  args: Record<string, unknown>,
  principal: AssistantPrincipal,
): string | undefined {
  const explicit = (args.foundationId as string) || (args.organizationId as string);
  if (isAdminRole(principal.role)) {
    return explicit || undefined;
  }
  if (explicit && explicit !== principal.organizationId) {
    throw new ForbiddenException(
      'You can only perform this action for your own organization.',
    );
  }
  return principal.organizationId;
}
