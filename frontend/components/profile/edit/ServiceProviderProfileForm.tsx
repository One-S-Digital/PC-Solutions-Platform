import React, { useEffect, useMemo, useState } from 'react';
import { SettingsFormData, SwissCanton, SupportedLanguage } from '../../../types';
import { STANDARD_INPUT_FIELD, SWISS_CANTONS_WITH_ALL, ALL_REGIONS_OPTION } from '../../../constants';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../contexts/AppContext';
import { toggleMultiSelectWithAll } from '../../../utils/regionSelection';
import CoverImageSection from './shared/CoverImageSection';
import ContactDetailsSection from './shared/ContactDetailsSection';
import AvatarSection from './shared/AvatarSection';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

const SUPPORTED_LANGUAGES_OPTIONS_BASE: { labelKey: string, value: SupportedLanguage }[] = [
  { labelKey: 'common:languageSwitcher.en', value: 'EN'},
  { labelKey: 'common:languageSwitcher.fr', value: 'FR'},
  { labelKey: 'common:languageSwitcher.de', value: 'DE'},
];

const SERVICE_CATEGORIES_OPTIONS = [
  'CLEANING',
  'IT_SUPPORT',
  'MAINTENANCE',
  'CONSULTING',
  'TRAINING',
  'OTHER'
];

const DELIVERY_TYPE_OPTIONS = [
  'On-site',
  'Remote',
  'Hybrid'
];

interface ServiceProviderProfileFormProps {
  formData: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
}

