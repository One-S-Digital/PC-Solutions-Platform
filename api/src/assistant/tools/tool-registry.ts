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

const ALL_ROLES: UserRole[] = [
  UserRole.FOUNDATION,
  UserRole.EDUCATOR,
  UserRole.PARENT,
  UserRole.PRODUCT_SUPPLIER,
  UserRole.SERVICE_PROVIDER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

const FOUNDATION_ADMIN: UserRole[] = [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN];

export const TOOL_REGISTRY: ToolDefinition[] = [
  // ── Universal tools (all roles) ────────────────────────────────────────────
  {
    name: 'search_help_docs',
    description: 'Search platform documentation to answer questions about how to use the platform.',
    level: 'L1_ANSWER',
    allowedRoles: ALL_ROLES,
    inputSchema: { query: { type: 'string', description: 'The user question or topic to look up' } },
  },
  {
    name: 'get_my_profile',
    description: "Fetch the current user's own profile data including name, contact info, role, and org.",
    level: 'L1_ANSWER',
    allowedRoles: ALL_ROLES,
    inputSchema: {},
  },
  {
    name: 'navigate_to',
    description: 'Navigate the user to a specific page in the platform.',
    level: 'L1_ANSWER',
    allowedRoles: ALL_ROLES,
    modal: 'navigate',
    inputSchema: {
      route: { type: 'string', description: 'The URL path to navigate to, e.g. /foundation/leads' },
      label: { type: 'string', description: 'Human-readable name of the destination' },
    },
  },
  {
    name: 'open_modal',
    description: 'Open a pre-filled platform form or modal for the user to review and submit.',
    level: 'L1_ANSWER',
    allowedRoles: ALL_ROLES,
    modal: 'dynamic',
    inputSchema: {
      modal: { type: 'string', description: 'Modal identifier, e.g. staffing_request_modal, job_post_modal' },
      prefill: { type: 'object', description: 'Key-value pairs to pre-fill in the modal' },
    },
  },

  // ── Foundation tools ───────────────────────────────────────────────────────
  {
    name: 'get_my_leads',
    description: 'Fetch open parent leads for the current foundation.',
    level: 'L1_ANSWER',
    allowedRoles: FOUNDATION_ADMIN,
    inputSchema: {
      status: { type: 'string', description: 'Filter by status: NEW, IN_PROGRESS, RESPONDED (optional)' },
      limit: { type: 'number', description: 'Max number of leads to return (default 5)' },
    },
  },
  {
    name: 'get_my_orders',
    description: 'Fetch recent orders placed by the current foundation.',
    level: 'L1_ANSWER',
    allowedRoles: [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    inputSchema: {
      status: { type: 'string', description: 'Filter by status: PENDING, PROCESSING, SHIPPED, DELIVERED (optional)' },
      limit: { type: 'number', description: 'Max number of orders to return (default 5)' },
    },
  },
  {
    name: 'search_internal_candidates',
    description: 'Parse a staffing request and search the internal educator pool for matching candidates.',
    level: 'L2_DRAFT',
    allowedRoles: FOUNDATION_ADMIN,
    modal: 'candidate_shortlist_modal',
    inputSchema: { rawText: { type: 'string', description: 'Free-text staffing request describing role, canton, dates, qualifications' } },
  },
  {
    name: 'explain_match',
    description: 'Generate a human-readable explanation for why a candidate matches a staffing request.',
    level: 'L1_ANSWER',
    allowedRoles: FOUNDATION_ADMIN,
    inputSchema: {
      matchResultId: { type: 'string', description: 'The MatchResult ID to explain' },
    },
  },
  {
    name: 'draft_job_post',
    description: 'Draft a job post pre-filled with details from the conversation.',
    level: 'L2_DRAFT',
    allowedRoles: FOUNDATION_ADMIN,
    modal: 'job_post_modal',
    inputSchema: {
      role: { type: 'string', description: 'Job role (e.g. EDE, ASSC)' },
      canton: { type: 'string', description: 'Swiss canton (e.g. VD, GE)' },
      percentage: { type: 'number', description: 'Work percentage (e.g. 80)' },
      notes: { type: 'string', description: 'Additional notes for the posting' },
    },
  },
  {
    name: 'draft_parent_reply',
    description: 'Draft a reply to a parent lead message.',
    level: 'L2_DRAFT',
    allowedRoles: FOUNDATION_ADMIN,
    modal: 'parent_reply_modal',
    inputSchema: {
      leadId: { type: 'string', description: 'Parent lead ID' },
      context: { type: 'string', description: 'Context or key points to include in the reply' },
    },
  },

  // ── Educator tools ─────────────────────────────────────────────────────────
  {
    name: 'get_my_applications',
    description: 'Fetch the current educator\'s job applications and their statuses.',
    level: 'L1_ANSWER',
    allowedRoles: [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    inputSchema: {
      status: { type: 'string', description: 'Filter by status: PENDING, SHORTLISTED, INTERVIEW, OFFER, HIRED, REJECTED (optional)' },
      limit: { type: 'number', description: 'Max number of applications to return (default 5)' },
    },
  },

  // ── Parent tools ───────────────────────────────────────────────────────────
  {
    name: 'get_my_enquiries',
    description: "Fetch the current parent's submitted childcare enquiries.",
    level: 'L1_ANSWER',
    allowedRoles: [UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    inputSchema: {
      limit: { type: 'number', description: 'Max number of enquiries to return (default 5)' },
    },
  },

  // ── Supplier tools ─────────────────────────────────────────────────────────
  {
    name: 'get_my_listings',
    description: 'Fetch the current supplier\'s product or service listings.',
    level: 'L1_ANSWER',
    allowedRoles: [UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    inputSchema: {
      limit: { type: 'number', description: 'Max number of listings to return (default 5)' },
    },
  },

  // ── Service provider tools ─────────────────────────────────────────────────
  {
    name: 'get_my_service_requests',
    description: 'Fetch the current service provider\'s incoming service requests.',
    level: 'L1_ANSWER',
    allowedRoles: [UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    inputSchema: {
      status: { type: 'string', description: 'Filter by status: PENDING, CONFIRMED, COMPLETED (optional)' },
      limit: { type: 'number', description: 'Max number of requests to return (default 5)' },
    },
  },
];

export function getToolsForRole(role: UserRole): ToolDefinition[] {
  return TOOL_REGISTRY.filter((t) => t.allowedRoles.includes(role));
}
