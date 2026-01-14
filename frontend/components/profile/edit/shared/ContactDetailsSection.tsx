import React from 'react';
import { PhoneIcon } from '@heroicons/react/24/outline';
import { SettingsFormData } from '../../../../types';
import { STANDARD_INPUT_FIELD } from '../../../../constants';
import { useTranslation } from 'react-i18next';

interface ContactDetailsSectionProps {
  formData: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  showContactPerson?: boolean;
}

const ContactDetailsSection: React.FC<ContactDetailsSectionProps> = ({
  formData,
  onChange,
  showContactPerson = true,
}) => {
  const { t } = useTranslation(['common', 'settings']);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <PhoneIcon className="w-5 h-5 mr-2 text-swiss-mint" />
        {t('settings:companyProfile.contactInfo', 'Contact Information')}
      </h3>
      <div className="space-y-4">
        {showContactPerson && (
          <div>
            <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings:companyProfile.contactPerson', 'Contact Person')}
            </label>
            <input
              type="text"
              id="contactPerson"
              value={formData.contactPerson || ''}
              onChange={(e) => onChange('contactPerson', e.target.value)}
              className={STANDARD_INPUT_FIELD}
              placeholder={t('settings:companyProfile.contactPersonPlaceholder', 'Enter contact person name')}
            />
          </div>
        )}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings:companyProfile.phoneNumber', 'Phone Number')}
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={formData.phoneNumber || ''}
            onChange={(e) => onChange('phoneNumber', e.target.value)}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('common:placeholders.41xxxxxxxxx')}
          />
        </div>
        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings:companyProfile.contactEmail', 'Contact Email')}
          </label>
          <input
            type="email"
            id="contactEmail"
            value={formData.contactEmail || ''}
            onChange={(e) => onChange('contactEmail', e.target.value)}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('common:placeholders.email')}
          />
        </div>
        <div>
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings:companyProfile.website', 'Website')}
          </label>
          <input
            type="text"
            id="websiteUrl"
            value={formData.websiteUrl || ''}
            onChange={(e) => onChange('websiteUrl', e.target.value)}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('common:placeholders.url', 'www.example.com')}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('settings:companyProfile.websiteHint', 'You can enter it without https://')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailsSection;
