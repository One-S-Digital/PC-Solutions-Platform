import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/admin';
import { User, Organization, UserRole, PlatformSettings } from '../services/types';

// Hook for user management
export const useAdminUsers = (params?: {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: 'active' | 'inactive' | 'pending';
  search?: string;
  organizationId?: string;
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminService.getUsers(params);
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
  }, [params]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = useCallback(async (data: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organizationId?: string;
    sendInvite?: boolean;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newUser = await adminService.createUser(data);
      setUsers(prev => [newUser, ...prev]);
      return newUser;
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (userId: string, data: Partial<User>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedUser = await adminService.updateUser(userId, data);
      setUsers(prev => prev.map(user => user.id === userId ? updatedUser : user));
      return updatedUser;
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      await adminService.deleteUser(userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const activateUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedUser = await adminService.activateUser(userId);
      setUsers(prev => prev.map(user => user.id === userId ? updatedUser : user));
      return updatedUser;
    } catch (err: any) {
      setError(err.message || 'Failed to activate user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deactivateUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedUser = await adminService.deactivateUser(userId);
      setUsers(prev => prev.map(user => user.id === userId ? updatedUser : user));
      return updatedUser;
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetUserPassword = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminService.resetUserPassword(userId);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to reset user password');
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
    createUser,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
    resetUserPassword,
  };
};

// Hook for organization management
export const useAdminOrganizations = (params?: {
  page?: number;
  limit?: number;
  type?: string;
  status?: 'active' | 'inactive' | 'pending';
  search?: string;
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminService.getOrganizations(params);
      setOrganizations(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch organizations');
      console.error('Error fetching organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const createOrganization = useCallback(async (data: {
    name: string;
    type: string;
    description?: string;
    website?: string;
    address?: string;
    contactEmail: string;
    contactPhone?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newOrganization = await adminService.createOrganization(data);
      setOrganizations(prev => [newOrganization, ...prev]);
      return newOrganization;
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrganization = useCallback(async (organizationId: string, data: Partial<Organization>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedOrganization = await adminService.updateOrganization(organizationId, data);
      setOrganizations(prev => prev.map(org => org.id === organizationId ? updatedOrganization : org));
      return updatedOrganization;
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOrganization = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);

    try {
      await adminService.deleteOrganization(organizationId);
      setOrganizations(prev => prev.filter(org => org.id !== organizationId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete organization');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const activateOrganization = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedOrganization = await adminService.activateOrganization(organizationId);
      setOrganizations(prev => prev.map(org => org.id === organizationId ? updatedOrganization : org));
      return updatedOrganization;
    } catch (err: any) {
      setError(err.message || 'Failed to activate organization');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deactivateOrganization = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedOrganization = await adminService.deactivateOrganization(organizationId);
      setOrganizations(prev => prev.map(org => org.id === organizationId ? updatedOrganization : org));
      return updatedOrganization;
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate organization');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    organizations,
    loading,
    error,
    pagination,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    activateOrganization,
    deactivateOrganization,
  };
};

// Hook for platform settings
export const useAdminPlatformSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await adminService.getPlatformSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch platform settings');
      console.error('Error fetching platform settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (data: Partial<PlatformSettings>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedSettings = await adminService.updatePlatformSettings(data);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err: any) {
      setError(err.message || 'Failed to update platform settings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  };
};

// Hook for dashboard statistics
export const useAdminDashboardStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard statistics');
      console.error('Error fetching dashboard statistics:', err);
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

// Hook for user analytics
export const useAdminUserAnalytics = (params?: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month';
}) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await adminService.getUserAnalytics(params);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user analytics');
      console.error('Error fetching user analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refreshAnalytics: fetchAnalytics,
  };
};

// Hook for revenue analytics
export const useAdminRevenueAnalytics = (params?: {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: 'day' | 'week' | 'month';
}) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await adminService.getRevenueAnalytics(params);
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch revenue analytics');
      console.error('Error fetching revenue analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refreshAnalytics: fetchAnalytics,
  };
};

// Hook for content management
export const useAdminContentStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await adminService.getContentStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch content statistics');
      console.error('Error fetching content statistics:', err);
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

// Hook for system health
export const useAdminSystemHealth = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await adminService.getSystemHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system health');
      console.error('Error fetching system health:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    
    // Poll for system health every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return {
    health,
    loading,
    error,
    refreshHealth: fetchHealth,
  };
};

// Hook for audit logs
export const useAdminAuditLogs = (params?: {
  page?: number;
  limit?: number;
  userId?: string;
  organizationId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminService.getAuditLogs(params);
      setLogs(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const exportLogs = useCallback(async (exportParams?: {
    userId?: string;
    organizationId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminService.exportAuditLogs(exportParams);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to export audit logs');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    logs,
    loading,
    error,
    pagination,
    fetchLogs,
    exportLogs,
  };
};

export default useAdminUsers;