

// Implement NotificationPreferencesSettings.tsx
// This is a placeholder for now, will be implemented in subsequent steps.
import React from 'react';
import { SettingsFormData, UserRole, DigestFrequency } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { BellAlertIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
// import ToggleSwitch from '../../ui/ToggleSwitch';
// import RadioPills from '../../ui/RadioPills';

interface NotificationPreferencesSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const DIGEST_FREQUENCIES: { labelKey: string, value: DigestFrequency }[] = [
  { labelKey: 'settingsNotificationPreferences.digestFrequencies.daily', value: 'Daily' },
  { labelKey: 'settingsNotificationPreferences.digestFrequencies.weekly', value: 'Weekly' },
  { labelKey: 'settingsNotificationPreferences.digestFrequencies.none', value: 'None' },
];

const NotificationPreferencesSettings: React.FC<NotificationPreferencesSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation();
  const isProvider = userRole === UserRole.SERVICE_PROVIDER;
  const newRequestLabelKey = isProvider ? "settingsNotificationPreferences.newRequestEmailToggleProvider" : "settingsNotificationPreferences.newRequestEmailToggleSupplier";

  return (
    <SettingsSectionWrapper title={t('settingsPage.notificationPreferences')} icon={BellAlertIcon}>
      <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
        {/* New Request Email Toggle */}
        <label htmlFor="newRequestEmailToggle" className="form-label md:pt-2">{t(newRequestLabelKey)} <span className="text-swiss-coral">*</span></label>
        <div className="form-input-container">
          {/* <ToggleSwitch id="newRequestEmailToggle" checked={settings.newRequestEmailToggle} onChange={(checked) => onChange('newRequestEmailToggle', checked)} /> */}
            <button
                type="button"
                onClick={() => onChange('newRequestEmailToggle', !settings.newRequestEmailToggle)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none transition-colors duration-200 ease-in-out ${settings.newRequestEmailToggle ? 'bg-swiss-mint' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={!!settings.newRequestEmailToggle}
                aria-label={t(newRequestLabelKey)}
            >
                <span className="sr-only">{t(newRequestLabelKey)}</span>
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.newRequestEmailToggle ? 'translate-x-6' : 'translate-x-1'}`}></span>
            </button>
        </div>

        {/* Daily/Weekly Digest Radio */}
        <label className="form-label md:pt-2">{t('settingsNotificationPreferences.digestFrequency')} <span className="text-swiss-coral">*</span></label>
        <div className="form-input-container">
          {/* <RadioPills options={DIGEST_FREQUENCIES} selectedValue={settings.digestRadio} onChange={(val) => onChange('digestRadio', val as DigestFrequency)} /> */}
           <div className="flex space-x-2">
            {DIGEST_FREQUENCIES.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange('digestRadio', opt.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-button border transition-colors duration-150 ${settings.digestRadio === opt.value ? 'bg-swiss-mint text-white border-swiss-mint' : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'}`}
                >
                    {t(opt.labelKey)}
                </button>
            ))}
          </div>
        </div>

        {/* Promo Redemption Alerts Toggle */}
        <label htmlFor="promoRedemptionAlertsToggle" className="form-label md:pt-2">{t('settingsNotificationPreferences.promoRedemptionAlertsToggle')} <span className="text-swiss-coral">*</span></label>
        <div className="form-input-container">
          {/* <ToggleSwitch id="promoRedemptionAlertsToggle" checked={settings.promoRedemptionAlertsToggle} onChange={(checked) => onChange('promoRedemptionAlertsToggle', checked)} /> */}
           <button
                type="button"
                onClick={() => onChange('promoRedemptionAlertsToggle', !settings.promoRedemptionAlertsToggle)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none transition-colors duration-200 ease-in-out ${settings.promoRedemptionAlertsToggle ? 'bg-swiss-mint' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={!!settings.promoRedemptionAlertsToggle}
                aria-label={t('settingsNotificationPreferences.promoRedemptionAlertsToggle')}
            >
                <span className="sr-only">{t('settingsNotificationPreferences.promoRedemptionAlertsToggle')}</span>
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.promoRedemptionAlertsToggle ? 'translate-x-6' : 'translate-x-1'}`}></span>
            </button>
        </div>
      </div>
    </SettingsSectionWrapper>
  );
};

export default NotificationPreferencesSettings;