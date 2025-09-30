import { apiClient } from './client'
import { PaginatedResponse } from '@pc-solutions/api-types'

export interface Organization {
  id: string
  name: string
  type: 'foundation' | 'supplier' | 'service_provider'
  region: string
  logoUrl?: string
  coverImageUrl?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  description?: string
  tags?: string[]
  capacity?: number
  pedagogy?: string[]
  languagesSpoken?: string[]
  rating?: number
  badges?: string[]
  directOrderLink?: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt: string
}

export interface CreateOrganizationRequest {
  name: string
  type: 'foundation' | 'supplier' | 'service_provider'
  region: string
  email?: string
  phone?: string
  website?: string
  address?: string
  description?: string
  tags?: string[]
  capacity?: number
  pedagogy?: string[]
  languagesSpoken?: string[]
  directOrderLink?: string
}

export interface UpdateOrganizationRequest {
  name?: string
  region?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  description?: string
  tags?: string[]
  capacity?: number
  pedagogy?: string[]
  languagesSpoken?: string[]
  directOrderLink?: string
  status?: 'active' | 'inactive' | 'pending'
}

export interface OrganizationsQuery {
  page?: number
  limit?: number
  type?: string
  region?: string
  status?: string
  search?: string
}

export const organizationsApi = {
  // List organizations
  getOrganizations: (query?: OrganizationsQuery): Promise<PaginatedResponse<Organization>> => {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.type) params.append('type', query.type)
    if (query?.region) params.append('region', query.region)
    if (query?.status) params.append('status', query.status)
    if (query?.search) params.append('search', query.search)
    
    return apiClient.get<PaginatedResponse<Organization>>(`/organizations?${params.toString()}`)
  },

  // Get organization by ID
  getOrganization: (organizationId: string): Promise<{ data: Organization }> => {
    return apiClient.get<{ data: Organization }>(`/organizations/${organizationId}`)
  },

  // Create organization
  createOrganization: (data: CreateOrganizationRequest): Promise<{ data: Organization }> => {
    return apiClient.post<{ data: Organization }>('/organizations', data)
  },

  // Update organization
  updateOrganization: (organizationId: string, data: UpdateOrganizationRequest): Promise<{ data: Organization }> => {
    return apiClient.put<{ data: Organization }>(`/organizations/${organizationId}`, data)
  },

  // Delete organization
  deleteOrganization: (organizationId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/organizations/${organizationId}`)
  },
}