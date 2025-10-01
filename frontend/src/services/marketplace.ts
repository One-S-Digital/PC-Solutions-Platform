import { apiClient } from './api';
import { Product, Service, Order, OrderItem, ServiceRequest, Catalog, Asset } from './types';

// Marketplace service for managing marketplace-related API calls
export class MarketplaceService {
  // Product endpoints
  async getProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    supplierId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.get(`/marketplace/products?${queryParams.toString()}`);
  }

  async getProductById(productId: string): Promise<Product> {
    return apiClient.get<Product>(`/marketplace/products/${productId}`);
  }

  async createProduct(data: {
    title: string;
    description?: string;
    price?: number;
    category?: string;
    tags?: string[];
    imageAssetId?: string;
  }): Promise<Product> {
    return apiClient.post<Product>('/marketplace/products', data);
  }

  async updateProduct(productId: string, data: Partial<Product>): Promise<Product> {
    return apiClient.patch<Product>(`/marketplace/products/${productId}`, data);
  }

  async deleteProduct(productId: string): Promise<void> {
    return apiClient.delete(`/marketplace/products/${productId}`);
  }

  // Service endpoints
  async getServices(params?: {
    page?: number;
    limit?: number;
    category?: string;
    providerId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<{
    data: Service[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.providerId) queryParams.append('providerId', params.providerId);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.get(`/marketplace/services?${queryParams.toString()}`);
  }

  async getServiceById(serviceId: string): Promise<Service> {
    return apiClient.get<Service>(`/marketplace/services/${serviceId}`);
  }

  async createService(data: {
    title: string;
    description?: string;
    category: string;
    price?: number;
  }): Promise<Service> {
    return apiClient.post<Service>('/marketplace/services', data);
  }

  async updateService(serviceId: string, data: Partial<Service>): Promise<Service> {
    return apiClient.patch<Service>(`/marketplace/services/${serviceId}`, data);
  }

  async deleteService(serviceId: string): Promise<void> {
    return apiClient.delete(`/marketplace/services/${serviceId}`);
  }

  // Order endpoints
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
  }): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId);

    return apiClient.get(`/marketplace/orders?${queryParams.toString()}`);
  }

  async getOrderById(orderId: string): Promise<Order> {
    return apiClient.get<Order>(`/marketplace/orders/${orderId}`);
  }

  async createOrder(data: {
    items: {
      productId: string;
      quantity: number;
      price: number;
    }[];
    notes?: string;
  }): Promise<Order> {
    return apiClient.post<Order>('/marketplace/orders', data);
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    return apiClient.patch<Order>(`/marketplace/orders/${orderId}/status`, { status });
  }

  // Service Request endpoints
  async getServiceRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    serviceId?: string;
  }): Promise<{
    data: ServiceRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.serviceId) queryParams.append('serviceId', params.serviceId);

    return apiClient.get(`/marketplace/service-requests?${queryParams.toString()}`);
  }

  async createServiceRequest(data: {
    serviceId: string;
    description?: string;
    scheduledAt?: string;
  }): Promise<ServiceRequest> {
    return apiClient.post<ServiceRequest>('/marketplace/service-requests', data);
  }

  async updateServiceRequestStatus(requestId: string, status: string): Promise<ServiceRequest> {
    return apiClient.patch<ServiceRequest>(`/marketplace/service-requests/${requestId}/status`, { status });
  }

  // Catalog endpoints
  async getCatalogs(params?: {
    page?: number;
    limit?: number;
    supplierId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<{
    data: Catalog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.get(`/marketplace/catalogs?${queryParams.toString()}`);
  }

  async getCatalogById(catalogId: string): Promise<Catalog> {
    return apiClient.get<Catalog>(`/marketplace/catalogs/${catalogId}`);
  }

  async createCatalog(data: {
    title: string;
    description?: string;
    pdfAssetId?: string;
    csvAssetId?: string;
  }): Promise<Catalog> {
    return apiClient.post<Catalog>('/marketplace/catalogs', data);
  }

  async updateCatalog(catalogId: string, data: Partial<Catalog>): Promise<Catalog> {
    return apiClient.patch<Catalog>(`/marketplace/catalogs/${catalogId}`, data);
  }

  async deleteCatalog(catalogId: string): Promise<void> {
    return apiClient.delete(`/marketplace/catalogs/${catalogId}`);
  }

  async associateCatalogAssets(catalogId: string, data: {
    pdfAssetId?: string;
    csvAssetId?: string;
  }): Promise<Catalog> {
    return apiClient.patch<Catalog>(`/marketplace/catalogs/${catalogId}/assets`, data);
  }

  async processCsvCatalog(catalogId: string, csvAssetId: string): Promise<{ message: string; productsCreated: number }> {
    return apiClient.post(`/marketplace/catalogs/${catalogId}/process-csv`, { csvAssetId });
  }

  async getCsvTemplate(): Promise<{
    template: any;
    instructions: string[];
  }> {
    return apiClient.get('/marketplace/catalogs/csv-template');
  }

  // Analytics endpoints
  async getMarketplaceStats(): Promise<{
    totalProducts: number;
    totalServices: number;
    totalOrders: number;
    totalServiceRequests: number;
    productsByCategory: Record<string, number>;
    servicesByCategory: Record<string, number>;
    ordersByStatus: Record<string, number>;
    serviceRequestsByStatus: Record<string, number>;
    revenueByMonth: Record<string, number>;
    topProducts: Array<{ product: Product; sales: number }>;
    topServices: Array<{ service: Service; requests: number }>;
  }> {
    return apiClient.get('/marketplace/stats');
  }

  // Search functionality
  async searchProducts(query: string, filters?: {
    category?: string;
    supplierId?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Product[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('search', query);
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.supplierId) queryParams.append('supplierId', filters.supplierId);
    if (filters?.minPrice) queryParams.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) queryParams.append('maxPrice', filters.maxPrice.toString());

    const response = await apiClient.get<{ data: Product[] }>(`/marketplace/products/search?${queryParams.toString()}`);
    return response.data;
  }

  async searchServices(query: string, filters?: {
    category?: string;
    providerId?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Service[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('search', query);
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.providerId) queryParams.append('providerId', filters.providerId);
    if (filters?.minPrice) queryParams.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) queryParams.append('maxPrice', filters.maxPrice.toString());

    const response = await apiClient.get<{ data: Service[] }>(`/marketplace/services/search?${queryParams.toString()}`);
    return response.data;
  }

  // File upload for product images
  async uploadProductImage(productId: string, file: File, onProgress?: (progress: number) => void): Promise<Asset> {
    return apiClient.uploadFile<Asset>(`/marketplace/products/${productId}/image`, file, onProgress);
  }

  // File upload for catalog files
  async uploadCatalogFile(catalogId: string, file: File, type: 'pdf' | 'csv', onProgress?: (progress: number) => void): Promise<Asset> {
    return apiClient.uploadFile<Asset>(`/marketplace/catalogs/${catalogId}/${type}`, file, onProgress);
  }
}

// Create singleton instance
export const marketplaceService = new MarketplaceService();

export default marketplaceService;