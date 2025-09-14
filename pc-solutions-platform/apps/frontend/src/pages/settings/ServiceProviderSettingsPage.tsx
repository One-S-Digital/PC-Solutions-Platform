import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  SwissCard, 
  SwissButton, 
  Input,
  Badge,
  Status,
  ThemeToggle
} from '@repo/ui';

interface ServiceProviderSettings {
  companyName: string;
  contactEmail: string;
  phoneNumber: string;
  address: string;
  canton: string;
  serviceCategories: string[];
  deliveryType: string;
  bookingLink: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  bookingAlerts: boolean;
  availabilityAlerts: boolean;
}

export default function ServiceProviderSettingsPage() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState<ServiceProviderSettings>({
    companyName: '',
    contactEmail: '',
    phoneNumber: '',
    address: '',
    canton: '',
    serviceCategories: [],
    deliveryType: '',
    bookingLink: '',
    emailNotifications: true,
    smsNotifications: false,
    bookingAlerts: true,
    availabilityAlerts: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await fetch('/api/settings/service-provider', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === 'checkbox') {
      setSettings(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'serviceCategories') {
      // Handle array fields
      const values = value.split(',').map(v => v.trim()).filter(v => v);
      setSettings(prev => ({ ...prev, [name]: values }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setAlert(null);
      const token = await getToken();
      
      const response = await fetch('/api/settings/service-provider', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'Settings updated successfully!' });
      } else {
        setAlert({ type: 'error', message: 'Failed to update settings.' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderCompanyTab = () => (
    <div className="space-y-6">
      <SwissCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-text-strong mb-4">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="companyName" className="block text-sm text-text-muted mb-1">Company Name</label>
            <Input
              id="companyName"
              name="companyName"
              value={settings.companyName}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className="block text-sm text-text-muted mb-1">Contact Email</label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={settings.contactEmail}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="phoneNumber" className="block text-sm text-text-muted mb-1">Phone Number</label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              value={settings.phoneNumber}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="canton" className="block text-sm text-text-muted mb-1">Canton</label>
            <select
              id="canton"
              name="canton"
              value={settings.canton}
              onChange={handleInputChange}
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default"
            >
              <option value="">Select Canton</option>
              <option value="ZH">Zurich</option>
              <option value="BE">Bern</option>
              <option value="LU">Lucerne</option>
              <option value="UR">Uri</option>
              <option value="SZ">Schwyz</option>
              <option value="OW">Obwalden</option>
              <option value="NW">Nidwalden</option>
              <option value="GL">Glarus</option>
              <option value="ZG">Zug</option>
              <option value="FR">Fribourg</option>
              <option value="SO">Solothurn</option>
              <option value="BS">Basel-Stadt</option>
              <option value="BL">Basel-Landschaft</option>
              <option value="SH">Schaffhausen</option>
              <option value="AR">Appenzell Ausserrhoden</option>
              <option value="AI">Appenzell Innerrhoden</option>
              <option value="SG">St. Gallen</option>
              <option value="GR">Graubünden</option>
              <option value="AG">Aargau</option>
              <option value="TG">Thurgau</option>
              <option value="TI">Ticino</option>
              <option value="VD">Vaud</option>
              <option value="VS">Valais</option>
              <option value="NE">Neuchâtel</option>
              <option value="GE">Geneva</option>
              <option value="JU">Jura</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm text-text-muted mb-1">Address</label>
            <textarea
              id="address"
              name="address"
              value={settings.address}
              onChange={handleInputChange}
              rows={3}
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default"
            />
          </div>
        </div>
      </SwissCard>

      <SwissCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-text-strong mb-4">Service Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="serviceCategories" className="block text-sm text-text-muted mb-1">Service Categories (comma-separated)</label>
            <Input
              id="serviceCategories"
              name="serviceCategories"
              value={settings.serviceCategories.join(', ')}
              onChange={handleInputChange}
              placeholder="Cleaning, Maintenance, Security, Catering"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="deliveryType" className="block text-sm text-text-muted mb-1">Delivery Type</label>
            <select
              id="deliveryType"
              name="deliveryType"
              value={settings.deliveryType}
              onChange={handleInputChange}
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default"
            >
              <option value="">Select Delivery Type</option>
              <option value="ON_SITE">On-site Service</option>
              <option value="PICKUP">Pickup Service</option>
              <option value="DELIVERY">Delivery Service</option>
              <option value="REMOTE">Remote Service</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="bookingLink" className="block text-sm text-text-muted mb-1">Booking Link</label>
            <Input
              id="bookingLink"
              name="bookingLink"
              value={settings.bookingLink}
              onChange={handleInputChange}
              placeholder="https://example.com/booking"
              className="w-full"
            />
          </div>
        </div>
      </SwissCard>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <SwissCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-text-strong mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              id="emailNotifications"
              name="emailNotifications"
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={handleInputChange}
              className="h-4 w-4 text-accent rounded border-border focus:ring-accent"
            />
            <label htmlFor="emailNotifications" className="ml-2 block text-sm text-text-default">
              Email Notifications
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="smsNotifications"
              name="smsNotifications"
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={handleInputChange}
              className="h-4 w-4 text-accent rounded border-border focus:ring-accent"
            />
            <label htmlFor="smsNotifications" className="ml-2 block text-sm text-text-default">
              SMS Notifications
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="bookingAlerts"
              name="bookingAlerts"
              type="checkbox"
              checked={settings.bookingAlerts}
              onChange={handleInputChange}
              className="h-4 w-4 text-accent rounded border-border focus:ring-accent"
            />
            <label htmlFor="bookingAlerts" className="ml-2 block text-sm text-text-default">
              Booking Alert Notifications
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="availabilityAlerts"
              name="availabilityAlerts"
              type="checkbox"
              checked={settings.availabilityAlerts}
              onChange={handleInputChange}
              className="h-4 w-4 text-accent rounded border-border focus:ring-accent"
            />
            <label htmlFor="availabilityAlerts" className="ml-2 block text-sm text-text-default">
              Availability Alert Notifications
            </label>
          </div>
        </div>
      </SwissCard>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return renderCompanyTab();
      case 'notifications':
        return renderNotificationsTab();
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen frontend-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen frontend-page">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-surface-1/80 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-accent"></div>
          <h1 className="text-text-strong font-semibold tracking-tight">Service Provider Settings</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="info">Service Provider</Badge>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {alert && (
          <div className={`mb-6 p-4 rounded-md ${
            alert.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {alert.message}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-border mb-6">
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'company' 
                ? 'border-b-2 border-accent text-accent' 
                : 'text-text-muted hover:text-text-default'
            }`}
            onClick={() => setActiveTab('company')}
          >
            Company Details
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'notifications' 
                ? 'border-b-2 border-accent text-accent' 
                : 'text-text-muted hover:text-text-default'
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <SwissButton variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </SwissButton>
        </div>
      </main>
    </div>
  );
}