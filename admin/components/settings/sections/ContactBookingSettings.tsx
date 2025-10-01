


import React from 'react';
import { SettingsFormData, SupplierSettings, ProviderSettings, UserRole, PreferredContactMethod, AvgResponseType } from '../../../types';
import { STANDARD_INPUT_FIELD } from '../../../constants';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { PhoneIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
// import RadioPills from '../../ui/RadioPills';
// import ToggleSwitch from '../../ui/ToggleSwitch';

interface ContactBookingSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const PREFERRED_CONTACT_METHODS: { labelKey: string, value: PreferredContactMethod }[] = [
  { labelKey: 'settingsContactBooking.contactMethods.email', value: 'Email' },
  { labelKey: 'settingsContactBooking.contactMethods.phone', value: 'Phone' },
  { labelKey: 'settingsContactBooking.contactMethods.platformForm', value: 'Platform Form' },
];

const AVG_RESPONSE_TIMES: { labelKey: string, value: AvgResponseType }[] = [
  { labelKey: 'settingsContactBooking.responseTimes.lessThan24h', value: '< 24 h' },
  { labelKey: 'settingsContactBooking.responseTimes.twoToThreeDays', value: '2–3 d' },
  { labelKey: 'settingsContactBooking.responseTimes.other', value: 'Other' },
];

const ContactBookingSettings: React.FC<ContactBookingSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation();
  const isProvider = userRole === UserRole.SERVICE_PROVIDER;
  const isSupplier = userRole === UserRole.PRODUCT_SUPPLIER;
  const providerSettings = settings as ProviderSettings; // Type assertion for provider-specific fields
  const supplierSettings = settings as SupplierSettings;

  return (
    <SettingsSectionWrapper title={t('settingsPage.contactBooking')} icon={PhoneIcon}>
      <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
        {/* Preferred Contact Method */}
        <label className="form-label md:pt-2">{t('settingsContactBooking.preferredContactMethod')} <span className="text-swiss-coral">*</span></label>
        <div className="form-input-container">
          {/* <RadioPills options={PREFERRED_CONTACT_METHODS} selectedValue={settings.preferredContactMethod} onChange={(val) => onChange('preferredContactMethod', val as PreferredContactMethod)} /> */}
          <div className="flex space-x-2">
            {PREFERRED_CONTACT_METHODS.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange('preferredContactMethod', opt.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-button border transition-colors duration-150 ${settings.preferredContactMethod === opt.value ? 'bg-swiss-mint text-white border-swiss-mint' : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'}`}
                >
                    {t(opt.labelKey)}
                </button>
            ))}
          </div>
        </div>

        {/* Avg. Response Time Badge */}
        <label htmlFor="avgResponseType" className="form-label md:pt-2">{t('settingsContactBooking.avgResponseTime')} <span className="text-swiss-coral">*</span></label>
        <div className="form-input-container">
          <select
            id="avgResponseType"
            name="avgResponseType"
            value={settings.avgResponseType || '< 24 h'}
            onChange={(e) => onChange('avgResponseType', e.target.value as AvgResponseType)}
            className={STANDARD_INPUT_FIELD}
            required
          >
            {AVG_RESPONSE_TIMES.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>)}
          </select>
        </div>

        {/* External Booking Link */}
        <label htmlFor="externalBookingLink" className="form-label md:pt-2">{t('settingsContactBooking.externalBookingLink')}</label>
        <div className="form-input-container">
          <input
            type="url"
            id="externalBookingLink"
            name="externalBookingLink"
            value={settings.externalBookingLink || ''}
            onChange={(e) => onChange('externalBookingLink', e.target.value)}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('settingsContactBooking.externalBookingLinkPlaceholder')}
          />
        </div>

        {/* Direct Order Link for Suppliers */}
        {isSupplier && (
          <>
            <label htmlFor="directOrderLink" className="form-label md:pt-2">{t('settingsContactBooking.directOrderLink')}</label>
            <div className="form-input-container">
              <input
                type="url"
                id="directOrderLink"
                name="directOrderLink"
                value={settings.directOrderLink || ''}
                onChange={(e) => onChange('directOrderLink', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settingsContactBooking.directOrderLinkPlaceholder')}
              />
               <p className="text-xs text-gray-500 mt-1">{t('settingsContactBooking.directOrderLinkHelpText')}</p>
            </div>
          </>
        )}


        {/* Service Provider Extras */}
        {isProvider && (
          <>
            {/* Cal.com / Calendly Link */}
            <label htmlFor="calComLink" className="form-label md:pt-2">{t('settingsContactBooking.calComLink')}</label>
            <div className="form-input-container">
              <input
                type="url"
                id="calComLink"
                name="calComLink"
                value={settings.calComLink || ''}
                onChange={(e) => onChange('calComLink', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settingsContactBooking.calComLinkPlaceholder')}
              />
            </div>

            {/* Delivery Type Toggle: Remote */}
            <label htmlFor="deliveryTypeToggleRemote" className="form-label md:pt-2">{t('settingsContactBooking.deliveryTypeToggleRemote')}</label>
            <div className="form-input-container">
              {/* <ToggleSwitch id="deliveryTypeToggleRemote" checked={providerSettings.deliveryTypeToggleRemote} onChange={(checked) => onChange('deliveryTypeToggleRemote', checked)} /> */}
                <button
                    type="button"
                    onClick={() => onChange('deliveryTypeToggleRemote', !settings.deliveryTypeToggleRemote)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none transition-colors duration-200 ease-in-out ${settings.deliveryTypeToggleRemote ? 'bg-swiss-mint' : 'bg-gray-200'}`}
                    role="switch"
                    aria-checked={!!settings.deliveryTypeToggleRemote}
                     aria-label={t('settingsContactBooking.deliveryTypeToggleRemote')}
                >
                    <span className="sr-only">{t('settingsContactBooking.deliveryTypeToggleRemote')}</span>
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${settings.deliveryTypeToggleRemote ? 'translate-x-6' : 'translate-x-1'}`}></span>
                </button>
            </div>
          </>
        )}
      </div>
    </SettingsSectionWrapper>
  );
};

export default ContactBookingSettings;