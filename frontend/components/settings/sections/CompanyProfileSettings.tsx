
import React from 'react';
import { SettingsFormData, UserRole, SwissCanton, SupportedLanguage } from '../../../types';
import { STANDARD_INPUT_FIELD, SWISS_CANTONS } from '../../../constants';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { 
  BuildingOfficeIcon, 
  PhotoIcon, 
  MapPinIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  GlobeAltIcon,
  ShoppingCartIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../contexts/AppContext';
import FileUploadZone from '../../ui/FileUploadZone';

interface CompanyProfileSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

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

const CompanyProfileSettings: React.FC<CompanyProfileSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation(['dashboard', 'common', 'settings']);
  const { currentUser } = useAppContext();
  
  const handleMultiSelectChange = (field: keyof SettingsFormData, selectedValue: string) => {
    const currentValues = (settings[field] as string[] || []) as Array<SwissCanton | SupportedLanguage | string>;
    let newValues: Array<SwissCanton | SupportedLanguage | string>;
    if (currentValues.includes(selectedValue as any)) {
      newValues = currentValues.filter(v => v !== selectedValue);
    } else {
      newValues = [...currentValues, selectedValue as any];
    }
    onChange(field, newValues);
  };

  const handleArrayFieldChange = (field: keyof SettingsFormData, value: string) => {
    const array = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    onChange(field, array);
  };

  const translatedLanguageOptions = SUPPORTED_LANGUAGES_OPTIONS_BASE.map(opt => ({...opt, label: t(opt.labelKey)}));

  const isFoundation = userRole === UserRole.FOUNDATION;
  const isSupplier = userRole === UserRole.PRODUCT_SUPPLIER;
  const isServiceProvider = userRole === UserRole.SERVICE_PROVIDER;

  const logoUrl = settings.logoUrl || currentUser?.orgLogoUrl || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(settings.companyName || 'Organization')}&background=2DD4BF&color=ffffff&size=128&rounded=true`;
  
  const coverImageUrl = settings.coverImageUrl || currentUser?.orgCoverImageUrl || 
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80';

  return (
    <SettingsSectionWrapper title={t('settings:page.companyProfile', 'Organization Profile')} icon={BuildingOfficeIcon}>
      <div className="space-y-8">
        {/* Logo and Cover Image Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PhotoIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:companyProfile.images', 'Logo & Cover Image')}
          </h3>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings:companyProfile.logo', 'Logo')}
              </label>
              <div className="flex items-center gap-4">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-24 h-24 rounded-lg border-2 border-gray-200 object-cover"
                />
                <div className="flex-1">
                    <FileUploadZone
                      label={t('settings:companyProfile.uploadLogo', 'Upload Logo')}
                      acceptedMimeTypes="image/*"
                      maxFileSizeMB={2}
                      assetKind="LOGO"
                      autoUpload
                      onUploadSuccess={(asset) => onChange('logoUrl', asset.url)}
                    />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('settings:companyProfile.logoHint', 'JPG, PNG or GIF. Max size 2MB')}
                  </p>
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings:companyProfile.coverImage', 'Cover Image')}
              </label>
              <div className="flex items-center gap-4">
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="w-32 h-20 rounded-lg border-2 border-gray-200 object-cover"
                />
                <div className="flex-1">
                    <FileUploadZone
                      label={t('settings:companyProfile.uploadCoverImage', 'Upload Cover Image')}
                      acceptedMimeTypes="image/*"
                      maxFileSizeMB={5}
                      assetKind="COVER_IMAGE"
                      autoUpload
                      onUploadSuccess={(asset) => onChange('coverImageUrl', asset.url)}
                    />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('settings:companyProfile.coverHint', 'Recommended: 1600x400px')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr />

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BuildingOfficeIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:companyProfile.basicInfo', 'Basic Information')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label htmlFor="companyName" className="form-label md:pt-2">
              {t('common:settingsCompanyProfile.companyName', 'Organization Name')} <span className="text-swiss-coral">*</span>
            </label>
            <div className="form-input-container">
              <input
                type="text"
                id="companyName"
                value={settings.companyName || ''}
                onChange={(e) => onChange('companyName', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:companyProfile.companyNamePlaceholder', 'Enter your organization name')}
                required
              />
            </div>

            <label htmlFor="aboutText" className="form-label md:pt-2">
              {t('common:settingsCompanyProfile.aboutText', 'Description / About')}
            </label>
            <div className="form-input-container">
              <textarea
                id="aboutText"
                value={settings.aboutText || settings.description || ''}
                onChange={(e) => onChange('aboutText', e.target.value)}
                rows={5}
                maxLength={1000}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:companyProfile.descriptionPlaceholder', 'Describe your organization...')}
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {(settings.aboutText || settings.description || '').length} / 1000
              </p>
            </div>

            <label htmlFor="vatNumber" className="form-label md:pt-2">
              {t('common:settingsCompanyProfile.vatNumber', 'VAT Number')}
            </label>
            <div className="form-input-container">
              <input
                type="text"
                id="vatNumber"
                value={settings.vatNumber || ''}
                onChange={(e) => onChange('vatNumber', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="CHE-123.456.789"
              />
            </div>
          </div>
        </div>

        <hr />

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PhoneIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:companyProfile.contactInfo', 'Contact Information')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label htmlFor="contactPerson" className="form-label md:pt-2">
              {t('settings:companyProfile.contactPerson', 'Contact Person')}
            </label>
            <div className="form-input-container">
              <input
                type="text"
                id="contactPerson"
                value={settings.contactPerson || ''}
                onChange={(e) => onChange('contactPerson', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:companyProfile.contactPersonPlaceholder', 'Enter contact person name')}
              />
            </div>

            <label htmlFor="phoneNumber" className="form-label md:pt-2">
              {t('settings:companyProfile.phoneNumber', 'Phone Number')}
            </label>
            <div className="form-input-container">
              <input
                type="tel"
                id="phoneNumber"
                value={settings.phoneNumber || ''}
                onChange={(e) => onChange('phoneNumber', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="+41 XX XXX XX XX"
              />
            </div>

            <label htmlFor="contactEmail" className="form-label md:pt-2">
              {t('settings:companyProfile.contactEmail', 'Contact Email')}
            </label>
            <div className="form-input-container">
              <input
                type="email"
                id="contactEmail"
                value={settings.contactEmail || currentUser?.email || ''}
                onChange={(e) => onChange('contactEmail', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:companyProfile.contactEmailPlaceholder', 'Enter contact email address')}
              />
            </div>
          </div>
        </div>

        <hr />

        {/* Location */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MapPinIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:companyProfile.location', 'Location')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label className="form-label">
              {t('common:settingsCompanyProfile.regionsServed', 'Regions Served (Cantons)')}
            </label>
            <div className="form-input-container">
              <p className="text-xs text-gray-500 mb-2">{t('common:settingsCompanyProfile.cantonsHelpText', 'Select all cantons where your organization operates')}</p>
              <div className="flex flex-wrap gap-2">
                {SWISS_CANTONS.map(canton => (
                  <button
                    key={canton}
                    type="button"
                    onClick={() => handleMultiSelectChange('regionsServed', canton)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                      (settings.regionsServed || []).includes(canton)
                        ? 'bg-swiss-mint text-white border-swiss-mint'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                    }`}
                  >
                    {canton}
                  </button>
                ))}
              </div>
            </div>

            <label className="form-label">
              {t('common:settingsCompanyProfile.languagesSpoken', 'Languages Spoken')}
            </label>
            <div className="form-input-container">
              <p className="text-xs text-gray-500 mb-2">{t('common:settingsCompanyProfile.languagesHelpText', 'Select all languages your organization supports')}</p>
              <div className="flex flex-wrap gap-2">
                {translatedLanguageOptions.map(lang => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => handleMultiSelectChange('languagesSpoken', lang.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                      (settings.languagesSpoken || []).includes(lang.value)
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

        {/* Foundation-specific fields */}
        {isFoundation && (
          <>
            <hr />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <AcademicCapIcon className="w-5 h-5 mr-2 text-swiss-mint" />
                {t('settings:companyProfile.foundationInfo', 'Foundation Information')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
                <label htmlFor="capacity" className="form-label md:pt-2">
                  {t('settings:companyProfile.capacity', 'Capacity (Number of Children)')}
                </label>
                <div className="form-input-container">
                  <input
                    type="number"
                    id="capacity"
                    min="0"
                    value={settings.capacity || ''}
                    onChange={(e) => onChange('capacity', e.target.value ? parseInt(e.target.value) : 0)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('settings:companyProfile.capacityPlaceholder', 'Enter number of children')}
                  />
                </div>

                <label className="form-label">
                  {t('settings:companyProfile.pedagogy', 'Pedagogical Approaches')}
                </label>
                <div className="form-input-container">
                  <p className="text-xs text-gray-500 mb-2">{t('settings:companyProfile.pedagogyHint', 'Select all that apply')}</p>
                  <div className="flex flex-wrap gap-2">
                    {PEDAGOGY_OPTIONS.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleMultiSelectChange('pedagogy', option)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                          (settings.pedagogy || []).includes(option)
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
          </>
        )}

        {/* Supplier-specific fields */}
        {isSupplier && (
          <>
            <hr />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ShoppingCartIcon className="w-5 h-5 mr-2 text-swiss-mint" />
                {t('settings:companyProfile.supplierInfo', 'Supplier Information')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
                <label htmlFor="productCategory" className="form-label md:pt-2">
                  {t('settings:companyProfile.productCategory', 'Product Category')}
                </label>
                <div className="form-input-container">
                  <input
                    type="text"
                    id="productCategory"
                    value={settings.productCategory || ''}
                    onChange={(e) => onChange('productCategory', e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('settings:companyProfile.productCategoryPlaceholder', 'e.g., Educational Toys, Furniture')}
                  />
                </div>

                <label htmlFor="minimumOrderQuantity" className="form-label md:pt-2">
                  {t('settings:companyProfile.minimumOrderQuantity', 'Minimum Order Quantity')}
                </label>
                <div className="form-input-container">
                  <input
                    type="number"
                    id="minimumOrderQuantity"
                    min="0"
                    value={settings.minimumOrderQuantity || ''}
                    onChange={(e) => onChange('minimumOrderQuantity', e.target.value ? parseInt(e.target.value) : 0)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('settings:companyProfile.minimumOrderQuantityPlaceholder', 'Enter minimum order quantity')}
                  />
                </div>

                <label htmlFor="directOrderLink" className="form-label md:pt-2">
                  {t('settings:companyProfile.directOrderLink', 'Direct Order Link')}
                </label>
                <div className="form-input-container">
                  <input
                    type="url"
                    id="directOrderLink"
                    value={settings.directOrderLink || ''}
                    onChange={(e) => onChange('directOrderLink', e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder="https://..."
                  />
                </div>

                <label htmlFor="catalogUrl" className="form-label md:pt-2">
                  {t('settings:companyProfile.catalogUrl', 'Catalog URL')}
                </label>
                <div className="form-input-container">
                  <input
                    type="url"
                    id="catalogUrl"
                    value={settings.catalogUrl || ''}
                    onChange={(e) => onChange('catalogUrl', e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Service Provider-specific fields */}
        {isServiceProvider && (
          <>
            <hr />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <BriefcaseIcon className="w-5 h-5 mr-2 text-swiss-mint" />
                {t('settings:companyProfile.serviceProviderInfo', 'Service Provider Information')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
                <label htmlFor="serviceType" className="form-label md:pt-2">
                  {t('settings:companyProfile.serviceType', 'Service Type')}
                </label>
                <div className="form-input-container">
                  <input
                    type="text"
                    id="serviceType"
                    value={settings.serviceType || ''}
                    onChange={(e) => onChange('serviceType', e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('settings:companyProfile.serviceTypePlaceholder', 'e.g., IT Support, Cleaning Services')}
                  />
                </div>

                <label className="form-label">
                  {t('settings:companyProfile.serviceCategories', 'Service Categories')}
                </label>
                <div className="form-input-container">
                  <p className="text-xs text-gray-500 mb-2">{t('settings:companyProfile.serviceCategoriesHint', 'Select all that apply')}</p>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_CATEGORIES_OPTIONS.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleMultiSelectChange('serviceCategories', option)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                          (settings.serviceCategories || []).includes(option)
                            ? 'bg-swiss-mint text-white border-swiss-mint'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                        }`}
                      >
                        {option.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <label htmlFor="deliveryType" className="form-label md:pt-2">
                  {t('settings:companyProfile.deliveryType', 'Delivery Type')}
                </label>
                <div className="form-input-container">
                  <select
                    id="deliveryType"
                    value={settings.deliveryType || ''}
                    onChange={(e) => onChange('deliveryType', e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                  >
                    <option value="">{t('settings:companyProfile.selectDeliveryType', 'Select Delivery Type')}</option>
                    {DELIVERY_TYPE_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {!settings.deliveryType && (
                    <p className="text-xs text-gray-500 mt-1">{t('settings:companyProfile.deliveryTypeHint', 'Choose how you deliver your services')}</p>
                  )}
                </div>

                <label htmlFor="bookingLink" className="form-label md:pt-2">
                  {t('settings:companyProfile.bookingLink', 'Booking Link')}
                </label>
                <div className="form-input-container">
                  <input
                    type="url"
                    id="bookingLink"
                    value={settings.bookingLink || ''}
                    onChange={(e) => onChange('bookingLink', e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SettingsSectionWrapper>
  );
};

export default CompanyProfileSettings;
