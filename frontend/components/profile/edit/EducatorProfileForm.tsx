import React, { useEffect, useState } from 'react';
import { SettingsFormData, WorkExperienceItem, EducationItem, CertificationItem, DocumentItem } from '../../../types';
import { STANDARD_INPUT_FIELD, SWISS_CANTONS_WITH_ALL, ALL_REGIONS_OPTION, EDUCATOR_JOB_ROLES } from '../../../constants';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../contexts/AppContext';
import CoverImageSection from './shared/CoverImageSection';
import ContactDetailsSection from './shared/ContactDetailsSection';
import AvatarSection from './shared/AvatarSection';
import FileUploadZone from '../../ui/FileUploadZone';
import ChipInput from '../../ui/ChipInput';
import {
  UserCircleIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  MapPinIcon,
  StarIcon,
  PaperClipIcon,
  DocumentTextIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Button from '../../ui/Button';

const MAX_DOCUMENTS = 5;

interface EducatorProfileFormProps {
  formData: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
}

const EducatorProfileForm: React.FC<EducatorProfileFormProps> = ({ formData, onChange }) => {
  const { t } = useTranslation(['common', 'settings']);
  const { currentUser } = useAppContext();
  const [citiesDraft, setCitiesDraft] = useState('');

  // Normalize role data on mount so the submit payload always matches what
  // the select displays, even if untouched.
  useEffect(() => {
    const allowed = EDUCATOR_JOB_ROLES as readonly string[];
    const current = formData.jobRole || '';
    if (current && !allowed.includes(current)) {
      onChange('jobRole', '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSkillsChange = (newSkills: string[]) => {
    onChange('skills', newSkills);
  };

  const workExperienceItems = Array.isArray(formData.workExperienceItems)
    ? formData.workExperienceItems
    : [];
  const educationItems = Array.isArray(formData.educationItems) ? formData.educationItems : [];
  const certificationItems = Array.isArray(formData.certificationItems)
    ? formData.certificationItems
    : [];

  const createTempId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleAddWorkExperience = () => {
    onChange('workExperienceItems', [
      ...workExperienceItems,
      {
        id: createTempId('work'),
        jobTitle: '',
        institutionName: '',
        startDate: '',
        endDate: '',
        descriptionPoints: [],
      },
    ]);
  };

  const handleUpdateWorkExperience = (
    index: number,
    field: keyof WorkExperienceItem,
    value: string | string[],
  ) => {
    const nextItems = [...workExperienceItems];
    const current = nextItems[index];
    if (!current) return;
    nextItems[index] = {
      ...current,
      [field]: value,
    } as WorkExperienceItem;
    onChange('workExperienceItems', nextItems);
  };

  const handleRemoveWorkExperience = (index: number) => {
    onChange(
      'workExperienceItems',
      workExperienceItems.filter((_, i) => i !== index),
    );
  };

  const handleAddEducation = () => {
    onChange('educationItems', [
      ...educationItems,
      {
        id: createTempId('edu'),
        degree: '',
        institutionName: '',
        graduationYear: '',
        description: '',
      },
    ]);
  };

  const handleUpdateEducation = (index: number, field: keyof EducationItem, value: string) => {
    const nextItems = [...educationItems];
    const current = nextItems[index];
    if (!current) return;
    nextItems[index] = {
      ...current,
      [field]: value,
    } as EducationItem;
    onChange('educationItems', nextItems);
  };

  const handleRemoveEducation = (index: number) => {
    onChange(
      'educationItems',
      educationItems.filter((_, i) => i !== index),
    );
  };

  const handleAddCertification = () => {
    onChange('certificationItems', [
      ...certificationItems,
      {
        id: createTempId('cert'),
        name: '',
        issuingOrganization: '',
        issueDate: '',
        expiryDate: '',
        credentialUrl: '',
      },
    ]);
  };

  const handleUpdateCertification = (
    index: number,
    field: keyof CertificationItem,
    value: string,
  ) => {
    const nextItems = [...certificationItems];
    const current = nextItems[index];
    if (!current) return;
    nextItems[index] = {
      ...current,
      [field]: value,
    } as CertificationItem;
    onChange('certificationItems', nextItems);
  };

  const handleRemoveCertification = (index: number) => {
    onChange(
      'certificationItems',
      certificationItems.filter((_, i) => i !== index),
    );
  };

  const handleAvatarChange = (url: string, assetId?: string) => {
    onChange('avatarUrl', url);
    onChange('avatarAssetId', assetId ?? '');
  };

  const handleCoverChange = (url: string, assetId?: string) => {
    onChange('coverImageUrl', url);
    onChange('coverAssetId', assetId ?? '');
  };

  const documents: DocumentItem[] = Array.isArray(formData.documents) ? formData.documents : [];
  const totalDocs = documents.length + (formData.cvUrl ? 1 : 0);

  const handleDocumentUpload = (asset: any) => {
    if (totalDocs >= MAX_DOCUMENTS) return;
    const url = asset.url || asset.publicUrl;
    const fileName = url.split('/').pop() || 'Document';
    const isFirst = totalDocs === 0;
    const newDoc: DocumentItem = {
      id: asset.id || String(Date.now()),
      name: fileName,
      url,
      type: isFirst ? 'CV' : 'Other',
      uploadDate: new Date().toISOString(),
      size: 0,
    };
    onChange('documents', [...documents, newDoc]);
    // Keep legacy cvUrl in sync so profile-completion checks and backend
    // mappings that still read cvUrl directly see the first uploaded document.
    if (isFirst && !formData.cvUrl) {
      onChange('cvUrl', url);
      if (asset.id) onChange('cvAssetId', asset.id);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    onChange('documents', documents.filter((d) => d.id !== docId));
  };

  const handleRemoveCv = () => {
    onChange('cvUrl', '');
    onChange('cvAssetId', '');
  };

  const avatarUrl = formData.avatarUrl || currentUser?.avatarUrl || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent((formData.firstName || '') + ' ' + (formData.lastName || ''))}&background=48CFAE&color=fff&size=128&rounded=true`;

  const coverImageUrl = formData.coverImageUrl || currentUser?.orgCoverImageUrl || 
    'https://images.unsplash.com/photo-1503676260728-4c8c0c7832a6?auto=format&fit=crop&w=1600&q=80';

  const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || t('settings:educatorProfile.educator', 'Educator');
  const cities = Array.isArray(formData.cities) ? formData.cities : [];
  const hasUnconfirmedCity = citiesDraft.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Cover Image Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <CoverImageSection
          coverImageUrl={coverImageUrl}
          onCoverChange={handleCoverChange}
          assetKind="COVER_IMAGE"
          cropPreset="COVER"
        />
        
        {/* Profile Picture Overlay */}
        <div className="relative px-6 pb-6">
          <div className="flex items-end -mt-16 mb-4">
            <AvatarSection
              avatarUrl={avatarUrl}
              onAvatarChange={handleAvatarChange}
              size="xl"
              variant="avatar"
              assetKind="AVATAR"
              cropPreset="AVATAR"
            />
            <div className="ml-4 mb-2 flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {fullName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('settings:educatorProfile.educator', 'Educator / Candidate')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings:educatorProfile.basicInfo', 'Basic Information')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings:educatorProfile.firstName', 'First Name')}
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName || ''}
              onChange={(e) => onChange('firstName', e.target.value)}
              className={STANDARD_INPUT_FIELD}
              placeholder={t('settings:educatorProfile.firstNamePlaceholder', 'Enter your first name')}
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings:educatorProfile.lastName', 'Last Name')}
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName || ''}
              onChange={(e) => onChange('lastName', e.target.value)}
              className={STANDARD_INPUT_FIELD}
              placeholder={t('settings:educatorProfile.lastNamePlaceholder', 'Enter your last name')}
            />
          </div>
        </div>
      </div>

      {/* Professional Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPinIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.professionalDetails', 'Professional Details')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="jobRole" className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings:educatorProfile.role', 'Role')} <span className="text-swiss-coral">*</span>
            </label>
            <select
              id="jobRole"
              value={formData.jobRole || ''}
              onChange={(e) => {
                const role = e.target.value;
                onChange('jobRole', role);
              }}
              className={STANDARD_INPUT_FIELD}
              required
            >
              <option value="">{t('settings:educatorProfile.rolePlaceholder', 'Select a role')}</option>
              {EDUCATOR_JOB_ROLES.map((role) => (
                <option key={role} value={role}>{t(`common:educatorJobRoles.${role.replace(/\s+/g, '')}`, role)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings:educatorProfile.location', 'Location')} <span className="text-swiss-coral">*</span>
            </label>
            <select
              id="region"
              value={formData.region || ''}
              onChange={(e) => onChange('region', e.target.value)}
              className={STANDARD_INPUT_FIELD}
              required
            >
              <option value="">{t('settings:educatorProfile.locationPlaceholder', 'Select a canton')}</option>
              {SWISS_CANTONS_WITH_ALL.map((canton) => (
                <option key={canton} value={canton}>
                  {canton === ALL_REGIONS_OPTION ? t('common:filters.all', 'All') : canton}
                </option>
              ))}
            </select>
            <div className="mt-3">
              <label htmlFor="cities" className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings:educatorProfile.cities', 'Cities')}
              </label>
              <ChipInput
                selectedChips={cities}
                onChange={(nextCities) => onChange('cities', nextCities)}
                placeholder={t('settings:educatorProfile.citiesPlaceholder', 'Add one or more cities')}
                allowCustomValues={true}
                onInputValueChange={setCitiesDraft}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('settings:educatorProfile.citiesHint', 'Add multiple cities to increase your visibility.')}
              </p>
              <p
                className={`mt-1 text-xs ${hasUnconfirmedCity ? 'text-swiss-coral' : 'text-gray-500'}`}
              >
                {hasUnconfirmedCity && <span className="text-swiss-coral">*</span>}{' '}
                {t(
                  'settings:educatorProfile.citiesPressEnterHint',
                  'Type a city and press Enter to add it.',
                )}
              </p>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {t(
            'settings:educatorProfile.professionalDetailsHint',
            'These fields help foundations find you in the candidate pool.',
          )}
        </p>
      </div>

      {/* Contact Information - Using Shared Component */}
      <ContactDetailsSection 
        formData={formData} 
        onChange={onChange} 
        showContactPerson={false} // Educators don't need a separate "Contact Person" field as they are the person
      />

      {/* Bio Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <UserCircleIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.bio', 'Bio')}
        </h3>
        <div>
          <label htmlFor="shortBio" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings:educatorProfile.shortBio', 'Short Bio / About Me')}
          </label>
          <textarea
            id="shortBio"
            rows={4}
            value={formData.shortBio || ''}
            onChange={(e) => onChange('shortBio', e.target.value)}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('settings:educatorProfile.shortBioPlaceholder', 'Tell others about yourself, your experience, and what makes you unique...')}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('settings:educatorProfile.bioHint', 'This will appear on your public profile')}
          </p>
        </div>
      </div>

      {/* Skills Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <StarIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.skills', 'Skills & Specialties')}
        </h3>
        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings:educatorProfile.skillsLabel', 'Skills')}
          </label>
          <ChipInput
            selectedChips={Array.isArray(formData.skills) ? formData.skills : []}
            onChange={handleSkillsChange}
            placeholder={t('settings:educatorProfile.skillsPlaceholder', 'e.g., Early Childhood Education, Special Needs, Bilingual')}
            allowCustomValues={true}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('settings:educatorProfile.skillsHint', 'Type and press Enter to add skills')}
          </p>
        </div>
      </div>

      {/* Work Experience */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BriefcaseIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.workExperience', 'Work Experience')}
        </h3>
        <div className="space-y-4">
          {workExperienceItems.length > 0 ? (
            workExperienceItems.map((item, index) => (
              <div key={item.id} className="rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    {t('settings:educatorProfile.workExperienceFields.itemLabel', {
                      defaultValue: `Experience ${index + 1}`,
                      index: index + 1,
                    })}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveWorkExperience(index)}
                  >
                    {t('common:buttons.remove', 'Remove')}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.workExperienceFields.jobTitle', 'Job title')}
                    </label>
                    <input
                      type="text"
                      value={item.jobTitle || ''}
                      onChange={(e) =>
                        handleUpdateWorkExperience(index, 'jobTitle', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.workExperienceFields.institutionName', 'Institution')}
                    </label>
                    <input
                      type="text"
                      value={item.institutionName || ''}
                      onChange={(e) =>
                        handleUpdateWorkExperience(index, 'institutionName', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.workExperienceFields.startDate', 'Start date')}
                    </label>
                    <input
                      type="month"
                      value={item.startDate || ''}
                      onChange={(e) =>
                        handleUpdateWorkExperience(index, 'startDate', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.workExperienceFields.endDate', 'End date')}
                    </label>
                    <input
                      type="month"
                      value={item.endDate || ''}
                      onChange={(e) =>
                        handleUpdateWorkExperience(index, 'endDate', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings:educatorProfile.workExperienceFields.descriptionPoints', 'Highlights')}
                  </label>
                  <textarea
                    rows={3}
                    value={(item.descriptionPoints || []).join('\n')}
                    onChange={(e) =>
                      handleUpdateWorkExperience(
                        index,
                        'descriptionPoints',
                        e.target.value
                          .split(/\r?\n/)
                          .map((line) => line.trim())
                          .filter(Boolean),
                      )
                    }
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('settings:educatorProfile.workExperienceFields.descriptionPlaceholder', 'Add one highlight per line')}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {t('settings:educatorProfile.workExperienceFields.emptyState', 'No experience added yet.')}
            </p>
          )}
          <Button type="button" variant="outline" onClick={handleAddWorkExperience}>
            {t('settings:educatorProfile.workExperienceFields.addButton', 'Add experience')}
          </Button>
        </div>
      </div>

      {/* Education */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AcademicCapIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.education', 'Education')}
        </h3>
        <div className="space-y-4">
          {educationItems.length > 0 ? (
            educationItems.map((item, index) => (
              <div key={item.id} className="rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    {t('settings:educatorProfile.educationFields.itemLabel', {
                      defaultValue: `Education ${index + 1}`,
                      index: index + 1,
                    })}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEducation(index)}
                  >
                    {t('common:buttons.remove', 'Remove')}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.educationFields.degree', 'Degree')}
                    </label>
                    <input
                      type="text"
                      value={item.degree || ''}
                      onChange={(e) => handleUpdateEducation(index, 'degree', e.target.value)}
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.educationFields.institutionName', 'Institution')}
                    </label>
                    <input
                      type="text"
                      value={item.institutionName || ''}
                      onChange={(e) =>
                        handleUpdateEducation(index, 'institutionName', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.educationFields.graduationYear', 'Graduation year')}
                    </label>
                    <input
                      type="text"
                      value={item.graduationYear || ''}
                      onChange={(e) =>
                        handleUpdateEducation(index, 'graduationYear', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                      placeholder={t('settings:educatorProfile.educationFields.graduationYearPlaceholder', 'e.g., 2024')}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings:educatorProfile.educationFields.description', 'Details')}
                  </label>
                  <textarea
                    rows={3}
                    value={item.description || ''}
                    onChange={(e) => handleUpdateEducation(index, 'description', e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('settings:educatorProfile.educationFields.descriptionPlaceholder', 'Add notes or coursework')}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {t('settings:educatorProfile.educationFields.emptyState', 'No education added yet.')}
            </p>
          )}
          <Button type="button" variant="outline" onClick={handleAddEducation}>
            {t('settings:educatorProfile.educationFields.addButton', 'Add education')}
          </Button>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <StarIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.certifications', 'Certifications')}
        </h3>
        <div className="space-y-4">
          {certificationItems.length > 0 ? (
            certificationItems.map((item, index) => (
              <div key={item.id} className="rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">
                    {t('settings:educatorProfile.certificationFields.itemLabel', {
                      defaultValue: `Certification ${index + 1}`,
                      index: index + 1,
                    })}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCertification(index)}
                  >
                    {t('common:buttons.remove', 'Remove')}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.certificationFields.name', 'Certification')}
                    </label>
                    <input
                      type="text"
                      value={item.name || ''}
                      onChange={(e) => handleUpdateCertification(index, 'name', e.target.value)}
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.certificationFields.issuingOrganization', 'Issuing organization')}
                    </label>
                    <input
                      type="text"
                      value={item.issuingOrganization || ''}
                      onChange={(e) =>
                        handleUpdateCertification(index, 'issuingOrganization', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.certificationFields.issueDate', 'Issue date')}
                    </label>
                    <input
                      type="month"
                      value={item.issueDate || ''}
                      onChange={(e) =>
                        handleUpdateCertification(index, 'issueDate', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.certificationFields.expiryDate', 'Expiry date')}
                    </label>
                    <input
                      type="month"
                      value={item.expiryDate || ''}
                      onChange={(e) =>
                        handleUpdateCertification(index, 'expiryDate', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings:educatorProfile.certificationFields.credentialUrl', 'Credential URL')}
                    </label>
                    <input
                      type="url"
                      value={item.credentialUrl || ''}
                      onChange={(e) =>
                        handleUpdateCertification(index, 'credentialUrl', e.target.value)
                      }
                      className={STANDARD_INPUT_FIELD}
                      placeholder="https://"
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {t('settings:educatorProfile.certificationFields.emptyState', 'No certifications added yet.')}
            </p>
          )}
          <Button type="button" variant="outline" onClick={handleAddCertification}>
            {t('settings:educatorProfile.certificationFields.addButton', 'Add certification')}
          </Button>
        </div>
      </div>

      {/* Documents / CV Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <PaperClipIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.cv', 'CV / Resume')}
        </h3>
        <div className="space-y-3">
          {/* Existing documents */}
          {totalDocs > 0 && (
            <div className="space-y-2">
              {formData.cvUrl && (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <DocumentTextIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {formData.cvUrl.split('/').pop() || t('settings:educatorProfile.cvDocument', 'CV document')}
                      </p>
                      <a
                        href={formData.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-700 hover:underline"
                      >
                        {t('settings:educatorProfile.viewDocument', 'View document')}
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCv}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                    aria-label={t('common:buttons.remove', 'Remove')}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <DocumentTextIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={doc.name}>
                        {doc.name}
                      </p>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-700 hover:underline"
                      >
                        {t('settings:educatorProfile.viewDocument', 'View document')}
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(doc.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                    aria-label={t('common:buttons.remove', 'Remove')}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalDocs === 0 && (
            <p className="text-sm text-gray-500 text-center">
              {t('settings:educatorProfile.noDocuments', 'No documents uploaded yet.')}
            </p>
          )}

          {totalDocs < MAX_DOCUMENTS && (
            <div className="space-y-2">
              <FileUploadZone
                key={totalDocs}
                label={t('settings:educatorProfile.cvDragDrop', 'Upload a document (CV, diploma, certificate…)')}
                acceptedMimeTypes=".pdf,.doc,.docx"
                maxFileSizeMB={5}
                assetKind="CV"
                onUploadSuccess={handleDocumentUpload}
                autoUpload={true}
              />
              <p className="text-xs text-gray-500 text-center">
                {t(
                  'settings:educatorProfile.cvHint',
                  `PDF, DOC, DOCX · Max 5 MB · Up to ${MAX_DOCUMENTS} documents (${totalDocs}/${MAX_DOCUMENTS} used)`,
                  { max: MAX_DOCUMENTS, used: totalDocs },
                )}
              </p>
            </div>
          )}

          {totalDocs >= MAX_DOCUMENTS && (
            <p className="text-xs text-amber-600 text-center">
              {t('settings:educatorProfile.maxDocuments', `Maximum of ${MAX_DOCUMENTS} documents reached. Remove one to upload another.`)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EducatorProfileForm;
