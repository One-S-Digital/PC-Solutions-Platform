import { apiService, ApiResponse } from './api';
import { Product, Service, ServiceCategory, ServiceDeliveryType } from '../types';
import { API_ENDPOINTS } from './api-endpoints';

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
  category: ServiceCategory | string;
  price?: number;
  priceInfo?: string;
  availability?: string;
  deliveryType?: ServiceDeliveryType;
  tags?: string[];
  imageUrl?: string;
}

export interface ServiceUpdateData extends Partial<ServiceCreateData> {
  isActive?: boolean;
}

class MarketplaceService {
  // Products
  async getProducts(page = 1, limit = 20, category?: string, search?: string): Promise<{ products: Product[]; pagination: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(category && { category }),
      ...(search && { search }),
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
    const response = await apiService.get<Product>(API_ENDPOINTS.marketplace.products.get(id));
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
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(category && { category }),
      ...(search && { search }),
    });
    
    const response = await apiService.get<{ services: Service[]; pagination: any }>(
      `${API_ENDPOINTS.marketplace.services.list}?${params.toString()}`
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
    const response = await apiService.get<Service>(API_ENDPOINTS.marketplace.services.get(id));
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
    const response = await apiService.put<Service>(API_ENDPOINTS.marketplace.services.update(id), data);
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
      supplierLogo: product.supplier?.logoAsset?.publicUrl,
      imageUrl: product.imageAsset?.publicUrl,
      stockStatus: 'In Stock', // Default status
    };
  }

  // Transform service data to include legacy fields for UI compatibility
  private transformService(service: any): Service {
    return {
      ...service,
      providerName: service.provider?.organization?.name ?? service.providerName,
      providerLogo: service.provider?.organization?.logoAsset?.publicUrl ?? service.providerLogo,
      availability: service.availability ?? 'Available on request',
      tags: service.tags ?? [],
      imageUrl: service.imageUrl ?? undefined,
      deliveryType: service.deliveryType ?? service.provider?.deliveryType ?? 'On-site',
      priceInfo: service.priceInfo ?? (service.price ? `CHF ${service.price}` : 'Contact for pricing'),
    };
  }
}

export const marketplaceService = new MarketplaceService();
