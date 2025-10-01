

// Implement PrivacyDataSettings.tsx
// Placeholder - This will be implemented in subsequent steps.
import React from 'react';
import { SettingsFormData, UserRole } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import Button from '../../ui/Button';
import { LockClosedIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
// import ToggleSwitch from '../../ui/ToggleSwitch';

interface PrivacyDataSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const PrivacyDataSettings: React.FC<PrivacyDataSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation();
  const hidePubliclyLabelKey = userRole === UserRole.PRODUCT_SUPPLIER 
    ? "settingsPrivacyData.hidePricesPublicly" 
    : "settingsPrivacyData.hideStartingRatePublicly";

  const hidePubliclyHelpTextKey = userRole === UserRole.PRODUCT_SUPPLIER
    ? "settingsPrivacyData.hidePricesHelpText"
    : "settingsPrivacyData.hideRateHelpText";

  const handleDataDeletionRequest = () => {
    if (window.confirm(t('settingsPrivacyData.confirmGDPRDelete'))) {
      onChange('gdprDataDeletionRequestMade', true);
      alert(t('settingsPrivacyData.deletionRequestSubmittedHelpText'));
      // In a real app, this would trigger a backend process.
    }
  };

  return (
    <SettingsSectionWrapper title={t('settingsPage.privacyData')} icon={LockClosedIcon}>
      <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
        {/* Hide Prices/Rate Publicly Toggle */}
        <label htmlFor="hidePubliclyToggle" className="form-label md:pt-2">{t(hidePubliclyLabelKey)}</label>
        <div className="form-input-container">
          {/* <ToggleSwitch id="hidePubliclyToggle" checked={settings.hidePubliclyToggle} onChange={(checked) => onChange('hidePubliclyToggle', checked)} /> */}
           <button
                type="button"
                onClick={() => onChange('hidePubliclyToggle', !settings.hidePubliclyToggle)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none transition-colors duration-200 ease-in-out ${settings.hidePubliclyToggle ? 'bg-swiss-mint' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={!!settings.hidePubliclyToggle}
                aria-label={t(hidePubliclyLabelKey)}
            >
                <span className="sr-only">{t(hidePubliclyLabelKey)}</span>
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.hidePubliclyToggle ? 'translate-x-6' : 'translate-x-1'}`}></span>
            </button>
          <p className="text-xs text-gray-500 mt-1">
            {t(hidePubliclyHelpTextKey)}
          </p>
        </div>

        {/* GDPR Data Deletion Request Button */}
        <label className="form-label md:pt-2">{t('settingsPrivacyData.dataDeletion')}</label>
        <div className="form-input-container">
          <Button 
            variant="danger" 
            leftIcon={ShieldExclamationIcon}
            onClick={handleDataDeletionRequest}
            disabled={!!settings.gdprDataDeletionRequestMade}
          >
            {settings.gdprDataDeletionRequestMade ? t('settingsPrivacyData.deletionRequestSubmitted') : t('settingsPrivacyData.requestGDPRDeletion')}
          </Button>
          {settings.gdprDataDeletionRequestMade && (
            <p className="text-xs text-yellow-600 mt-1">{t('settingsPrivacyData.deletionRequestSubmittedHelpText')}</p>
          )}
          {!settings.gdprDataDeletionRequestMade && (
             <p className="text-xs text-gray-500 mt-1">{t('settingsPrivacyData.requestDeletionHelpText')}</p>
          )}
        </div>
      </div>
    </SettingsSectionWrapper>
  );
};

export default PrivacyDataSettings;