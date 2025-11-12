
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';
import { UserRole, SettingsFormData } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import {
  UsersIcon, LockClosedIcon, BellAlertIcon, WalletIcon, BuildingOfficeIcon,
  PhoneIcon, TagIcon, AdjustmentsHorizontalIcon, ChartPieIcon, UserCircleIcon, EyeIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Tabs from '../components/ui/Tabs';

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
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';


export interface SettingsSectionConfig {
  id: string;
  nameKey: string;
  icon: React.ElementType;
  component: React.FC<{ settings: SettingsFormData; onChange: (field: keyof SettingsFormData, value: any) => void; userRole: UserRole }>;
  roles: UserRole[];
}

const SettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { currentUser } = useAppContext();
  const { addNotification } = useNotifications();
  const { request } = useAuthenticatedApi();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SettingsFormData | null>(null);
  const [initialFormData, setInitialFormData] = useState<SettingsFormData | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!currentUser) {
      setFormData(null);
      setInitialFormData(null);
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        let roleSettings: Partial<SettingsFormData> = {};

        if (currentUser.role === UserRole.FOUNDATION) {
          const response = await request<{ success: boolean; data?: any }>('/settings/foundation');
          const data = response.success && response.data ? response.data : {};
          roleSettings = {
            companyName: data.companyName || currentUser.orgName || '',
            contactEmail: data.contactEmail || currentUser.email,
            phoneNumber: data.phoneNumber || '',
            address: data.address || '',
            canton: data.canton || '',
            languagesSpoken: Array.isArray(data.languages) ? data.languages : [],
            capacity: typeof data.capacity === 'number' ? data.capacity : 0,
            pedagogy: Array.isArray(data.pedagogy) ? data.pedagogy : [],
          } as Partial<SettingsFormData>;
        } else if (currentUser.role === UserRole.PRODUCT_SUPPLIER) {
          const response = await request<{ success: boolean; data?: any }>('/settings/supplier');
          const data = response.success && response.data ? response.data : {};
          roleSettings = {
            companyName: data.companyName || '',
            contactEmail: data.contactEmail || currentUser.email,
            phoneNumber: data.phoneNumber || '',
            address: data.address || '',
            canton: data.canton || '',
            productCategory: data.productCategory || '',
            serviceType: data.serviceType || '',
            minimumOrderQuantity: typeof data.minimumOrderQuantity === 'number' ? data.minimumOrderQuantity : 0,
            directOrderLink: data.directOrderLink || '',
            catalogUrl: data.catalogUrl || '',
          } as Partial<SettingsFormData>;
        } else if (currentUser.role === UserRole.SERVICE_PROVIDER) {
          const response = await request<{ success: boolean; data?: any }>('/settings/service-provider');
          const data = response.success && response.data ? response.data : {};
          roleSettings = {
            companyName: data.companyName || '',
            contactEmail: data.contactEmail || currentUser.email,
            phoneNumber: data.phoneNumber || '',
            address: data.address || '',
            canton: data.canton || '',
            serviceCategories: Array.isArray(data.serviceCategories) ? data.serviceCategories : [],
            deliveryType: data.deliveryType || '',
            bookingLink: data.bookingLink || '',
          } as Partial<SettingsFormData>;
        } else if (currentUser.role === UserRole.EDUCATOR) {
          const response = await request<{ success: boolean; data?: any }>('/settings/educator');
          const data = response.success && response.data ? response.data : {};
          roleSettings = {
            firstName: data.firstName || currentUser.firstName || '',
            lastName: data.lastName || currentUser.lastName || '',
            email: data.email || currentUser.email || '',
            phoneNumber: data.phoneNumber || '',
            workExperience: data.workExperience || '',
            education: data.education || '',
            certifications: Array.isArray(data.certifications) ? data.certifications : [],
            skills: Array.isArray(data.skills) ? data.skills : [],
            availability: data.availability || '',
            cvUrl: data.cvUrl || '',
            shortBio: data.shortBio || '',
            avatarAssetId: data.avatarAssetId || '',
          } as Partial<SettingsFormData>;
        }

        const [privacyResponse, notificationResponse] = await Promise.all([
          request<{ success: boolean; data?: any }>('/settings/privacy'),
          request<{ success: boolean; data?: any }>('/settings/notifications'),
        ]);

        const privacyData = privacyResponse.success && privacyResponse.data
          ? {
              hidePubliclyToggle: !!privacyResponse.data.hidePubliclyToggle,
              gdprDataDeletionRequestMade: !!privacyResponse.data.gdprDataDeletionRequestMade,
            }
          : { hidePubliclyToggle: false, gdprDataDeletionRequestMade: false };

        const notificationData = notificationResponse.success && notificationResponse.data
          ? {
              newRequestEmailToggle: !!notificationResponse.data.newRequestEmailToggle,
              digestRadio: (notificationResponse.data.digestRadio as SettingsFormData['digestRadio']) || 'Daily',
              promoRedemptionAlertsToggle: !!notificationResponse.data.promoRedemptionAlertsToggle,
            }
          : { newRequestEmailToggle: true, digestRadio: 'Daily' as const, promoRedemptionAlertsToggle: false };

        if (cancelled) {
          return;
        }

        const combined = {
          ...roleSettings,
          ...privacyData,
          ...notificationData,
        } as SettingsFormData;

        setFormData(combined);
        setInitialFormData(JSON.parse(JSON.stringify(combined)));
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load settings', error);
          addNotification({
            title: t('common:errors.genericErrorTitle'),
            message: t('common:errors.genericErrorMessage'),
            type: 'error',
          });
          setFormData(null);
          setInitialFormData(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [currentUser, request, addNotification, t]);

  useEffect(() => {
    if (formData && initialFormData) {
      setIsDirty(JSON.stringify(formData) !== JSON.stringify(initialFormData));
    } else {
      setIsDirty(false);
    }
  }, [formData, initialFormData]);

  const sections: SettingsSectionConfig[] = [
    { id: 'accountSecurity', nameKey: 'common:settingsPage.accountSecurity', icon: UserCircleIcon, component: AccountSecuritySettings, roles: [UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.FOUNDATION, UserRole.EDUCATOR, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: 'billingSubscription', nameKey: 'common:settingsPage.billingSubscription', icon: WalletIcon, component: BillingSubscriptionSettings, roles: [UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.FOUNDATION] },
    { id: 'notifications', nameKey: 'common:settingsPage.notificationPreferences', icon: BellAlertIcon, component: NotificationPreferencesSettings, roles: [UserRole.PRODUCT_SUPPLIER, UserRole.FOUNDATION] },
    { id: 'privacyData', nameKey: 'common:settingsPage.privacyData', icon: LockClosedIcon, component: PrivacyDataSettings, roles: [UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.FOUNDATION] },
    { id: 'companyProfile', nameKey: 'common:settingsPage.companyProfile', icon: BuildingOfficeIcon, component: CompanyProfileSettings, roles: [UserRole.PRODUCT_SUPPLIER] },
    { id: 'contactBooking', nameKey: 'common:settingsPage.contactBooking', icon: PhoneIcon, component: ContactBookingSettings, roles: [UserRole.PRODUCT_SUPPLIER] },
    { id: 'promoCodes', nameKey: 'common:settingsPage.promoCodeManager', icon: TagIcon, component: PromoCodeManagerSettings, roles: [UserRole.PRODUCT_SUPPLIER] },
    { id: 'analyticsPreferences', nameKey: 'common:settingsPage.analyticsPreferences', icon: ChartPieIcon, component: AnalyticsPreferencesSettings, roles: [UserRole.PRODUCT_SUPPLIER] },
  ];

  const availableSections = sections.filter(section => currentUser && section.roles.includes(currentUser.role));

  useEffect(() => {
    if (availableSections.length > 0 && !activeSectionId) {
      setActiveSectionId(availableSections[0].id);
    }
  }, [availableSections, activeSectionId]);

  const handleFormChange = (field: keyof SettingsFormData, value: any) => {
    setFormData(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = async () => {
    if (!formData || !currentUser) {
      return;
    }

    setIsSaving(true);
    try {
      const requests: Promise<any>[] = [];
      const payload = formData as Record<string, any>;

      if (currentUser.role === UserRole.FOUNDATION) {
        requests.push(
          request('/settings/foundation', {
            method: 'PATCH',
            body: JSON.stringify({
              companyName: payload.companyName || currentUser.orgName || '',
              contactEmail: payload.contactEmail || currentUser.email,
              phoneNumber: payload.phoneNumber || '',
              address: payload.address || '',
              canton: payload.canton || '',
              languages: Array.isArray(payload.languagesSpoken) ? payload.languagesSpoken : [],
              capacity: Number.isFinite(payload.capacity) ? Number(payload.capacity) : 0,
              pedagogy: Array.isArray(payload.pedagogy) ? payload.pedagogy : [],
            }),
          })
        );
      }

      if (currentUser.role === UserRole.PRODUCT_SUPPLIER) {
        requests.push(
          request('/settings/supplier', {
            method: 'PATCH',
            body: JSON.stringify({
              companyName: payload.companyName || '',
              contactEmail: payload.contactEmail || currentUser.email,
              phoneNumber: payload.phoneNumber || '',
              address: payload.address || '',
              canton: payload.canton || '',
              productCategory: payload.productCategory || '',
              serviceType: payload.serviceType || '',
              minimumOrderQuantity: Number.isFinite(payload.minimumOrderQuantity) ? Number(payload.minimumOrderQuantity) : 0,
              directOrderLink: payload.directOrderLink || '',
              catalogUrl: payload.catalogUrl || '',
            }),
          })
        );
      }

      if (currentUser.role === UserRole.SERVICE_PROVIDER) {
        requests.push(
          request('/settings/service-provider', {
            method: 'PATCH',
            body: JSON.stringify({
              companyName: payload.companyName || '',
              contactEmail: payload.contactEmail || currentUser.email,
              phoneNumber: payload.phoneNumber || '',
              address: payload.address || '',
              canton: payload.canton || '',
              serviceCategories: Array.isArray(payload.serviceCategories) ? payload.serviceCategories : [],
              deliveryType: payload.deliveryType || '',
              bookingLink: payload.bookingLink || '',
            }),
          })
        );
      }

      if (currentUser.role === UserRole.EDUCATOR) {
        requests.push(
          request('/settings/educator', {
            method: 'PATCH',
            body: JSON.stringify({
              firstName: payload.firstName || '',
              lastName: payload.lastName || '',
              email: payload.email || currentUser.email,
              phoneNumber: payload.phoneNumber || '',
              workExperience: payload.workExperience || '',
              education: payload.education || '',
              certifications: Array.isArray(payload.certifications) ? payload.certifications : [],
              skills: Array.isArray(payload.skills) ? payload.skills : [],
              availability: payload.availability || '',
              cvUrl: payload.cvUrl || '',
              shortBio: payload.shortBio || '',
              avatarAssetId: payload.avatarAssetId || '',
            }),
          })
        );
      }

      requests.push(
        request('/settings/privacy', {
          method: 'PATCH',
          body: JSON.stringify({
            hidePubliclyToggle: !!payload.hidePubliclyToggle,
            gdprDataDeletionRequestMade: !!payload.gdprDataDeletionRequestMade,
          }),
        })
      );

      requests.push(
        request('/settings/notifications', {
          method: 'PATCH',
          body: JSON.stringify({
            newRequestEmailToggle: !!payload.newRequestEmailToggle,
            digestRadio: (payload.digestRadio as 'Daily' | 'Weekly' | 'None') || 'Daily',
            promoRedemptionAlertsToggle: !!payload.promoRedemptionAlertsToggle,
          }),
        })
      );

      const responses = await Promise.all(requests);
      const failure = responses.find(res => res && res.success === false);
      if (failure) {
        throw new Error(failure.message || 'Failed to save settings');
      }

      setInitialFormData(JSON.parse(JSON.stringify(formData)));
      setIsDirty(false);
      addNotification({
        title: t('notifications.successTitle'),
        message: t('notifications.settingsUpdated'),
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to save settings', error);
      addNotification({
        title: t('common:errors.genericErrorTitle'),
        message: t('common:errors.genericErrorMessage'),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm(t('settings:page.unsavedChangesPrompt'))) {
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

  if (!currentUser || isLoading || !formData) {
    return <div className="p-6 text-center">{t('settings:page.loading')}</div>;
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
      ),
    }));
    const activeTabIndex = availableSections.findIndex(section => section.id === activeSectionId);

    return (
      <Tabs
        tabs={tabsConfig}
        variant="line"
        activeTab={activeTabIndex > -1 ? activeTabIndex : 0}
        onTabChange={index => setActiveSectionId(availableSections[index].id)}
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
            <div key={section.id} id={section.id} ref={el => { sectionRefs.current[section.id] = el; }}>
              <SectionComponent settings={formData} onChange={handleFormChange} userRole={userRole} />
            </div>
          );
        })}
        {availableSections.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-gray-600">{t('settings:page.noSectionsAvailable')}</p>
          </Card>
        )}
      </main>
    </div>
  );

  const profilePath = useMemo(() => {
    if (!currentUser) {
      return null;
    }

    switch (currentUser.role) {
      case UserRole.FOUNDATION:
        // Link to frontend-facing organization profile if available, otherwise own profile
        return currentUser.primaryOrganization?.id 
          ? `/profile/organization/${currentUser.primaryOrganization.id}`
          : '/profile';
      case UserRole.EDUCATOR:
        // Link to frontend-facing educator profile
        return currentUser.id ? `/profile/educator/${currentUser.id}` : '/educator/profile';
      case UserRole.PRODUCT_SUPPLIER:
      case UserRole.SERVICE_PROVIDER:
        // Link to frontend-facing organization profile if available, otherwise own profile
        return currentUser.primaryOrganization?.id 
          ? `/profile/organization/${currentUser.primaryOrganization.id}`
          : '/profile';
      default:
        return '/profile';
    }
  }, [currentUser]);

  const handleViewProfile = () => {
    if (!profilePath) {
      return;
    }

    if (isDirty && !window.confirm(t('settings:page.unsavedChangesPrompt'))) {
      return;
    }

    navigate(profilePath);
  };

  return (
    <div className="flex flex-col h-full bg-page-bg">
      <div className="sticky top-0 z-30 bg-page-bg/80 backdrop-blur-md px-8 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-swiss-charcoal">{t('settings:page.title')}</h1>
          <div className="flex items-center space-x-3">
            {profilePath && (
              <Button variant="outline" leftIcon={EyeIcon} onClick={handleViewProfile}>
                {t('common:buttons.viewProfile')}
              </Button>
            )}
              {availableSections.length > 1 && (
                <>
                  <Button variant="light" onClick={handleCancel}>
                    {t('common:buttons.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="bg-swiss-mint hover:bg-opacity-90"
                  >
                    {isSaving
                      ? `${t('common:buttons.saveChanges')}...`
                      : t('common:buttons.saveChanges')}
                  </Button>
                </>
              )}
          </div>
        </div>
      </div>

      {userRole === UserRole.FOUNDATION ? renderFoundationLayout() : renderDefaultLayout()}
    </div>
  );
};

export default SettingsPage;
