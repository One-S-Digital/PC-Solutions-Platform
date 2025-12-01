export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

class ApiService {
  private baseUrl: string;

  constructor() {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    this.baseUrl = this.normalizeBaseUrl(rawUrl);
  }

  private normalizeBaseUrl(url: string): string {
    if (!url) {
      return 'http://localhost:3000/api';
    }

    const trimmed = url.replace(/\s+/g, '').replace(/\/+$/g, '');

    if (trimmed.length === 0) {
      return 'http://localhost:3000/api';
    }

    // If the URL already targets an API path (e.g. /api or /api/v1), respect it
    if (/\/api(\/|$)/.test(trimmed)) {
      return trimmed;
    }

    return `${trimmed}/api`;
  }

  // Expose baseUrl for use in hooks
  get apiBaseUrl() {
    return this.baseUrl;
  }

  private getAuthHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { token?: string } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { token, ...fetchOptions } = options;
      const headers = this.getAuthHeaders(token);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code
        );
      }

      // Read response body once
      const text = await response.text();
      
      // Handle 304 Not Modified or empty response
      if (response.status === 304 || !text || !text.trim()) {
        // Return success with empty array for conversations endpoint
        if (endpoint.includes('/conversations')) {
          return {
            success: true,
            data: [] as T,
          };
        }
        // For other endpoints, try to return cached data if available
        return {
          success: true,
          data: [] as T,
        };
      }

      // Parse JSON response
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error('Failed to parse JSON response:', { text: text.substring(0, 200), endpoint, error });
        throw new ApiError('Invalid JSON response from server', response.status);
      }
      
      // Handle case where backend returns data directly (not wrapped in ApiResponse)
      // Check if it's an array first
      if (Array.isArray(data) && !('success' in data)) {
        return {
          success: true,
          data: data as T,
        };
      }
      
      // If data is wrapped in ApiEnvelope format (success, version, timestamp, data or error)
      if (data && typeof data === 'object' && 'success' in data) {
        // Handle error response format from AllExceptionsFilter
        if (data.error) {
          return {
            success: false,
            message: data.error.message || data.message || 'An error occurred',
            data: undefined,
            error: data.error,
          };
        }
        // Handle success response with data
        if ('data' in data) {
          return {
            success: data.success,
            message: data.message,
            data: data.data,
          };
        }
        // Handle success response without explicit data field (data might be the object itself)
        return {
          success: data.success !== false, // Default to true if not explicitly false
          message: data.message,
          data: data,
        };
      }
      
      // Handle case where backend returns the object directly (e.g., conversation object with id, type, etc.)
      // This happens when NestJS returns the result directly without wrapping
      if (data && typeof data === 'object' && !('success' in data) && !('error' in data)) {
        // Check if it looks like a direct data object (has common entity fields like id, createdAt, etc.)
        if ('id' in data || Array.isArray(data) || (typeof data === 'object' && Object.keys(data).length > 0)) {
          return {
            success: true,
            data: data as T,
          };
        }
      }
      
      return data;
    } catch (error) {
      // Handle abort errors - don't convert to ApiError, just re-throw
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        0
      );
    }
  }

  // Generic CRUD operations
  async get<T>(endpoint: string, options?: RequestInit & { token?: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit & { token?: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit & { token?: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestInit & { token?: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit & { token?: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // File upload
  async uploadFile(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(), // Note: token should be passed via options if needed
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.code
      );
    }

    return response.json();
  }

  // Upload asset with specific kind
  async uploadAsset(
    file: File,
    assetKind: string,
  ): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assetKind', assetKind);

    const response = await fetch(`${this.baseUrl}/upload/file`, {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders(), // Note: token should be passed via options if needed
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.code
      );
    }

    return response.json();
  }

  // Delete asset
  async deleteAsset(assetId: string): Promise<ApiResponse> {
    return this.delete(`/upload/files/${assetId}`);
  }

  // Get user's assets
  async getUserAssets(options?: { kind?: string; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.kind) params.append('kind', options.kind);
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const queryString = params.toString();
    return this.get(`/upload/assets${queryString ? `?${queryString}` : ''}`);
  }

  // ===== Content Management Methods =====

  // Fetch HR Documents
  async getHRDocuments(options?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.category) params.append('category', options.category);
    if (options?.status) params.append('status', options.status);
    
    const queryString = params.toString();
    return this.get(`/content/hr-documents${queryString ? `?${queryString}` : ''}`);
  }

  // Fetch E-Learning Content
  async getELearningContent(options?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    type?: string;
    language?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.category) params.append('category', options.category);
    if (options?.type) params.append('type', options.type);
    if (options?.language) params.append('language', options.language);
    
    const queryString = params.toString();
    return this.get(`/content/elearning${queryString ? `?${queryString}` : ''}`);
  }

  // Fetch State Policies
  async getStatePolicies(options?: {
    page?: number;
    limit?: number;
    search?: string;
    country?: string;
    region?: string;
    isCritical?: boolean;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.country) params.append('country', options.country);
    if (options?.region) params.append('region', options.region);
    if (options?.isCritical !== undefined) params.append('isCritical', options.isCritical.toString());
    
    const queryString = params.toString();
    return this.get(`/content/state-policies${queryString ? `?${queryString}` : ''}`);
  }

  // Delete HR Document
  async deleteHRDocument(id: string): Promise<ApiResponse> {
    return this.delete(`/content/hr-documents/${id}`);
  }

  // Delete E-Learning Content
  async deleteELearningContent(id: string): Promise<ApiResponse> {
    return this.delete(`/content/elearning/${id}`);
  }

  // Delete State Policy
  async deleteStatePolicy(id: string): Promise<ApiResponse> {
    return this.delete(`/content/state-policies/${id}`);
  }
}

// Create a singleton instance
export const apiService = new ApiService();

// Export the class for testing
export { ApiService };
