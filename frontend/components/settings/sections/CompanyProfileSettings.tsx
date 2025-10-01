
import React from 'react';
import { SettingsFormData, UserRole, SwissCanton, SupportedLanguage } from '../../../types';
import { STANDARD_INPUT_FIELD, SWISS_CANTONS } from '../../../constants';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
// Import new UI components when ready
// import ChipInput from '../../ui/ChipInput';
// import FileUploadZone from '../../ui/FileUploadZone';

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
  const { t } = useTranslation();
  
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
    <SettingsSectionWrapper title={t('settingsPage.companyProfile')} icon={BuildingOfficeIcon}>
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

        {/* Logo Upload - Placeholder */}
        <label className="form-label">{t('settingsCompanyProfile.logo')}</label>
        <div className="form-input-container">
          {/* <FileUploadZone onFileUpload={(file) => onChange('logoUrl', 'mock-logo-url.png')} /> Placeholder */}
           <input type="file" id="logoUrl" name="logoUrl" className={`${STANDARD_INPUT_FIELD} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-button file:border-0 file:text-sm file:font-semibold file:bg-swiss-teal/10 file:text-swiss-teal hover:file:bg-swiss-teal/20`} />
        </div>
        
        {/* Cover Image Upload - Placeholder */}
        <label className="form-label">{t('settingsCompanyProfile.coverImage')}</label>
        <div className="form-input-container">
          {/* <FileUploadZone onFileUpload={(file) => onChange('coverImageUrl', 'mock-cover-url.png')} /> Placeholder */}
          <input type="file" id="coverImageUrl" name="coverImageUrl" className={`${STANDARD_INPUT_FIELD} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-button file:border-0 file:text-sm file:font-semibold file:bg-swiss-teal/10 file:text-swiss-teal hover:file:bg-swiss-teal/20`} />
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
