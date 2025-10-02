import { apiService, ApiResponse } from './api';
import { User } from '../types';

export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  workExperience?: string;
  education?: string;
  certifications?: string[];
  skills?: string[];
  availability?: string;
  cvUrl?: string;
}

export interface UserCreateData {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

class UserService {
  // Get current user profile
  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<User>('/users/me');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch user profile');
    }
    return this.transformUser(response.data);
  }

  // Update current user profile
  async updateCurrentUser(data: UserUpdateData): Promise<User> {
    const response = await apiService.put<User>('/users/me', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update user profile');
    }
    return this.transformUser(response.data);
  }

  // Get all users (admin only)
  async getAllUsers(page = 1, limit = 20): Promise<{ users: User[]; pagination: any }> {
    const response = await apiService.get<{ users: User[]; pagination: any }>(
      `/users?page=${page}&limit=${limit}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch users');
    }
    return {
      users: response.data.users.map(user => this.transformUser(user)),
      pagination: response.data.pagination,
    };
  }

  // Get user by ID (admin only)
  async getUserById(id: string): Promise<User> {
    const response = await apiService.get<User>(`/users/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch user');
    }
    return this.transformUser(response.data);
  }

  // Create user (admin only)
  async createUser(data: UserCreateData): Promise<User> {
    const response = await apiService.post<User>('/users', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create user');
    }
    return this.transformUser(response.data);
  }

  // Update user (admin only)
  async updateUser(id: string, data: UserUpdateData): Promise<User> {
    const response = await apiService.put<User>(`/users/${id}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update user');
    }
    return this.transformUser(response.data);
  }

  // Delete user (admin only)
  async deleteUser(id: string): Promise<void> {
    const response = await apiService.delete(`/users/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete user');
    }
  }

  // Transform user data to include legacy fields for UI compatibility
  private transformUser(user: any): User {
    return {
      ...user,
      // Legacy fields for UI compatibility
      name: `${user.firstName} ${user.lastName}`,
      status: user.isActive ? 'Active' : 'Inactive',
      lastLogin: user.lastActiveAt,
      memberSince: user.createdAt,
    };
  }
}

export const userService = new UserService();
