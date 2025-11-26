import { apiService, ApiResponse } from './api';
import { User } from '../types';
import { API_ENDPOINTS } from './api-endpoints';

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
    const response = await apiService.get<User>(API_ENDPOINTS.users.me);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch user profile');
    }
    return this.transformUser(response.data);
  }

  // Update current user profile
  async updateCurrentUser(data: UserUpdateData): Promise<User> {
    const response = await apiService.put<User>(API_ENDPOINTS.users.update, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update user profile');
    }
    return this.transformUser(response.data);
  }

  // Get user organization data
  async getUserOrganization(): Promise<any> {
    const response = await apiService.get(API_ENDPOINTS.users.organization);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch organization data');
    }
    return response.data;
  }

  // Get all users (admin only)
  async getAllUsers(page = 1, limit = 20, token?: string): Promise<{ users: User[]; pagination: any }> {
    try {
      const response = await apiService.get<any>(
        `/users?page=${page}&limit=${limit}`,
        { token }
      );
      
      console.log('👥 getAllUsers response:', JSON.stringify({
        success: response.success,
        successType: typeof response.success,
        hasData: !!response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        dataKeys: response.data && typeof response.data === 'object' && !Array.isArray(response.data) ? Object.keys(response.data) : 'N/A',
        hasMeta: !!(response as any).meta,
        fullResponse: response
      }, null, 2));
      
      // Check success - handle undefined as success if data exists
      if (response.success === false) {
        console.error('❌ Response indicates failure:', response);
        throw new Error(response.message || 'Failed to fetch users');
      }
      
      // If success is undefined but we have data, treat as success
      if (response.success === undefined && !response.data) {
        console.warn('⚠️ No success flag and no data');
        return { users: [], pagination: {} };
      }
      
      if (!response.data) {
        console.warn('⚠️ No data in response, returning empty array');
        return { users: [], pagination: {} };
      }
      
      // Handle different response formats
      let users: any[] = [];
      let pagination: any = {};
      
      // The API response wrapper puts backend's { data: [], meta: {} } into:
      // { success: true, data: [...users...], meta: {...} } OR
      // { success: true, data: { data: [...users...], meta: {...} } }
      
      // Case 1: Direct array with meta at top level
      if (Array.isArray(response.data)) {
        users = response.data;
        pagination = (response as any).meta || {};
      }
      // Case 2: Nested structure { data: { data: [], meta: {} } }
      else if (response.data && typeof response.data === 'object' && response.data.data && Array.isArray(response.data.data)) {
        users = response.data.data;
        pagination = response.data.meta || {};
      }
      // Case 3: Object with users array { users: [], pagination: {} } (legacy)
      else if (response.data && typeof response.data === 'object' && response.data.users && Array.isArray(response.data.users)) {
        users = response.data.users;
        pagination = response.data.pagination || response.data.meta || {};
      }
      // Case 4: Try to find any array in the response
      else if (response.data && typeof response.data === 'object') {
        // Look for any array property
        for (const key in response.data) {
          if (Array.isArray(response.data[key])) {
            users = response.data[key];
            // Check for meta or pagination
            pagination = response.data.meta || response.data.pagination || (response as any).meta || {};
            break;
          }
        }
      }
      
      console.log('👥 Parsed users:', { count: users.length, pagination });
      
      if (users.length === 0) {
        console.warn('⚠️ No users found in response');
        return { users: [], pagination: pagination };
      }
      
      try {
        return {
          users: users.map(user => {
            try {
              return this.transformUser(user);
            } catch (error) {
              console.error('❌ Error transforming user:', user, error);
              // Return a basic user object if transformation fails
              return {
                id: user.id || 'unknown',
                clerkId: user.clerkId || '',
                email: user.email || '',
                firstName: user.firstName || null,
                lastName: user.lastName || null,
                role: user.role || 'USER',
                name: user.email || 'Unknown User',
                status: 'Active',
                isActive: true,
              } as User;
            }
          }),
          pagination: pagination,
        };
      } catch (error) {
        console.error('❌ Error mapping users:', error);
        throw new Error('Failed to process users data');
      }
    } catch (error) {
      console.error('❌ Error in getAllUsers:', error);
      throw error;
    }
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
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    return {
      ...user,
      // Legacy fields for UI compatibility
      name: fullName || user.email || 'Unknown User',
      status: user.isActive ? 'Active' : 'Inactive',
      lastLogin: user.lastActiveAt,
      memberSince: user.createdAt,
    };
  }
}

export const userService = new UserService();
