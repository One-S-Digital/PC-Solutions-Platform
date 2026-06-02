import { UserRole } from '@prisma/client';

export type ToolLevel = 'L1_ANSWER' | 'L2_DRAFT' | 'L3_EXECUTE';

export interface ToolDefinition {
  name: string;
  description: string;
  level: ToolLevel;
  allowedRoles: UserRole[];
  modal?: string;
  inputSchema: Record<string, unknown>;
  featureFlag?: string;
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

const EDUCATOR_ADMIN: UserRole[] = [UserRole.EDUCATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN];

const PARENT_ADMIN: UserRole[] = [UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN];

const ADMIN_ONLY: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

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
  {
    name: 'contact_admin',
    description:
      'File a support ticket to the admin team describing what the user needs. Use as the final fallback when a search finds nothing, a capability is missing, or the user is frustrated or wants to reach a human. Always available.',
    level: 'L3_EXECUTE',
    allowedRoles: ALL_ROLES,
    inputSchema: {
      subject: { type: 'string', description: 'Short ticket subject summarising the request' },
      message: { type: 'string', description: 'Full description of what the user needs. Pre-fill from the conversation so the user does not repeat themselves.' },
      category: { type: 'string', description: 'Optional: GENERAL, TECHNICAL, BILLING, FEATURE_REQUEST (default GENERAL)' },
      priority: { type: 'string', description: 'Optional: LOW, MEDIUM, HIGH, URGENT (default MEDIUM)' },
    },
  },

  // ── Admin-only tools ───────────────────────────────────────────────────────
  {
    name: 'find_foundation',
    description: 'Look up foundation organisations by name. Use this before acting on behalf of a foundation when only a name was provided — returns the foundationId needed by other tools.',
    level: 'L1_ANSWER',
    allowedRoles: ADMIN_ONLY,
    inputSchema: {
      query: { type: 'string', description: 'Organisation name or partial name to search for (e.g. "Kinderwelt", "Les Bout\'choux")' },
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
    name: 'search_candidates',
    description:
      'Search the internal educator pool directly and instantly by role, canton/location, skills, or free text. Returns ranked candidates immediately. Use this for fast, structured lookups.',
    level: 'L1_ANSWER',
    allowedRoles: FOUNDATION_ADMIN,
    featureFlag: 'v2_staffing_ia',
    inputSchema: {
      role: { type: 'string', description: 'Candidate job role (e.g. EDE, ASE, ASSC)' },
      location: { type: 'string', description: 'Canton or city (e.g. GE, Genève)' },
      skills: { type: 'array', description: 'Optional list of required skills' },
      search: { type: 'string', description: 'Optional free-text query across name, role, location, skills' },
    },
  },
  {
    name: 'search_candidates_ai',
    description:
      'Parse a free-text staffing request, run AI matching synchronously, and return ranked candidates with match scores in the same turn. Use when the user describes their need in natural language (dates, hours, qualifications).',
    level: 'L1_ANSWER',
    allowedRoles: FOUNDATION_ADMIN,
    featureFlag: 'v2_staffing_ia',
    inputSchema: {
      rawText: { type: 'string', description: 'Free-text staffing request describing role, canton, dates, qualifications' },
      foundationId: { type: 'string', description: 'Optional: UUID of a specific foundation org to scope the search. Omit for a platform-wide search (admin only).' },
    },
  },
  {
    name: 'search_products',
    description: 'Search marketplace products by name/category. Returns matching products with price and supplier.',
    level: 'L1_ANSWER',
    allowedRoles: FOUNDATION_ADMIN,
    inputSchema: {
      category: { type: 'string', description: 'Optional product category' },
      search: { type: 'string', description: 'Free-text query (product name or keywords)' },
    },
  },
  {
    name: 'search_services',
    description: 'Search marketplace services by name/category/canton. Returns matching services with price and provider.',
    level: 'L1_ANSWER',
    allowedRoles: FOUNDATION_ADMIN,
    inputSchema: {
      category: { type: 'string', description: 'Optional service category' },
      search: { type: 'string', description: 'Free-text query (service name or keywords)' },
    },
  },
  {
    name: 'explain_match',
    description: 'Generate a human-readable explanation for why a candidate matches a staffing request.',
    level: 'L1_ANSWER',
    allowedRoles: FOUNDATION_ADMIN,
    featureFlag: 'v2_staffing_ia',
    inputSchema: {
      matchResultId: { type: 'string', description: 'The MatchResult ID to explain' },
    },
  },
  {
    name: 'draft_job_post',
    description: 'Draft a job post pre-filled with details from the conversation.',
    level: 'L2_DRAFT',
    allowedRoles: FOUNDATION_ADMIN,
    featureFlag: 'v2_staffing_ia',
    modal: 'job_post_modal',
    inputSchema: {
      role: { type: 'string', description: 'Job role (e.g. EDE, ASSC)' },
      canton: { type: 'string', description: 'Swiss canton (e.g. VD, GE)' },
      percentage: { type: 'number', description: 'Work percentage (e.g. 80)' },
      notes: { type: 'string', description: 'Additional notes for the posting' },
      foundationId: { type: 'string', description: 'Optional: UUID of the foundation to post on behalf of (admin only). Resolve with find_foundation first if only a name is known.' },
    },
  },
  {
    name: 'draft_parent_reply',
    description: 'Draft a reply to a parent lead message.',
    level: 'L2_DRAFT',
    allowedRoles: FOUNDATION_ADMIN,
    featureFlag: 'v2_staffing_ia',
    modal: 'parent_reply_modal',
    inputSchema: {
      leadId: { type: 'string', description: 'Parent lead ID' },
      context: { type: 'string', description: 'Context or key points to include in the reply' },
    },
  },

  // ── Educator tools ─────────────────────────────────────────────────────────
  {
    name: 'search_jobs',
    description: 'Search available job listings by role/location. Returns published jobs the educator can apply to.',
    level: 'L1_ANSWER',
    allowedRoles: EDUCATOR_ADMIN,
    inputSchema: {
      location: { type: 'string', description: 'Canton or city to search in' },
      search: { type: 'string', description: 'Free-text query (job title or keywords)' },
      contractType: { type: 'string', description: 'Optional: FULL_TIME, PART_TIME, REPLACEMENT' },
    },
  },
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
    name: 'search_foundations',
    description: 'Search childcare foundations by location/type. Returns foundations a parent can enquire with.',
    level: 'L1_ANSWER',
    allowedRoles: PARENT_ADMIN,
    inputSchema: {
      canton: { type: 'string', description: 'Swiss canton (e.g. VD, GE)' },
      city: { type: 'string', description: 'City or town name' },
      query: { type: 'string', description: 'Optional free-text foundation name' },
    },
  },
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

export function getToolsForRole(role: UserRole, disabledFlags: Set<string> = new Set()): ToolDefinition[] {
  return TOOL_REGISTRY.filter(
    (t) => t.allowedRoles.includes(role) && (!t.featureFlag || !disabledFlags.has(t.featureFlag)),
  );
}
