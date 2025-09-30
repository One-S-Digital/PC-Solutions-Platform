// Service data adapter for transforming API responses to UI models
export interface ApiService {
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

export interface UIService {
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
  categoryLabel: string
  deliveryTypeLabel: string
  statusLabel: string
  formattedCreatedAt: string
}

export const serviceAdapter = {
  toUI: (apiService: ApiService): UIService => ({
    ...apiService,
    categoryLabel: apiService.category,
    deliveryTypeLabel: apiService.deliveryType || 'Not specified',
    statusLabel: apiService.status === 'active' ? 'Active' : 
                 apiService.status === 'inactive' ? 'Inactive' : 
                 'Pending',
    formattedCreatedAt: new Date(apiService.createdAt).toLocaleDateString(),
  }),
  
  toAPI: (uiService: Partial<UIService>): Partial<ApiService> => ({
    title: uiService.title,
    description: uiService.description,
    category: uiService.category,
    availability: uiService.availability,
    tags: uiService.tags,
    imageUrl: uiService.imageUrl,
    deliveryType: uiService.deliveryType,
    priceInfo: uiService.priceInfo,
    status: uiService.status,
  }),
}