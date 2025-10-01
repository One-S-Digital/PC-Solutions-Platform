
import React from 'react';
import Card from '../../components/ui/Card';
import OrganizationProfileForm from '../../components/settings/OrganizationProfileForm'; // Main form
import Button from '../../components/ui/Button';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { BuildingOfficeIcon, PhotoIcon, GlobeAltIcon, CalendarDaysIcon, UserPlusIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

// This page can extend or wrap the OrganizationProfileForm from settings,
// or be a more public-facing version. For now, let's assume it's an extended settings page.
const FoundationOrganisationProfilePage: React.FC = () => {
  const { t } = useTranslation();
  // Mock state for additional fields not in OrganizationProfileForm
  const [additionalProfile, setAdditionalProfile] = React.useState({
    pedagogyStatement: t('foundationOrganisationProfilePage.mock.pedagogyStatement'),
    openingHours: "Mon-Fri: 07:30 - 18:30",
    acceptingLeads: true,
    calComLink: "https://cal.com/kinderwelt-visits",
    socialMediaLink: "https://facebook.com/kinderwelt",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        setAdditionalProfile(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
        setAdditionalProfile(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving additional profile info:", additionalProfile);
    alert(t('foundationOrganisationProfilePage.alert.infoSaved'));
  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
        <BuildingOfficeIcon className="w-8 h-8 mr-3 text-swiss-mint" />
        {t('foundationOrganisationProfilePage.title')}
      </h1>
      
      {/* Re-use the existing form for core details like capacity, pedagogy, languages */}
      <OrganizationProfileForm />

      {/* Additional fields specific to PDF spec for this page */}
      <Card className="p-6 mt-6">
         <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
                <PhotoIcon className="w-6 h-6 mr-2 text-swiss-teal" />
                {t('foundationOrganisationProfilePage.sections.branding.title')}
            </h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="orgLogoUpload" className="block text-sm font-medium text-gray-700 mb-1">{t('foundationOrganisationProfilePage.sections.branding.logoLabel')}</label>
                    <input type="file" id="orgLogoUpload" className={`${STANDARD_INPUT_FIELD} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-button file:border-0 file:text-sm file:font-semibold file:bg-swiss-teal/10 file:text-swiss-teal hover:file:bg-swiss-teal/20`} />
                </div>
                <div>
                    <label htmlFor="orgCoverImageUpload" className="block text-sm font-medium text-gray-700 mb-1">{t('foundationOrganisationProfilePage.sections.branding.coverImageLabel')}</label>
                    <input type="file" id="orgCoverImageUpload" className={`${STANDARD_INPUT_FIELD} p-0 file:mr-4 file:py-2 file:px-4 file:rounded-l-button file:border-0 file:text-sm file:font-semibold file:bg-swiss-teal/10 file:text-swiss-teal hover:file:bg-swiss-teal/20`} />
                </div>
                <div>
                    <label htmlFor="pedagogyStatement" className="block text-sm font-medium text-gray-700 mb-1">{t('foundationOrganisationProfilePage.sections.branding.pedagogyStatementLabel')}</label>
                    <textarea name="pedagogyStatement" id="pedagogyStatement" value={additionalProfile.pedagogyStatement} onChange={handleChange} rows={4} className={STANDARD_INPUT_FIELD} placeholder={t('foundationOrganisationProfilePage.sections.branding.pedagogyStatementPlaceholder')}/>
                </div>
            </div>

            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 mt-6 flex items-center">
                <CalendarDaysIcon className="w-6 h-6 mr-2 text-swiss-teal" />
                {t('foundationOrganisationProfilePage.sections.operations.title')}
            </h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="orgOpeningHours" className="block text-sm font-medium text-gray-700 mb-1">{t('foundationOrganisationProfilePage.sections.operations.openingHoursLabel')}</label>
                    <input type="text" name="openingHours" id="orgOpeningHours" value={additionalProfile.openingHours} onChange={handleChange} className={STANDARD_INPUT_FIELD} placeholder={t('foundationOrganisationProfilePage.sections.operations.openingHoursPlaceholder')}/>
                </div>
                <div>
                    <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-1">{t('foundationOrganisationProfilePage.sections.operations.contactInfoLabel')}</label>
                    <input type="text" name="contactInfo" id="contactInfo" className={STANDARD_INPUT_FIELD} placeholder={t('foundationOrganisationProfilePage.sections.operations.contactInfoPlaceholder')}/>
                </div>
            </div>
            
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 mt-6 flex items-center">
                <LinkIcon className="w-6 h-6 mr-2 text-swiss-teal" />
                {t('foundationOrganisationProfilePage.sections.online.title')}
            </h2>
             <div className="space-y-4">
                <div>
                    <label htmlFor="calComLink" className="block text-sm font-medium text-gray-700 mb-1">{t('foundationOrganisationProfilePage.sections.online.bookingLinkLabel')}</label>
                    <input type="url" name="calComLink" id="calComLink" value={additionalProfile.calComLink} onChange={handleChange} className={STANDARD_INPUT_FIELD} placeholder={t('foundationOrganisationProfilePage.sections.online.bookingLinkPlaceholder')}/>
                </div>
                <div>
                    <label htmlFor="socialMediaLink" className="block text-sm font-medium text-gray-700 mb-1">{t('foundationOrganisationProfilePage.sections.online.socialMediaLinkLabel')}</label>
                    <input type="url" name="socialMediaLink" id="socialMediaLink" value={additionalProfile.socialMediaLink} onChange={handleChange} className={STANDARD_INPUT_FIELD} placeholder={t('foundationOrganisationProfilePage.sections.online.socialMediaLinkPlaceholder')}/>
                </div>
                 <div className="flex items-center">
                    <input type="checkbox" name="acceptingLeads" id="acceptingLeads" checked={additionalProfile.acceptingLeads} onChange={handleChange} className="h-4 w-4 text-swiss-mint border-gray-300 rounded focus:ring-swiss-mint" />
                    <label htmlFor="acceptingLeads" className="ml-2 block text-sm font-medium text-gray-700">{t('foundationOrganisationProfilePage.sections.online.acceptingLeadsLabel')}</label>
                </div>
            </div>
            
            <div className="pt-2">
                <Button type="submit" variant="primary">{t('foundationOrganisationProfilePage.saveButton')}</Button>
            </div>
        </form>
      </Card>
    </div>
  );
};

export default FoundationOrganisationProfilePage;
