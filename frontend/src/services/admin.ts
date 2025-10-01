import { apiClient } from './api';
import { User, Organization, UserRole, PlatformSettings } from './types';

// Admin service for managing admin dashboard features
export class AdminService {
  // User management endpoints
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    status?: 'active' | 'inactive' | 'pending';
    search?: string;
    organizationId?: string;
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
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.organizationId) queryParams.append('organizationId', params.organizationId);

    return apiClient.get(`/admin/users?${queryParams.toString()}`);
  }

  async getUserById(userId: string): Promise<User> {
    return apiClient.get<User>(`/admin/users/${userId}`);
  }

  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organizationId?: string;
    sendInvite?: boolean;
  }): Promise<User> {
    return apiClient.post<User>('/admin/users', data);
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return apiClient.patch<User>(`/admin/users/${userId}`, data);
  }

  async deleteUser(userId: string): Promise<void> {
    return apiClient.delete(`/admin/users/${userId}`);
  }

  async activateUser(userId: string): Promise<User> {
    return apiClient.patch<User>(`/admin/users/${userId}/activate`);
  }

  async deactivateUser(userId: string): Promise<User> {
    return apiClient.patch<User>(`/admin/users/${userId}/deactivate`);
  }

  async resetUserPassword(userId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/admin/users/${userId}/reset-password`);
  }

  // Organization management endpoints
  async getOrganizations(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: 'active' | 'inactive' | 'pending';
    search?: string;
  }): Promise<{
    data: Organization[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.get(`/admin/organizations?${queryParams.toString()}`);
  }

  async getOrganizationById(organizationId: string): Promise<Organization> {
    return apiClient.get<Organization>(`/admin/organizations/${organizationId}`);
  }

  async createOrganization(data: {
    name: string;
    type: string;
    description?: string;
    website?: string;
    address?: string;
    contactEmail: string;
    contactPhone?: string;
  }): Promise<Organization> {
    return apiClient.post<Organization>('/admin/organizations', data);
  }

  async updateOrganization(organizationId: string, data: Partial<Organization>): Promise<Organization> {
    return apiClient.patch<Organization>(`/admin/organizations/${organizationId}`, data);
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    return apiClient.delete(`/admin/organizations/${organizationId}`);
  }

  async activateOrganization(organizationId: string): Promise<Organization> {
    return apiClient.patch<Organization>(`/admin/organizations/${organizationId}/activate`);
  }

  async deactivateOrganization(organizationId: string): Promise<Organization> {
    return apiClient.patch<Organization>(`/admin/organizations/${organizationId}/deactivate`);
  }

  // Platform settings management
  async getPlatformSettings(): Promise<PlatformSettings> {
    return apiClient.get<PlatformSettings>('/admin/platform-settings');
  }

  async updatePlatformSettings(data: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return apiClient.patch<PlatformSettings>('/admin/platform-settings', data);
  }

  // Analytics and reporting
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalOrganizations: number;
    activeUsers: number;
    newUsersThisMonth: number;
    totalRevenue: number;
    revenueThisMonth: number;
    systemHealth: {
      database: 'healthy' | 'warning' | 'error';
      storage: 'healthy' | 'warning' | 'error';
      email: 'healthy' | 'warning' | 'error';
      api: 'healthy' | 'warning' | 'error';
    };
    recentActivity: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
      userId?: string;
      userName?: string;
    }>;
  }> {
    return apiClient.get('/admin/dashboard/stats');
  }

  async getUserAnalytics(params?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    registrations: Array<{ date: string; count: number }>;
    logins: Array<{ date: string; count: number }>;
    activeUsers: Array<{ date: string; count: number }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);

    return apiClient.get(`/admin/analytics/users?${queryParams.toString()}`);
  }

  async getRevenueAnalytics(params?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    revenue: Array<{ date: string; amount: number }>;
    subscriptions: Array<{ date: string; count: number; amount: number }>;
    topProducts: Array<{ name: string; revenue: number; sales: number }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);

    return apiClient.get(`/admin/analytics/revenue?${queryParams.toString()}`);
  }

  // Content management
  async getContentStats(): Promise<{
    totalProducts: number;
    totalServices: number;
    totalJobListings: number;
    totalApplications: number;
    totalMessages: number;
    totalFiles: number;
    storageUsed: number;
  }> {
    return apiClient.get('/admin/content/stats');
  }

  async getContentModeration(): Promise<{
    pendingReviews: number;
    flaggedContent: Array<{
      id: string;
      type: 'product' | 'service' | 'job' | 'message' | 'file';
      content: string;
      reason: string;
      reportedBy: string;
      reportedAt: string;
    }>;
  }> {
    return apiClient.get('/admin/content/moderation');
  }

  async approveContent(contentId: string, type: string): Promise<void> {
    return apiClient.patch(`/admin/content/${type}/${contentId}/approve`);
  }

  async rejectContent(contentId: string, type: string, reason: string): Promise<void> {
    return apiClient.patch(`/admin/content/${type}/${contentId}/reject`, { reason });
  }

  // System management
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    services: Array<{
      name: string;
      status: 'healthy' | 'warning' | 'error';
      responseTime?: number;
      lastCheck: string;
      message?: string;
    }>;
    database: {
      status: 'healthy' | 'warning' | 'error';
      connections: number;
      maxConnections: number;
      responseTime: number;
    };
    storage: {
      status: 'healthy' | 'warning' | 'error';
      used: number;
      total: number;
      percentage: number;
    };
  }> {
    return apiClient.get('/admin/system/health');
  }

  async getSystemLogs(params?: {
    page?: number;
    limit?: number;
    level?: 'info' | 'warn' | 'error';
    service?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    data: Array<{
      id: string;
      timestamp: string;
      level: string;
      service: string;
      message: string;
      metadata: any;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.level) queryParams.append('level', params.level);
    if (params?.service) queryParams.append('service', params.service);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    return apiClient.get(`/admin/system/logs?${queryParams.toString()}`);
  }

  // Backup and maintenance
  async createBackup(): Promise<{ backupId: string; downloadUrl: string }> {
    return apiClient.post('/admin/backup/create');
  }

  async getBackups(): Promise<Array<{
    id: string;
    createdAt: string;
    size: number;
    status: 'completed' | 'failed' | 'in_progress';
    downloadUrl?: string;
  }>> {
    return apiClient.get('/admin/backups');
  }

  async deleteBackup(backupId: string): Promise<void> {
    return apiClient.delete(`/admin/backups/${backupId}`);
  }

  async enableMaintenanceMode(message: string): Promise<void> {
    return apiClient.post('/admin/maintenance/enable', { message });
  }

  async disableMaintenanceMode(): Promise<void> {
    return apiClient.post('/admin/maintenance/disable');
  }

  async getMaintenanceStatus(): Promise<{
    isMaintenanceMode: boolean;
    scheduledMaintenance?: {
      startTime: string;
      endTime: string;
      message: string;
    };
  }> {
    return apiClient.get('/admin/maintenance/status');
  }

  // Email management
  async getEmailStats(): Promise<{
    totalSent: number;
    sentToday: number;
    failedToday: number;
    queueSize: number;
    templates: Array<{
      id: string;
      name: string;
      subject: string;
      sentCount: number;
      lastUsed: string;
    }>;
  }> {
    return apiClient.get('/admin/email/stats');
  }

  async sendTestEmail(data: {
    to: string;
    template: string;
    variables?: Record<string, any>;
  }): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/admin/email/test', data);
  }

  async getEmailQueue(): Promise<Array<{
    id: string;
    to: string;
    subject: string;
    template: string;
    status: 'pending' | 'sent' | 'failed';
    scheduledAt: string;
    attempts: number;
    lastError?: string;
  }>> {
    return apiClient.get('/admin/email/queue');
  }

  // API management
  async getApiStats(): Promise<{
    totalRequests: number;
    requestsToday: number;
    averageResponseTime: number;
    errorRate: number;
    topEndpoints: Array<{
      endpoint: string;
      requests: number;
      averageResponseTime: number;
      errorRate: number;
    }>;
  }> {
    return apiClient.get('/admin/api/stats');
  }

  async getApiKeys(): Promise<Array<{
    id: string;
    name: string;
    key: string;
    permissions: string[];
    lastUsed?: string;
    createdAt: string;
    expiresAt?: string;
  }>> {
    return apiClient.get('/admin/api/keys');
  }

  async createApiKey(data: {
    name: string;
    permissions: string[];
    expiresAt?: string;
  }): Promise<{
    id: string;
    name: string;
    key: string;
    permissions: string[];
    expiresAt?: string;
  }> {
    return apiClient.post('/admin/api/keys', data);
  }

  async deleteApiKey(keyId: string): Promise<void> {
    return apiClient.delete(`/admin/api/keys/${keyId}`);
  }

  // Audit and compliance
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    organizationId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    data: Array<{
      id: string;
      userId: string;
      userName: string;
      action: string;
      resource: string;
      resourceId: string;
      timestamp: string;
      ipAddress: string;
      userAgent: string;
      metadata: any;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.organizationId) queryParams.append('organizationId', params.organizationId);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    return apiClient.get(`/admin/audit-logs?${queryParams.toString()}`);
  }

  async exportAuditLogs(params?: {
    userId?: string;
    organizationId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ downloadUrl: string; expiresAt: string }> {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.organizationId) queryParams.append('organizationId', params.organizationId);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    return apiClient.post(`/admin/audit-logs/export?${queryParams.toString()}`);
  }
}

// Create singleton instance
export const adminService = new AdminService();

export default adminService;