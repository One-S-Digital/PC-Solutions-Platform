import { useCallback } from 'react'
import { useAuth } from './useAuth'
import axios, { AxiosInstance } from 'axios'

export const useApiClient = (): AxiosInstance => {
  const { getAuthToken } = useAuth()

  const apiClient = useCallback(() => {
    const client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    client.interceptors.request.use(
      async (config) => {
        const token = await getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    client.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )

    return client
  }, [getAuthToken])

  return apiClient()
}