import { apiClient } from './client'
import { PaginatedResponse } from '@pc-solutions/api-types'

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

export interface CreateUserRequest {
  email: string
  firstName?: string
  lastName?: string
  role: string
  organizationId?: string
}

export interface UpdateUserRequest {
  firstName?: string
  lastName?: string
  role?: string
  status?: 'active' | 'inactive' | 'pending'
}

export interface UsersQuery {
  page?: number
  limit?: number
  role?: string
  status?: string
  search?: string
}

export const usersApi = {
  // List users (admin only)
  getUsers: (query?: UsersQuery): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.role) params.append('role', query.role)
    if (query?.status) params.append('status', query.status)
    if (query?.search) params.append('search', query.search)
    
    return apiClient.get<PaginatedResponse<User>>(`/users?${params.toString()}`)
  },

  // Get user by ID
  getUser: (userId: string): Promise<{ data: User }> => {
    return apiClient.get<{ data: User }>(`/users/${userId}`)
  },

  // Create user (admin only)
  createUser: (data: CreateUserRequest): Promise<{ data: User }> => {
    return apiClient.post<{ data: User }>('/users', data)
  },

  // Update user (admin only)
  updateUser: (userId: string, data: UpdateUserRequest): Promise<{ data: User }> => {
    return apiClient.put<{ data: User }>(`/users/${userId}`, data)
  },

  // Delete user (admin only)
  deleteUser: (userId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/users/${userId}`)
  },
}