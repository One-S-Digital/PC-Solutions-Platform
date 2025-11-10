
import React from 'react';
import { SettingsFormData, UserRole, SwissCanton, SupportedLanguage } from '../../../types';
import { STANDARD_INPUT_FIELD, SWISS_CANTONS } from '../../../constants';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import FileUploadZone from '../../ui/FileUploadZone';

interface CompanyProfileSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const SUPPORTED_LANGUAGES_OPTIONS_BASE: { labelKey: string, value: SupportedLanguage }[] = [
    { labelKey: 'languageSwitcher.en', value: 'EN'},
    { labelKey: 'languageSwitcher.fr', value: 'FR'},
    { labelKey: 'languageSwitcher.de', value: 'DE'},
];

const CompanyProfileSettings: React.FC<CompanyProfileSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  
  const handleMultiSelectChange = (field: keyof SettingsFormData, selectedValue: string) => {
    const currentValues = (settings[field] as string[] || []) as Array<SwissCanton | SupportedLanguage>;
    let newValues: Array<SwissCanton | SupportedLanguage>;
    if (currentValues.includes(selectedValue as any)) {
      newValues = currentValues.filter(v => v !== selectedValue);
    } else {
      newValues = [...currentValues, selectedValue as any];
    }
    onChange(field, newValues);
  };

  const translatedLanguageOptions = SUPPORTED_LANGUAGES_OPTIONS_BASE.map(opt => ({...opt, label: t(opt.labelKey)}));


  return (
    <SettingsSectionWrapper title={t('settings:page.companyProfile')} icon={BuildingOfficeIcon}>
      <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
        {/* Company Name */}
        <label htmlFor="companyName" className="form-label md:pt-2">{t('settingsCompanyProfile.companyName')} <span className="text-swiss-coral">*</span></label>
        <div className="form-input-container">
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={settings.companyName || ''}
            onChange={(e) => onChange('companyName', e.target.value)}
            className={STANDARD_INPUT_FIELD}
            required
          />
        </div>

        {/* Logo Upload */}
        <label className="form-label">{t('settingsCompanyProfile.logo')}</label>
        <div className="form-input-container">
          {settings.logoUrl && (
            <div className="mb-3">
              <img src={settings.logoUrl} alt="Company Logo" className="w-24 h-24 object-cover rounded-lg border" />
            </div>
          )}
          <FileUploadZone 
            label={t('settingsCompanyProfile.uploadLogo')}
            acceptedMimeTypes="image/*"
            maxFileSizeMB={2}
            assetKind="LOGO"
            onUploadSuccess={(asset) => onChange('logoUrl', asset.url)}
            autoUpload={true}
          />
        </div>
        
        {/* Cover Image Upload */}
        <label className="form-label">{t('settingsCompanyProfile.coverImage')}</label>
        <div className="form-input-container">
          {settings.coverImageUrl && (
            <div className="mb-3">
              <img src={settings.coverImageUrl} alt="Cover Image" className="w-full h-32 object-cover rounded-lg border" />
            </div>
          )}
          <FileUploadZone 
            label={t('settingsCompanyProfile.uploadCoverImage')}
            acceptedMimeTypes="image/*"
            maxFileSizeMB={5}
            assetKind="COVER_IMAGE"
            onUploadSuccess={(asset) => onChange('coverImageUrl', asset.url)}
            autoUpload={true}
          />
        </div>

        {/* About Text */}
        <label htmlFor="aboutText" className="form-label md:pt-2">{t('settingsCompanyProfile.aboutText')}</label>
        <div className="form-input-container">
          <textarea
            id="aboutText"
            name="aboutText"
            value={settings.aboutText || ''}
            onChange={(e) => onChange('aboutText', e.target.value)}
            rows={5}
            maxLength={500}
            className={STANDARD_INPUT_FIELD}
          />
          <p className="text-xs text-gray-400 text-right mt-1">{t('settingsCompanyProfile.aboutTextLength', { length: settings.aboutText?.length || 0 })}</p>
        </div>

        {/* VAT Number */}
        <label htmlFor="vatNumber" className="form-label md:pt-2">{t('settingsCompanyProfile.vatNumber')}</label>
        <div className="form-input-container">
          <input
            type="text"
            id="vatNumber"
            name="vatNumber"
            value={settings.vatNumber || ''}
            onChange={(e) => onChange('vatNumber', e.target.value)}
            className={STANDARD_INPUT_FIELD}
          />
        </div>

        {/* Regions Served (Multi-select pills) */}
        <label className="form-label">{t('settingsCompanyProfile.regionsServed')}</label>
        <div className="form-input-container">
            {/* <ChipInput selectedChips={settings.regionsServed || []} availableOptions={SWISS_CANTONS} onChange={(newChips) => onChange('regionsServed', newChips)} placeholder={t('settingsCompanyProfile.selectCanton')} /> */}
            <p className="text-xs text-gray-500 mb-2">{t('settingsCompanyProfile.cantonsHelpText')}</p>
            <div className="flex flex-wrap gap-2">
                {SWISS_CANTONS.map(canton => (
                    <button
                        key={canton}
                        type="button"
                        onClick={() => handleMultiSelectChange('regionsServed', canton)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${ (settings.regionsServed || []).includes(canton) ? 'bg-swiss-mint text-white border-swiss-mint' : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'}`}
                    >
                       {canton}
                    </button>
                ))}
            </div>
        </div>

        {/* Languages Spoken */}
        <label className="form-label">{t('settingsCompanyProfile.languagesSpoken')}</label>
        <div className="form-input-container">
            {/* <ChipInput selectedChips={settings.languagesSpoken || []} availableOptions={['EN', 'FR', 'DE']} onChange={(newChips) => onChange('languagesSpoken', newChips)} placeholder={t('settingsCompanyProfile.selectLanguage')} /> */}
             <p className="text-xs text-gray-500 mb-2">{t('settingsCompanyProfile.languagesHelpText')}</p>
             <div className="flex flex-wrap gap-2">
                {translatedLanguageOptions.map(lang => (
                    <button
                        key={lang.value}
                        type="button"
                        onClick={() => handleMultiSelectChange('languagesSpoken', lang.value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${ (settings.languagesSpoken || []).includes(lang.value) ? 'bg-swiss-mint text-white border-swiss-mint' : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'}`}
                    >
                       {lang.label}
                    </button>
                ))}
            </div>
        </div>
      </div>
    </SettingsSectionWrapper>
  );
};

export default CompanyProfileSettings;
