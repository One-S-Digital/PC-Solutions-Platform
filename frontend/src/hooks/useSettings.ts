import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settings';
import { User, Organization, PlatformSettings, SupportedLanguage } from '../services/types';

// Hook for user profile management
export const useUserProfile = (userId: string) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await settingsService.getUserProfile(userId);
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user profile');
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const updatedProfile = await settingsService.updateUserProfile(userId, data);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to update user profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updatePreferences = useCallback(async (preferences: {
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
  }) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const updatedProfile = await settingsService.updateUserPreferences(userId, preferences);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to update user preferences');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const changePassword = useCallback(async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await settingsService.changePassword(userId, data);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateAvatar = useCallback(async (file: File, onProgress?: (progress: number) => void) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await settingsService.updateAvatar(userId, file, onProgress);
      // Update profile with new avatar URL
      setProfile(prev => prev ? { ...prev, avatarUrl: result.avatarUrl } : null);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to update avatar');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const deleteAvatar = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      await settingsService.deleteAvatar(userId);
      // Update profile to remove avatar URL
      setProfile(prev => prev ? { ...prev, avatarUrl: undefined } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete avatar');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    updatePreferences,
    changePassword,
    updateAvatar,
    deleteAvatar,
  };
};

// Hook for organization settings
export const useOrganizationSettings = (organizationId: string) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await settingsService.getOrganizationSettings(organizationId);
      setOrganization(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch organization settings');
      console.error('Error fetching organization settings:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const updateOrganization = useCallback(async (data: Partial<Organization>) => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const updatedOrganization = await settingsService.updateOrganizationSettings(organizationId, data);
      setOrganization(updatedOrganization);
      return updatedOrganization;
    } catch (err: any) {
      setError(err.message || 'Failed to update organization settings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const updateLogo = useCallback(async (file: File, onProgress?: (progress: number) => void) => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await settingsService.updateOrganizationLogo(organizationId, file, onProgress);
      // Update organization with new logo URL
      setOrganization(prev => prev ? { ...prev, logoUrl: result.logoUrl } : null);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to update organization logo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const deleteLogo = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      await settingsService.deleteOrganizationLogo(organizationId);
      // Update organization to remove logo URL
      setOrganization(prev => prev ? { ...prev, logoUrl: undefined } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete organization logo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    organization,
    loading,
    error,
    fetchOrganization,
    updateOrganization,
    updateLogo,
    deleteLogo,
  };
};

// Hook for organization members
export const useOrganizationMembers = (organizationId: string) => {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchMembers = useCallback(async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await settingsService.getOrganizationMembers(organizationId, params);
      setMembers(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch organization members');
      console.error('Error fetching organization members:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const inviteMember = useCallback(async (data: {
    email: string;
    role: string;
    message?: string;
  }) => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await settingsService.inviteMember(organizationId, data);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const updatedMember = await settingsService.updateMemberRole(organizationId, userId, role);
      setMembers(prev => prev.map(member => member.id === userId ? updatedMember : member));
      return updatedMember;
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const removeMember = useCallback(async (userId: string) => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      await settingsService.removeMember(organizationId, userId);
      setMembers(prev => prev.filter(member => member.id !== userId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    pagination,
    fetchMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
  };
};

// Hook for platform settings (admin only)
export const usePlatformSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await settingsService.getPlatformSettings();
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
      const updatedSettings = await settingsService.updatePlatformSettings(data);
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

// Hook for notification settings
export const useNotificationSettings = (userId: string) => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await settingsService.getNotificationSettings(userId);
      setSettings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notification settings');
      console.error('Error fetching notification settings:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateSettings = useCallback(async (newSettings: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    categories?: {
      messages?: boolean;
      applications?: boolean;
      orders?: boolean;
      system?: boolean;
    };
  }) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      await settingsService.updateNotificationSettings(userId, newSettings);
      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (err: any) {
      setError(err.message || 'Failed to update notification settings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

// Hook for security settings
export const useSecuritySettings = (userId: string) => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await settingsService.getSecuritySettings(userId);
      setSettings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch security settings');
      console.error('Error fetching security settings:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const enableTwoFactor = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await settingsService.enableTwoFactor(userId);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to enable two-factor authentication');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const disableTwoFactor = useCallback(async (code: string) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      await settingsService.disableTwoFactor(userId, code);
      setSettings(prev => prev ? { ...prev, twoFactorEnabled: false } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to disable two-factor authentication');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const verifyTwoFactor = useCallback(async (code: string) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await settingsService.verifyTwoFactor(userId, code);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to verify two-factor code');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const revokeSession = useCallback(async (sessionId: string) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      await settingsService.revokeSession(userId, sessionId);
      setSettings(prev => prev ? {
        ...prev,
        activeSessions: prev.activeSessions.filter(session => session.id !== sessionId)
      } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const revokeAllSessions = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      await settingsService.revokeAllSessions(userId);
      setSettings(prev => prev ? { ...prev, activeSessions: [] } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke all sessions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    enableTwoFactor,
    disableTwoFactor,
    verifyTwoFactor,
    revokeSession,
    revokeAllSessions,
  };
};

// Hook for system statistics
export const useSystemStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await settingsService.getSystemStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system statistics');
      console.error('Error fetching system statistics:', err);
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

export default useUserProfile;