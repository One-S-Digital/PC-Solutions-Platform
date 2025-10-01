
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';
import { UserRole, SettingsFormData, SupplierSettings, ProviderSettings, FoundationSettings } from '../types';
import { MOCK_SUPPLIER_SETTINGS, MOCK_PROVIDER_SETTINGS, MOCK_FOUNDATION_SETTINGS } from '../constants';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import {
  UsersIcon, LockClosedIcon, BellAlertIcon, WalletIcon, BuildingOfficeIcon,
  PhoneIcon, TagIcon, AdjustmentsHorizontalIcon, ChartPieIcon, UserCircleIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Tabs from '../components/ui/Tabs';
import { useUserProfile, useOrganizationSettings, useNotificationSettings, useSecuritySettings } from '../src/hooks/useSettings';

// Section specific components
import CompanyProfileSettings from '../components/settings/sections/CompanyProfileSettings';
import ContactBookingSettings from '../components/settings/sections/ContactBookingSettings';
import NotificationPreferencesSettings from '../components/settings/sections/NotificationPreferencesSettings';
import DefaultsSettings from '../components/settings/sections/DefaultsSettings';
import PromoCodeManagerSettings from '../components/settings/sections/PromoCodeManagerSettings';
import BillingSubscriptionSettings from '../components/settings/sections/BillingSubscriptionSettings';
import AnalyticsPreferencesSettings from '../components/settings/sections/AnalyticsPreferencesSettings';
import TeamPermissionsSettings from '../components/settings/sections/TeamPermissionsSettings';
import PrivacyDataSettings from '../components/settings/sections/PrivacyDataSettings';
import AccountSecuritySettings from '../components/settings/sections/AccountSecuritySettings';


export interface SettingsSectionConfig {
  id: string;
  nameKey: string; // Changed from name to nameKey
  icon: React.ElementType;
  component: React.FC<{ settings: SettingsFormData; onChange: (field: keyof SettingsFormData, value: any) => void; userRole: UserRole }>;
  roles: UserRole[]; // Roles that can see this section
}

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAppContext();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SettingsFormData | null>(null);
  const [initialFormData, setInitialFormData] = useState<SettingsFormData | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // API hooks for settings
  const { 
    profile: userProfile, 
    loading: profileLoading, 
    error: profileError,
    updateProfile,
    updatePreferences,
    changePassword,
    updateAvatar 
  } = useUserProfile(currentUser?.id || '');

  const { 
    organization, 
    loading: organizationLoading, 
    error: organizationError,
    updateOrganization,
    updateLogo 
  } = useOrganizationSettings(currentUser?.orgId || '');

  const { 
    settings: notificationSettings, 
    loading: notificationLoading, 
    error: notificationError,
    updateSettings: updateNotificationSettings 
  } = useNotificationSettings(currentUser?.id || '');

  const { 
    settings: securitySettings, 
    loading: securityLoading, 
    error: securityError,
    enableTwoFactor,
    disableTwoFactor,
    revokeSession 
  } = useSecuritySettings(currentUser?.id || '');

  useEffect(() => {
    if (currentUser) {
      let initialSettings: SettingsFormData = {}; // Default empty object for other roles
      if (currentUser.role === UserRole.PRODUCT_SUPPLIER) {
        initialSettings = MOCK_SUPPLIER_SETTINGS;
      } else if (currentUser.role === UserRole.SERVICE_PROVIDER) {
        initialSettings = MOCK_PROVIDER_SETTINGS;
      } else if (currentUser.role === UserRole.FOUNDATION) {
        initialSettings = MOCK_FOUNDATION_SETTINGS;
      }
      // For other roles, it remains an empty object, AccountSecuritySettings will handle its own state from currentUser
      setFormData(JSON.parse(JSON.stringify(initialSettings))); 
      setInitialFormData(JSON.parse(JSON.stringify(initialSettings)));
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (formData && initialFormData) {
      setIsDirty(JSON.stringify(formData) !== JSON.stringify(initialFormData));
    } else {
      setIsDirty(false);
    }
  }, [formData, initialFormData]);

  const sections: SettingsSectionConfig[] = [
    { id: 'accountSecurity', nameKey: 'settingsPage.accountSecurity', icon: UserCircleIcon, component: AccountSecuritySettings, roles: [UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.FOUNDATION, UserRole.EDUCATOR, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    // Foundation
    { id: 'billingSubscription', nameKey: 'settingsPage.billingSubscription', icon: WalletIcon, component: BillingSubscriptionSettings, roles: [UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.FOUNDATION] },
    { id: 'notifications', nameKey: 'settingsPage.notificationPreferences', icon: BellAlertIcon, component: NotificationPreferencesSettings, roles: [UserRole.PRODUCT_SUPPLIER, UserRole.FOUNDATION] },
    { id: 'privacyData', nameKey: 'settingsPage.privacyData', icon: LockClosedIcon, component: PrivacyDataSettings, roles: [UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.FOUNDATION] },
    // Supplier Only
    { id: 'companyProfile', nameKey: 'settingsPage.companyProfile', icon: BuildingOfficeIcon, component: CompanyProfileSettings, roles: [UserRole.PRODUCT_SUPPLIER] },
    { id: 'contactBooking', nameKey: 'settingsPage.contactBooking', icon: PhoneIcon, component: ContactBookingSettings, roles: [UserRole.PRODUCT_SUPPLIER] },
    { id: 'promoCodes', nameKey: 'settingsPage.promoCodeManager', icon: TagIcon, component: PromoCodeManagerSettings, roles: [UserRole.PRODUCT_SUPPLIER] },
    { id: 'analyticsPreferences', nameKey: 'settingsPage.analyticsPreferences', icon: ChartPieIcon, component: AnalyticsPreferencesSettings, roles: [UserRole.PRODUCT_SUPPLIER] },
  ];
  
  const availableSections = sections.filter(s => currentUser && s.roles.includes(currentUser.role));

   useEffect(() => {
    if (availableSections.length > 0 && !activeSectionId) {
      setActiveSectionId(availableSections[0].id);
    }
  }, [availableSections, activeSectionId]);


  const handleFormChange = async (field: keyof SettingsFormData, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
    
    // Auto-save certain fields to API
    try {
      if (field === 'language' && currentUser) {
        await updatePreferences({ language: value });
      } else if (field === 'timezone' && currentUser) {
        await updatePreferences({ timezone: value });
      } else if (field === 'notifications' && currentUser) {
        await updateNotificationSettings(value);
      }
    } catch (error) {
      console.error('Failed to auto-save setting:', error);
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save setting. Please try again.',
      });
    }
  };

  const handleSave = async () => {
    if (!currentUser || !formData) return;

    try {
      // Save user profile data
      if (userProfile) {
        await updateProfile({
          name: formData.name || userProfile.name,
          email: formData.email || userProfile.email,
          phone: formData.phone || userProfile.phone,
        });
      }

      // Save organization data if applicable
      if (organization && currentUser.orgId) {
        await updateOrganization({
          name: formData.companyName || organization.name,
          description: formData.description || organization.description,
          website: formData.website || organization.website,
          address: formData.address || organization.address,
        });
      }

      setInitialFormData(JSON.parse(JSON.stringify(formData)));
      addNotification({ 
        title: t('notifications.successTitle'), 
        message: t('notifications.settingsUpdated'), 
        type: 'success' 
      });
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save settings. Please try again.',
      });
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm(t('settingsPage.unsavedChangesPrompt'))) {
        setFormData(JSON.parse(JSON.stringify(initialFormData))); 
        setIsDirty(false);
        navigate('/dashboard'); 
      }
    } else {
      navigate('/dashboard');
    }
  };
  
  const scrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Show loading state while fetching data
  if (!currentUser || !formData || profileLoading || organizationLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('settingsPage.loading')}</p>
      </div>
    );
  }

  // Show error state if there are critical errors
  if (profileError || organizationError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Failed to load settings. Using cached data.</p>
        <p className="text-sm text-gray-500 mt-2">Some features may not work properly.</p>
      </div>
    );
  }
  
  const userRole = currentUser.role;

  const renderFoundationLayout = () => {
    const tabsConfig = availableSections.map(section => ({
      label: t(section.nameKey),
      icon: section.icon,
      content: (
        <div key={section.id}>
          <section.component settings={formData} onChange={handleFormChange} userRole={userRole} />
        </div>
      )
    }));
    const activeTabIndex = availableSections.findIndex(s => s.id === activeSectionId);
    
    return (
        <Tabs
          tabs={tabsConfig}
          variant="line"
          activeTab={activeTabIndex > -1 ? activeTabIndex : 0}
          onTabChange={(index) => setActiveSectionId(availableSections[index].id)}
          className="flex-1 overflow-y-auto pt-6 px-8"
        />
    );
  };
  
  const renderDefaultLayout = () => (
     <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 bg-white border-r border-gray-200 p-4 space-y-1 overflow-y-auto flex-shrink-0">
          {availableSections.map(section => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md text-left transition-colors
                ${activeSectionId === section.id 
                    ? 'bg-swiss-mint/10 text-swiss-mint' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-swiss-charcoal'
                }`}
              aria-current={activeSectionId === section.id ? 'page' : undefined}
            >
              <section.icon className={`w-5 h-5 mr-3 ${activeSectionId === section.id ? 'text-swiss-mint' : 'text-gray-400'}`} />
              {t(section.nameKey)}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {availableSections.map(section => {
            const SectionComponent = section.component;
            return (
              <div key={section.id} id={section.id} ref={(el) => { sectionRefs.current[section.id] = el; }}>
                <SectionComponent settings={formData} onChange={handleFormChange} userRole={userRole} />
              </div>
            );
          })}
           {availableSections.length === 0 && (
            <Card className="p-6 text-center">
                <p className="text-gray-600">{t('settingsPage.noSectionsAvailable')}</p>
            </Card>
          )}
        </main>
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-page-bg">
      <div className="sticky top-0 z-30 bg-page-bg/80 backdrop-blur-md px-8 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-swiss-charcoal">{t('settingsPage.title')}</h1>
          {/* Don't show save/cancel if only AccountSecurity is available */}
          {availableSections.length > 1 && ( 
            <div className="flex space-x-3">
              <Button variant="light" onClick={handleCancel}>
                {t('buttons.cancel')}
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={!isDirty} className="bg-swiss-mint hover:bg-opacity-90">
                {t('buttons.saveChanges')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {userRole === UserRole.FOUNDATION ? renderFoundationLayout() : renderDefaultLayout()}
    </div>
  );
};

export default SettingsPage;
