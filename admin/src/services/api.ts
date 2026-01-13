import axios from 'axios'
import axiosRetry from 'axios-retry'

import { useAuth } from '@clerk/clerk-react'
import { useMemo } from 'react'
import logger from '../utils/logger'
import { 
  User, 
  Organization, 
  Product, 
  Service, 
  ApiResponse,
  InviteUserResponse,
  AnalyticsOverview,
  AdminDashboardCounts,
  UserAnalytics,
  OrgAnalytics,
  ProductAnalytics,
  JobAnalytics,
  RevenueAnalytics,
  SystemUsageAnalytics,
  Partner,
  PartnerStats,
  PartnerType
} from '../types/api'
import { AxiosInstance } from 'axios'
import { UserRole } from '../types'


// Use environment variable for API base URL, fallback to '/api' for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Log the API base URL for debugging (dev only)
if (import.meta.env.DEV) {
  console.log('🔧 API Base URL configured:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    API_BASE_URL: API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  })
}

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

// Development API client (with auth using getToken callback)
const createDevApiClient = (getToken: () => Promise<string | null>) => {
  if (import.meta.env.DEV) {
    console.log('🔧 Creating development API client with baseURL:', API_BASE_URL)
  }
  
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
    async (config) => {
      try {
        const token = await getToken();
        const url = config.url || '';
        const isAdminStatus =
          url.includes('/static-translations/admin/full-sync/') &&
          url.endsWith('/status');
        const isPublicFullSyncStatus =
          url.includes('/static-translations/public/full-sync/') &&
          url.endsWith('/status');

        // Ensure headers object exists
        config.headers = config.headers || {};

        if (isAdminStatus || isPublicFullSyncStatus) {
          // Public status endpoints - DO NOT send Authorization
          delete (config.headers as any).Authorization;
          delete (config.headers as any).authorization;
          logger.log('🔧 Dev API Request (public full-sync status, no auth)', {
            url: config.url,
            method: config.method,
            hasAuth: false,
            mode: 'development',
          });
        } else {
          if (token) {
            (config.headers as any).Authorization = `Bearer ${token}`;
            logger.log('🔧 Dev API Request:', {
              url: config.url,
              method: config.method,
              hasAuth: true,
              mode: 'development',
            });
          } else {
            // No token - might be public endpoint or user not logged in yet
            logger.log('🔧 Dev API Request:', {
              url: config.url,
              method: config.method,
              hasAuth: false,
              mode: 'development',
            });
          }
        }
      } catch (error) {
        logger.error('❌ Dev API token error:', error);
      }
      
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
      logger.log('🔧 Using development API client (with Clerk auth)');
      return createDevApiClient(getToken);
    }

    const apiWithAuth = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // Increased timeout for upload operations
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (import.meta.env.DEV) {
      console.log('🔧 Creating production API client with baseURL:', API_BASE_URL)
    }

    // Enable retries ONLY for status polling requests (GET /static-translations/admin/full-sync/*/status)
    axiosRetry(apiWithAuth, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        const url = error.config?.url ?? '';
        const isStatusPoll =
          url.includes('/static-translations/admin/full-sync/') &&
          url.includes('/status');
        const isGet = (error.config?.method ?? 'get').toLowerCase() === 'get';
        const status = error.response?.status;
        // Retry on network errors and HTTP 502/503/504 for status polling only
        return isGet && isStatusPoll && (!status || [502, 503, 504].includes(status));
      },
    })


    apiWithAuth.interceptors.request.use(
      async (config) => {
        try {
          const token = await getToken()
          const url = config.url || ''
          const isAdminStatus =
            url.includes('/static-translations/admin/full-sync/') &&
            url.endsWith('/status')
          const isPublicFullSyncStatus =
            url.includes('/static-translations/public/full-sync/') &&
            url.endsWith('/status')

          // Ensure headers object exists
          config.headers = config.headers || {}

          if (isAdminStatus || isPublicFullSyncStatus) {
            // Public full-sync status endpoints - DO NOT send Authorization
            delete (config.headers as any).Authorization
            delete (config.headers as any).authorization
            logger.log('✅ Admin Dashboard API public full-sync status request (no auth):', {
              url: config.url,
              hasAuth: false,
            })
          } else {
            if (token) {
              ;(config.headers as any).Authorization = `Bearer ${token}`
              logger.log('✅ Admin Dashboard API token added:', {
                url: config.url,
                hasAuth: true,
              })
            } else {
              logger.warn('⚠️ Admin Dashboard API no token available:', {
                url: config.url,
                hasAuth: false,
              })
            }
          }
        } catch (error) {
          logger.error('❌ Admin Dashboard API token error:', {
            url: config.url,
            error: error
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
  getPartners: () => api.get<ApiResponse<Partner[]>>('/partners/active'),
}

// API service functions
export const apiService = {
  // Users
  getUsers: (
    apiClient: AxiosInstance,
    params?: { page?: number; limit?: number; search?: string; role?: string },
  ) => apiClient.get<ApiResponse<any>>('/users', { params }),
  getAdminUsers: (apiClient: AxiosInstance, params?: { page?: number; limit?: number; search?: string; role?: string }) => 
    apiClient.get<ApiResponse<{ users: User[]; total: number; page: number; limit: number; totalPages: number }>>('/admin/users', { params }),
  getAdminUserStats: (apiClient: AxiosInstance) =>
    apiClient.get<any>('/admin/users/stats'),
  getUserById: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<User>>(`/users/${id}`),
  createUser: (apiClient: AxiosInstance, userData: Partial<User>) => apiClient.post<ApiResponse<User>>('/users', userData),
  inviteUser: (
    apiClient: AxiosInstance,
    payload: { email: string; role: UserRole; redirectUrl?: string; reason?: string },
  ) => apiClient.post<ApiResponse<InviteUserResponse>>('/users/invite', payload),
  updateUser: (apiClient: AxiosInstance, id: string, userData: Partial<User>) => {
    // Exclude id from the body - it's already in the URL and not allowed in UpdateUserDto
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...updateData } = userData
    return apiClient.patch<ApiResponse<User>>(`/users/${id}`, updateData)
  },
  deleteUser: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/users/${id}`),
  
  // Role Elevation - Super Admin only
  elevateUserToAdmin: (
    apiClient: AxiosInstance, 
    userId: string, 
    targetRole: 'ADMIN' | 'SUPER_ADMIN',
    reason?: string
  ) => apiClient.post<ApiResponse<User>>(`/users/${userId}/elevate-to-admin`, { targetRole, reason }),

  // Organizations
  getOrganizations: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Organization[]>>('/compat/organizations', { params: { limit: 10000 } }),
  getOrganizationById: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<Organization>>(`/compat/organizations/${id}`),
  createOrganization: (apiClient: AxiosInstance, orgData: Partial<Organization>) => apiClient.post<ApiResponse<Organization>>('/compat/organizations', orgData),
  updateOrganization: (apiClient: AxiosInstance, id: string, orgData: Partial<Organization>) => apiClient.put<ApiResponse<Organization>>(`/compat/organizations/${id}`, orgData),
  deleteOrganization: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/compat/organizations/${id}`),

  // Organization Backfill (Admin)
  getUsersWithoutOrganizations: (apiClient: AxiosInstance) => 
    apiClient.get<ApiResponse<{ total: number; byRole: { foundations: number; productSuppliers: number; serviceProviders: number }; users: any[] }>>('/admin/users-without-organizations'),
  backfillOrganizations: (apiClient: AxiosInstance) => 
    apiClient.post<ApiResponse<{ total: number; created: number; failed: number; details: any[] }>>('/admin/backfill-organizations'),

  // Discount Terminations / Vendor Clients (Admin)
  getVendorClients: (
    apiClient: AxiosInstance,
    params?: { vendorId?: string; orgId?: string; isActive?: boolean; reason?: string },
  ) => apiClient.get<ApiResponse<any[]>>('/admin/vendor-clients', { params }),
  upsertVendorClient: (
    apiClient: AxiosInstance,
    data: { vendorId: string; orgId: string; isActive: boolean; reason?: string; note?: string },
  ) => apiClient.post<ApiResponse<any>>('/admin/vendor-clients', data),

  // Products
  // Note: GET list uses compat controller, CRUD operations use marketplace controller
  getProducts: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Product[]>>('/compat/products'),
  getProductById: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<Product>>(`/marketplace/products/${id}`),
  createProduct: (apiClient: AxiosInstance, productData: Partial<Product>) => apiClient.post<ApiResponse<Product>>('/marketplace/products', productData),
  updateProduct: (apiClient: AxiosInstance, id: string, productData: Partial<Product>) => apiClient.patch<ApiResponse<Product>>(`/marketplace/products/${id}`, productData),
  deleteProduct: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/marketplace/products/${id}`),

  // Services
  // Note: GET list uses compat controller, CRUD operations use marketplace controller
  getServices: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Service[]>>('/compat/services'),
  getService: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<Service>>(`/marketplace/services/${id}`),
  createService: (apiClient: AxiosInstance, serviceData: Partial<Service>) => apiClient.post<ApiResponse<Service>>('/marketplace/services', serviceData),
  updateService: (apiClient: AxiosInstance, id: string, serviceData: Partial<Service>) => apiClient.patch<ApiResponse<Service>>(`/marketplace/services/${id}`, serviceData),
  deleteService: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/marketplace/services/${id}`),

  // Job Listings
  getJobListings: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<JobListing[]>>('/compat/job-listings'),
  createJobListing: (apiClient: AxiosInstance, jobData: {
    title: string;
    description?: string;
    location?: string;
    salary?: string;
    contractType?: string;
    foundationId: string;
    requirements?: string[];
    responsibilities?: string[];
    qualifications?: string[];
    benefits?: string[];
    status?: string;
  }) => apiClient.post<ApiResponse<JobListing>>('/compat/job-listings', jobData),
  updateJobListing: (apiClient: AxiosInstance, id: string, jobData: Partial<{
    title: string;
    description?: string;
    location?: string;
    salary?: string;
    contractType?: string;
    requirements?: string[];
    responsibilities?: string[];
    qualifications?: string[];
    benefits?: string[];
    status?: string;
  }>) => apiClient.patch<ApiResponse<JobListing>>(`/compat/job-listings/${id}`, jobData),
  deleteJobListing: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/compat/job-listings/${id}`),

  // Candidates
  getCandidates: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Candidate[]>>('/compat/candidates'),
  createCandidate: (apiClient: AxiosInstance, candidateData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    skills?: string[];
    certifications?: string[];
    workExperience?: string;
    education?: string;
    availability?: string;
    shortBio?: string;
  }) => apiClient.post<ApiResponse<Candidate>>('/compat/candidates', candidateData),


  // Content Management - E-Learning
  getELearning: (
    apiClient: AxiosInstance, 
    params?: { 
      page?: number; 
      limit?: number; 
      search?: string; 
      category?: string; 
      type?: string; 
      language?: string;
      status?: string;
      lang?: string; // Language for translation resolution (en, fr, de)
    }
  ) => apiClient.get<ApiResponse<any[]>>('/content/elearning', { params }),
  
  uploadELearning: (
    apiClient: AxiosInstance, 
    data: FormData, 
    onProgress?: (progress: number) => void
  ) => apiClient.post<ApiResponse<any>>('/content/elearning', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  }),
  
  updateELearning: (apiClient: AxiosInstance, id: string, data: any) => 
    apiClient.patch<ApiResponse<any>>(`/content/elearning/${id}`, data),
  
  deleteELearning: (apiClient: AxiosInstance, id: string) => 
    apiClient.delete<ApiResponse<null>>(`/content/elearning/${id}`),

  // Content Management - HR Documents
  getHrDocuments: (
    apiClient: AxiosInstance,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      status?: string;
      language?: string;
      lang?: string; // Language for translation resolution (en, fr, de)
    }
  ) => apiClient.get<ApiResponse<HrDocument[]>>('/content/hr-documents', { params }),
  
  uploadHrDocument: (
    apiClient: AxiosInstance, 
    formData: FormData,
    onProgress?: (progress: number) => void
  ) => apiClient.post<ApiResponse<HrDocument>>('/content/hr-documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  }),
  
  updateHrDocument: (apiClient: AxiosInstance, id: string, data: Partial<HrDocument>) => 
    apiClient.patch<ApiResponse<HrDocument>>(`/content/hr-documents/${id}`, data),
  
  deleteHrDocument: (apiClient: AxiosInstance, id: string) => 
    apiClient.delete<ApiResponse<null>>(`/content/hr-documents/${id}`),

  // Content Management - State Policies
  getStatePolicies: (
    apiClient: AxiosInstance,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      status?: string;
      language?: string;
      country?: string;
      region?: string;
      isCritical?: boolean;
      lang?: string; // Language for translation resolution (en, fr, de)
    }
  ) => apiClient.get<ApiResponse<PolicyDocument[]>>('/content/state-policies', { params }),
  
  uploadStatePolicy: (
    apiClient: AxiosInstance, 
    formData: FormData,
    onProgress?: (progress: number) => void
  ) => apiClient.post<ApiResponse<PolicyDocument>>('/content/state-policies/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  }),
  
  updateStatePolicy: (apiClient: AxiosInstance, id: string, data: Partial<PolicyDocument>) => 
    apiClient.patch<ApiResponse<PolicyDocument>>(`/content/state-policies/${id}`, data),
  
  deleteStatePolicy: (apiClient: AxiosInstance, id: string) => 
    apiClient.delete<ApiResponse<null>>(`/content/state-policies/${id}`),

  getPolicyAlerts: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<PolicyAlert[]>>('/policy-alerts'),
  getPolicyAlert: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<PolicyAlert>>(`/policy-alerts/${id}`),
  createPolicyAlert: (apiClient: AxiosInstance, data: Omit<PolicyAlert, 'id' | 'creationDate'>) => apiClient.post<ApiResponse<PolicyAlert>>('/policy-alerts', data),
  updatePolicyAlert: (apiClient: AxiosInstance, id: string, data: Partial<PolicyAlert>) => apiClient.put<ApiResponse<PolicyAlert>>(`/policy-alerts/${id}`, data),
  deletePolicyAlert: (apiClient: AxiosInstance, id: string) => apiClient.delete<ApiResponse<null>>(`/policy-alerts/${id}`),

  // Parent Leads
  getParentLeads: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<ParentLead[]>>('/compat/parent-leads'),

  // Orders

  getOrders: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Order[]>>('/compat/orders'),
  getOrderRequests: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<OrderRequest[]>>('/compat/order-requests'),

  // Messaging
  // NOTE: Endpoint paths changed from /messages/* to /messaging/* - ensure backend is deployed first
  getConversations: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<Conversation[]>>('/messaging/conversations'),
  getConversation: (apiClient: AxiosInstance, id: string) => apiClient.get<ApiResponse<Conversation>>(`/messaging/conversations/${id}`),
  createConversation: (apiClient: AxiosInstance, data: { type: 'DIRECT' | 'GROUP' | 'SUPPORT'; participantIds: string[]; title?: string }) => 
    apiClient.post<ApiResponse<any>>('/messaging/conversations', data),
  getMessages: (apiClient: AxiosInstance, conversationId: string) => apiClient.get<ApiResponse<Message[]>>(`/messaging/conversations/${conversationId}/messages`),
  sendMessage: (apiClient: AxiosInstance, data: { conversationId: string; content: string }) => apiClient.post<ApiResponse<Message>>('/messaging/messages', data),
  markMessageAsRead: (apiClient: AxiosInstance, id: string) => apiClient.put<ApiResponse<Message>>(`/messaging/messages/${id}/read`),

  // System
  getCurrentUser: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<User>>('/users/me'),

  // File Management
  uploadUniversalFile: (apiClient: AxiosInstance, formData: FormData, onProgress?: (progress: number) => void) => apiClient.post<ApiResponse<FileUploadResult>>('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
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
  uploadAsset: (apiClient: AxiosInstance, formData: FormData, onProgress?: (progress: number) => void) => apiClient.post<ApiResponse<UploadedAsset>>('/admin/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  }),

  // Logo and Favicon Uploads
  uploadLogo: (apiClient: AxiosInstance, formData: FormData, onProgress?: (progress: number) => void) => {
    const fullUrl = `${apiClient.defaults.baseURL}/admin/frontend-settings/logo`
    if (import.meta.env.DEV) {
      console.log('🔄 API: uploadLogo called with full URL:', fullUrl)
    }
    return apiClient.post<ApiResponse<UploadedAsset>>('/admin/frontend-settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    })
  },

  uploadFavicon: (apiClient: AxiosInstance, formData: FormData, onProgress?: (progress: number) => void) => {
    const fullUrl = `${apiClient.defaults.baseURL}/admin/frontend-settings/favicon`
    if (import.meta.env.DEV) {
      console.log('🔄 API: uploadFavicon called with full URL:', fullUrl)
    }
    return apiClient.post<ApiResponse<UploadedAsset>>('/admin/frontend-settings/favicon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    })
  },

  uploadAdminLogo: (apiClient: AxiosInstance, formData: FormData, onProgress?: (progress: number) => void) => {
    const fullUrl = `${apiClient.defaults.baseURL}/admin/frontend-settings/admin-logo`
    if (import.meta.env.DEV) {
      console.log('🔄 API: uploadAdminLogo called with full URL:', fullUrl)
    }
    return apiClient.post<ApiResponse<UploadedAsset>>('/admin/frontend-settings/admin-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    })
  },

  uploadAdminFavicon: (apiClient: AxiosInstance, formData: FormData, onProgress?: (progress: number) => void) => {
    const fullUrl = `${apiClient.defaults.baseURL}/admin/frontend-settings/admin-favicon`
    if (import.meta.env.DEV) {
      console.log('🔄 API: uploadAdminFavicon called with full URL:', fullUrl)
    }
    return apiClient.post<ApiResponse<UploadedAsset>>('/admin/frontend-settings/admin-favicon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    })
  },

  uploadSidebarLogo: (apiClient: AxiosInstance, formData: FormData, onProgress?: (progress: number) => void) => {
    const fullUrl = `${apiClient.defaults.baseURL}/admin/frontend-settings/sidebar-logo`
    if (import.meta.env.DEV) {
      console.log('🔄 API: uploadSidebarLogo called with full URL:', fullUrl)
    }
    return apiClient.post<ApiResponse<UploadedAsset>>('/admin/frontend-settings/sidebar-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    })
  },

  // Health Check
  getSettingsHealth: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<SettingsHealth>>('/admin/settings/health'),
  getSystemHealth: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<SystemHealth>>('/health'),
  getDbHealth: (apiClient: AxiosInstance) => apiClient.get<ApiResponse<DbHealth>>('/health/db'),

  // Admin Analytics - Real-time dashboard statistics
  getAnalyticsOverview: (apiClient: AxiosInstance) => 
    apiClient.get<ApiResponse<AnalyticsOverview>>('/admin/analytics/overview'),
  getDashboardCounts: (apiClient: AxiosInstance) =>
    apiClient.get<ApiResponse<AdminDashboardCounts>>('/admin/analytics/counts'),
  getUserAnalytics: (apiClient: AxiosInstance, timeRange: '7d' | '30d' | '90d' | '1y' = '30d') => 
    apiClient.get<ApiResponse<UserAnalytics>>('/admin/analytics/users', { params: { timeRange } }),
  getOrganizationAnalytics: (apiClient: AxiosInstance, timeRange: '7d' | '30d' | '90d' | '1y' = '30d') => 
    apiClient.get<ApiResponse<OrgAnalytics>>('/admin/analytics/organizations', { params: { timeRange } }),
  getProductAnalytics: (apiClient: AxiosInstance, timeRange: '7d' | '30d' | '90d' | '1y' = '30d') => 
    apiClient.get<ApiResponse<ProductAnalytics>>('/admin/analytics/products', { params: { timeRange } }),
  getJobAnalytics: (apiClient: AxiosInstance, timeRange: '7d' | '30d' | '90d' | '1y' = '30d') => 
    apiClient.get<ApiResponse<JobAnalytics>>('/admin/analytics/jobs', { params: { timeRange } }),
  getRevenueAnalytics: (apiClient: AxiosInstance, timeRange: '7d' | '30d' | '90d' | '1y' = '30d') => 
    apiClient.get<ApiResponse<RevenueAnalytics>>('/admin/analytics/revenue', { params: { timeRange } }),
  getSystemUsageAnalytics: (apiClient: AxiosInstance, timeRange: '7d' | '30d' | '90d' | '1y' = '30d') => 
    apiClient.get<ApiResponse<SystemUsageAnalytics>>('/admin/analytics/system', { params: { timeRange } }),

  // Partners Management
  getPartners: (apiClient: AxiosInstance, params?: { type?: PartnerType; isActive?: boolean; isFeatured?: boolean; search?: string }) => 
    apiClient.get<ApiResponse<Partner[]>>('/partners', { params }),
  getPartnerById: (apiClient: AxiosInstance, id: string) => 
    apiClient.get<ApiResponse<Partner>>(`/partners/${id}`),
  createPartner: (apiClient: AxiosInstance, data: Partial<Partner>) => 
    apiClient.post<ApiResponse<Partner>>('/partners', data),
  updatePartner: (apiClient: AxiosInstance, id: string, data: Partial<Partner>) => 
    apiClient.patch<ApiResponse<Partner>>(`/partners/${id}`, data),
  deletePartner: (apiClient: AxiosInstance, id: string) => 
    apiClient.delete<ApiResponse<null>>(`/partners/${id}`),
  togglePartnerActive: (apiClient: AxiosInstance, id: string) => 
    apiClient.patch<ApiResponse<Partner>>(`/partners/${id}/toggle-active`),
  togglePartnerFeatured: (apiClient: AxiosInstance, id: string) => 
    apiClient.patch<ApiResponse<Partner>>(`/partners/${id}/toggle-featured`),
  getPartnerStats: (apiClient: AxiosInstance) => 
    apiClient.get<ApiResponse<PartnerStats>>('/partners/stats'),

  // Legacy upload (keeping for compatibility)
  uploadFile: (apiClient: AxiosInstance, file: FormData) => apiClient.post<ApiResponse<LegacyUploadResult>>('/admin/upload', file, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  // Translations
  getTranslationKeys: (
    apiClient: AxiosInstance,
    params?: { namespace?: string; lang?: string; search?: string; page?: number; limit?: number }
  ) => apiClient.get<ApiResponse<any[]>>('/static-translations/admin/keys', { params }),

  getTranslationIssues: (
    apiClient: AxiosInstance,
    params?: {
      type?: 'missing' | 'needsReview';
      lang?: string;
      namespace?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) => apiClient.get<ApiResponse<any[]>>('/static-translations/admin/issues', { params }),

  getTranslation: (
    apiClient: AxiosInstance,
    namespace: string,
    key: string,
    lang: string
  ) => apiClient.get<ApiResponse<any>>(`/static-translations/admin/${namespace}/${key}/${lang}`),

  updateTranslation: (
    apiClient: AxiosInstance,
    namespace: string,
    key: string,
    lang: string,
    value: string
  ) => apiClient.put<ApiResponse<any>>(`/static-translations/admin/${namespace}/${key}/${lang}`, { value }),

  bulkUpdateTranslations: (
    apiClient: AxiosInstance,
    translations: Array<{ namespace: string; key: string; lang: string; value: string }>
  ) => apiClient.post<ApiResponse<{ updated: number }>>('/static-translations/admin/bulk', translations),

  deleteTranslation: (
    apiClient: AxiosInstance,
    namespace: string,
    key: string,
    lang: string
  ) => apiClient.delete<ApiResponse<{ success: boolean }>>(`/static-translations/admin/${namespace}/${key}/${lang}`),

  markTranslationReviewed: (
    apiClient: AxiosInstance,
    namespace: string,
    key: string,
    lang: string
  ) => apiClient.post<ApiResponse<{ success: boolean }>>(`/static-translations/admin/${namespace}/${key}/${lang}/review`),

  getNamespaces: (
    apiClient: AxiosInstance,
    params?: { lang?: string }
  ) => apiClient.get<ApiResponse<string[]>>('/static-translations/admin/namespaces', { params }),

  createTranslationRelease: (
    apiClient: AxiosInstance,
    version: string,
    description?: string
  ) => apiClient.post<ApiResponse<{ success: boolean; version: string }>>('/static-translations/admin/releases', {
    version,
    description,
  }),

  translateMissing: (
    apiClient: AxiosInstance,
    sourceLang: string,
    targetLang: string,
    namespace?: string,
    keys?: string[],
    force?: boolean,
    includePlaceholders?: boolean,
  ) => apiClient.post<ApiResponse<{ success: boolean; translated: number }>>('/static-translations/admin/translate-missing', {
    sourceLang,
    targetLang,
    namespace,
    keys,
    force,
    includePlaceholders,
  }, {
    timeout: 300000, // 5 minutes timeout for translation operations (can take a while for large batches)
  }),

  bulkApproveTranslations: (
    apiClient: AxiosInstance,
    keys: Array<{ namespace: string; key: string; lang: string }>
  ) => apiClient.post<ApiResponse<{ success: boolean; approved: number }>>('/static-translations/admin/bulk-approve', { keys }),

  exportTranslations: (
    apiClient: AxiosInstance,
    params?: { namespace?: string; format?: 'json' | 'csv' }
  ) => {
    if (params?.format === 'csv') {
      // For CSV, we need to get the raw response as text
      return apiClient.get('/static-translations/admin/export', { 
        params,
        responseType: 'text' // Important: get response as text for CSV
      });
    }
    // For JSON, get as normal JSON response
    return apiClient.get<ApiResponse<any[]>>('/static-translations/admin/export', { params });
  },

  importTranslations: (
    apiClient: AxiosInstance,
    translations: Array<{ namespace: string; key: string; lang: string; value: string }>
  ) => apiClient.post<ApiResponse<{ success: boolean; imported: number }>>('/static-translations/admin/import', translations),

  getAuditLogs: (
    apiClient: AxiosInstance,
    params?: { type?: 'static' | 'dynamic'; limit?: number }
  ) => apiClient.get<ApiResponse<any[]>>('/static-translations/admin/audit-logs', { params }),

  listReleases: (
    apiClient: AxiosInstance
  ) => apiClient.get<ApiResponse<any[]>>('/static-translations/admin/releases'),

  cleanupPrefixes: (
    apiClient: AxiosInstance
  ) => apiClient.post<ApiResponse<{ success: boolean; cleaned: number; affected: number }>>('/static-translations/admin/cleanup-prefixes', {}, {
    timeout: 300000, // 5 minutes timeout for cleanup operations (can take a while for large datasets)
  }),

  // Support Tickets
  getSupportTickets: (apiClient: AxiosInstance, filters?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    
    return apiClient.get<ApiResponse<any[]>>(`/support/admin/tickets${params.toString() ? `?${params.toString()}` : ''}`);
  },

  getSupportTicket: (apiClient: AxiosInstance, ticketId: string) => 
    apiClient.get<ApiResponse<any>>(`/support/tickets/${ticketId}`),

  updateTicketStatus: (apiClient: AxiosInstance, ticketId: string, status: string) =>
    apiClient.patch<ApiResponse<any>>(`/support/admin/tickets/${ticketId}/status`, { status }),

  assignTicket: (apiClient: AxiosInstance, ticketId: string, assigneeId?: string) =>
    apiClient.patch<ApiResponse<any>>(`/support/admin/tickets/${ticketId}/assign`, { assigneeId }),

  respondToTicket: (apiClient: AxiosInstance, ticketId: string, message: string) =>
    apiClient.post<ApiResponse<any>>(`/support/tickets/${ticketId}/respond`, { message }),

  getSupportTicketStats: (apiClient: AxiosInstance) =>
    apiClient.get<ApiResponse<any>>('/support/admin/stats'),

  importFromJsonFiles: (
    apiClient: AxiosInstance
  ) =>
    apiClient.post<
      ApiResponse<{
        success: boolean;
        imported: number;
        details: Record<string, number>;
      }>
    >('/static-translations/admin/import-from-files'),

  exportToJsonFiles: (
    apiClient: AxiosInstance
  ) =>
    apiClient.post<
      ApiResponse<{
        success: boolean;
        exported: number;
        details: Record<string, number>;
      }>
    >('/static-translations/admin/export-to-files'),

  fullSync: (
    apiClient: AxiosInstance
  ) =>
    apiClient.post<
      ApiResponse<{
        success: boolean;
        jobId: string;
        message: string;
      }>
    >('/static-translations/admin/full-sync', {}, { timeout: 30000 }), // 30 second timeout (should return 202 immediately)

  getFullSyncStatus: (
    apiClient: AxiosInstance,
    jobId: string
  ) =>
    apiClient.get<
      ApiResponse<{
        success: boolean;
        job?: {
          status: 'queued' | 'running' | 'done' | 'error';
          progress?: string;
          result?: {
            imported: number;
            translatedFr: number;
            translatedDe: number;
            exported: number;
            backupId?: string;
          };
          error?: {
            message: string;
            stack?: string;
          };
          duration?: number;
        };
        error?: string;
      }>
    >(`/static-translations/public/full-sync/${jobId}/status`, { timeout: 30000 }),

  autoFixHardcodedStrings: (
    apiClient: AxiosInstance
  ) =>
    apiClient.post<
      ApiResponse<{
        success: boolean;
        fixed: number;
        skipped: number;
        errors: number;
        /** Number of completely new translation keys created by the script */
        missingKeysCreated?: number;
        /** Detailed per-file/per-key info from the script */
        details?: any;
        message: string;
      }>
    >('/static-translations/admin/auto-fix-hardcoded-strings', {}, {
      timeout: 600000, // 10 minutes timeout for auto-fix operations (can take a while)
    }),

  fixEnglishPlaceholders: (apiClient: AxiosInstance) =>
    apiClient.post<
      ApiResponse<{
        success: boolean;
        cleaned: number;
        affected: number;
      }>
    >('/static-translations/admin/fix-english-placeholders', {}, {
      timeout: 300000, // 5 minutes timeout for cleanup operations
    }),
}

// Export individual content functions for easier imports
export const getELearning = apiService.getELearning;
export const uploadELearning = apiService.uploadELearning;
export const deleteELearning = apiService.deleteELearning;
export const updateELearning = apiService.updateELearning;

export const getHrDocuments = apiService.getHrDocuments;
export const uploadHrDocument = apiService.uploadHrDocument;
export const deleteHrDocument = apiService.deleteHrDocument;
export const updateHrDocument = apiService.updateHrDocument;

export const getStatePolicies = apiService.getStatePolicies;
export const uploadStatePolicy = apiService.uploadStatePolicy;
export const deleteStatePolicy = apiService.deleteStatePolicy;
export const updateStatePolicy = apiService.updateStatePolicy;

export default api
