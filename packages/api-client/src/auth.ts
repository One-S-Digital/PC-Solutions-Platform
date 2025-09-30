import { apiClient } from './client'

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  organizationId?: string
  organizationName?: string
  avatarUrl?: string
  status: 'active' | 'inactive' | 'pending'
  lastLogin?: string
  region?: string
  plan?: string
  memberSince?: string
}

export interface AuthResponse {
  user: User
  message?: string
}

export const authApi = {
  // Get current user
  getCurrentUser: (): Promise<AuthResponse> => {
    return apiClient.get<AuthResponse>('/users/me')
  },

  // Update current user
  updateCurrentUser: (data: Partial<User>): Promise<AuthResponse> => {
    return apiClient.put<AuthResponse>('/users/me', data)
  },

  // Get user profile
  getUserProfile: (userId: string): Promise<AuthResponse> => {
    return apiClient.get<AuthResponse>(`/users/${userId}`)
  },
}