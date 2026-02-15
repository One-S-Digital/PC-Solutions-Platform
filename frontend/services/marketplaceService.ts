import { apiService, ApiResponse } from './api';
import { Product, Service, Organization, OrganizationType } from '../types';
import { API_ENDPOINTS } from './api-endpoints';
import i18n from '../i18n';

export interface ProductCreateData {
  title: string;
  description?: string;
  price?: number;
  category?: string;
  tags?: string[];
  imageAssetId?: string;
}

export interface ProductUpdateData extends Partial<ProductCreateData> {}

export interface ServiceCreateData {
  title: string;
  description?: string;
  category: string;
  price?: number;
}

export interface ServiceUpdateData extends Partial<ServiceCreateData> {}

export interface MarketplaceFilters {
  category?: string;
  region?: string;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  isActive?: boolean;
}

class MarketplaceService {
  // Get product suppliers (organizations of type PRODUCT_SUPPLIER)
  async getProductSuppliers(filters: MarketplaceFilters = {}): Promise<{ suppliers: Organization[]; pagination: any }> {
    const currentLang = i18n.language || 'en';
    const params = new URLSearchParams();
    
    params.append('type', 'PRODUCT_SUPPLIER');
    params.append('lang', currentLang);
    params.append('isActive', 'true');
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.region && filters.region !== 'All') params.append('region', filters.region);
    if (filters.search) params.append('search', filters.search);
    
