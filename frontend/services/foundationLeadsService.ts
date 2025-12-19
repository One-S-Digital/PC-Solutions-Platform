/**
 * Foundation Leads Service
 * Provides API calls for the foundation leads page
 */

export type LeadResponseStatus = 'INTERESTED' | 'NOT_INTERESTED' | 'NEEDS_MORE_INFO' | 'ENROLLED';

export interface FoundationResponse {
  id: string;
  foundationId: string;
  foundationName: string;
  status: string;
  message: string | null;
  respondedAt: string;
}

export interface MyResponse {
  id: string;
  status: string;
  message: string | null;
  respondedAt: string;
}

export interface LeadWithResponses {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  childName: string;
  childAge: number;
  message: string | null;
  preferredLocation: string | null;
  preferredLanguages: string[];
  specialRequirements: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  foundationResponses: FoundationResponse[];
  myResponse?: MyResponse;
}

export interface LeadResponseStats {
  totalResponses: number;
  interested: number;
  notInterested: number;
  needsMoreInfo: number;
  enrolled: number;
}

export interface CreateLeadResponseData {
  status: LeadResponseStatus;
  message?: string;
}

// API endpoints
export const FOUNDATION_LEADS_ENDPOINTS = {
  myLeads: '/leads/foundation/my-leads',
  leadDetail: '/leads/foundation/leads',
  respond: '/leads/foundation/leads',
  stats: '/leads/foundation/stats',
};

/**
 * Hook-compatible service functions
 */
export const foundationLeadsApi = {
  /**
   * Get foundation's leads endpoint
   */
  getLeadsEndpoint: (filters?: {
    status?: string;
    responseStatus?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.responseStatus) params.append('responseStatus', filters.responseStatus);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    return queryString
      ? `${FOUNDATION_LEADS_ENDPOINTS.myLeads}?${queryString}`
      : FOUNDATION_LEADS_ENDPOINTS.myLeads;
  },

  /**
   * Get single lead endpoint
   */
  getLeadEndpoint: (leadId: string) =>
    `${FOUNDATION_LEADS_ENDPOINTS.leadDetail}/${leadId}`,

  /**
   * Respond to lead - returns config for POST request
   */
  respondToLeadConfig: (leadId: string, data: CreateLeadResponseData) => ({
    endpoint: `${FOUNDATION_LEADS_ENDPOINTS.respond}/${leadId}/respond`,
    method: 'POST' as const,
    body: JSON.stringify(data),
  }),

  /**
   * Get lead response stats endpoint
   */
  getStatsEndpoint: () => FOUNDATION_LEADS_ENDPOINTS.stats,
};

/**
 * Get status display info
 */
export const getLeadStatusInfo = (status: string) => {
  switch (status.toUpperCase()) {
    case 'NEW':
      return { label: 'New', className: 'bg-blue-100 text-blue-800' };
    case 'ASSIGNED':
      return { label: 'Assigned', className: 'bg-yellow-100 text-yellow-800' };
    case 'CONTACTED':
      return { label: 'Contacted', className: 'bg-purple-100 text-purple-800' };
    case 'PROCESSING':
      return { label: 'Processing', className: 'bg-orange-100 text-orange-800' };
    case 'CONVERTED':
      return { label: 'Converted', className: 'bg-green-100 text-green-800' };
    case 'CLOSED':
      return { label: 'Closed', className: 'bg-gray-100 text-gray-800' };
    default:
      return { label: status, className: 'bg-gray-100 text-gray-800' };
  }
};

/**
 * Get response status display info
 */
export const getResponseStatusInfo = (status: string) => {
  switch (status.toUpperCase()) {
    case 'INTERESTED':
      return { label: 'Interested', className: 'bg-green-100 text-green-700' };
    case 'NOT_INTERESTED':
      return { label: 'Not Interested', className: 'bg-red-100 text-red-700' };
    case 'NEEDS_MORE_INFO':
      return { label: 'Needs More Info', className: 'bg-yellow-100 text-yellow-700' };
    case 'ENROLLED':
      return { label: 'Enrolled', className: 'bg-purple-100 text-purple-700' };
    case 'NOT_RESPONDED':
      return { label: 'Not Responded', className: 'bg-gray-200 text-gray-700' };
    default:
      return { label: status, className: 'bg-gray-200 text-gray-700' };
  }
};

export default foundationLeadsApi;
