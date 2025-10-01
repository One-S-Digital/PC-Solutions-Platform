import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { MOCK_ORGANIZATIONS, MOCK_FOUNDATION_ORG_KINDERWELT, STANDARD_INPUT_FIELD } from '../../constants'; // Use MOCK_ORGANIZATIONS for lookup, Import STANDARD_INPUT_FIELD
import { Organization } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useTranslation } from 'react-i18next';

const OrganizationProfileForm: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAppContext();
  const [profile, setProfile] = useState<Partial<Organization>>({
    capacity: undefined,
    pedagogy: [],
    languagesSpoken: [],
  });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.orgId) {
      // Find the organization from MOCK_ORGANIZATIONS or use MOCK_FOUNDATION_ORG_KINDERWELT if it matches
      const orgData = MOCK_ORGANIZATIONS.find(org => org.id === currentUser.orgId) || 
                      (currentUser.orgId === MOCK_FOUNDATION_ORG_KINDERWELT.id ? MOCK_FOUNDATION_ORG_KINDERWELT : undefined);
      if (orgData) {
        setProfile({
          capacity: orgData.capacity || undefined,
          pedagogy: orgData.pedagogy || [],
          languagesSpoken: orgData.languagesSpoken || [],
        });
      }
    }
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "pedagogy" || name === "languagesSpoken") {
      setProfile(prev => ({ ...prev, [name]: value.split(',').map(item => item.trim()).filter(Boolean) }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
    setIsSaved(false);
  };
  
  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile(prev => ({ ...prev, capacity: e.target.value === '' ? undefined : parseInt(e.target.value, 10) }));
    setIsSaved(false);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, send this data to the backend
    console.log('Saving organization profile:', { orgId: currentUser?.orgId, ...profile });
    setIsSaved(true);
    // Update MOCK_ORGANIZATIONS or MOCK_FOUNDATION_ORG_KINDERWELT for demo persistence if needed
  };

  if (!currentUser || currentUser.role !== 'Foundation (Daycare)') {
    return <p>{t('organizationProfileForm.accessDenied')}</p>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-swiss-charcoal mb-1">{t('organizationProfileForm.title')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('organizationProfileForm.subtitle')}</p>
      
      {isSaved && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
          {t('organizationProfileForm.saveSuccess')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
            {t('organizationProfileForm.labels.capacity')}
          </label>
          <input
            type="number"
            name="capacity"
            id="capacity"
            value={profile.capacity === undefined ? '' : profile.capacity}
            onChange={handleCapacityChange}
            className={`${STANDARD_INPUT_FIELD} max-w-xs`}
            min="0"
          />
        </div>

        <div>
          <label htmlFor="pedagogy" className="block text-sm font-medium text-gray-700 mb-1">
            {t('organizationProfileForm.labels.pedagogy')}
          </label>
          <input
            type="text"
            name="pedagogy"
            id="pedagogy"
            value={(profile.pedagogy || []).join(', ')}
            onChange={handleChange}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('organizationProfileForm.placeholders.pedagogy')}
          />
          <p className="text-xs text-gray-500 mt-1">{t('organizationProfileForm.helpText.commaSeparated')}</p>
        </div>

        <div>
          <label htmlFor="languagesSpoken" className="block text-sm font-medium text-gray-700 mb-1">
            {t('organizationProfileForm.labels.languages')}
          </label>
          <input
            type="text"
            name="languagesSpoken"
            id="languagesSpoken"
            value={(profile.languagesSpoken || []).join(', ')}
            onChange={handleChange}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('organizationProfileForm.placeholders.languages')}
          />
          <p className="text-xs text-gray-500 mt-1">{t('organizationProfileForm.helpText.commaSeparated')}</p>
        </div>
        
        {/* Add more fields as needed: Opening Hours, specific age groups etc. */}

        <div className="pt-2">
          <Button type="submit" variant="primary">
            {t('organizationProfileForm.saveButton')}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default OrganizationProfileForm;