    const response = await apiService.get<{ organizations: Organization[]; pagination: any }>(
      `/compat/organizations?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch product suppliers');
    }
    return {
      suppliers: response.data.organizations.map(org => this.transformOrganization(org)),
      pagination: response.data.pagination,
    };
  }

  // Get service providers (organizations of type SERVICE_PROVIDER)
  async getServiceProviders(filters: MarketplaceFilters = {}): Promise<{ providers: Organization[]; pagination: any }> {
    const currentLang = i18n.language || 'en';
    const params = new URLSearchParams();
    
    params.append('type', 'SERVICE_PROVIDER');
    params.append('lang', currentLang);
    params.append('isActive', 'true');
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.region && filters.region !== 'All') params.append('region', filters.region);
    if (filters.search) params.append('search', filters.search);
    
    const response = await apiService.get<{ organizations: Organization[]; pagination: any }>(
      `/compat/organizations?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch service providers');
    }
    return {
      providers: response.data.organizations.map(org => this.transformOrganization(org)),
      pagination: response.data.pagination,
    };
  }

  // Products
  async getProducts(filters: MarketplaceFilters = {}): Promise<{ products: Product[]; pagination: any }> {
    const currentLang = i18n.language || 'en';
    const params = new URLSearchParams({
      page: (filters.page || 1).toString(),
      limit: (filters.limit || 20).toString(),
      ...(filters.category && { category: filters.category }),
      ...(filters.search && { search: filters.search }),
      // Hide blocked items by default on marketplace browsing
      ...(filters.isActive === undefined ? { isActive: 'true' } : { isActive: String(filters.isActive) }),
      lang: currentLang,
    });
    
    const response = await apiService.get<{ products: Product[]; pagination: any } | Product[]>(
      `${API_ENDPOINTS.marketplace.products.list}?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch products');
    }
    
    // Handle both array and paginated response formats
    const products = Array.isArray(response.data) ? response.data : (response.data.products || []);
    const pagination = Array.isArray(response.data) 
      ? { page: 1, limit: products.length, total: products.length, totalPages: 1 }
      : response.data.pagination;
    
    return {
      products: products.map(product => this.transformProduct(product)),
      pagination,
    };
  }

  async getProductById(id: string): Promise<Product> {
    const currentLang = i18n.language || 'en';
    const response = await apiService.get<Product>(
      `${API_ENDPOINTS.marketplace.products.get(id)}?lang=${currentLang}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch product');
    }
    return this.transformProduct(response.data);
  }

  async createProduct(data: ProductCreateData): Promise<Product> {
    const response = await apiService.post<Product>(API_ENDPOINTS.marketplace.products.create, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create product');
    }
    return this.transformProduct(response.data);
  }

  async updateProduct(id: string, data: ProductUpdateData): Promise<Product> {
    const response = await apiService.patch<Product>(API_ENDPOINTS.marketplace.products.update(id), data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update product');
    }
    return this.transformProduct(response.data);
  }

  async deleteProduct(id: string): Promise<void> {
    const response = await apiService.delete(API_ENDPOINTS.marketplace.products.delete(id));
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete product');
    }
  }

  // Services
  async getServices(filters: MarketplaceFilters = {}): Promise<{ services: Service[]; pagination: any }> {
    const currentLang = i18n.language || 'en';
    const params = new URLSearchParams({
      page: (filters.page || 1).toString(),
      limit: (filters.limit || 20).toString(),
      ...(filters.category && { category: filters.category }),
      ...(filters.search && { search: filters.search }),
      // Hide blocked items by default on marketplace browsing
      ...(filters.isActive === undefined ? { isActive: 'true' } : { isActive: String(filters.isActive) }),
      lang: currentLang,
    });
    
    const response = await apiService.get<{ services: Service[]; pagination: any } | Service[]>(
      `${API_ENDPOINTS.marketplace.services.list}?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch services');
    }
    
    // Handle both array and paginated response formats
    const services = Array.isArray(response.data) ? response.data : (response.data.services || []);
    const pagination = Array.isArray(response.data) 
      ? { page: 1, limit: services.length, total: services.length, totalPages: 1 }
      : response.data.pagination;
    
    return {
      services: services.map(service => this.transformService(service)),
      pagination,
    };
  }

  async getServiceById(id: string): Promise<Service> {
    const currentLang = i18n.language || 'en';
    const response = await apiService.get<Service>(
      `${API_ENDPOINTS.marketplace.services.get(id)}?lang=${currentLang}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch service');
    }
    return this.transformService(response.data);
  }

  async createService(data: ServiceCreateData): Promise<Service> {
    const response = await apiService.post<Service>(API_ENDPOINTS.marketplace.services.create, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create service');
    }
    return this.transformService(response.data);
  }

  async updateService(id: string, data: ServiceUpdateData): Promise<Service> {
    const response = await apiService.patch<Service>(API_ENDPOINTS.marketplace.services.update(id), data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update service');
    }
    return this.transformService(response.data);
  }

  async deleteService(id: string): Promise<void> {
    const response = await apiService.delete(API_ENDPOINTS.marketplace.services.delete(id));
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete service');
    }
  }

  // Transform product data to include legacy fields for UI compatibility
  private transformProduct(product: any): Product {
    return {
      ...product,
      // Legacy fields for UI compatibility
      supplierName: product.supplier?.name,
      supplierLogo: product.supplier?.logoAsset?.publicUrl || product.supplier?.logoUrl,
      imageUrl: product.imageAsset?.publicUrl || product.imageUrl,
      stockStatus: product.stockStatus || 'In Stock', // Default status
    };
  }

  // Transform service data to include legacy fields for UI compatibility
  private transformService(service: any): Service {
    return {
      ...service,
      // Legacy fields for UI compatibility
      providerName: service.provider?.organization?.name || service.providerName,
      providerLogo: service.provider?.organization?.logoAsset?.publicUrl || service.providerLogo,
      providerId: service.provider?.organizationId || service.providerId,
      availability: service.availability || 'Available', // Default availability
      tags: service.tags || [], // Default empty tags
      imageUrl: service.imageUrl, // Services may have images
      deliveryType: service.deliveryType || service.provider?.deliveryType || 'On-site',
      // TODO: Consider moving translation to UI layer for dynamic language switching
      // Current approach: translates at data fetch time, won't update if user switches language
      // Alternative: Store translation key and translate in component
      priceInfo: service.priceInfo || (service.price ? `CHF ${service.price}` : i18n.t('common:marketplace.contactForPricing')),
    };
  }

  // Transform organization data for marketplace display
  private transformOrganization(org: any): Organization {
    return {
      ...org,
      // Legacy fields for UI compatibility
      logoUrl: org.logoAsset?.publicUrl || org.logoUrl,
      coverImageUrl: org.coverAsset?.publicUrl || org.coverImageUrl,
      email: org.email, // Use actual email if available
      phone: org.phoneNumber,
      website: org.websiteUrl || org.directOrderLink || org.bookingLink || org.catalogUrl,
      address: org.region ? `${org.region}, Switzerland` : undefined,
      tags: org.productCategories || org.serviceCategories || org.pedagogy || [],
      rating: org.rating, // Preserve actual rating or leave undefined
      badges: org.badges || [],
    };
  }
}

export const marketplaceService = new MarketplaceService();
