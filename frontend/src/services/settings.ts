import { apiClient } from './api';
import { User, Organization, PlatformSettings, SupportedLanguage } from './types';

// Settings service for managing user and platform settings
export class SettingsService {
  // User profile endpoints
  async getUserProfile(userId: string): Promise<User> {
    return apiClient.get<User>(`/settings/users/${userId}/profile`);
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
    return apiClient.patch<User>(`/settings/users/${userId}/profile`, data);
  }

  async updateUserPreferences(userId: string, preferences: {
    language?: SupportedLanguage;
    timezone?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
    privacy?: {
      profileVisibility?: 'public' | 'private' | 'organization';
      showEmail?: boolean;
      showPhone?: boolean;
    };
  }): Promise<User> {
    return apiClient.patch<User>(`/settings/users/${userId}/preferences`, preferences);
  }

  async changePassword(userId: string, data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/settings/users/${userId}/change-password`, data);
  }

  async updateAvatar(userId: string, file: File, onProgress?: (progress: number) => void): Promise<{ avatarUrl: string }> {
    return apiClient.uploadFile<{ avatarUrl: string }>(`/settings/users/${userId}/avatar`, file, onProgress);
  }

  async deleteAvatar(userId: string): Promise<void> {
    return apiClient.delete(`/settings/users/${userId}/avatar`);
  }

  // Organization settings endpoints
  async getOrganizationSettings(organizationId: string): Promise<Organization> {
    return apiClient.get<Organization>(`/settings/organizations/${organizationId}`);
  }

  async updateOrganizationSettings(organizationId: string, data: Partial<Organization>): Promise<Organization> {
    return apiClient.patch<Organization>(`/settings/organizations/${organizationId}`, data);
  }

  async updateOrganizationLogo(organizationId: string, file: File, onProgress?: (progress: number) => void): Promise<{ logoUrl: string }> {
    return apiClient.uploadFile<{ logoUrl: string }>(`/settings/organizations/${organizationId}/logo`, file, onProgress);
  }

  async deleteOrganizationLogo(organizationId: string): Promise<void> {
    return apiClient.delete(`/settings/organizations/${organizationId}/logo`);
  }

  async getOrganizationMembers(organizationId: string, params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
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

    return apiClient.get(`/settings/organizations/${organizationId}/members?${queryParams.toString()}`);
  }

  async inviteMember(organizationId: string, data: {
    email: string;
    role: string;
    message?: string;
  }): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/settings/organizations/${organizationId}/invite`, data);
  }

  async updateMemberRole(organizationId: string, userId: string, role: string): Promise<User> {
    return apiClient.patch<User>(`/settings/organizations/${organizationId}/members/${userId}/role`, { role });
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    return apiClient.delete(`/settings/organizations/${organizationId}/members/${userId}`);
  }

  // Platform settings endpoints (admin only)
  async getPlatformSettings(): Promise<PlatformSettings> {
    return apiClient.get<PlatformSettings>('/settings/platform');
  }

  async updatePlatformSettings(data: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return apiClient.patch<PlatformSettings>('/settings/platform', data);
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    totalOrganizations: number;
    activeUsers: number;
    systemHealth: {
      database: 'healthy' | 'warning' | 'error';
      storage: 'healthy' | 'warning' | 'error';
      email: 'healthy' | 'warning' | 'error';
    };
    usageStats: {
      storageUsed: number;
      bandwidthUsed: number;
      apiCalls: number;
    };
  }> {
    return apiClient.get('/settings/platform/stats');
  }

  // Notification settings
  async getNotificationSettings(userId: string): Promise<{
    email: boolean;
    push: boolean;
    sms: boolean;
    categories: {
      messages: boolean;
      applications: boolean;
      orders: boolean;
      system: boolean;
    };
  }> {
    return apiClient.get(`/settings/users/${userId}/notifications`);
  }

  async updateNotificationSettings(userId: string, settings: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    categories?: {
      messages?: boolean;
      applications?: boolean;
      orders?: boolean;
      system?: boolean;
    };
  }): Promise<void> {
    return apiClient.patch(`/settings/users/${userId}/notifications`, settings);
  }

  // Security settings
  async getSecuritySettings(userId: string): Promise<{
    twoFactorEnabled: boolean;
    loginHistory: Array<{
      id: string;
      timestamp: string;
      ipAddress: string;
      userAgent: string;
      location: string;
    }>;
    activeSessions: Array<{
      id: string;
      device: string;
      location: string;
      lastActive: string;
    }>;
  }> {
    return apiClient.get(`/settings/users/${userId}/security`);
  }

  async enableTwoFactor(userId: string): Promise<{
    qrCode: string;
    secret: string;
    backupCodes: string[];
  }> {
    return apiClient.post(`/settings/users/${userId}/two-factor/enable`);
  }

  async disableTwoFactor(userId: string, code: string): Promise<void> {
    return apiClient.post(`/settings/users/${userId}/two-factor/disable`, { code });
  }

  async verifyTwoFactor(userId: string, code: string): Promise<{ verified: boolean }> {
    return apiClient.post(`/settings/users/${userId}/two-factor/verify`, { code });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    return apiClient.delete(`/settings/users/${userId}/sessions/${sessionId}`);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    return apiClient.delete(`/settings/users/${userId}/sessions`);
  }

  // Data export and deletion
  async exportUserData(userId: string): Promise<{ downloadUrl: string; expiresAt: string }> {
    return apiClient.post(`/settings/users/${userId}/export`);
  }

  async deleteUserAccount(userId: string, data: {
    password: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/settings/users/${userId}/delete`, data);
  }

  // Audit logs
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

    return apiClient.get(`/settings/audit-logs?${queryParams.toString()}`);
  }

  // Backup and restore
  async createBackup(): Promise<{ backupId: string; downloadUrl: string }> {
    return apiClient.post('/settings/backup/create');
  }

  async getBackups(): Promise<Array<{
    id: string;
    createdAt: string;
    size: number;
    status: 'completed' | 'failed' | 'in_progress';
    downloadUrl?: string;
  }>> {
    return apiClient.get('/settings/backups');
  }

  async deleteBackup(backupId: string): Promise<void> {
    return apiClient.delete(`/settings/backups/${backupId}`);
  }

  // System maintenance
  async getMaintenanceStatus(): Promise<{
    isMaintenanceMode: boolean;
    scheduledMaintenance?: {
      startTime: string;
      endTime: string;
      message: string;
    };
  }> {
    return apiClient.get('/settings/maintenance');
  }

  async enableMaintenanceMode(message: string): Promise<void> {
    return apiClient.post('/settings/maintenance/enable', { message });
  }

  async disableMaintenanceMode(): Promise<void> {
    return apiClient.post('/settings/maintenance/disable');
  }

  // API keys and integrations
  async getApiKeys(): Promise<Array<{
    id: string;
    name: string;
    key: string;
    permissions: string[];
    lastUsed?: string;
    createdAt: string;
    expiresAt?: string;
  }>> {
    return apiClient.get('/settings/api-keys');
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
    return apiClient.post('/settings/api-keys', data);
  }

  async deleteApiKey(keyId: string): Promise<void> {
    return apiClient.delete(`/settings/api-keys/${keyId}`);
  }

  // Webhooks
  async getWebhooks(): Promise<Array<{
    id: string;
    url: string;
    events: string[];
    isActive: boolean;
    lastTriggered?: string;
    createdAt: string;
  }>> {
    return apiClient.get('/settings/webhooks');
  }

  async createWebhook(data: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<{
    id: string;
    url: string;
    events: string[];
    isActive: boolean;
    createdAt: string;
  }> {
    return apiClient.post('/settings/webhooks', data);
  }

  async updateWebhook(webhookId: string, data: {
    url?: string;
    events?: string[];
    isActive?: boolean;
    secret?: string;
  }): Promise<void> {
    return apiClient.patch(`/settings/webhooks/${webhookId}`, data);
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    return apiClient.delete(`/settings/webhooks/${webhookId}`);
  }

  async testWebhook(webhookId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/settings/webhooks/${webhookId}/test`);
  }
}

// Create singleton instance
export const settingsService = new SettingsService();

export default settingsService;