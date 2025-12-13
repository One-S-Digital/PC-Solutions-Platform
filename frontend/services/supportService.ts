/**
 * Support Service
 * Provides API calls for the support ticket system
 */

export interface TicketResponse {
  id: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
  userName?: string;
   attachmentUrl?: string | null;
   attachmentName?: string | null;
   attachmentSize?: number | null;
   attachmentMimeType?: string | null;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  attachmentMimeType?: string | null;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  responses: TicketResponse[];
}

export interface CreateTicketData {
  subject: string;
  message: string;
  category?: 'GENERAL' | 'TECHNICAL' | 'BILLING' | 'FEATURE_REQUEST';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
}

export interface CreateTicketResponseData {
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
}

export type TicketCategory = 'GENERAL' | 'TECHNICAL' | 'BILLING' | 'FEATURE_REQUEST';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

// API endpoints
export const SUPPORT_ENDPOINTS = {
  tickets: '/support/tickets',
  adminTickets: '/support/admin/tickets',
  adminStats: '/support/admin/stats',
};

/**
 * Hook-compatible service functions
 */
export const supportApi = {
  /**
   * Get user's tickets endpoint
   */
  getTicketsEndpoint: () => SUPPORT_ENDPOINTS.tickets,

  /**
   * Get single ticket endpoint
   */
  getTicketEndpoint: (ticketId: string) => `${SUPPORT_ENDPOINTS.tickets}/${ticketId}`,

  /**
   * Create ticket - returns config for POST request
   */
  createTicketConfig: (data: CreateTicketData) => ({
    endpoint: SUPPORT_ENDPOINTS.tickets,
    method: 'POST' as const,
    body: JSON.stringify(data),
  }),

  /**
   * Respond to ticket - returns config for POST request
   */
  respondToTicketConfig: (ticketId: string, data: CreateTicketResponseData) => ({
    endpoint: `${SUPPORT_ENDPOINTS.tickets}/${ticketId}/respond`,
    method: 'POST' as const,
    body: JSON.stringify(data),
  }),

  // Admin endpoints
  /**
   * Get all tickets (admin) endpoint
   */
  getAdminTicketsEndpoint: (filters?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    return queryString
      ? `${SUPPORT_ENDPOINTS.adminTickets}?${queryString}`
      : SUPPORT_ENDPOINTS.adminTickets;
  },

  /**
   * Update ticket status (admin) - returns config for PATCH request
   */
  updateTicketStatusConfig: (ticketId: string, status: TicketStatus) => ({
    endpoint: `${SUPPORT_ENDPOINTS.adminTickets}/${ticketId}/status`,
    method: 'PATCH' as const,
    body: JSON.stringify({ status }),
  }),

  /**
   * Assign ticket (admin) - returns config for PATCH request
   */
  assignTicketConfig: (ticketId: string, assigneeId?: string) => ({
    endpoint: `${SUPPORT_ENDPOINTS.adminTickets}/${ticketId}/assign`,
    method: 'PATCH' as const,
    body: JSON.stringify({ assigneeId }),
  }),

  /**
   * Get ticket stats (admin) endpoint
   */
  getAdminStatsEndpoint: () => SUPPORT_ENDPOINTS.adminStats,
};

/**
 * Get status display class for tickets
 */
export const getTicketStatusClass = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return 'bg-yellow-100 text-yellow-800';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get priority display class for tickets
 */
export const getTicketPriorityClass = (priority: string): string => {
  switch (priority.toUpperCase()) {
    case 'LOW':
      return 'bg-gray-100 text-gray-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800';
    case 'URGENT':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Category labels for display
 */
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL: 'General',
  TECHNICAL: 'Technical Support',
  BILLING: 'Billing',
  FEATURE_REQUEST: 'Feature Request',
};

/**
 * Priority labels for display
 */
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

/**
 * Status labels for display
 */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export default supportApi;
