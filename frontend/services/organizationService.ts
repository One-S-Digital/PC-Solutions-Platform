import { apiService, ApiResponse } from './api';
import { Organization, OrganizationType } from '../types';
import i18n from '../i18n';

export interface OrganizationCreateData {
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
}

export interface OrganizationUpdateData extends Partial<OrganizationCreateData> {}

export interface OrganizationFilters {
  type?: OrganizationType | string;
  region?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

class OrganizationService {
  // Get all organizations with optional filters
  async getOrganizations(filters: OrganizationFilters = {}): Promise<{ organizations: Organization[]; pagination: any }> {
    const currentLang = i18n.language || 'en';
    const params = new URLSearchParams();
    
    params.append('lang', currentLang);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.type) params.append('type', filters.type);
    if (filters.region && filters.region !== 'All') params.append('region', filters.region);
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    
    const response = await apiService.get<{ organizations: Organization[]; pagination: any }>(
      `/organizations?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch organizations');
    }
    return {
      organizations: response.data.organizations.map(org => this.transformOrganization(org)),
      pagination: response.data.pagination,
    };
  }

  // Get product suppliers
  async getProductSuppliers(filters: Omit<OrganizationFilters, 'type'> = {}): Promise<{ organizations: Organization[]; pagination: any }> {
    return this.getOrganizations({ ...filters, type: 'PRODUCT_SUPPLIER' });
  }

  // Get service providers
  async getServiceProviders(filters: Omit<OrganizationFilters, 'type'> = {}): Promise<{ organizations: Organization[]; pagination: any }> {
    return this.getOrganizations({ ...filters, type: 'SERVICE_PROVIDER' });
  }

  // Get foundations (daycares)
  async getFoundations(filters: Omit<OrganizationFilters, 'type'> = {}): Promise<{ organizations: Organization[]; pagination: any }> {
    return this.getOrganizations({ ...filters, type: 'FOUNDATION' });
  }

  // Get organization by ID
  async getOrganizationById(id: string): Promise<Organization> {
    const currentLang = i18n.language || 'en';
    const response = await apiService.get<Organization>(`/organizations/${id}?lang=${currentLang}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch organization');
    }
    return this.transformOrganization(response.data);
  }

  // Create organization (admin only)
  async createOrganization(data: OrganizationCreateData): Promise<Organization> {
    const response = await apiService.post<Organization>('/organizations', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create organization');
    }
    return this.transformOrganization(response.data);
  }

  // Update organization
  async updateOrganization(id: string, data: OrganizationUpdateData): Promise<Organization> {
    const response = await apiService.put<Organization>(`/organizations/${id}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update organization');
    }
    return this.transformOrganization(response.data);
  }

  // Delete organization (admin only)
  async deleteOrganization(id: string): Promise<void> {
    const response = await apiService.delete(`/organizations/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete organization');
    }
  }

  // Get user's organizations
  async getUserOrganizations(): Promise<Organization[]> {
    const currentLang = i18n.language || 'en';
    const response = await apiService.get<Organization[]>(`/organizations/my?lang=${currentLang}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch user organizations');
    }
    return response.data.map(org => this.transformOrganization(org));
  }

  // Join organization
  async joinOrganization(organizationId: string): Promise<void> {
    const response = await apiService.post(`/organizations/${organizationId}/join`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to join organization');
    }
  }

  // Leave organization
  async leaveOrganization(organizationId: string): Promise<void> {
    const response = await apiService.post(`/organizations/${organizationId}/leave`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to leave organization');
    }
  }

  // Transform organization data to include legacy fields for UI compatibility
  private transformOrganization(org: any): Organization {
    return {
      ...org,
      // Legacy fields for UI compatibility
      logoUrl: org.logoAsset?.publicUrl || org.logoUrl,
      coverImageUrl: org.coverAsset?.publicUrl || org.coverImageUrl,
      email: org.email, // Use actual email if available
      phone: org.phoneNumber,
      website: org.directOrderLink || org.bookingLink || org.catalogUrl,
      address: org.region ? `${org.region}, Switzerland` : undefined,
      tags: org.pedagogy || org.serviceCategories || org.productCategories || [],
      rating: org.rating, // Preserve actual rating or leave undefined
      badges: org.badges || [],
    };
  }
}

export const organizationService = new OrganizationService();
