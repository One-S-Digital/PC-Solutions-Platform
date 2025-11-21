import { apiService, ApiResponse } from './api';
import { Product, Service } from '../types';
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

class MarketplaceService {
  // Products
  async getProducts(page = 1, limit = 20, category?: string, search?: string): Promise<{ products: Product[]; pagination: any }> {
    const currentLang = i18n.language || 'en';
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(category && { category }),
      ...(search && { search }),
      lang: currentLang,
    });
    
    const response = await apiService.get<{ products: Product[]; pagination: any }>(
      `${API_ENDPOINTS.marketplace.products.list}?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch products');
    }
    return {
      products: response.data.products.map(product => this.transformProduct(product)),
      pagination: response.data.pagination,
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
    const response = await apiService.put<Product>(API_ENDPOINTS.marketplace.products.update(id), data);
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
  async getServices(page = 1, limit = 20, category?: string, search?: string): Promise<{ services: Service[]; pagination: any }> {
    const currentLang = i18n.language || 'en';
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(category && { category }),
      ...(search && { search }),
      lang: currentLang,
    });
    
    const response = await apiService.get<{ services: Service[]; pagination: any }>(
      `/services?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch services');
    }
    return {
      services: response.data.services.map(service => this.transformService(service)),
      pagination: response.data.pagination,
    };
  }

  async getServiceById(id: string): Promise<Service> {
    const currentLang = i18n.language || 'en';
    const response = await apiService.get<Service>(`/services/${id}?lang=${currentLang}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch service');
    }
    return this.transformService(response.data);
  }

  async createService(data: ServiceCreateData): Promise<Service> {
    const response = await apiService.post<Service>('/services', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create service');
    }
    return this.transformService(response.data);
  }

  async updateService(id: string, data: ServiceUpdateData): Promise<Service> {
    const response = await apiService.put<Service>(`/services/${id}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update service');
    }
    return this.transformService(response.data);
  }

  async deleteService(id: string): Promise<void> {
    const response = await apiService.delete(`/services/${id}`);
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
      supplierLogo: product.supplier?.logoAsset?.publicUrl,
      imageUrl: product.imageAsset?.publicUrl,
      stockStatus: 'In Stock', // Default status
    };
  }

  // Transform service data to include legacy fields for UI compatibility
  private transformService(service: any): Service {
    return {
      ...service,
      // Legacy fields for UI compatibility
      providerName: service.provider?.organization?.name,
      providerLogo: service.provider?.organization?.logoAsset?.publicUrl,
      availability: 'Available', // Default availability
      tags: [], // Default empty tags
      imageUrl: undefined, // Services don't have images by default
      deliveryType: service.provider?.deliveryType || 'On-site',
      priceInfo: service.price ? `CHF ${service.price}` : 'Contact for pricing',
    };
  }
}

export const marketplaceService = new MarketplaceService();
