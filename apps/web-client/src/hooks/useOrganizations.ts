import { useQuery } from '@tanstack/react-query'
import { useApiClient } from './useApiClient'
import { organizationAdapter, UIOrganization } from '../adapters'

export const useOrganizations = (query?: {
  page?: number
  limit?: number
  type?: string
  region?: string
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
    queryKey: ['organizations', query],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query?.page) params.append('page', query.page.toString())
      if (query?.limit) params.append('limit', query.limit.toString())
      if (query?.type) params.append('type', query.type)
      if (query?.region) params.append('region', query.region)
      if (query?.status) params.append('status', query.status)
      if (query?.search) params.append('search', query.search)
      
      const response = await apiClient.get(`/organizations?${params.toString()}`)
      return {
        ...response.data,
        data: response.data.data.map((org: unknown) => organizationAdapter.toUI(org))
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  return {
    organizations: data?.data as UIOrganization[] || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refetch,
  }
}