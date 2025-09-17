import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  AdminCard, 
  AdminButton, 
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
  AdminBadge,
  AdminStatus
} from '@repo/ui';

interface AdminProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
  department?: string;
  permissions?: string[];
  accessLevel?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  organizations?: Array<{
    organization: {
      id: string;
      name: string;
      type: string;
    };
  }>;
}

export default function AdminProfilePage() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [profileData, setProfileData] = useState<AdminProfileData | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'settings'>('profile');

  useEffect(() => {
    fetchProfile();
    fetchUsers();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      
      const response = await fetch('/api/profiles/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      setProfileData(result.data);
      setFormData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      setUsers(result.data || []);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const token = await getToken();
      
      const response = await fetch('/api/profiles/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const result = await response.json();
      setProfileData(result.data);
      alert('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const token = await getToken();
      
      const response = await fetch(`/api/users/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      await fetchUsers(); // Refresh users list
      alert(`User ${action}d successfully!`);
    } catch (err: any) {
      alert(`Failed to ${action} user: ${err.message}`);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <AdminCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-admin-charcoal mb-4">Admin Profile</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-admin-charcoal mb-2">
              First Name
            </label>
            <input
              type="text"
              className="input-field"
              value={formData.firstName || ''}
              onChange={(e) => updateFormData('firstName', e.target.value)}
              placeholder="Enter your first name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-admin-charcoal mb-2">
              Last Name
            </label>
            <input
              type="text"
              className="input-field"
              value={formData.lastName || ''}
              onChange={(e) => updateFormData('lastName', e.target.value)}
              placeholder="Enter your last name"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-admin-charcoal mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            className="input-field"
            value={formData.phoneNumber || ''}
            onChange={(e) => updateFormData('phoneNumber', e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {profileData?.role === 'SUPER_ADMIN' && (
          <>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-admin-charcoal mb-2">
                Department
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.department || ''}
                onChange={(e) => updateFormData('department', e.target.value)}
                placeholder="IT, Operations, Management"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-admin-charcoal mb-2">
                Access Level
              </label>
              <select
                className="input-field"
                value={formData.accessLevel || ''}
                onChange={(e) => updateFormData('accessLevel', e.target.value)}
              >
                <option value="">Select Access Level</option>
                <option value="FULL">Full Access</option>
                <option value="LIMITED">Limited Access</option>
                <option value="READ_ONLY">Read Only</option>
              </select>
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <AdminButton
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </AdminButton>
        </div>
      </AdminCard>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      <AdminCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-admin-text">User Management</h3>
          <AdminButton variant="primary">Export Users</AdminButton>
        </div>

        <AdminTable>
          <AdminTableHeader>
            <AdminTableRow>
              <AdminTableHeaderCell>Name</AdminTableHeaderCell>
              <AdminTableHeaderCell>Email</AdminTableHeaderCell>
              <AdminTableHeaderCell>Role</AdminTableHeaderCell>
              <AdminTableHeaderCell>Organization</AdminTableHeaderCell>
              <AdminTableHeaderCell>Joined</AdminTableHeaderCell>
              <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHeader>
          <AdminTableBody>
            {users.map((user) => (
              <AdminTableRow key={user.id}>
                <AdminTableCell>{user.firstName} {user.lastName}</AdminTableCell>
                <AdminTableCell>{user.email}</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge variant="medium">{user.role}</AdminBadge>
                </AdminTableCell>
                <AdminTableCell>
                  {user.organizations?.[0]?.organization?.name || 'N/A'}
                </AdminTableCell>
                <AdminTableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </AdminTableCell>
                <AdminTableCell>
                  <div className="flex gap-2">
                    <AdminButton variant="outline" size="sm">
                      Edit
                    </AdminButton>
                    <AdminButton 
                      variant="danger" 
                      size="sm"
                      onClick={() => handleUserAction(user.id, 'suspend')}
                    >
                      Suspend
                    </AdminButton>
                  </div>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      </AdminCard>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <AdminCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-admin-text mb-4">Quick Settings</h3>
        
        <div className="space-y-4">
          <AdminStatus variant="medium">
            <span>⚙️</span>
            <span>Platform maintenance scheduled for tonight at 2 AM</span>
          </AdminStatus>
          
          <AdminStatus variant="low">
            <span>ℹ️</span>
            <span>Database backup completed successfully</span>
          </AdminStatus>
          
          <AdminStatus variant="high">
            <span>⚠️</span>
            <span>High memory usage detected on server-02</span>
          </AdminStatus>
        </div>

        <div className="mt-6 space-y-3">
          <AdminButton variant="primary" className="w-full">
            Open Full Settings Panel
          </AdminButton>
          <AdminButton variant="secondary" className="w-full">
            System Monitoring
          </AdminButton>
          <AdminButton variant="secondary" className="w-full">
            Subscription Management
          </AdminButton>
        </div>
      </AdminCard>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-admin-accent mx-auto"></div>
          <p className="mt-4 text-admin-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-app">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-admin-text">Admin Profile Management</h1>
          <p className="text-admin-muted mt-2">Manage your admin profile and system settings</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-admin-border">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-admin-muted hover:text-admin-text hover:border-admin-border'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-admin-muted hover:text-admin-text hover:border-admin-border'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-admin-muted hover:text-admin-text hover:border-admin-border'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
}