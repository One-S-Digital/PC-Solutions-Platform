import { UserRole } from '@prisma/client';

export type ToolLevel = 'L1_ANSWER' | 'L2_DRAFT' | 'L3_EXECUTE';

export interface ToolDefinition {
  name: string;
  description: string;
  level: ToolLevel;
  allowedRoles: UserRole[];
  modal?: string;
  inputSchema: Record<string, unknown>;
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: 'search_help_docs',
    description: 'Search the platform knowledge base to answer user questions about how to use ProCrèche.',
    level: 'L1_ANSWER',
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    inputSchema: { query: { type: 'string', description: 'The user question' } },
  },
  {
    name: 'open_modal',
    description: 'Open a pre-filled platform form/modal for the user to review and submit.',
    level: 'L1_ANSWER',
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    modal: 'dynamic',
    inputSchema: {
      modal: { type: 'string', description: 'Modal identifier, e.g. staffing_request_modal, job_post_modal' },
      prefill: { type: 'object', description: 'Key-value pairs to pre-fill in the modal' },
    },
  },
  {
    name: 'search_internal_candidates',
    description: 'Parse a staffing request and search the internal educator pool for matching candidates.',
    level: 'L2_DRAFT',
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    modal: 'candidate_shortlist_modal',
    inputSchema: { rawText: { type: 'string', description: 'Free-text staffing request' } },
  },
  {
    name: 'explain_match',
    description: 'Generate a human-readable explanation for why a candidate matches a request.',
    level: 'L1_ANSWER',
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    inputSchema: {
      matchResultId: { type: 'string', description: 'The MatchResult ID to explain' },
    },
  },
  {
    name: 'draft_job_post',
    description: 'Draft a job post pre-filled with details from the conversation.',
    level: 'L2_DRAFT',
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    modal: 'job_post_modal',
    inputSchema: {
      role: { type: 'string', description: 'Job role' },
      canton: { type: 'string', description: 'Swiss canton' },
      percentage: { type: 'number', description: 'Work percentage' },
      notes: { type: 'string', description: 'Additional notes' },
    },
  },
  {
    name: 'draft_parent_reply',
    description: 'Draft a reply to a parent lead message.',
    level: 'L2_DRAFT',
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    modal: 'parent_reply_modal',
    inputSchema: {
      leadId: { type: 'string', description: 'Parent lead ID' },
      context: { type: 'string', description: 'Context from conversation' },
    },
  },
];

export function getToolsForRole(role: UserRole): ToolDefinition[] {
  return TOOL_REGISTRY.filter((t) => t.allowedRoles.includes(role));
}
