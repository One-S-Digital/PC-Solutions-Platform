import { apiClient } from './client'
import { PaginatedResponse } from '@pc-solutions/api-types'

export interface Product {
  id: string
  title: string
  supplierId: string
  supplierName: string
  supplierLogo?: string
  description: string
  category: string
  tags: string[]
  imageUrl?: string
  price?: number
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'On Demand'
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  title: string
  providerId: string
  providerName: string
  providerLogo?: string
  description: string
  category: 'Cleaning' | 'Workshops' | 'Legal' | 'IT Support' | 'Pedagogy' | 'Other'
  availability: string
  tags: string[]
  imageUrl?: string
  deliveryType?: 'On-site' | 'Remote' | 'Hybrid'
  priceInfo?: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt: string
}

export interface CreateProductRequest {
  title: string
  description: string
  category: string
  tags: string[]
  imageUrl?: string
  price?: number
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'On Demand'
}

export interface CreateServiceRequest {
  title: string
  description: string
  category: 'Cleaning' | 'Workshops' | 'Legal' | 'IT Support' | 'Pedagogy' | 'Other'
  availability: string
  tags: string[]
  imageUrl?: string
  deliveryType?: 'On-site' | 'Remote' | 'Hybrid'
  priceInfo?: string
}

export interface ProductsQuery {
  page?: number
  limit?: number
  category?: string
  supplierId?: string
  status?: string
  search?: string
}

export interface ServicesQuery {
  page?: number
  limit?: number
  category?: string
  providerId?: string
  status?: string
  search?: string
}

export const marketplaceApi = {
  // Products
  getProducts: (query?: ProductsQuery): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.category) params.append('category', query.category)
    if (query?.supplierId) params.append('supplierId', query.supplierId)
    if (query?.status) params.append('status', query.status)
    if (query?.search) params.append('search', query.search)
    
    return apiClient.get<PaginatedResponse<Product>>(`/products?${params.toString()}`)
  },

  getProduct: (productId: string): Promise<{ data: Product }> => {
    return apiClient.get<{ data: Product }>(`/products/${productId}`)
  },

  createProduct: (data: CreateProductRequest): Promise<{ data: Product }> => {
    return apiClient.post<{ data: Product }>('/products', data)
  },

  updateProduct: (productId: string, data: Partial<CreateProductRequest>): Promise<{ data: Product }> => {
    return apiClient.put<{ data: Product }>(`/products/${productId}`, data)
  },

  deleteProduct: (productId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/products/${productId}`)
  },

  // Services
  getServices: (query?: ServicesQuery): Promise<PaginatedResponse<Service>> => {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.category) params.append('category', query.category)
    if (query?.providerId) params.append('providerId', query.providerId)
    if (query?.status) params.append('status', query.status)
    if (query?.search) params.append('search', query.search)
    
    return apiClient.get<PaginatedResponse<Service>>(`/services?${params.toString()}`)
  },

  getService: (serviceId: string): Promise<{ data: Service }> => {
    return apiClient.get<{ data: Service }>(`/services/${serviceId}`)
  },

  createService: (data: CreateServiceRequest): Promise<{ data: Service }> => {
    return apiClient.post<{ data: Service }>('/services', data)
  },

  updateService: (serviceId: string, data: Partial<CreateServiceRequest>): Promise<{ data: Service }> => {
    return apiClient.put<{ data: Service }>(`/services/${serviceId}`, data)
  },

  deleteService: (serviceId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/services/${serviceId}`)
  },
}