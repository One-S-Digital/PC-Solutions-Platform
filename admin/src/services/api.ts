import axios from 'axios'
import axiosRetry from 'axios-retry'

import { useAuth } from '@clerk/clerk-react'
import { useMemo } from 'react'
import logger from '../utils/logger'
import { User, Organization, Product, Service, ApiResponse } from '../types/api'
import { AxiosInstance } from 'axios'


// Use environment variable for API base URL, fallback to '/api' for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Log the API base URL for debugging
console.log('🔧 API Base URL configured:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL: API_BASE_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE
})

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosRetry(api, {
  retries: 1,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) && error.response?.status !== 429;
  },
})

// Check if we're in development mode
const isDevelopmentMode = () => {
  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const nodeEnv = import.meta.env.MODE;
  
  return nodeEnv === 'development' || 
         !clerkKey ||
         clerkKey.includes('mock') ||
         clerkKey.includes('dev') ||
         clerkKey.includes('placeholder');
};

// Development API client (no auth required)
const createDevApiClient = () => {
  console.log('🔧 Creating development API client with baseURL:', API_BASE_URL)
  
  const devApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // Increased timeout for development mode
    headers: {
      'Content-Type': 'application/json',
    },
  });

  axiosRetry(devApi, {
    retries: 1,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      return axiosRetry.isNetworkOrIdempotentRequestError(error) && error.response?.status !== 429;
    },
  });

  devApi.interceptors.request.use(
    (config) => {
      logger.log('🔧 Dev API Request:', {
        url: config.url,
        method: config.method,
        hasAuth: false,
        mode: 'development'
      });
      return config;
    },
    (error) => {
      logger.error('❌ Dev API request error:', error);
      return Promise.reject(error);
    }
  );

  devApi.interceptors.response.use(
    (response) => {
      logger.log('✅ Dev API Response:', {
        url: response.config.url,
        status: response.status,
        statusText: response.statusText
      });
      return response;
    },
    (error) => {
      logger.error('❌ Dev API Response Error:', {
        url: error.config?.url,
        status: error.response?.status,
        errorData: error.response?.data,
        errorMessage: error.message
      });
      return Promise.reject(error);
    }
  );

  return devApi;
};

// Request interceptor to add auth token
export const useApiClient = () => {
  const { getToken } = useAuth()

  return useMemo(() => {
    if (isDevelopmentMode()) {
      logger.log('🔧 Using development API client (no auth required)');
      return createDevApiClient();
    }

    const apiWithAuth = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // Increased timeout for upload operations
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('🔧 Creating production API client with baseURL:', API_BASE_URL)

    axiosRetry(apiWithAuth, {
      retries: 0,
      retryCondition: () => false,
    })


    apiWithAuth.interceptors.request.use(
      async (config) => {
        // Log all requests for debugging
        logger.log('[REQ]', {
          url: config.url,
          method: config.method,
          origin: window.location.origin,
        });

        try {
          const token = await getToken()
          console.log('🔧 Token Debug:', {
            hasToken: !!token,
            tokenLength: token?.length || 0,
            tokenStart: token?.substring(0, 20) || 'none',
            url: config.url
          });
          
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
            logger.log('✅ Admin Dashboard API token added:', {
              url: config.url,
              tokenLength: token.length,
              hasAuth: true
            });
          } else {
            logger.warn('⚠️ Admin Dashboard API no token available:', {
              url: config.url,
              hasAuth: false
            });
          }
        } catch (error) {
          console.error('❌ Token Error:', error);
          logger.error('❌ Admin Dashboard API token error:', {
            url: config.url,
            error: error,
            errorMessage: (error as Error)?.message
          });
        }
        return config
      },
      (error) => {
        logger.error('❌ Admin Dashboard API request interceptor error:', error);
        return Promise.reject(error)
      }
    )

    apiWithAuth.interceptors.response.use(
      (response) => {
        logger.log('✅ Admin Dashboard API Response Success:', {
          url: response.config.url,
          status: response.status,
          statusText: response.statusText,
          dataKeys: response.data ? Object.keys(response.data) : 'no data'
        });
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error('❌ Admin Dashboard API Response Error:', {
            url: error.config?.url,
            status: error.response.status,
            errorData: error.response?.data,
            errorMessage: error.message
          });
        } else if (error.request) {
          logger.log('[ERR NO RESPONSE]', error.message);
        } else {
          logger.log('[ERR SETUP]', error.message);
        }
        return Promise.reject(error);
      }
    );

    return apiWithAuth
  }, [getToken])
}

