import { useQuery } from '@tanstack/react-query'
import { marketplaceApi } from '@pc-solutions/api-client'
import { productAdapter, UIProduct } from '../adapters'

export const useProducts = (query?: {
  page?: number
  limit?: number
  category?: string
  supplierId?: string
  status?: string
  search?: string
}) => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', query],
    queryFn: async () => {
      const response = await marketplaceApi.getProducts(query)
      return {
        ...response,
        data: response.data.map((product) => productAdapter.toUI(product))
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