import { apiClient } from './client'
import { PaginatedResponse } from '@pc-solutions/api-types'

export interface ParentLead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  childName: string
  childAge: number
  preferredStartDate?: string
  location: string
  specialRequirements?: string
  status: 'pending' | 'contacted' | 'enrolled' | 'declined'
  createdAt: string
  updatedAt: string
}

export interface CreateParentLeadRequest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  childName: string
  childAge: number
  preferredStartDate?: string
  location: string
  specialRequirements?: string
}

export interface UpdateParentLeadRequest {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  childName?: string
  childAge?: number
  preferredStartDate?: string
  location?: string
  specialRequirements?: string
  status?: 'pending' | 'contacted' | 'enrolled' | 'declined'
}

export interface ParentLeadsQuery {
  page?: number
  limit?: number
  status?: string
  location?: string
  search?: string
}

export const parentLeadsApi = {
  // List parent leads (foundation/admin only)
  getParentLeads: (query?: ParentLeadsQuery): Promise<PaginatedResponse<ParentLead>> => {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.status) params.append('status', query.status)
    if (query?.location) params.append('location', query.location)
    if (query?.search) params.append('search', query.search)
    
    return apiClient.get<PaginatedResponse<ParentLead>>(`/parent-leads?${params.toString()}`)
  },

  // Get parent lead by ID
  getParentLead: (leadId: string): Promise<{ data: ParentLead }> => {
    return apiClient.get<{ data: ParentLead }>(`/parent-leads/${leadId}`)
  },

  // Create parent lead (public endpoint)
  createParentLead: (data: CreateParentLeadRequest): Promise<{ data: ParentLead }> => {
    return apiClient.post<{ data: ParentLead }>('/parent-leads', data)
  },

  // Update parent lead (foundation/admin only)
  updateParentLead: (leadId: string, data: UpdateParentLeadRequest): Promise<{ data: ParentLead }> => {
    return apiClient.put<{ data: ParentLead }>(`/parent-leads/${leadId}`, data)
  },

  // Delete parent lead (admin only)
  deleteParentLead: (leadId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/parent-leads/${leadId}`)
  },
}