// Public API calls (no auth required)
export const publicApi = {
  getSystemHealth: () => api.get<ApiResponse<SystemHealth>>('/health'),
  getPartners: () => api.get('/partners'),
}

// API service functions
export const apiService = {
  // Users
  getUsers: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<User[]>>('/users'),
  getUserById: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<User>>(`/users/${id}`),
  createUser: (apiClient: AxiosInstance, userData: Partial<User>) => apiClient.post<ApiResponse<User>>('/users', userData),
  updateUser: (apiClient: AxiosInstance, id: string, userData: Partial<User>) => apiClient.put<ApiResponse<User>>(`/users/${id}`, userData),
  deleteUser: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/users/${id}`),

  // Organizations
  getOrganizations: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Organization[]>>('/organizations'),
  getOrganizationById: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<Organization>>(`/organizations/${id}`),
  createOrganization: (apiClient: AxiosInstance, orgData: Partial<Organization>) => apiClient.post<ApiResponse<Organization>>('/organizations', orgData),
  updateOrganization: (apiClient: AxiosInstance, id: string, orgData: Partial<Organization>) => apiClient.put<ApiResponse<Organization>>(`/organizations/${id}`, orgData),

  // Products

  getProducts: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Product[]>>('/products'),
  getProductById: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<Product>>(`/products/${id}`),
  createProduct: (apiClient: AxiosInstance, productData: Partial<Product>) => apiClient.post<ApiResponse<Product>>('/products', productData),
  updateProduct: (apiClient: AxiosInstance, id: string, productData: Partial<Product>) => apiClient.put<ApiResponse<Product>>(`/products/${id}`, productData),
  deleteProduct: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/products/${id}`),

  // Services
  getServices: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Service[]>>('/services'),
  getService: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<Service>>(`/services/${id}`),
  createService: (apiClient: AxiosInstance, serviceData: Partial<Service>) => apiClient.post<ApiResponse<Service>>('/services', serviceData),
  updateService: (apiClient: AxiosInstance, id: string, serviceData: Partial<Service>) => apiClient.put<ApiResponse<Service>>(`/services/${id}`, serviceData),
  deleteService: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/services/${id}`),

  // Job Listings
  getJobListings: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<JobListing[]>>('/job-listings'),

  // Candidates
  getCandidates: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Candidate[]>>('/candidates'),


  // Content
  getHrDocuments: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<HrDocument[]>>('/hr-documents'),
  getHrDocument: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<HrDocument>>(`/hr-documents/${id}`),
  createHrDocument: (apiClient: AxiosInstance, data: Omit<HrDocument, 'id' | 'updatedAt'>) => apiClient.post<ApiResponse<HrDocument>>('/hr-documents', data),
  updateHrDocument: (apiClient: AxiosInstance, id: string, data: Partial<HrDocument>) => apiClient.put<ApiResponse<HrDocument>>(`/hr-documents/${id}`, data),
  deleteHrDocument: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/hr-documents/${id}`),

  getCourses: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Course[]>>('/courses'),
  getCourse: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<Course>>(`/courses/${id}`),
  createCourse: (apiClient: AxiosInstance, data: Omit<Course, 'id' | 'updatedDate'>) => apiClient.post<ApiResponse<Course>>('/courses', data),
  updateCourse: (apiClient: AxiosInstance, id: string, data: Partial<Course>) => apiClient.put<ApiResponse<Course>>(`/courses/${id}`, data),
  deleteCourse: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/courses/${id}`),

  getPolicyDocuments: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<PolicyDocument[]>>('/policy-documents'),
  getPolicyDocument: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<PolicyDocument>>(`/policy-documents/${id}`),
  createPolicyDocument: (apiClient: AxiosInstance, data: Omit<PolicyDocument, 'id' | 'lastUpdatedDate'>) => apiClient.post<ApiResponse<PolicyDocument>>('/policy-documents', data),
  updatePolicyDocument: (apiClient: AxiosInstance, id: string, data: Partial<PolicyDocument>) => apiClient.put<ApiResponse<PolicyDocument>>(`/policy-documents/${id}`, data),
  deletePolicyDocument: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/policy-documents/${id}`),

  getPolicyAlerts: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<PolicyAlert[]>>('/policy-alerts'),
  getPolicyAlert: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<PolicyAlert>>(`/policy-alerts/${id}`),
  createPolicyAlert: (apiClient: AxiosInstance, data: Omit<PolicyAlert, 'id' | 'creationDate'>) => apiClient.post<ApiResponse<PolicyAlert>>('/policy-alerts', data),
  updatePolicyAlert: (apiClient: AxiosInstance, id: string, data: Partial<PolicyAlert>) => apiClient.put<ApiResponse<PolicyAlert>>(`/policy-alerts/${id}`, data),
  deletePolicyAlert: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/policy-alerts/${id}`),

  // Parent Leads
  getParentLeads: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<ParentLead[]>>('/parent-leads'),

  // Orders

  getOrders: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Order[]>>('/orders'),
  getOrderRequests: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<OrderRequest[]>>('/order-requests'),

  // Messaging
  getConversations: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Conversation[]>>('/messages/conversations'),
  getConversation: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<Conversation>>(`/messages/conversations/${id}`),
  createConversation: (apiClient: AxiosInstance, data: Omit<Conversation, 'id' | 'lastMessageSnippet' | 'lastMessageAt' | 'unreadCount'>) => apiClient.post<ApiResponse<Conversation>>('/messages/conversations', data),
  getMessages: (apiClient: AxiosInstance, conversationId: string) => apiClient.get<ApiResponse<Message[]>>(`/messages/conversations/${conversationId}/messages`),
  sendMessage: (apiClient: AxiosInstance, data: { conversationId: string; content: string }) => apiClient.post<ApiResponse<Message>>('/messages', data),
  markMessageAsRead: (apiClient: AxiosInstance, id: string) => apiClient.put<ApiResponse<Message>>(`/messages/${id}/read`),

  // System
  getCurrentUser: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<User>>('/users/me'),

  // File Management
  uploadUniversalFile: (apiClient: AxiosInstance, formData: FormData) => apiClient.post<ApiResponse<FileUploadResult>>('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  getFileTypeInfo: (apiClient: AxiosInstance, kind: string) => apiClient.get<ApiResponse<FileTypeInfo>>(`/files/types/${kind}`),

  getAllFileTypes: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<FileTypeInfo[]>>('/files/types'),

  searchFiles: (apiClient: AxiosInstance, params: Record<string, string>) => apiClient.get<ApiResponse<FileSearchResult[]>>('/files/search', { params }),

  getFileAnalytics: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<FileAnalytics>>('/files/analytics'),

  getFileHealth: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<FileHealth>>('/files/health'),

  // Frontend Settings
  getFrontendSettings: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<FrontendSettings>>('/admin/frontend-settings'),
  updateFrontendSettings: (apiClient: AxiosInstance, settings: Partial<FrontendSettings>) => apiClient.put<ApiResponse<FrontendSettings>>('/admin/frontend-settings', settings),

  // Asset Management
  uploadAsset: (apiClient: AxiosInstance, formData: FormData) => apiClient.post<ApiResponse<UploadedAsset>>('/admin/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  // Logo and Favicon Uploads
  uploadLogo: (apiClient: AxiosInstance, formData: FormData) => {
    const fullUrl = `${apiClient.defaults.baseURL}/admin/frontend-settings/logo`
    console.log('🔄 API: uploadLogo called with full URL:', fullUrl)
    return apiClient.post<ApiResponse<UploadedAsset>>('/admin/frontend-settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  uploadFavicon: (apiClient: AxiosInstance, formData: FormData) => {
    const fullUrl = `${apiClient.defaults.baseURL}/admin/frontend-settings/favicon`
    console.log('🔄 API: uploadFavicon called with full URL:', fullUrl)
    return apiClient.post<ApiResponse<UploadedAsset>>('/admin/frontend-settings/favicon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  uploadAdminLogo: (apiClient: AxiosInstance, formData: FormData) => {
    const fullUrl = `${apiClient.defaults.baseURL}/admin/frontend-settings/admin-logo`
    console.log('🔄 API: uploadAdminLogo called with full URL:', fullUrl)
    return apiClient.post<ApiResponse<UploadedAsset>>('/admin/frontend-settings/admin-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  uploadAdminFavicon: (apiClient: AxiosInstance, formData: FormData) => {
    const fullUrl = `${apiClient.defaults.baseURL}/admin/frontend-settings/admin-favicon`
    console.log('🔄 API: uploadAdminFavicon called with full URL:', fullUrl)
    return apiClient.post<ApiResponse<UploadedAsset>>('/admin/frontend-settings/admin-favicon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // Health Check

  getSettingsHealth: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<SettingsHealth>>('/admin/settings/health'),
  getSystemHealth: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<SystemHealth>>('/health'),
  getDbHealth: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<DbHealth>>('/health/db'),


  // Legacy upload (keeping for compatibility)
  uploadFile: (apiClient: AxiosInstance, file: FormData) => apiClient.post<ApiResponse<LegacyUploadResult>>('/admin/upload', file, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
}

export default api
