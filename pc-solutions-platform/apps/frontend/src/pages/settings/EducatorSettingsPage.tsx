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

interface EducatorSettings {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  workExperience: string;
  education: string;
  certifications: string[];
  skills: string[];
  availability: string;
  cvUrl: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  jobAlerts: boolean;
  profileVisibility: 'public' | 'private';
}

export default function EducatorSettingsPage() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState<EducatorSettings>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    workExperience: '',
    education: '',
    certifications: [],
    skills: [],
    availability: '',
    cvUrl: '',
    emailNotifications: true,
    smsNotifications: false,
    jobAlerts: true,
    profileVisibility: 'public',
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
      const response = await fetch('/api/settings/educator', {
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
    } else if (name === 'certifications' || name === 'skills') {
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
      
      const response = await fetch('/api/settings/educator', {
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

  const renderProfileTab = () => (
    <div className="space-y-6">
      <SwissCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-text-strong mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm text-text-muted mb-1">First Name</label>
            <Input
              id="firstName"
              name="firstName"
              value={settings.firstName}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm text-text-muted mb-1">Last Name</label>
            <Input
              id="lastName"
              name="lastName"
              value={settings.lastName}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm text-text-muted mb-1">Email</label>
            <Input
              id="email"
              name="email"
              type="email"
              value={settings.email}
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
        </div>
      </SwissCard>

      <SwissCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-text-strong mb-4">Professional Information</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="workExperience" className="block text-sm text-text-muted mb-1">Work Experience</label>
            <textarea
              id="workExperience"
              name="workExperience"
              value={settings.workExperience}
              onChange={handleInputChange}
              rows={4}
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default"
              placeholder="Describe your work experience in early childhood education..."
            />
          </div>
          <div>
            <label htmlFor="education" className="block text-sm text-text-muted mb-1">Education</label>
            <textarea
              id="education"
              name="education"
              value={settings.education}
              onChange={handleInputChange}
              rows={3}
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default"
              placeholder="List your educational background..."
            />
          </div>
          <div>
            <label htmlFor="certifications" className="block text-sm text-text-muted mb-1">Certifications (comma-separated)</label>
            <Input
              id="certifications"
              name="certifications"
              value={settings.certifications.join(', ')}
              onChange={handleInputChange}
              placeholder="First Aid, CPR, Early Childhood Education"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="skills" className="block text-sm text-text-muted mb-1">Skills (comma-separated)</label>
            <Input
              id="skills"
              name="skills"
              value={settings.skills.join(', ')}
              onChange={handleInputChange}
              placeholder="Montessori, Special Needs, Music, Art"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="availability" className="block text-sm text-text-muted mb-1">Availability</label>
            <Input
              id="availability"
              name="availability"
              value={settings.availability}
              onChange={handleInputChange}
              placeholder="Monday-Friday, 8:00 AM - 5:00 PM"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="cvUrl" className="block text-sm text-text-muted mb-1">CV URL</label>
            <Input
              id="cvUrl"
              name="cvUrl"
              value={settings.cvUrl}
              onChange={handleInputChange}
              placeholder="https://example.com/cv.pdf"
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
              id="jobAlerts"
              name="jobAlerts"
              type="checkbox"
              checked={settings.jobAlerts}
              onChange={handleInputChange}
              className="h-4 w-4 text-accent rounded border-border focus:ring-accent"
            />
            <label htmlFor="jobAlerts" className="ml-2 block text-sm text-text-default">
              Job Alert Notifications
            </label>
          </div>
        </div>
      </SwissCard>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <SwissCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-text-strong mb-4">Privacy Settings</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="profileVisibility" className="block text-sm text-text-muted mb-1">Profile Visibility</label>
            <select
              id="profileVisibility"
              name="profileVisibility"
              value={settings.profileVisibility}
              onChange={handleInputChange}
              className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-text-default"
            >
              <option value="public">Public - Visible to all employers</option>
              <option value="private">Private - Only visible to employers you apply to</option>
            </select>
          </div>
        </div>
      </SwissCard>

      <SwissCard variant="accent" className="p-6">
        <h3 className="text-lg font-semibold text-text-strong mb-4">Data Management</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
            <div>
              <h4 className="font-medium text-text-strong">Download My Data</h4>
              <p className="text-text-muted text-sm">Get a copy of all your data</p>
            </div>
            <SwissButton variant="secondary">Download</SwissButton>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
            <div>
              <h4 className="font-medium text-text-strong">Delete Account</h4>
              <p className="text-text-muted text-sm">Permanently delete your account and all data</p>
            </div>
            <SwissButton variant="danger">Delete</SwissButton>
          </div>
        </div>
      </SwissCard>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'privacy':
        return renderPrivacyTab();
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
          <h1 className="text-text-strong font-semibold tracking-tight">Educator Settings</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="info">Educator</Badge>
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
              activeTab === 'profile' 
                ? 'border-b-2 border-accent text-accent' 
                : 'text-text-muted hover:text-text-default'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
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
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'privacy' 
                ? 'border-b-2 border-accent text-accent' 
                : 'text-text-muted hover:text-text-default'
            }`}
            onClick={() => setActiveTab('privacy')}
          >
            Privacy
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