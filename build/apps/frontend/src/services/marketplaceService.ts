// API base URL configuration
const API_BASE_URL = '/api';

export interface Product {
  id: string;
  title: string;
  description?: string;
  price?: number;
  category?: string;
  tags: string[];
  isActive: boolean;
  supplierId: string;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: string;
    name: string;
    type: string;
  };
  imageAsset?: {
    id: string;
    publicUrl: string;
    filename: string;
  };
}

export interface Service {
  id: string;
  title: string;
  description?: string;
  category: string;
  price?: number;
  isActive: boolean;
  providerId: string;
  createdAt: string;
  updatedAt: string;
  provider?: {
    id: string;
    organization: {
      id: string;
      name: string;
      type: string;
    };
  };
}

export interface Order {
  id: string;
  organizationId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: string;
    name: string;
  };
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface ServiceRequest {
  id: string;
  organizationId: string;
  serviceId: string;
  description?: string;
  status: string;
  requestedAt: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: string;
    name: string;
  };
  service: Service;
}

export interface Catalog {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  uploadedAt: string;
  pdfAsset?: {
    id: string;
    filename: string;
    publicUrl: string;
  };
  csvAsset?: {
    id: string;
    filename: string;
    publicUrl: string;
  };
  supplier: {
    id: string;
    name: string;
  };
}

export interface CreateProductData {
  title: string;
  description?: string;
  price?: number;
  category?: string;
  tags?: string[];
  imageAssetId?: string;
}

export interface UpdateProductData {
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  tags?: string[];
  isActive?: boolean;
  imageAssetId?: string;
}

export interface CreateServiceData {
  title: string;
  description?: string;
  category: string;
  price?: number;
}

export interface UpdateServiceData {
  title?: string;
  description?: string;
  category?: string;
  price?: number;
  isActive?: boolean;
}

export interface CreateOrderData {
  notes?: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface CreateCatalogData {
  title: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCatalogData {
  title?: string;
  description?: string;
  isActive?: boolean;
}

export interface MarketplaceFilters {
  category?: string;
  supplierId?: string;
  providerId?: string;
  isActive?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

class MarketplaceService {
  private baseUrl = `${API_BASE_URL}/marketplace`;

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    getToken?: () => Promise<string | null>
  ): Promise<T> {
    const token = getToken ? await getToken() : null;
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Product Management
  async createProduct(data: CreateProductData, getToken: () => Promise<string | null>): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }, getToken);
  }

