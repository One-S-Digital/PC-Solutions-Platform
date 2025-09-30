// Re-export types from api-types package
export * from '@pc-solutions/api-types'

// Additional client-specific types
export interface ApiClientError {
  message: string
  statusCode: number
  error?: string
}

export interface ApiClientConfig {
  baseURL: string
  timeout?: number
  getAuthToken?: () => string | null
}

export interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, any>
  timeout?: number
}