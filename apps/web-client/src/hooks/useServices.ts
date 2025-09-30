import { useQuery } from '@tanstack/react-query'
import { marketplaceApi } from '@pc-solutions/api-client'
import { serviceAdapter, UIService } from '../adapters'

export const useServices = (query?: {
  page?: number
  limit?: number
  category?: string
  providerId?: string
  status?: string
  search?: string
}) => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['services', query],
    queryFn: async () => {
      const response = await marketplaceApi.getServices(query)
      return {
        ...response,
        data: response.data.map((service) => serviceAdapter.toUI(service))
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