import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApiClient, apiService } from '../services/api'
import UserAnalyticsSection from '../components/UserAnalyticsSection'

const AnalyticsPage: React.FC = () => {
  const apiClient = useApiClient()

  const { data: clerkOverviewResp, isLoading, isError } = useQuery({
    queryKey: ['admin-clerk-overview'],
    queryFn: () => apiService.getClerkOverview(apiClient),
    enabled: !!apiClient,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    select: (res) => res?.data?.data ?? null,
  })

  return (
    <div className="p-6">
      <UserAnalyticsSection
        data={clerkOverviewResp}
        isLoading={isLoading || !apiClient}
        isError={isError}
      />
    </div>
  )
}

export default AnalyticsPage
