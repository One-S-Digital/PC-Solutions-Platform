import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { UserRole, SettingsFormData } from '../types';
import { useTranslation } from 'react-i18next';
import FoundationProfileForm from '../components/profile/edit/FoundationProfileForm';
import EducatorProfileForm from '../components/profile/edit/EducatorProfileForm';
import SupplierProfileForm from '../components/profile/edit/SupplierProfileForm';
import ServiceProviderProfileForm from '../components/profile/edit/ServiceProviderProfileForm';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Tabs from '../components/ui/Tabs';
import { AvailabilityScheduler } from '../components/availability';
import { EducatorAvailabilitySettings, createEmptyAvailabilitySettings } from '../types/availability';

// Helper function to parse availability settings from various formats
const parseAvailabilitySettings = (
  value: EducatorAvailabilitySettings | string | undefined
): EducatorAvailabilitySettings => {
  if (!value) {
    return createEmptyAvailabilitySettings();
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 'employmentType' in parsed) {
        return parsed as EducatorAvailabilitySettings;
      }
    } catch {
      // If string can't be parsed, return default with notes containing the old value
      return {
        ...createEmptyAvailabilitySettings(),
        notes: value,
      };
    }
  }

  if (typeof value === 'object' && 'employmentType' in value) {
    return value as EducatorAvailabilitySettings;
  }

  return createEmptyAvailabilitySettings();
};

