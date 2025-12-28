import { apiService, ApiResponse } from './api';
import { ParentLead, LeadMainStatus, FoundationLeadResponseStatus } from '../types';

export interface ParentLeadCreateData {
  canton: string;
  municipality: string;
  preferredCities?: string[];
  childAge: number;
  desiredStartDate: string;
  specialNeeds?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
}

export interface FoundationResponseCreateData {
  foundationId: string;
  status: FoundationLeadResponseStatus;
  messageToParent?: string;
}

export interface ParentLeadUpdateData {
  mainStatus?: LeadMainStatus;
  assignedFoundations?: string[];
}

class LeadsService {
  // Parent Leads
  async getParentLeads(page = 1, limit = 20, status?: LeadMainStatus): Promise<{ leads: ParentLead[]; pagination: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    
    const response = await apiService.get<{ leads: ParentLead[]; pagination: any }>(
      `/parent-leads?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch parent leads');
    }
    return {
      leads: response.data.leads.map(lead => this.transformParentLead(lead)),
      pagination: response.data.pagination,
    };
  }

  async getParentLeadById(id: string): Promise<ParentLead> {
    const response = await apiService.get<ParentLead>(`/parent-leads/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch parent lead');
    }
    return this.transformParentLead(response.data);
  }

  async createParentLead(data: ParentLeadCreateData): Promise<ParentLead> {
    const response = await apiService.post<ParentLead>('/parent-leads', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create parent lead');
    }
    return this.transformParentLead(response.data);
  }

  async updateParentLead(id: string, data: ParentLeadUpdateData): Promise<ParentLead> {
    const response = await apiService.put<ParentLead>(`/parent-leads/${id}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update parent lead');
    }
    return this.transformParentLead(response.data);
  }

  async deleteParentLead(id: string): Promise<void> {
    const response = await apiService.delete(`/parent-leads/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete parent lead');
    }
  }

  // Foundation Responses
  async getFoundationResponses(leadId: string): Promise<any[]> {
    const response = await apiService.get<any[]>(`/parent-leads/${leadId}/responses`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch foundation responses');
    }
    return response.data;
  }

  async createFoundationResponse(leadId: string, data: FoundationResponseCreateData): Promise<any> {
    const response = await apiService.post<any>(`/parent-leads/${leadId}/responses`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create foundation response');
    }
    return response.data;
  }

  async updateFoundationResponse(leadId: string, responseId: string, data: Partial<FoundationResponseCreateData>): Promise<any> {
    const response = await apiService.put<any>(`/parent-leads/${leadId}/responses/${responseId}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update foundation response');
    }
    return response.data;
  }

  // Get leads for a specific foundation
  async getFoundationLeads(foundationId: string, page = 1, limit = 20): Promise<{ leads: ParentLead[]; pagination: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      foundationId,
    });
    
    const response = await apiService.get<{ leads: ParentLead[]; pagination: any }>(
      `/parent-leads?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch foundation leads');
    }
    return {
      leads: response.data.leads.map(lead => this.transformParentLead(lead)),
      pagination: response.data.pagination,
    };
  }

  // Get leads for a specific parent
  async getParentLeadsForUser(parentId: string, page = 1, limit = 20): Promise<{ leads: ParentLead[]; pagination: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      parentId,
    });
    
    const response = await apiService.get<{ leads: ParentLead[]; pagination: any }>(
      `/parent-leads?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch parent leads');
    }
    return {
      leads: response.data.leads.map(lead => this.transformParentLead(lead)),
      pagination: response.data.pagination,
    };
  }

  // Transform parent lead data to include legacy fields for UI compatibility
  private transformParentLead(lead: any): ParentLead {
    return {
      id: lead.id,
      parentId: lead.parentId,
      canton: lead.canton,
      municipality: lead.municipality,
      childAge: lead.childAge,
      desiredStartDate: lead.desiredStartDate,
      specialNeeds: lead.specialNeeds,
      contactName: lead.contactName,
      contactEmail: lead.contactEmail,
      contactPhone: lead.contactPhone,
      submissionDate: lead.createdAt,
      mainStatus: lead.status as LeadMainStatus,
      assignedFoundations: lead.assignedFoundations || [],
      responses: lead.responses || [],
    };
  }
}

export const leadsService = new LeadsService();
