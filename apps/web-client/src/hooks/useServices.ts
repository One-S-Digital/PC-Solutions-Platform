import { useQuery } from '@tanstack/react-query'
import { useApiClient } from './useApiClient'
import { serviceAdapter, UIService } from '../adapters'

export const useServices = (query?: {
  page?: number
  limit?: number
  category?: string
  providerId?: string
  status?: string
  search?: string
}) => {
  const apiClient = useApiClient()

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['services', query],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query?.page) params.append('page', query.page.toString())
      if (query?.limit) params.append('limit', query.limit.toString())
      if (query?.category) params.append('category', query.category)
      if (query?.providerId) params.append('providerId', query.providerId)
      if (query?.status) params.append('status', query.status)
      if (query?.search) params.append('search', query.search)
      
      const response = await apiClient.get(`/services?${params.toString()}`)
      return {
        ...response.data,
        data: response.data.data.map((service: unknown) => serviceAdapter.toUI(service))
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  return {
    services: data?.data as UIService[] || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refetch,
  }
}