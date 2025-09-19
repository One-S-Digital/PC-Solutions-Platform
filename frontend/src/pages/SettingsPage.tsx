import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Badge } from '@repo/ui';
import { Cog6ToothIcon, BellIcon, ShieldCheckIcon, UserGroupIcon, BuildingOfficeIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useRoleSettings, UserRole, FoundationSettings, EducatorSettings, ProductSupplierSettings, ServiceProviderSettings, ParentSettings } from '../services/settingsService';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRole = (user?.publicMetadata?.role as UserRole) || UserRole.PARENT;

  // Load role-specific settings
  const {
    settings,
    loading,
    error: settingsError,
    saving,
    loadSettings,
    updateSettings,
  } = useRoleSettings(userRole);

  useEffect(() => {
    if (user) {
      loadSettings(user.id);
    }
  }, [user, loadSettings]);

  const handleSaveSettings = async (updates: any) => {
    if (!user) return;

    try {
      setIsSaving(true);
      setError(null);
      await updateSettings(user.id, updates);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case UserRole.FOUNDATION: return 'Foundation (Daycare)';
      case UserRole.EDUCATOR: return 'Educator';
      case UserRole.PRODUCT_SUPPLIER: return 'Product Supplier';
      case UserRole.SERVICE_PROVIDER: return 'Service Provider';
      case UserRole.PARENT: return 'Parent';
      case UserRole.ADMIN: return 'Administrator';
      case UserRole.SUPER_ADMIN: return 'Super Administrator';
      default: return role;
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.FOUNDATION: return BuildingOfficeIcon;
      case UserRole.EDUCATOR: return UserGroupIcon;
      case UserRole.PRODUCT_SUPPLIER: return CurrencyDollarIcon;
      case UserRole.SERVICE_PROVIDER: return Cog6ToothIcon;
      case UserRole.PARENT: return UserGroupIcon;
      case UserRole.ADMIN: return ShieldCheckIcon;
      case UserRole.SUPER_ADMIN: return ShieldCheckIcon;
      default: return Cog6ToothIcon;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen frontend-page bg-swiss-light py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint mx-auto mb-4"></div>
              <p className="text-swiss-gray">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="min-h-screen frontend-page bg-swiss-light py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Settings</h2>
              <p className="text-swiss-gray mb-4">{settingsError}</p>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(userRole);

  return (
    <div className="min-h-screen frontend-page bg-swiss-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="h-1 w-16 bg-swiss-mint rounded-full mr-4"></div>
            <h1 className="text-3xl font-bold text-swiss-charcoal font-swiss">
              Settings
            </h1>
          </div>
          <div className="flex items-center">
            <RoleIcon className="h-6 w-6 text-swiss-mint mr-3" />
            <Badge variant="mint">{getRoleDisplayName(userRole)}</Badge>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="p-4 mb-6 border-red-200 bg-red-50">
            <div className="text-red-700 font-medium">{error}</div>
          </Card>
        )}

        {/* Settings Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'general', label: 'General', icon: Cog6ToothIcon },
              { id: 'notifications', label: 'Notifications', icon: BellIcon },
              { id: 'security', label: 'Security', icon: ShieldCheckIcon },
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-swiss-mint text-swiss-mint'
                      : 'border-transparent text-swiss-gray hover:text-swiss-charcoal hover:border-gray-300'
                  }`}
                >
                  <TabIcon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Form */}
          <div className="lg:col-span-2">
            {activeTab === 'general' && (
              <GeneralSettings 
                settings={settings} 
                userRole={userRole}
                onSave={handleSaveSettings}
                saving={saving || isSaving}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationSettings 
                settings={settings} 
                userRole={userRole}
                onSave={handleSaveSettings}
                saving={saving || isSaving}
              />
            )}
            {activeTab === 'security' && (
              <SecuritySettings 
                settings={settings} 
                userRole={userRole}
                onSave={handleSaveSettings}
                saving={saving || isSaving}
              />
            )}
          </div>

          {/* Settings Info */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-swiss-charcoal mb-4">Settings Info</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-swiss-charcoal mb-2">Your Role</h4>
                  <Badge variant="mint">{getRoleDisplayName(userRole)}</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-swiss-charcoal mb-2">Settings Scope</h4>
                  <p className="text-sm text-swiss-gray">
                    These settings are specific to your role and will affect how you interact with the platform.
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-swiss-charcoal mb-2">Data Privacy</h4>
                  <p className="text-sm text-swiss-gray">
                    Your settings are stored securely and only accessible to you and authorized administrators.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// General Settings Component
function GeneralSettings({ settings, userRole, onSave, saving }: any) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const renderRoleSpecificFields = () => {
    switch (userRole) {
      case UserRole.FOUNDATION:
        return (
          <FoundationGeneralFields 
            formData={formData} 
            onInputChange={handleInputChange} 
          />
        );
      case UserRole.EDUCATOR:
        return (
          <EducatorGeneralFields 
            formData={formData} 
            onInputChange={handleInputChange} 
          />
        );
      case UserRole.PRODUCT_SUPPLIER:
        return (
          <ProductSupplierGeneralFields 
            formData={formData} 
            onInputChange={handleInputChange} 
          />
        );
      case UserRole.SERVICE_PROVIDER:
        return (
          <ServiceProviderGeneralFields 
            formData={formData} 
            onInputChange={handleInputChange} 
          />
        );
      case UserRole.PARENT:
        return (
          <ParentGeneralFields 
            formData={formData} 
            onInputChange={handleInputChange} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-swiss-charcoal mb-6">General Settings</h2>
      
      {renderRoleSpecificFields()}
      
      <div className="flex justify-end mt-6">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}

// Foundation General Fields
function FoundationGeneralFields({ formData, onInputChange }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Organization Name
          </label>
          <Input
            value={formData.organizationName || ''}
            onChange={(e) => onInputChange('organizationName', e.target.value)}
            placeholder="Enter organization name"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Capacity
          </label>
          <Input
            type="number"
            value={formData.capacity || ''}
            onChange={(e) => onInputChange('capacity', parseInt(e.target.value))}
            placeholder="Maximum number of children"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
          License Number
        </label>
        <Input
          value={formData.licenseNumber || ''}
          onChange={(e) => onInputChange('licenseNumber', e.target.value)}
          placeholder="Enter license number"
        />
      </div>
      
      <div>
        <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
          Programs Offered
        </label>
        <textarea
          value={formData.programs?.join(', ') || ''}
          onChange={(e) => onInputChange('programs', e.target.value.split(', '))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-input bg-white text-swiss-charcoal placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint"
          placeholder="List programs separated by commas"
        />
      </div>
    </div>
  );
}

// Educator General Fields
function EducatorGeneralFields({ formData, onInputChange }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Years of Experience
          </label>
          <Input
            type="number"
            value={formData.experience || ''}
            onChange={(e) => onInputChange('experience', parseInt(e.target.value))}
            placeholder="Years of experience"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Hourly Rate
          </label>
          <Input
            type="number"
            value={formData.workPreferences?.hourlyRate || ''}
            onChange={(e) => onInputChange('workPreferences', {
              ...formData.workPreferences,
              hourlyRate: parseFloat(e.target.value)
            })}
            placeholder="Hourly rate"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
          Certifications
        </label>
        <textarea
          value={formData.certifications?.join(', ') || ''}
          onChange={(e) => onInputChange('certifications', e.target.value.split(', '))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-input bg-white text-swiss-charcoal placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint"
          placeholder="List certifications separated by commas"
        />
      </div>
    </div>
  );
}

// Product Supplier General Fields
function ProductSupplierGeneralFields({ formData, onInputChange }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Company Name
          </label>
          <Input
            value={formData.companyName || ''}
            onChange={(e) => onInputChange('companyName', e.target.value)}
            placeholder="Enter company name"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Tax ID
          </label>
          <Input
            value={formData.taxId || ''}
            onChange={(e) => onInputChange('taxId', e.target.value)}
            placeholder="Enter tax ID"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
          Product Categories
        </label>
        <textarea
          value={formData.productCategories?.join(', ') || ''}
          onChange={(e) => onInputChange('productCategories', e.target.value.split(', '))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-input bg-white text-swiss-charcoal placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint"
          placeholder="List product categories separated by commas"
        />
      </div>
    </div>
  );
}

// Service Provider General Fields
function ServiceProviderGeneralFields({ formData, onInputChange }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Company Name
          </label>
          <Input
            value={formData.companyName || ''}
            onChange={(e) => onInputChange('companyName', e.target.value)}
            placeholder="Enter company name"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Service Type
          </label>
          <select
            value={formData.serviceType || ''}
            onChange={(e) => onInputChange('serviceType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-input bg-white text-swiss-charcoal focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint"
          >
            <option value="">Select service type</option>
            <option value="consulting">Consulting</option>
            <option value="training">Training</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
            <option value="catering">Catering</option>
            <option value="transportation">Transportation</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
          Service Categories
        </label>
        <textarea
          value={formData.serviceCategories?.join(', ') || ''}
          onChange={(e) => onInputChange('serviceCategories', e.target.value.split(', '))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-input bg-white text-swiss-charcoal placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint"
          placeholder="List service categories separated by commas"
        />
      </div>
    </div>
  );
}

// Parent General Fields
function ParentGeneralFields({ formData, onInputChange }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Number of Children
          </label>
          <Input
            type="number"
            value={formData.familyInfo?.numberOfChildren || ''}
            onChange={(e) => onInputChange('familyInfo', {
              ...formData.familyInfo,
              numberOfChildren: parseInt(e.target.value)
            })}
            placeholder="Number of children"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Max Monthly Budget
          </label>
          <Input
            type="number"
            value={formData.budget?.maxMonthlyBudget || ''}
            onChange={(e) => onInputChange('budget', {
              ...formData.budget,
              maxMonthlyBudget: parseFloat(e.target.value)
            })}
            placeholder="Maximum monthly budget"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
          Children Ages
        </label>
        <Input
          value={formData.familyInfo?.childrenAges?.join(', ') || ''}
          onChange={(e) => onInputChange('familyInfo', {
            ...formData.familyInfo,
            childrenAges: e.target.value.split(', ').map(age => parseInt(age))
          })}
          placeholder="Enter ages separated by commas (e.g., 3, 5, 7)"
        />
      </div>
    </div>
  );
}

// Notification Settings Component
function NotificationSettings({ settings, userRole, onSave, saving }: any) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleNotificationChange = (key: string, value: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const getNotificationFields = () => {
    switch (userRole) {
      case UserRole.FOUNDATION:
        return [
          { key: 'newApplications', label: 'New Applications', description: 'Get notified when new applications are submitted' },
          { key: 'staffUpdates', label: 'Staff Updates', description: 'Get notified about staff changes and updates' },
          { key: 'parentMessages', label: 'Parent Messages', description: 'Get notified when parents send messages' },
          { key: 'systemAlerts', label: 'System Alerts', description: 'Get notified about important system updates' },
          { key: 'weeklyReports', label: 'Weekly Reports', description: 'Receive weekly summary reports' },
        ];
      case UserRole.EDUCATOR:
        return [
          { key: 'jobMatches', label: 'Job Matches', description: 'Get notified about matching job opportunities' },
          { key: 'applicationUpdates', label: 'Application Updates', description: 'Get notified about application status changes' },
          { key: 'trainingOpportunities', label: 'Training Opportunities', description: 'Get notified about available training programs' },
          { key: 'systemAlerts', label: 'System Alerts', description: 'Get notified about important system updates' },
        ];
      case UserRole.PRODUCT_SUPPLIER:
        return [
          { key: 'newOrders', label: 'New Orders', description: 'Get notified when new orders are placed' },
          { key: 'inventoryAlerts', label: 'Inventory Alerts', description: 'Get notified about low inventory levels' },
          { key: 'customerInquiries', label: 'Customer Inquiries', description: 'Get notified about customer questions' },
          { key: 'systemAlerts', label: 'System Alerts', description: 'Get notified about important system updates' },
        ];
      case UserRole.SERVICE_PROVIDER:
        return [
          { key: 'newBookings', label: 'New Bookings', description: 'Get notified when new service bookings are made' },
          { key: 'bookingChanges', label: 'Booking Changes', description: 'Get notified about booking modifications' },
          { key: 'customerReviews', label: 'Customer Reviews', description: 'Get notified when customers leave reviews' },
          { key: 'systemAlerts', label: 'System Alerts', description: 'Get notified about important system updates' },
        ];
      case UserRole.PARENT:
        return [
          { key: 'bookingConfirmations', label: 'Booking Confirmations', description: 'Get notified when bookings are confirmed' },
          { key: 'scheduleChanges', label: 'Schedule Changes', description: 'Get notified about schedule modifications' },
          { key: 'childUpdates', label: 'Child Updates', description: 'Get notified about your child\'s activities' },
          { key: 'paymentReminders', label: 'Payment Reminders', description: 'Get notified about upcoming payments' },
          { key: 'systemAlerts', label: 'System Alerts', description: 'Get notified about important system updates' },
        ];
      default:
        return [];
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-swiss-charcoal mb-6">Notification Settings</h2>
      
      <div className="space-y-6">
        {getNotificationFields().map((field) => (
          <div key={field.key} className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-swiss-charcoal">{field.label}</label>
              <p className="text-xs text-swiss-gray">{field.description}</p>
            </div>
            <input
              type="checkbox"
              checked={formData.notifications?.[field.key] || false}
              onChange={(e) => handleNotificationChange(field.key, e.target.checked)}
              className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
            />
          </div>
        ))}
      </div>
      
      <div className="flex justify-end mt-6">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}

// Security Settings Component
function SecuritySettings({ settings, userRole, onSave, saving }: any) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-swiss-charcoal mb-6">Security Settings</h2>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-swiss-charcoal">Two-Factor Authentication</label>
            <p className="text-xs text-swiss-gray">Add an extra layer of security to your account</p>
          </div>
          <input
            type="checkbox"
            checked={formData.securitySettings?.twoFactorRequired || false}
            onChange={(e) => handleInputChange('securitySettings', {
              ...formData.securitySettings,
              twoFactorRequired: e.target.checked
            })}
            className="h-4 w-4 text-swiss-mint focus:ring-swiss-mint border-gray-300 rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Session Timeout (minutes)
          </label>
          <Input
            type="number"
            value={formData.securitySettings?.sessionTimeout || ''}
            onChange={(e) => handleInputChange('securitySettings', {
              ...formData.securitySettings,
              sessionTimeout: parseInt(e.target.value)
            })}
            placeholder="Session timeout in minutes"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-swiss-charcoal mb-2">
            Password Policy
          </label>
          <select
            value={formData.securitySettings?.passwordPolicy || ''}
            onChange={(e) => handleInputChange('securitySettings', {
              ...formData.securitySettings,
              passwordPolicy: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-input bg-white text-swiss-charcoal focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint"
          >
            <option value="weak">Weak</option>
            <option value="medium">Medium</option>
            <option value="strong">Strong</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end mt-6">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}