const ServiceProviderProfileForm: React.FC<ServiceProviderProfileFormProps> = ({ formData, onChange }) => {
  const { t } = useTranslation(['common', 'settings']);
  const { currentUser } = useAppContext();
  const [customServiceCategory, setCustomServiceCategory] = useState('');

  const serviceCategories = useMemo(
    () => (Array.isArray(formData.serviceCategories) ? formData.serviceCategories.filter(Boolean) : []),
    [formData.serviceCategories],
  );

  const normalizedKnownOptions = useMemo(
    () => new Set(SERVICE_CATEGORIES_OPTIONS.map((value) => value.toUpperCase())),
    [],
  );

  const existingCustomCategory = useMemo(() => {
    // Anything outside the legacy enum options counts as a custom category.
    // This supports previously-saved human labels (e.g. "Cleaning & Maintenance") too.
    return serviceCategories.find((value) => !normalizedKnownOptions.has(String(value).toUpperCase())) || '';
  }, [normalizedKnownOptions, serviceCategories]);

  const isOtherSelected = useMemo(() => {
    const hasOtherLegacy = serviceCategories.some((value) => String(value).toUpperCase() === 'OTHER');
    return hasOtherLegacy || !!existingCustomCategory;
  }, [existingCustomCategory, serviceCategories]);

  useEffect(() => {
    setCustomServiceCategory(existingCustomCategory || '');
  }, [existingCustomCategory]);

  const handleMultiSelectChange = (field: keyof SettingsFormData, selectedValue: string) => {
    const currentValues = (formData[field] as string[] || []) as Array<SwissCanton | SupportedLanguage | string>;
    let newValues: Array<SwissCanton | SupportedLanguage | string>;
    if (field === 'regionsServed') {
      newValues = toggleMultiSelectWithAll(currentValues as string[], selectedValue);
    } else if (currentValues.includes(selectedValue as any)) {
      newValues = currentValues.filter(v => v !== selectedValue);
    } else {
      newValues = [...currentValues, selectedValue as any];
    }

    // If the user turns off OTHER, also clear any existing custom category value.
    if (field === 'serviceCategories' && String(selectedValue).toUpperCase() === 'OTHER') {
      const turningOffOther = currentValues.some((v) => String(v).toUpperCase() === 'OTHER');
      if (turningOffOther) {
        newValues = newValues.filter((v) => normalizedKnownOptions.has(String(v).toUpperCase()));
        setCustomServiceCategory('');
      }
    }
    onChange(field, newValues);
  };

  const translatedLanguageOptions = SUPPORTED_LANGUAGES_OPTIONS_BASE.map(opt => ({...opt, label: t(opt.labelKey)}));

  const logoUrl = formData.logoUrl || currentUser?.orgLogoUrl || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.companyName || 'Service Provider')}&background=2DD4BF&color=ffffff&size=128&rounded=true`;
  
  const coverImageUrl = formData.coverImageUrl || currentUser?.orgCoverImageUrl || 
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80';

  const handleLogoChange = (url: string, assetId?: string) => {
    onChange('logoUrl', url);
    onChange('logoAssetId', assetId ?? '');
  };

  const handleCoverChange = (url: string, assetId?: string) => {
    onChange('coverImageUrl', url);
    onChange('coverAssetId', assetId ?? '');
  };

  return (
    <div className="space-y-6">
      {/* Cover Image Section - Facebook-like */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <CoverImageSection
          coverImageUrl={coverImageUrl}
          onCoverChange={handleCoverChange}
          assetKind="COVER_IMAGE"
          cropPreset="COVER"
        />
        
        {/* Profile Picture Overlay - Facebook style */}
        <div className="relative px-6 pb-6">
          <div className="flex items-end -mt-16 mb-4">
            <AvatarSection
              avatarUrl={logoUrl}
              onAvatarChange={handleLogoChange}
              size="xl"
              variant="logo"
              assetKind="LOGO"
              cropPreset="LOGO"
            />
            <div className="ml-4 mb-2 flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {formData.companyName || t('settings:companyProfile.serviceProvider', 'Service Provider')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('settings:companyProfile.serviceProvider', 'Service Provider')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Information Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BuildingOfficeIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:companyProfile.basicInfo', 'Basic Information')}
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              {t('common:settingsCompanyProfile.companyName', 'Organization Name')} <span className="text-swiss-coral">*</span>
            </label>
            <input
              type="text"
              id="companyName"
              value={formData.companyName || ''}
              onChange={(e) => onChange('companyName', e.target.value)}
              className={STANDARD_INPUT_FIELD}
              required
              placeholder={t('settings:companyProfile.companyNamePlaceholder', 'Enter your organization name')}
            />
          </div>

          <div>
            <label htmlFor="aboutText" className="block text-sm font-medium text-gray-700 mb-1">
              {t('common:settingsCompanyProfile.aboutText', 'Description / About')}
            </label>
            <textarea
              id="aboutText"
              value={formData.aboutText || formData.description || ''}
              onChange={(e) => onChange('aboutText', e.target.value)}
              rows={5}
              maxLength={1000}
              className={STANDARD_INPUT_FIELD}
              placeholder={t('settings:companyProfile.descriptionPlaceholder', 'Describe your organization...')}
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {(formData.aboutText || formData.description || '').length} / 1000
            </p>
          </div>

          <div>
            <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700 mb-1">
              {t('common:settingsCompanyProfile.vatNumber', 'VAT Number')}
            </label>
            <input
              type="text"
              id="vatNumber"
              value={formData.vatNumber || ''}
              onChange={(e) => onChange('vatNumber', e.target.value)}
              className={STANDARD_INPUT_FIELD}
              placeholder={t('common:placeholders.vatNumber')}
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <ContactDetailsSection formData={formData} onChange={onChange} />

      {/* Location Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPinIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:companyProfile.location', 'Location')}
        </h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('common:settingsCompanyProfile.regionsServed', 'Regions Served (Cantons)')}
            </label>
            <p className="text-xs text-gray-500 mb-3">{t('common:settingsCompanyProfile.cantonsHelpText', 'Select all cantons where your organization operates')}</p>
            <div className="flex flex-wrap gap-2">
              {SWISS_CANTONS_WITH_ALL.map(canton => (
                <button
                  key={canton}
                  type="button"
                  onClick={() => handleMultiSelectChange('regionsServed', canton)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                    (formData.regionsServed || []).includes(canton)
                      ? 'bg-swiss-mint text-white border-swiss-mint'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                  }`}
                >
                  {canton === ALL_REGIONS_OPTION ? t('common:filters.all', 'All') : canton}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('common:settingsCompanyProfile.languagesSpoken', 'Languages Spoken')}
            </label>
            <p className="text-xs text-gray-500 mb-3">{t('common:settingsCompanyProfile.languagesHelpText', 'Select all languages your organization supports')}</p>
            <div className="flex flex-wrap gap-2">
              {translatedLanguageOptions.map(lang => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => handleMultiSelectChange('languagesSpoken', lang.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                    (formData.languagesSpoken || []).includes(lang.value)
                      ? 'bg-swiss-mint text-white border-swiss-mint'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Service Provider-specific Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BriefcaseIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:companyProfile.serviceProviderInfo', 'Service Provider Information')}
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings:companyProfile.serviceType', 'Service Type')}
            </label>
            <input
              type="text"
              id="serviceType"
              value={formData.serviceType || ''}
              onChange={(e) => onChange('serviceType', e.target.value)}
              className={STANDARD_INPUT_FIELD}
              placeholder={t('settings:companyProfile.serviceTypePlaceholder', 'e.g., IT Support, Cleaning Services')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings:companyProfile.serviceCategories', 'Service Categories')}
            </label>
            <p className="text-xs text-gray-500 mb-3">{t('settings:companyProfile.serviceCategoriesHint', 'Select all that apply')}</p>
            <div className="flex flex-wrap gap-2">
              {SERVICE_CATEGORIES_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleMultiSelectChange('serviceCategories', option)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                    (formData.serviceCategories || []).includes(option)
                      ? 'bg-swiss-mint text-white border-swiss-mint'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                  }`}
                >
                  {t(`common:serviceCategories.${option}`, option.replace(/_/g, ' '))}
                </button>
              ))}
            </div>

            {isOtherSelected && (
              <div className="mt-3">
                <label htmlFor="customServiceCategory" className="block text-xs font-medium text-gray-600 mb-1">
                  {t('settings:companyProfile.otherServiceCategoryLabel', 'Specify your service category')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="customServiceCategory"
                    type="text"
                    value={customServiceCategory}
                    onChange={(e) => setCustomServiceCategory(e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('settings:companyProfile.otherServiceCategoryPlaceholder', 'e.g., Catering, Landscaping')}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 text-sm font-medium rounded-md bg-swiss-mint text-white hover:bg-swiss-teal transition-colors"
                    onClick={() => {
                      const name = customServiceCategory.trim();
                      if (!name) return;

                      // Persist the custom category alongside OTHER.
                      // Keep legacy enum values (incl. OTHER) and avoid duplicates (case-insensitive).
                      const next = [...serviceCategories.filter((v) => normalizedKnownOptions.has(String(v).toUpperCase())), 'OTHER', name]
                        .map(String)
                        .filter((value, idx, arr) => arr.findIndex((v) => v.toLowerCase() === value.toLowerCase()) === idx);

                      onChange('serviceCategories', next);
                    }}
                  >
                    {t('common:buttons.add', 'Add')}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('settings:companyProfile.otherServiceCategoryHint', 'This will be added to your service categories.')}
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="deliveryType" className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings:companyProfile.deliveryType', 'Delivery Type')}
            </label>
            <select
              id="deliveryType"
              value={formData.deliveryType || ''}
              onChange={(e) => onChange('deliveryType', e.target.value)}
              className={STANDARD_INPUT_FIELD}
            >
              <option value="">{t('settings:companyProfile.selectDeliveryType', 'Select Delivery Type')}</option>
              {DELIVERY_TYPE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bookingLink" className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings:companyProfile.bookingLink', 'Booking Link')}
            </label>
            <input
              type="text"
              id="bookingLink"
              value={formData.bookingLink || ''}
              onChange={(e) => onChange('bookingLink', e.target.value)}
              className={STANDARD_INPUT_FIELD}
              placeholder={t('common:placeholders.url')}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('settings:companyProfile.bookingLinkHint', 'You can enter it without https://')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderProfileForm;
