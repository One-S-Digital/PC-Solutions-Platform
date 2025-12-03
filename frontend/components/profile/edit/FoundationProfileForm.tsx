import React, { useState } from 'react';
import { SettingsFormData, SwissCanton, SupportedLanguage } from '../../../types';
import { STANDARD_INPUT_FIELD, SWISS_CANTONS } from '../../../constants';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../contexts/AppContext';
import CoverImageSection from './shared/CoverImageSection';
import ContactDetailsSection from './shared/ContactDetailsSection';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  AcademicCapIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';

const SUPPORTED_LANGUAGES_OPTIONS_BASE: { labelKey: string, value: SupportedLanguage }[] = [
  { labelKey: 'common:languageSwitcher.en', value: 'EN'},
  { labelKey: 'common:languageSwitcher.fr', value: 'FR'},
  { labelKey: 'common:languageSwitcher.de', value: 'DE'},
];

const PEDAGOGY_OPTIONS = [
  'Montessori',
  'Reggio Emilia',
  'Waldorf',
  'Play-based',
  'Academic-focused',
  'Bilingual',
  'Nature-based',
  'Inclusive',
  'Other'
];

interface FoundationProfileFormProps {
  formData: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
}

const FoundationProfileForm: React.FC<FoundationProfileFormProps> = ({ formData, onChange }) => {
  const { t } = useTranslation(['common', 'settings']);
  const { currentUser } = useAppContext();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleMultiSelectChange = (field: keyof SettingsFormData, selectedValue: string) => {
    const currentValues = (formData[field] as string[] || []) as Array<SwissCanton | SupportedLanguage | string>;
    let newValues: Array<SwissCanton | SupportedLanguage | string>;
    if (currentValues.includes(selectedValue as any)) {
      newValues = currentValues.filter(v => v !== selectedValue);
    } else {
      newValues = [...currentValues, selectedValue as any];
    }
    onChange(field, newValues);
  };

  const translatedLanguageOptions = SUPPORTED_LANGUAGES_OPTIONS_BASE.map(opt => ({...opt, label: t(opt.labelKey)}));

  const logoUrl = formData.logoUrl || currentUser?.orgLogoUrl || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.companyName || 'Organization')}&background=2DD4BF&color=ffffff&size=128&rounded=true`;
  
  const coverImageUrl = formData.coverImageUrl || currentUser?.orgCoverImageUrl || 
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80';

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    // TODO: Implement actual file upload
    setTimeout(() => {
      alert('Logo upload functionality will be implemented with file upload service');
      setUploadingLogo(false);
    }, 500);
  };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    // TODO: Implement actual file upload
    setTimeout(() => {
      alert('Cover image upload functionality will be implemented with file upload service');
      setUploadingCover(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Cover Image Section - Facebook-like */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <CoverImageSection
          coverImageUrl={coverImageUrl}
          onCoverChange={handleCoverUpload}
          uploading={uploadingCover}
        />
        
        {/* Profile Picture Overlay - Facebook style */}
        <div className="relative px-6 pb-6">
          <div className="flex items-end -mt-16 mb-4">
            <div className="relative group">
              <img
                src={logoUrl}
                alt={t('common:logo', 'Logo')}
                className="w-40 h-40 rounded-full border-4 border-white shadow-lg object-cover bg-white"
              />
              <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full cursor-pointer transition-opacity">
                <CameraIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                  disabled={uploadingLogo}
                  className="sr-only"
                />
              </label>
              {uploadingLogo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <div className="ml-4 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {formData.companyName || t('settings:companyProfile.organizationName', 'Organization Name')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('settings:companyProfile.foundation', 'Foundation / Daycare')}
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
              {SWISS_CANTONS.map(canton => (
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
                  {canton}
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

      {/* Foundation-specific Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AcademicCapIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:companyProfile.foundationInfo', 'Foundation Information')}
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings:companyProfile.capacity', 'Capacity (Number of Children)')}
            </label>
            <input
              type="number"
              id="capacity"
              min="0"
              value={formData.capacity || ''}
              onChange={(e) => onChange('capacity', e.target.value ? parseInt(e.target.value, 10) : 0)}
              className={STANDARD_INPUT_FIELD}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings:companyProfile.pedagogy', 'Pedagogical Approaches')}
            </label>
            <p className="text-xs text-gray-500 mb-3">{t('settings:companyProfile.pedagogyHint', 'Select all that apply')}</p>
            <div className="flex flex-wrap gap-2">
              {PEDAGOGY_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleMultiSelectChange('pedagogy', option)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                    (formData.pedagogy || []).includes(option)
                      ? 'bg-swiss-mint text-white border-swiss-mint'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoundationProfileForm;
