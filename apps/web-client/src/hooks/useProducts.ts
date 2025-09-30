import { useQuery } from '@tanstack/react-query'
import { useApiClient } from './useApiClient'
import { productAdapter, UIProduct } from '../adapters'

export const useProducts = (query?: {
  page?: number
  limit?: number
  category?: string
  supplierId?: string
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
    queryKey: ['products', query],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query?.page) params.append('page', query.page.toString())
      if (query?.limit) params.append('limit', query.limit.toString())
      if (query?.category) params.append('category', query.category)
      if (query?.supplierId) params.append('supplierId', query.supplierId)
      if (query?.status) params.append('status', query.status)
      if (query?.search) params.append('search', query.search)
      
      const response = await apiClient.get(`/products?${params.toString()}`)
      return {
        ...response.data,
        data: response.data.data.map((product: unknown) => productAdapter.toUI(product))
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  return {
    products: data?.data as UIProduct[] || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refetch,
  }
}