const ProfileEditPage: React.FC = () => {
  const { t } = useTranslation(['common', 'settings']);
  const { currentUser } = useAppContext();
  const { addNotification } = useNotifications();
  const { request } = useAuthenticatedApi();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SettingsFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      navigate('/settings');
      return;
    }

    loadProfileData();
  }, [currentUser]);

  const loadProfileData = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      let roleSettings: Partial<SettingsFormData> = {};

      if (currentUser.role === UserRole.FOUNDATION) {
        const response = await request<{ success: boolean; data?: any }>('/settings/foundation');
        const data = response.success && response.data ? response.data : ({} as any);
        const org = currentUser.primaryOrganization;
        roleSettings = {
          companyName: data.companyName || org?.name || currentUser.orgName || '',
          contactEmail: data.contactEmail || currentUser.email,
          phoneNumber: data.phoneNumber || org?.phoneNumber || '',
          contactPerson: data.contactPerson || org?.contactPerson || '',
          address: data.address || org?.region || '',
          canton: data.canton || org?.canton || '',
          city: data.city || org?.city || '',
          regionsServed: Array.isArray(data.regionsServed) ? data.regionsServed : (Array.isArray(org?.regionsServed) ? org.regionsServed : (org?.canton ? [org.canton] : [])),
          languagesSpoken: Array.isArray(data.languages) ? data.languages : (org?.languages || []),
          aboutText: data.description || org?.description || '',
          description: data.description || org?.description || '',
          vatNumber: data.vatNumber || org?.vatNumber || '',
          logoUrl: data.logoUrl || org?.logoUrl || null,
          coverImageUrl: data.coverImageUrl || org?.coverImageUrl || null,
          capacity: typeof data.capacity === 'number' ? data.capacity : (org?.capacity || 0),
          pedagogy: Array.isArray(data.pedagogy) ? data.pedagogy : (org?.pedagogy || []),
        } as Partial<SettingsFormData>;
      } else if (currentUser.role === UserRole.PRODUCT_SUPPLIER) {
        const response = await request<{ success: boolean; data?: any }>('/settings/supplier');
        const data = response.success && response.data ? response.data : ({} as any);
        const org = currentUser.primaryOrganization;
        roleSettings = {
          companyName: data.companyName || org?.name || '',
          contactEmail: data.contactEmail || currentUser.email,
          phoneNumber: data.phoneNumber || org?.phoneNumber || '',
          contactPerson: data.contactPerson || org?.contactPerson || '',
          address: data.address || org?.region || '',
          canton: data.canton || org?.canton || '',
          city: data.city || org?.city || '',
          regionsServed: Array.isArray(data.regionsServed) ? data.regionsServed : (Array.isArray(org?.regionsServed) ? org.regionsServed : (org?.canton ? [org.canton] : [])),
          languagesSpoken: Array.isArray(data.languages) ? data.languages : (org?.languages || []),
          aboutText: data.description || org?.description || '',
          description: data.description || org?.description || '',
          vatNumber: data.vatNumber || org?.vatNumber || '',
          logoUrl: data.logoUrl || org?.logoUrl || null,
          coverImageUrl: data.coverImageUrl || org?.coverImageUrl || null,
          productCategory: data.productCategory || org?.productCategory || '',
          serviceType: data.serviceType || org?.serviceType || '',
          minimumOrderQuantity: typeof data.minimumOrderQuantity === 'number' ? data.minimumOrderQuantity : (org?.minimumOrderQuantity || 0),
          directOrderLink: data.directOrderLink || org?.directOrderLink || '',
          catalogUrl: data.catalogUrl || org?.catalogUrl || '',
        } as Partial<SettingsFormData>;
      } else if (currentUser.role === UserRole.SERVICE_PROVIDER) {
        const response = await request<{ success: boolean; data?: any }>('/settings/service-provider');
        const data = response.success && response.data ? response.data : ({} as any);
        const org = currentUser.primaryOrganization;
        roleSettings = {
          companyName: data.companyName || org?.name || '',
          contactEmail: data.contactEmail || currentUser.email,
          phoneNumber: data.phoneNumber || org?.phoneNumber || '',
          contactPerson: data.contactPerson || org?.contactPerson || '',
          address: data.address || org?.region || '',
          canton: data.canton || org?.canton || '',
          city: data.city || org?.city || '',
          regionsServed: Array.isArray(data.regionsServed) ? data.regionsServed : (Array.isArray(org?.regionsServed) ? org.regionsServed : (org?.canton ? [org.canton] : [])),
          languagesSpoken: Array.isArray(data.languages) ? data.languages : (org?.languages || []),
          aboutText: data.description || org?.description || '',
          description: data.description || org?.description || '',
          vatNumber: data.vatNumber || org?.vatNumber || '',
          logoUrl: data.logoUrl || org?.logoUrl || null,
          coverImageUrl: data.coverImageUrl || org?.coverImageUrl || null,
          serviceType: data.serviceType || org?.serviceType || '',
          serviceCategories: Array.isArray(data.serviceCategories) ? data.serviceCategories : (org?.serviceCategories || []),
          deliveryType: data.deliveryType || org?.deliveryType || '',
          bookingLink: data.bookingLink || org?.bookingLink || '',
        } as Partial<SettingsFormData>;
      } else if (currentUser.role === UserRole.EDUCATOR) {
        const response = await request<{ success: boolean; data?: any }>('/settings/educator');
        const data = response.success && response.data ? response.data : ({} as any);
        roleSettings = {
          firstName: data.firstName || currentUser.firstName || '',
          lastName: data.lastName || currentUser.lastName || '',
          email: data.email || currentUser.email || '',
          contactEmail: data.contactEmail || currentUser.email || '',
          phoneNumber: data.phoneNumber || '',
          workExperience: data.workExperience || '',
          education: data.education || '',
          certifications: Array.isArray(data.certifications) ? data.certifications : [],
          skills: Array.isArray(data.skills) ? data.skills : [],
          availability: data.availability || '',
          availabilitySettings: data.availabilitySettings,
          cvUrl: data.cvUrl || '',
          shortBio: data.shortBio || '',
          avatarAssetId: data.avatarAssetId || '',
          avatarUrl: data.avatarUrl || '', // Computed from asset relation on backend
          coverAssetId: data.coverAssetId || '',
          coverImageUrl: data.coverImageUrl || null,
        } as Partial<SettingsFormData>;
      }

      setFormData(roleSettings as SettingsFormData);
    } catch (error) {
      console.error('Failed to load profile data', error);
      addNotification({
        title: t('common:errors.genericErrorTitle'),
        message: t('common:errors.genericErrorMessage'),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData || !currentUser) {
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const payload = formData as Record<string, any>;
      let saveRequest: Promise<any>;

      if (currentUser.role === UserRole.FOUNDATION) {
        saveRequest = request('/settings/foundation', {
          method: 'PATCH',
          body: JSON.stringify({
            companyName: payload.companyName || currentUser.orgName || '',
            contactEmail: payload.contactEmail || currentUser.email,
            phoneNumber: payload.phoneNumber || '',
            contactPerson: payload.contactPerson || '',
            address: payload.address || '',
            canton: payload.canton || '',
            city: payload.city || '',
            regionsServed: Array.isArray(payload.regionsServed) ? payload.regionsServed : (payload.canton ? [payload.canton] : []),
            description: payload.aboutText || payload.description || '',
            vatNumber: payload.vatNumber || '',
            languages: Array.isArray(payload.languagesSpoken) ? payload.languagesSpoken : [],
            capacity: Number.isFinite(payload.capacity) ? Number(payload.capacity) : 0,
            pedagogy: Array.isArray(payload.pedagogy) ? payload.pedagogy : [],
            ...(payload.logoAssetId !== undefined && { logoAssetId: payload.logoAssetId || null }),
            ...(payload.coverAssetId !== undefined && { coverAssetId: payload.coverAssetId || null }),
          }),
        });
      } else if (currentUser.role === UserRole.PRODUCT_SUPPLIER) {
        saveRequest = request('/settings/supplier', {
          method: 'PATCH',
          body: JSON.stringify({
            companyName: payload.companyName || '',
            contactEmail: payload.contactEmail || currentUser.email,
            phoneNumber: payload.phoneNumber || '',
            contactPerson: payload.contactPerson || '',
            address: payload.address || '',
            canton: payload.canton || '',
            city: payload.city || '',
            regionsServed: Array.isArray(payload.regionsServed) ? payload.regionsServed : (payload.canton ? [payload.canton] : []),
            description: payload.aboutText || payload.description || '',
            vatNumber: payload.vatNumber || '',
            languages: Array.isArray(payload.languagesSpoken) ? payload.languagesSpoken : [],
            productCategory: payload.productCategory || '',
            serviceType: payload.serviceType || '',
            minimumOrderQuantity: Number.isFinite(payload.minimumOrderQuantity) ? Number(payload.minimumOrderQuantity) : 0,
            directOrderLink: payload.directOrderLink || '',
            catalogUrl: payload.catalogUrl || '',
            ...(payload.logoAssetId !== undefined && { logoAssetId: payload.logoAssetId || null }),
            ...(payload.coverAssetId !== undefined && { coverAssetId: payload.coverAssetId || null }),
          }),
        });
      } else if (currentUser.role === UserRole.SERVICE_PROVIDER) {
        saveRequest = request('/settings/service-provider', {
          method: 'PATCH',
          body: JSON.stringify({
            companyName: payload.companyName || '',
            contactEmail: payload.contactEmail || currentUser.email,
            phoneNumber: payload.phoneNumber || '',
            contactPerson: payload.contactPerson || '',
            address: payload.address || '',
            canton: payload.canton || '',
            city: payload.city || '',
            regionsServed: Array.isArray(payload.regionsServed) ? payload.regionsServed : (payload.canton ? [payload.canton] : []),
            description: payload.aboutText || payload.description || '',
            vatNumber: payload.vatNumber || '',
            languages: Array.isArray(payload.languagesSpoken) ? payload.languagesSpoken : [],
            serviceType: payload.serviceType || '',
            serviceCategories: Array.isArray(payload.serviceCategories) ? payload.serviceCategories : [],
            deliveryType: payload.deliveryType || '',
            bookingLink: payload.bookingLink || '',
            ...(payload.logoAssetId !== undefined && { logoAssetId: payload.logoAssetId || null }),
            ...(payload.coverAssetId !== undefined && { coverAssetId: payload.coverAssetId || null }),
          }),
        });
      } else if (currentUser.role === UserRole.EDUCATOR) {
        const educatorPayload: Record<string, any> = {
          firstName: payload.firstName || '',
          lastName: payload.lastName || '',
          email: payload.email || currentUser.email,
          contactEmail: payload.contactEmail || currentUser.email,
          phoneNumber: payload.phoneNumber || '',
          workExperience: payload.workExperience || '',
          education: payload.education || '',
          certifications: Array.isArray(payload.certifications) ? payload.certifications : [],
          skills: Array.isArray(payload.skills) ? payload.skills : [],
          availability: payload.availability || '',
          cvUrl: payload.cvUrl || '',
          shortBio: payload.shortBio || '',
          avatarAssetId: payload.avatarAssetId || '',
        };

        if (payload.availabilitySettings !== undefined) {
          educatorPayload.availabilitySettings = payload.availabilitySettings;
        }
        if (payload.coverAssetId !== undefined) {
          educatorPayload.coverAssetId = payload.coverAssetId || null;
        }

        saveRequest = request('/settings/educator', {
          method: 'PATCH',
          body: JSON.stringify(educatorPayload),
        });
      } else {
        throw new Error('Unsupported role');
      }

      const response = await saveRequest;
      
      if (response && response.success !== false) {
        setSaveSuccess(true);
        addNotification({
          title: t('notifications.successTitle', 'Success'),
          message: t('notifications.settingsUpdated', 'Profile updated successfully'),
          type: 'success',
        });
        
        // Reload profile data to reflect changes without blocking UI state
        void loadProfileData();
        
        // Hide success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(response?.message || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Failed to save profile', error);
      addNotification({
        title: t('common:errors.genericErrorTitle', 'Error'),
        message: error instanceof Error ? error.message : t('common:errors.genericErrorMessage', 'An error occurred while saving'),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (field: keyof SettingsFormData, value: any) => {
    setFormData(prev => (prev ? { ...prev, [field]: value } : null));
    setSaveSuccess(false);
  };

  if (!currentUser || isLoading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint mx-auto mb-4"></div>
          <p className="text-gray-600">{t('settings:page.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  const renderProfileForm = () => {
    switch (currentUser.role) {
      case UserRole.FOUNDATION:
        return <FoundationProfileForm formData={formData} onChange={handleFormChange} />;
      case UserRole.PRODUCT_SUPPLIER:
        return <SupplierProfileForm formData={formData} onChange={handleFormChange} />;
      case UserRole.SERVICE_PROVIDER:
        return <ServiceProviderProfileForm formData={formData} onChange={handleFormChange} />;
      case UserRole.EDUCATOR:
        return (
          <Tabs
            variant="line"
            activeTab={activeTabIndex}
            onTabChange={setActiveTabIndex}
            tabs={[
              {
                label: t('common:settingsPage.profile', 'Profile'),
                content: <EducatorProfileForm formData={formData} onChange={handleFormChange} />,
              },
              {
                label: t('settings:availability.title', 'Availability Schedule'),
                content: (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <AvailabilityScheduler
                      value={parseAvailabilitySettings((formData as any).availabilitySettings)}
                      onChange={(settings) => handleFormChange('availabilitySettings', settings)}
                      showPreview={true}
                    />
                  </div>
                ),
              },
            ]}
          />
        );
      default:
        return <div className="p-6 text-center text-gray-600">{t('common:errors.unsupportedRole', 'Unsupported role')}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="light"
                leftIcon={ArrowLeftIcon}
                onClick={() => navigate('/settings')}
              >
                {t('common:buttons.back', 'Back')}
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                {t('common:settingsPage.profile', 'Edit Profile')}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              {saveSuccess && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">{t('common:buttons.profileUpdated', 'Profile updated!')}</span>
                </div>
              )}
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-swiss-mint hover:bg-opacity-90"
              >
                {isSaving
                  ? `${t('common:buttons.saving', 'Saving')}...`
                  : t('common:buttons.saveChanges', 'Save Changes')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderProfileForm()}
      </div>
    </div>
  );
};

export default ProfileEditPage;
