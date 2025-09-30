import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useApiClient } from './useApiClient'

export const useCurrentUser = () => {
  const { isSignedIn, isLoaded } = useAuth()
  const apiClient = useApiClient()

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await apiClient.get('/users/me')
      return response.data
    },
    enabled: isSignedIn && isLoaded,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  return {
    user: user?.user,
    isLoading: isLoading || !isLoaded,
    error,
    refetch,
    isSignedIn,
  }
}