import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { usersApi } from '@pc-solutions/api-client'
import { userAdapter } from '../adapters'

export const useCurrentUser = () => {
  const { isSignedIn, isLoaded } = useAuth()

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await usersApi.getMe()
      return userAdapter.toUI(response.data)
    },
    enabled: isSignedIn && isLoaded,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  return {
    user,
    isLoading: isLoading || !isLoaded,
    error,
    refetch,
    isSignedIn,
  }
}