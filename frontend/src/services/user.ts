import { apiClient } from './api';
import { User, Organization, UserRole } from './types';

// User service for managing user-related API calls
export class UserService {
  // Get current user profile
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/users/me');
  }

  // Update user profile
  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    return apiClient.patch<User>(`/users/${userId}`, data);
  }

  // Get user's organization
  async getUserOrganization(userId: string): Promise<Organization | null> {
    try {
      return await apiClient.get<Organization>(`/users/${userId}/organization`);
    } catch (error) {
      // User might not have an organization
      return null;
    }
  }

  // Get all users (admin only)
  async getAllUsers(params?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    search?: string;
    isActive?: boolean;
  }): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    return apiClient.get(`/users?${queryParams.toString()}`);
  }

  // Get user by ID (admin only)
  async getUserById(userId: string): Promise<User> {
    return apiClient.get<User>(`/users/${userId}`);
  }

  // Update user role (admin only)
  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    return apiClient.patch<User>(`/users/${userId}/role`, { role });
  }

  // Deactivate user (admin only)
  async deactivateUser(userId: string): Promise<User> {
    return apiClient.patch<User>(`/users/${userId}/deactivate`);
  }

  // Activate user (admin only)
  async activateUser(userId: string): Promise<User> {
    return apiClient.patch<User>(`/users/${userId}/activate`);
  }

  // Delete user (admin only)
  async deleteUser(userId: string): Promise<void> {
    return apiClient.delete(`/users/${userId}`);
  }

  // Get user activity logs (admin only)
  async getUserActivity(userId: string, params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    return apiClient.get(`/users/${userId}/activity?${queryParams.toString()}`);
  }

  // Upload user avatar
  async uploadAvatar(file: File, onProgress?: (progress: number) => void): Promise<{ url: string }> {
    return apiClient.uploadFile<{ url: string }>('/users/avatar', file, onProgress);
  }

  // Update user settings
  async updateSettings(userId: string, settings: any): Promise<User> {
    return apiClient.patch<User>(`/users/${userId}/settings`, settings);
  }

  // Get user statistics (admin only)
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<UserRole, number>;
    newUsersThisMonth: number;
    usersByRegion: Record<string, number>;
  }> {
    return apiClient.get('/users/stats');
  }
}

// Create singleton instance
export const userService = new UserService();

export default userService;