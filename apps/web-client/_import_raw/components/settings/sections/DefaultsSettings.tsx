

// Implement DefaultsSettings.tsx
// Placeholder - This will be implemented in subsequent steps.
import React from 'react';
import { SettingsFormData, UserRole, SupplierSettings, ProviderSettings, ConsultationLength } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { STANDARD_INPUT_FIELD } from '../../../constants';
import { useTranslation } from 'react-i18next';
// import ToggleSwitch from '../../ui/ToggleSwitch';
// import RadioPills from '../../ui/RadioPills';

interface DefaultsSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const CONSULTATION_LENGTHS: {labelKey: string, value: ConsultationLength}[] = [
    {labelKey: 'settingsDefaults.consultationLengths.30min', value: '30 min'},
    {labelKey: 'settingsDefaults.consultationLengths.60min', value: '60 min'},
];

const DefaultsSettings: React.FC<DefaultsSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation();
  const isSupplier = userRole === UserRole.PRODUCT_SUPPLIER;
  const isProvider = userRole === UserRole.SERVICE_PROVIDER;

  return (
    <SettingsSectionWrapper title={t('settingsPage.defaults')} icon={AdjustmentsHorizontalIcon}>
      <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
        {/* Auto-respond Toggle (off by default) */}
        <label htmlFor="autoRespondToggle" className="form-label md:pt-2">{t('settingsDefaults.autoRespondToggle')}</label>
        <div className="form-input-container">
          {/* <ToggleSwitch id="autoRespondToggle" checked={settings.autoRespondToggle} onChange={(checked) => onChange('autoRespondToggle', checked)} /> */}
           <button
                type="button"
                onClick={() => onChange('autoRespondToggle', !settings.autoRespondToggle)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none transition-colors duration-200 ease-in-out ${settings.autoRespondToggle ? 'bg-swiss-mint' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={!!settings.autoRespondToggle}
                aria-label={t('settingsDefaults.autoRespondToggle')}
            >
                <span className="sr-only">{t('settingsDefaults.autoRespondToggle')}</span>
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.autoRespondToggle ? 'translate-x-6' : 'translate-x-1'}`}></span>
            </button>
          <p className="text-xs text-gray-500 mt-1">{t('settingsDefaults.autoRespondHelpText')}</p>
        </div>

        {/* Supplier Extras */}
        {isSupplier && (
          <>
            <label htmlFor="defaultMOQ" className="form-label md:pt-2">{t('settingsDefaults.defaultMOQ')}</label>
            <div className="form-input-container">
              <input
                type="number"
                id="defaultMOQ"
                name="defaultMOQ"
                value={settings.defaultMOQ || ''}
                onChange={(e) => onChange('defaultMOQ', e.target.value ? parseInt(e.target.value) : undefined)}
                className={`${STANDARD_INPUT_FIELD} w-32`}
                placeholder={t('settingsDefaults.defaultMOQPlaceholder')}
              />
            </div>

            <label htmlFor="autoAcceptOrderQtyLimit" className="form-label md:pt-2">{t('settingsDefaults.autoAcceptOrderQtyLimit')}</label>
            <div className="form-input-container">
              <input
                type="number"
                id="autoAcceptOrderQtyLimit"
                name="autoAcceptOrderQtyLimit"
                value={settings.autoAcceptOrderQtyLimit || ''}
                onChange={(e) => onChange('autoAcceptOrderQtyLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                className={`${STANDARD_INPUT_FIELD} w-32`}
                placeholder={t('settingsDefaults.autoAcceptOrderQtyLimitPlaceholder')}
              />
            </div>
          </>
        )}

        {/* Service Provider Extras */}
        {isProvider && (
          <>
            <label className="form-label md:pt-2">{t('settingsDefaults.defaultConsultationLength')}</label>
            <div className="form-input-container">
              {/* <RadioPills options={CONSULTATION_LENGTHS} selectedValue={providerSettings.defaultConsultationLength} onChange={(val) => onChange('defaultConsultationLength', val as ConsultationLength)} /> */}
                <div className="flex space-x-2">
                {CONSULTATION_LENGTHS.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange('defaultConsultationLength', opt.value as ConsultationLength)}
                        className={`px-4 py-2 text-sm font-medium rounded-button border transition-colors duration-150 ${settings.defaultConsultationLength === opt.value ? 'bg-swiss-mint text-white border-swiss-mint' : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'}`}
                    >
                        {t(opt.labelKey)}
                    </button>
                ))}
                </div>
            </div>
          </>
        )}
      </div>
    </SettingsSectionWrapper>
  );
};

export default DefaultsSettings;