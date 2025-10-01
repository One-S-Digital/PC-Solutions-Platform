import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { AdjustmentsHorizontalIcon, GlobeAltIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const AdminPlatformSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { platformSettings, setPlatformSettings } = useAppContext();
  const [formData, setFormData] = useState(platformSettings);
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPlatformSettings(formData);
    setIsSaved(true);
    // In a real app, this would be an API call.
    console.log("Saving platform settings:", formData);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
        <AdjustmentsHorizontalIcon className="w-8 h-8 mr-3 text-swiss-mint" />
        {t('adminPlatformSettings.title')}
      </h1>

      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          {isSaved && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
              {t('organizationProfileForm.saveSuccess')}
            </div>
          )}
          
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
            <GlobeAltIcon className="w-6 h-6 mr-2 text-swiss-teal" />
            {t('adminPlatformSettings.general.title')}
          </h2>
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="platformName" className="block text-sm font-medium text-gray-700 mb-1">{t('adminPlatformSettings.general.nameLabel')}</label>
              <input
                type="text"
                id="platformName"
                name="platformName"
                value={formData.platformName}
                onChange={handleChange}
                className={STANDARD_INPUT_FIELD}
              />
            </div>
            <div>
              <label htmlFor="metadataDescription" className="block text-sm font-medium text-gray-700 mb-1">{t('adminPlatformSettings.general.descriptionLabel')}</label>
              <textarea
                id="metadataDescription"
                name="metadataDescription"
                value={formData.metadataDescription}
                onChange={handleChange}
                rows={3}
                className={STANDARD_INPUT_FIELD}
              />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
            <PhotoIcon className="w-6 h-6 mr-2 text-swiss-teal" />
            {t('adminPlatformSettings.branding.title')}
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">{t('adminPlatformSettings.branding.logoLabel')}</label>
              <input type="file" id="logoUrl" className={`${STANDARD_INPUT_FIELD} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-button file:border-0 file:text-sm file:font-semibold file:bg-swiss-teal/10 file:text-swiss-teal hover:file:bg-swiss-teal/20`} />
            </div>
            <div>
              <label htmlFor="faviconUrl" className="block text-sm font-medium text-gray-700 mb-1">{t('adminPlatformSettings.branding.faviconLabel')}</label>
              <input type="file" id="faviconUrl" className={`${STANDARD_INPUT_FIELD} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-button file:border-0 file:text-sm file:font-semibold file:bg-swiss-teal/10 file:text-swiss-teal hover:file:bg-swiss-teal/20`} />
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button type="submit" variant="primary">{t('buttons.saveChanges')}</Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default AdminPlatformSettingsPage;