import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import {
  SettingsFormData,
  UserRole,
} from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import {
    UsersIcon,
    LockClosedIcon,
    BellAlertIcon,
    WalletIcon,
    BuildingOfficeIcon,
    PhoneIcon,
    AdjustmentsHorizontalIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import AccountSecuritySettings from '../components/settings/sections/AccountSecuritySettings';
import BillingSubscriptionSettings from '../components/settings/sections/BillingSubscriptionSettings';
import PrivacyDataSettings from '../components/settings/sections/PrivacyDataSettings';
import ContactBookingSettings from '../components/settings/sections/ContactBookingSettings';
import DefaultsSettings from '../components/settings/sections/DefaultsSettings';
import NotificationPreferencesSettings from '../components/settings/sections/NotificationPreferencesSettings';

interface ProviderSectionConfig {
  id: string;
  nameKey: string;
  icon: React.ElementType;
  component: React.FC<{
    settings: SettingsFormData;
    onChange: (field: keyof SettingsFormData, value: any) => void;
    userRole: UserRole;
  }>;
}

const ServiceProviderSettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { currentUser } = useAppContext();
  const { addNotification } = useNotifications();
  const { request } = useAuthenticatedApi();
  const navigate = useNavigate();
  const location = useLocation();

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

    if (currentUser.role !== UserRole.SERVICE_PROVIDER) {
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const response = await request<{ success: boolean; data?: any }>('/settings/service-provider');
        const data = response.success && response.data ? response.data : ({} as any);

        const [privacyResponse, notificationResponse] = await Promise.all([
          request<{ success: boolean; data?: any }>('/settings/privacy'),
          request<{ success: boolean; data?: any }>('/settings/notifications'),
        ]);

        const privacyData = privacyResponse.success && privacyResponse.data
          ? {
              hidePubliclyToggle: !!(privacyResponse.data as any).hidePubliclyToggle,
              gdprDataDeletionRequestMade: !!(privacyResponse.data as any).gdprDataDeletionRequestMade,
            }
          : { hidePubliclyToggle: false, gdprDataDeletionRequestMade: false };

        const notificationData = notificationResponse.success && notificationResponse.data
          ? {
              newRequestEmailToggle: !!(notificationResponse.data as any).newRequestEmailToggle,
              digestRadio: ((notificationResponse.data as any).digestRadio as SettingsFormData['digestRadio']) || 'Daily',
              promoRedemptionAlertsToggle: !!(notificationResponse.data as any).promoRedemptionAlertsToggle,
            }
          : { newRequestEmailToggle: true, digestRadio: 'Daily' as const, promoRedemptionAlertsToggle: false };

        if (cancelled) {
          return;
        }

        const combined: SettingsFormData = {
          companyName: data.companyName || '',
          contactEmail: data.contactEmail || currentUser.email || '',
          phoneNumber: data.phoneNumber || '',
          contactPerson: data.contactPerson || '',
          address: data.address || '',
          canton: data.canton || '',
          regionsServed: Array.isArray(data.regionsServed) ? data.regionsServed : [],
          languagesSpoken: Array.isArray(data.languages) ? data.languages : [],
          aboutText: data.description || '',
          description: data.description || '',
          vatNumber: data.vatNumber || '',
          logoUrl: data.logoUrl || null,
          coverImageUrl: data.coverImageUrl || null,
          serviceType: data.serviceType || '',
          serviceCategories: Array.isArray(data.serviceCategories) ? data.serviceCategories : [],
          deliveryType: data.deliveryType || '',
          bookingLink: data.bookingLink || '',
          ...privacyData,
          ...notificationData,
        };

        setFormData(combined);
        setInitialFormData(JSON.parse(JSON.stringify(combined)));
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load service provider settings', error);
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

  const sections: ProviderSectionConfig[] = [
    { id: 'accountSecurity', nameKey: 'common:settingsPage.accountSecurity', icon: UsersIcon, component: AccountSecuritySettings },
    { id: 'billingSubscription', nameKey: 'common:settingsPage.billingSubscription', icon: WalletIcon, component: BillingSubscriptionSettings },
    { id: 'privacyData', nameKey: 'common:settingsPage.privacyData', icon: LockClosedIcon, component: PrivacyDataSettings },
    { id: 'notifications', nameKey: 'common:settingsPage.notificationPreferences', icon: BellAlertIcon, component: NotificationPreferencesSettings },
    { id: 'contactBooking', nameKey: 'common:settingsPage.contactBooking', icon: PhoneIcon, component: ContactBookingSettings },
    { id: 'defaults', nameKey: 'settings:page.defaults', icon: AdjustmentsHorizontalIcon, component: DefaultsSettings },
  ];

  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  // Deep-link support: /settings/service-provider#billingSubscription (optionally ?focus=manage-subscription)
  useEffect(() => {
    const hashSectionId = (location.hash || '').replace('#', '').trim();
    if (!hashSectionId) return;
    const hasSection = sections.some(s => s.id === hashSectionId);
    if (!hasSection) return;

    setActiveSectionId(hashSectionId);
    requestAnimationFrame(() => {
      sectionRefs.current[hashSectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.hash, sections]);

  const handleFormChange = (field: keyof SettingsFormData, value: any) => {
    setFormData(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = async () => {
    if (!formData || !currentUser) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = formData as Record<string, any>;

      const requests: Promise<any>[] = [
        request('/settings/service-provider', {
          method: 'PATCH',
          body: JSON.stringify({
            companyName: payload.companyName || '',
            contactEmail: payload.contactEmail || currentUser.email || '',
            phoneNumber: payload.phoneNumber || '',
            contactPerson: payload.contactPerson || '',
            address: payload.address || '',
            canton: payload.canton || '',
            regionsServed: Array.isArray(payload.regionsServed) ? payload.regionsServed : [],
            languages: Array.isArray(payload.languagesSpoken) ? payload.languagesSpoken : [],
            description: payload.description || payload.aboutText || '',
            vatNumber: payload.vatNumber || '',
            serviceType: payload.serviceType || '',
            serviceCategories: Array.isArray(payload.serviceCategories) ? payload.serviceCategories : [],
            deliveryType: payload.deliveryType || '',
            bookingLink: payload.bookingLink || '',
            ...(payload.logoAssetId !== undefined && { logoAssetId: payload.logoAssetId || null }),
            ...(payload.coverAssetId !== undefined && { coverAssetId: payload.coverAssetId || null }),
          }),
        }),
        request('/settings/privacy', {
          method: 'PATCH',
          body: JSON.stringify({
            hidePubliclyToggle: !!payload.hidePubliclyToggle,
            gdprDataDeletionRequestMade: !!payload.gdprDataDeletionRequestMade,
          }),
        }),
        request('/settings/notifications', {
          method: 'PATCH',
          body: JSON.stringify({
            newRequestEmailToggle: !!payload.newRequestEmailToggle,
            digestRadio: (payload.digestRadio as 'Daily' | 'Weekly' | 'None') || 'Daily',
            promoRedemptionAlertsToggle: !!payload.promoRedemptionAlertsToggle,
          }),
        }),
      ];

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
      console.error('Failed to save service provider settings', error);
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
        setFormData(initialFormData ? JSON.parse(JSON.stringify(initialFormData)) : null);
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

  if (!currentUser) {
    return <div className="p-6 text-center">{t('settings:page.loading')}</div>;
  }

  if (currentUser.role !== UserRole.SERVICE_PROVIDER) {
    return <Navigate to="/settings" replace />;
  }

  if (isLoading || !formData) {
    return <div className="p-6 text-center">{t('settings:page.loading')}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-page-bg">
      <div className="sticky top-0 z-30 bg-page-bg/80 backdrop-blur-md px-8 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-swiss-charcoal">{t('settings:page.title')}</h1>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                leftIcon={PencilSquareIcon}
                onClick={() => navigate('/settings/profile')}
              >
                {t('common:buttons.editProfile', 'Edit Profile')}
              </Button>
              <Button variant="light" onClick={handleCancel}>
                {t('common:buttons.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="bg-swiss-mint hover:bg-opacity-90"
              >
                {isSaving ? `${t('common:buttons.saveChanges')}...` : t('common:buttons.saveChanges')}
              </Button>
            </div>
          </div>
        </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 bg-white border-r border-gray-200 p-4 space-y-1 overflow-y-auto flex-shrink-0">
          {sections.map(section => (
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
          {sections.map(section => {
            const SectionComponent = section.component;
            return (
              <div
                key={section.id}
                id={section.id}
                ref={el => { sectionRefs.current[section.id] = el; }}
              >
                <SectionComponent
                  settings={formData}
                  onChange={handleFormChange}
                  userRole={UserRole.SERVICE_PROVIDER}
                />
              </div>
            );
          })}
          {sections.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-gray-600">{t('settings:page.noSectionsAvailable')}</p>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default ServiceProviderSettingsPage;
