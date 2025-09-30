import { useAuth as useClerkAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'

export const useAuth = () => {
  const { getToken, isSignedIn, isLoaded, signOut } = useClerkAuth()

  const getAuthToken = useCallback(async () => {
    if (!isSignedIn) return null
    try {
      const token = await getToken()
      return token
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return null
    }
  }, [getToken, isSignedIn])

  return {
    isSignedIn,
    isLoaded,
    getAuthToken,
    signOut,
  }
}