  async getProducts(filters?: MarketplaceFilters, getToken?: () => Promise<string | null>): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.supplierId) params.append('supplierId', filters.supplierId);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());

    const queryString = params.toString();
    return this.request<Product[]>(`/products${queryString ? `?${queryString}` : ''}`, {}, getToken);
  }

  async getProduct(id: string, getToken?: () => Promise<string | null>): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {}, getToken);
  }

  async updateProduct(id: string, data: UpdateProductData, getToken: () => Promise<string | null>): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, getToken);
  }

  async deleteProduct(id: string, getToken: () => Promise<string | null>): Promise<void> {
    return this.request<void>(`/products/${id}`, {
      method: 'DELETE',
    }, getToken);
  }

  // Service Management
  async createService(data: CreateServiceData, getToken: () => Promise<string | null>): Promise<Service> {
    return this.request<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }, getToken);
  }

  async getServices(filters?: MarketplaceFilters, getToken?: () => Promise<string | null>): Promise<Service[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.providerId) params.append('providerId', filters.providerId);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());

    const queryString = params.toString();
    return this.request<Service[]>(`/services${queryString ? `?${queryString}` : ''}`, {}, getToken);
  }

  async getService(id: string, getToken?: () => Promise<string | null>): Promise<Service> {
    return this.request<Service>(`/services/${id}`, {}, getToken);
  }

  async updateService(id: string, data: UpdateServiceData, getToken: () => Promise<string | null>): Promise<Service> {
    return this.request<Service>(`/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, getToken);
  }

  async deleteService(id: string, getToken: () => Promise<string | null>): Promise<void> {
    return this.request<void>(`/services/${id}`, {
      method: 'DELETE',
    }, getToken);
  }

  // Order Management
  async createOrder(data: CreateOrderData, getToken: () => Promise<string | null>): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }, getToken);
  }

  async getOrders(getToken: () => Promise<string | null>): Promise<Order[]> {
    return this.request<Order[]>('/orders', {}, getToken);
  }

  async getOrder(id: string, getToken?: () => Promise<string | null>): Promise<Order> {
    return this.request<Order>(`/orders/${id}`, {}, getToken);
  }

  async updateOrderStatus(id: string, status: string, getToken: () => Promise<string | null>): Promise<Order> {
    return this.request<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, getToken);
  }

  // Service Request Management
  async createServiceRequest(
    serviceId: string,
    description?: string,
    scheduledAt?: string,
    getToken?: () => Promise<string | null>
  ): Promise<ServiceRequest> {
    return this.request<ServiceRequest>('/service-requests', {
      method: 'POST',
      body: JSON.stringify({
        serviceId,
        description,
        scheduledAt,
      }),
    }, getToken);
  }

  async getServiceRequests(getToken?: () => Promise<string | null>): Promise<ServiceRequest[]> {
    return this.request<ServiceRequest[]>('/service-requests', {}, getToken);
  }

  async updateServiceRequestStatus(id: string, status: string, getToken: () => Promise<string | null>): Promise<ServiceRequest> {
    return this.request<ServiceRequest>(`/service-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, getToken);
  }

  // Catalog Management
  async createCatalog(data: CreateCatalogData, getToken: () => Promise<string | null>): Promise<Catalog> {
    return this.request<Catalog>('/catalogs', {
      method: 'POST',
      body: JSON.stringify(data),
    }, getToken);
  }

  async getCatalogs(filters?: { supplierId?: string; isActive?: boolean; search?: string }, getToken?: () => Promise<string | null>): Promise<Catalog[]> {
    const params = new URLSearchParams();
    if (filters?.supplierId) params.append('supplierId', filters.supplierId);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    return this.request<Catalog[]>(`/catalogs${queryString ? `?${queryString}` : ''}`, {}, getToken);
  }

  async getCatalog(id: string, getToken?: () => Promise<string | null>): Promise<Catalog> {
    return this.request<Catalog>(`/catalogs/${id}`, {}, getToken);
  }

  async updateCatalog(id: string, data: UpdateCatalogData, getToken: () => Promise<string | null>): Promise<Catalog> {
    return this.request<Catalog>(`/catalogs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, getToken);
  }

  async deleteCatalog(id: string, getToken: () => Promise<string | null>): Promise<void> {
    return this.request<void>(`/catalogs/${id}`, {
      method: 'DELETE',
    }, getToken);
  }

  async associateCatalogAssets(
    catalogId: string,
    pdfAssetId?: string,
    csvAssetId?: string,
    getToken?: () => Promise<string | null>
  ): Promise<Catalog> {
    return this.request<Catalog>(`/catalogs/${catalogId}/assets`, {
      method: 'PATCH',
      body: JSON.stringify({ pdfAssetId, csvAssetId }),
    }, getToken);
  }

  async processCsvCatalog(catalogId: string, csvAssetId: string, getToken: () => Promise<string | null>): Promise<any> {
    return this.request(`/catalogs/${catalogId}/process-csv`, {
      method: 'POST',
      body: JSON.stringify({ csvAssetId }),
    }, getToken);
  }

  async getCsvTemplate(getToken: () => Promise<string | null>): Promise<any> {
    return this.request('/catalogs/csv-template', {}, getToken);
  }

  // Analytics
  async getMarketplaceStats(getToken: () => Promise<string | null>): Promise<{
    totalProducts: number;
    totalServices: number;
    totalOrders: number;
    totalServiceRequests: number;
    totalCatalogs: number;
    activeSuppliers: number;
    activeServiceProviders: number;
  }> {
    return this.request('/stats', {}, getToken);
  }
}

export const marketplaceService = new MarketplaceService();