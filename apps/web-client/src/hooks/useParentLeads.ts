import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { parentLeadsApi } from '@pc-solutions/api-client'
import { parentLeadAdapter, UIParentLead, CreateParentLeadRequest } from '../adapters'

export const useParentLeads = (query?: {
  page?: number
  limit?: number
  status?: string
  location?: string
  search?: string
}) => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['parentLeads', query],
    queryFn: async () => {
      const response = await parentLeadsApi.getParentLeads(query)
      return {
        ...response,
        data: response.data.map((lead) => parentLeadAdapter.toUI(lead))
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  return {
    leads: data?.data as UIParentLead[] || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refetch,
  }
}

export const useCreateParentLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateParentLeadRequest) => {
      const response = await parentLeadsApi.createParentLead(data)
      return parentLeadAdapter.toUI(response.data)
    },
    onSuccess: () => {
      // Invalidate and refetch parent leads
      queryClient.invalidateQueries({ queryKey: ['parentLeads'] })
    },
  })
}

export const useUpdateParentLead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: Partial<CreateParentLeadRequest> }) => {
      const response = await parentLeadsApi.updateParentLead(leadId, data)
      return parentLeadAdapter.toUI(response.data)
    },
    onSuccess: () => {
      // Invalidate and refetch parent leads
      queryClient.invalidateQueries({ queryKey: ['parentLeads'] })
    },
  })
}