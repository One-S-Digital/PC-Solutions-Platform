import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { UserRole } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useNotifications } from '../../contexts/NotificationContext';

interface FoundationSettingsState {
  companyName: string;
  contactEmail: string;
  phoneNumber: string;
  address: string;
  canton: string;
  languages: string[];
  capacity: number;
  pedagogy: string[];
}

const OrganizationProfileForm: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const { request } = useAuthenticatedApi();
  const { addNotification } = useNotifications();

  const [profile, setProfile] = useState<FoundationSettingsState | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!currentUser || currentUser.role !== UserRole.FOUNDATION) {
        if (!cancelled) {
          setProfile(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const response = await request<{ success: boolean; data?: any }>('/settings/foundation');
        if (cancelled) {
          return;
        }

        if (response.success && response.data) {
          const data = response.data as any;
          setProfile({
            companyName: data.companyName || currentUser.orgName || '',
            contactEmail: data.contactEmail || currentUser.email,
            phoneNumber: data.phoneNumber || '',
            address: data.address || '',
            canton: data.canton || '',
            languages: Array.isArray(data.languages) ? data.languages : [],
            capacity: typeof data.capacity === 'number' ? data.capacity : 0,
            pedagogy: Array.isArray(data.pedagogy) ? data.pedagogy : [],
          });
        } else {
          setProfile({
            companyName: currentUser.orgName || '',
            contactEmail: currentUser.email,
            phoneNumber: '',
            address: '',
            canton: '',
            languages: [],
            capacity: 0,
            pedagogy: [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load foundation settings', error);
          addNotification({
            title: t('common:errors.genericErrorTitle'),
            message: t('common:errors.genericErrorMessage'),
            type: 'error',
          });
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [currentUser, request, addNotification, t]);

  const updateState = (changes: Partial<FoundationSettingsState>) => {
    setProfile(prev => (prev ? { ...prev, ...changes } : prev));
    setIsSaved(false);
  };

  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numeric = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    updateState({ capacity: numeric });
  };

  const handlePedagogyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const entries = e.target.value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    updateState({ pedagogy: entries });
  };

  const handleLanguagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const entries = e.target.value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    updateState({ languages: entries });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !currentUser) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        companyName: profile.companyName || currentUser.orgName || '',
        contactEmail: profile.contactEmail || currentUser.email,
        phoneNumber: profile.phoneNumber || '',
        address: profile.address || '',
        canton: profile.canton || '',
        languages: profile.languages,
        capacity: profile.capacity ?? 0,
        pedagogy: profile.pedagogy,
      };

      const response = await request('/settings/foundation', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!response.success) {
        throw new Error(response.message || 'Update failed');
      }

      setIsSaved(true);
      addNotification({
        title: t('notifications.successTitle'),
        message: t('notifications.settingsUpdated'),
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to update foundation settings', error);
      addNotification({
        title: t('common:errors.genericErrorTitle'),
        message: t('common:errors.genericErrorMessage'),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser || currentUser.role !== UserRole.FOUNDATION) {
    return <p>{t('organizationProfileForm.accessDenied')}</p>;
  }

  if (isLoading || !profile) {
    return (
      <Card className="p-6">
        <p>{t('common:loading')}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-swiss-charcoal mb-1">{t('organizationProfileForm.title')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('organizationProfileForm.subtitle')}</p>

      {isSaved && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
          {t('organizationProfileForm.saveSuccess')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
            {t('organizationProfileForm.labels.capacity')}
          </label>
          <input
            type="number"
            name="capacity"
            id="capacity"
            value={Number.isFinite(profile.capacity) ? profile.capacity : 0}
            onChange={handleCapacityChange}
            className={`${STANDARD_INPUT_FIELD} max-w-xs`}
            min="0"
          />
        </div>

        <div>
          <label htmlFor="pedagogy" className="block text-sm font-medium text-gray-700 mb-1">
            {t('organizationProfileForm.labels.pedagogy')}
          </label>
          <input
            type="text"
            name="pedagogy"
            id="pedagogy"
            value={profile.pedagogy.join(', ')}
            onChange={handlePedagogyChange}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('organizationProfileForm.placeholders.pedagogy')}
          />
          <p className="text-xs text-gray-500 mt-1">{t('organizationProfileForm.helpText.commaSeparated')}</p>
        </div>

        <div>
          <label htmlFor="languages" className="block text-sm font-medium text-gray-700 mb-1">
            {t('organizationProfileForm.labels.languages')}
          </label>
          <input
            type="text"
            name="languages"
            id="languages"
            value={profile.languages.join(', ')}
            onChange={handleLanguagesChange}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('organizationProfileForm.placeholders.languages')}
          />
          <p className="text-xs text-gray-500 mt-1">{t('organizationProfileForm.helpText.commaSeparated')}</p>
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? `${t('common:buttons.saveChanges')}...` : t('organizationProfileForm.saveButton')}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default OrganizationProfileForm;