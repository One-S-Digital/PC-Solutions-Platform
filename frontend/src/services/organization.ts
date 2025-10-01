import { apiClient } from './api';
import { Organization, OrganizationType, Asset } from './types';

// Organization service for managing organization-related API calls
export class OrganizationService {
  // Get current user's organization
  async getCurrentOrganization(): Promise<Organization | null> {
    try {
      return await apiClient.get<Organization>('/organizations/me');
    } catch (error) {
      // User might not have an organization
      return null;
    }
  }

  // Get organization by ID
  async getOrganizationById(organizationId: string): Promise<Organization> {
    return apiClient.get<Organization>(`/organizations/${organizationId}`);
  }

  // Create new organization
  async createOrganization(data: {
    name: string;
    type: OrganizationType;
    region?: string;
    description?: string;
    vatNumber?: string;
    contactPerson?: string;
    phoneNumber?: string;
    canton?: string;
    languages?: string[];
    capacity?: number;
    pedagogy?: string[];
    productCategory?: string;
    serviceType?: string;
    minimumOrderQuantity?: number;
    directOrderLink?: string;
    catalogUrl?: string;
    serviceCategories?: string[];
    deliveryType?: string;
    bookingLink?: string;
  }): Promise<Organization> {
    return apiClient.post<Organization>('/organizations', data);
  }

  // Update organization
  async updateOrganization(organizationId: string, data: Partial<Organization>): Promise<Organization> {
    return apiClient.patch<Organization>(`/organizations/${organizationId}`, data);
  }

  // Get all organizations (admin only)
  async getAllOrganizations(params?: {
    page?: number;
    limit?: number;
    type?: OrganizationType;
    search?: string;
    isActive?: boolean;
    region?: string;
  }): Promise<{
    data: Organization[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.region) queryParams.append('region', params.region);

    return apiClient.get(`/organizations?${queryParams.toString()}`);
  }

  // Upload organization logo
  async uploadLogo(organizationId: string, file: File, onProgress?: (progress: number) => void): Promise<Asset> {
    return apiClient.uploadFile<Asset>(`/organizations/${organizationId}/logo`, file, onProgress);
  }

  // Upload organization cover image
  async uploadCoverImage(organizationId: string, file: File, onProgress?: (progress: number) => void): Promise<Asset> {
    return apiClient.uploadFile<Asset>(`/organizations/${organizationId}/cover`, file, onProgress);
  }

  // Get organization members
  async getOrganizationMembers(organizationId: string, params?: {
    page?: number;
    limit?: number;
    role?: string;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);

    return apiClient.get(`/organizations/${organizationId}/members?${queryParams.toString()}`);
  }

  // Add member to organization
  async addMember(organizationId: string, userId: string, role: string): Promise<void> {
    return apiClient.post(`/organizations/${organizationId}/members`, { userId, role });
  }

  // Remove member from organization
  async removeMember(organizationId: string, userId: string): Promise<void> {
    return apiClient.delete(`/organizations/${organizationId}/members/${userId}`);
  }

  // Update member role
  async updateMemberRole(organizationId: string, userId: string, role: string): Promise<void> {
    return apiClient.patch(`/organizations/${organizationId}/members/${userId}`, { role });
  }

  // Deactivate organization (admin only)
  async deactivateOrganization(organizationId: string): Promise<Organization> {
    return apiClient.patch<Organization>(`/organizations/${organizationId}/deactivate`);
  }

  // Activate organization (admin only)
  async activateOrganization(organizationId: string): Promise<Organization> {
    return apiClient.patch<Organization>(`/organizations/${organizationId}/activate`);
  }

  // Delete organization (admin only)
  async deleteOrganization(organizationId: string): Promise<void> {
    return apiClient.delete(`/organizations/${organizationId}`);
  }

  // Get organization statistics (admin only)
  async getOrganizationStats(): Promise<{
    totalOrganizations: number;
    activeOrganizations: number;
    organizationsByType: Record<OrganizationType, number>;
    newOrganizationsThisMonth: number;
    organizationsByRegion: Record<string, number>;
  }> {
    return apiClient.get('/organizations/stats');
  }

  // Search organizations
  async searchOrganizations(query: string, filters?: {
    type?: OrganizationType;
    region?: string;
    isActive?: boolean;
  }): Promise<Organization[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('search', query);
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.region) queryParams.append('region', filters.region);
    if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());

    const response = await apiClient.get<{ data: Organization[] }>(`/organizations/search?${queryParams.toString()}`);
    return response.data;
  }
}

// Create singleton instance
export const organizationService = new OrganizationService();

export default organizationService;