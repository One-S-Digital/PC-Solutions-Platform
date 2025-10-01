

// Implement AnalyticsPreferencesSettings.tsx
// Placeholder - This will be implemented in subsequent steps.
import React from 'react';
import { SettingsFormData, UserRole } from '../../../types';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { ChartPieIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { STANDARD_INPUT_FIELD } from '../../../constants';
import { useTranslation } from 'react-i18next';
// import ToggleSwitch from '../../ui/ToggleSwitch';

interface AnalyticsPreferencesSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

// Mock timezones, in a real app, use a library like moment-timezone
const TIMEZONES = ['Europe/Zurich', 'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'];
const CURRENCIES = [{value: 'CHF', labelKey: 'settingsAnalyticsPreferences.currencies.chf'}, {value: 'EUR', labelKey: 'settingsAnalyticsPreferences.currencies.eur'}];


const AnalyticsPreferencesSettings: React.FC<AnalyticsPreferencesSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation();
  return (
    <SettingsSectionWrapper title={t('settingsPage.analyticsPreferences')} icon={ChartPieIcon}>
      <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
        {/* Time-zone Dropdown */}
        <label htmlFor="timeZone" className="form-label md:pt-2">{t('settingsAnalyticsPreferences.timeZone')} <span className="text-swiss-coral">*</span></label>
        <div className="form-input-container">
          <select
            id="timeZone"
            name="timeZone"
            value={settings.timeZone || 'Europe/Zurich'}
            onChange={(e) => onChange('timeZone', e.target.value)}
            className={STANDARD_INPUT_FIELD}
            required
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        {/* Currency Dropdown */}
        <label htmlFor="currency" className="form-label md:pt-2">{t('settingsAnalyticsPreferences.currency')} <span className="text-swiss-coral">*</span></label>
        <div className="form-input-container">
          <select
            id="currency"
            name="currency"
            value={settings.currency || 'CHF'}
            onChange={(e) => onChange('currency', e.target.value as 'CHF' | 'EUR')}
            className={STANDARD_INPUT_FIELD}
            required
          >
            {CURRENCIES.map(curr => <option key={curr.value} value={curr.value}>{t(curr.labelKey)}</option>)}
          </select>
        </div>

        {/* Opt-in to anonymised benchmark data (checkbox) */}
        <label htmlFor="anonymisedBenchmarkDataOptIn" className="form-label md:pt-2">{t('settingsAnalyticsPreferences.benchmarkData')}</label>
        <div className="form-input-container">
          {/* <ToggleSwitch id="anonymisedBenchmarkDataOptIn" checked={settings.anonymisedBenchmarkDataOptIn} onChange={(checked) => onChange('anonymisedBenchmarkDataOptIn', checked)} /> */}
           <button
                type="button"
                onClick={() => onChange('anonymisedBenchmarkDataOptIn', !settings.anonymisedBenchmarkDataOptIn)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none transition-colors duration-200 ease-in-out ${settings.anonymisedBenchmarkDataOptIn ? 'bg-swiss-mint' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={!!settings.anonymisedBenchmarkDataOptIn}
                aria-label={t('settingsAnalyticsPreferences.benchmarkData')}
            >
                <span className="sr-only">{t('settingsAnalyticsPreferences.benchmarkData')}</span>
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.anonymisedBenchmarkDataOptIn ? 'translate-x-6' : 'translate-x-1'}`}></span>
            </button>
          <p className="text-xs text-gray-500 mt-1">{t('settingsAnalyticsPreferences.benchmarkDataHelpText')}</p>
        </div>
      </div>
    </SettingsSectionWrapper>
  );
};

export default AnalyticsPreferencesSettings;