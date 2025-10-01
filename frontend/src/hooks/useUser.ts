import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { userService } from '../services/user';
import { organizationService } from '../services/organization';
import { User, Organization } from '../services/types';

// Hook for current user data
export const useCurrentUser = () => {
  const { user: authUser, isAuthenticated } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!isAuthenticated || !authUser) {
      setUser(null);
      setOrganization(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch full user profile
      const userData = await userService.getCurrentUser();
      setUser(userData);

      // Fetch user's organization
      const orgData = await organizationService.getCurrentOrganization();
      setOrganization(orgData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user data');
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authUser]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const updatedUser = await userService.updateProfile(user.id, data);
      setUser(updatedUser);
      return updatedUser;
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const uploadAvatar = useCallback(async (file: File, onProgress?: (progress: number) => void) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await userService.uploadAvatar(file, onProgress);
      // Update user with new avatar URL
      const updatedUser = await userService.getCurrentUser();
      setUser(updatedUser);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshUserData = useCallback(() => {
    fetchUserData();
  }, [fetchUserData]);

  return {
    user,
    organization,
    loading,
    error,
    updateProfile,
    uploadAvatar,
    refreshUserData,
  };
};

// Hook for user management (admin only)
export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchUsers = useCallback(async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    isActive?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await userService.getAllUsers(params);
      setUsers(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserRole = useCallback(async (userId: string, role: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedUser = await userService.updateUserRole(userId, role as any);
      setUsers(prev => prev.map(user => user.id === userId ? updatedUser : user));
      return updatedUser;
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deactivateUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedUser = await userService.deactivateUser(userId);
      setUsers(prev => prev.map(user => user.id === userId ? updatedUser : user));
      return updatedUser;
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const activateUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedUser = await userService.activateUser(userId);
      setUsers(prev => prev.map(user => user.id === userId ? updatedUser : user));
      return updatedUser;
    } catch (err: any) {
      setError(err.message || 'Failed to activate user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    updateUserRole,
    deactivateUser,
    activateUser,
    deleteUser,
  };
};

// Hook for user statistics (admin only)
export const useUserStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await userService.getUserStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user statistics');
      console.error('Error fetching user stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats,
  };
};

export default useCurrentUser;