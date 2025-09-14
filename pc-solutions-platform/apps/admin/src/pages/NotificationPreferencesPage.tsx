import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { 
  AdminCard, 
  AdminButton, 
} from '@repo/ui';

interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  categories: {
    authentication: boolean;
    userManagement: boolean;
    jobRecruitment: boolean;
    messaging: boolean;
    marketplace: boolean;
    leadManagement: boolean;
    subscription: boolean;
    contentModeration: boolean;
    systemAdmin: boolean;
    marketing: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export default function NotificationPreferencesPage() {
  const { getToken, userId } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch(`/api/admin/email-notifications/preferences/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }

      const data = await response.json();
      setPreferences(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      const response = await fetch(`/api/admin/email-notifications/preferences/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const updateCategory = (category: keyof NotificationPreferences['categories'], value: boolean) => {
    if (!preferences) return;
    
    setPreferences(prev => ({
      ...prev!,
      categories: {
        ...prev!.categories,
        [category]: value,
      },
    }));
  };

  const updateFrequency = (frequency: 'immediate' | 'daily' | 'weekly') => {
    if (!preferences) return;
    
    setPreferences(prev => ({
      ...prev!,
      frequency,
    }));
  };

  const updateQuietHours = (field: 'enabled' | 'start' | 'end', value: boolean | string) => {
    if (!preferences) return;
    
    setPreferences(prev => ({
      ...prev!,
      quietHours: {
        ...prev!.quietHours,
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent mx-auto mb-4"></div>
          <p className="text-admin-muted">Loading notification preferences...</p>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-admin-text mb-2">Error Loading Preferences</h2>
          <p className="text-admin-muted mb-4">{error}</p>
          <AdminButton onClick={fetchPreferences}>Retry</AdminButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-app">
      {/* Header */}
      <div className="admin-header sticky top-0 z-40 backdrop-blur bg-admin-surface/80 border-b border-admin-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1.5 rounded-full bg-admin-accent"></div>
            <h1 className="text-admin-text font-semibold tracking-tight">Notification Preferences</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <AdminButton 
              variant="primary" 
              size="sm"
              onClick={savePreferences}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">Preferences saved successfully!</div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Email Notifications Toggle */}
        <AdminCard className="p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-admin-text">Email Notifications</h3>
              <p className="text-admin-muted">Receive email notifications from the platform</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.emailNotifications}
                onChange={(e) => setPreferences(prev => ({
                  ...prev!,
                  emailNotifications: e.target.checked,
                }))}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </AdminCard>

        {/* Notification Categories */}
        <AdminCard className="p-6 mb-8">
          <h3 className="text-lg font-semibold text-admin-text mb-6">Notification Categories</h3>
          
          <div className="space-y-6">
            {/* Mandatory Categories */}
            <div>
              <h4 className="text-md font-medium text-admin-text mb-3">Mandatory Notifications</h4>
              <p className="text-sm text-admin-muted mb-4">
                These notifications are required for account security and billing. They cannot be disabled.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-admin-text">Authentication & Security</span>
                    <p className="text-sm text-admin-muted">Account verification, password resets, login alerts</p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.categories.authentication}
                      disabled
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-500">Required</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-admin-text">Subscription & Billing</span>
                    <p className="text-sm text-admin-muted">Payment confirmations, subscription changes, billing alerts</p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.categories.subscription}
                      disabled
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-500">Required</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Categories */}
            <div>
              <h4 className="text-md font-medium text-admin-text mb-3">Optional Notifications</h4>
              <p className="text-sm text-admin-muted mb-4">
                You can choose which of these notification types you'd like to receive.
              </p>
              
              <div className="space-y-3">
                {[
                  {
                    key: 'userManagement' as const,
                    title: 'User Management',
                    description: 'Profile updates, role changes, account status changes',
                  },
                  {
                    key: 'jobRecruitment' as const,
                    title: 'Job & Recruitment',
                    description: 'Job applications, application status updates, job matches',
                  },
                  {
                    key: 'messaging' as const,
                    title: 'Messaging',
                    description: 'New messages, group messages, mentions',
                  },
                  {
                    key: 'marketplace' as const,
                    title: 'Marketplace & Orders',
                    description: 'Order confirmations, order updates, payment notifications',
                  },
                  {
                    key: 'leadManagement' as const,
                    title: 'Lead Management',
                    description: 'Lead assignments, status updates, follow-up reminders',
                  },
                  {
                    key: 'contentModeration' as const,
                    title: 'Content Moderation',
                    description: 'Content approval notifications, moderation updates',
                  },
                  {
                    key: 'systemAdmin' as const,
                    title: 'System & Admin',
                    description: 'System maintenance, security alerts, platform updates',
                  },
                  {
                    key: 'marketing' as const,
                    title: 'Marketing',
                    description: 'Newsletters, promotions, feature announcements',
                  },
                ].map((category) => (
                  <div key={category.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <span className="font-medium text-admin-text">{category.title}</span>
                      <p className="text-sm text-admin-muted">{category.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.categories[category.key]}
                      onChange={(e) => updateCategory(category.key, e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Frequency Settings */}
        <AdminCard className="p-6 mb-8">
          <h3 className="text-lg font-semibold text-admin-text mb-4">Email Frequency</h3>
          
          <div className="space-y-3">
            {[
              { value: 'immediate', label: 'Immediate', description: 'Receive emails as soon as they are sent' },
              { value: 'daily', label: 'Daily Digest', description: 'Receive a daily summary of all notifications' },
              { value: 'weekly', label: 'Weekly Summary', description: 'Receive a weekly summary of all notifications' },
            ].map((option) => (
              <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  checked={preferences.frequency === option.value}
                  onChange={() => updateFrequency(option.value as any)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="font-medium text-admin-text">{option.label}</span>
                  <p className="text-sm text-admin-muted">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </AdminCard>

        {/* Quiet Hours */}
        <AdminCard className="p-6">
          <h3 className="text-lg font-semibold text-admin-text mb-4">Quiet Hours</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-admin-text">Enable Quiet Hours</span>
                <p className="text-sm text-admin-muted">Pause non-urgent notifications during specified hours</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.quietHours.enabled}
                  onChange={(e) => updateQuietHours('enabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {preferences.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Start Time</label>
                  <input
                    type="time"
                    className="admin-input w-full px-3 py-2"
                    value={preferences.quietHours.start}
                    onChange={(e) => updateQuietHours('start', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">End Time</label>
                  <input
                    type="time"
                    className="admin-input w-full px-3 py-2"
                    value={preferences.quietHours.end}
                    onChange={(e) => updateQuietHours('end', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </AdminCard>
      </main>
    </div>
  );
}