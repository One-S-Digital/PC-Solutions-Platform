import React from 'react';
import { SettingsFormData } from '../../../types';
import { STANDARD_INPUT_FIELD } from '../../../constants';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../contexts/AppContext';
import CoverImageSection from './shared/CoverImageSection';
import ContactDetailsSection from './shared/ContactDetailsSection';
import AvatarSection from './shared/AvatarSection';
import FileUploadZone from '../../ui/FileUploadZone';
import {
  UserCircleIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  StarIcon,
  CalendarDaysIcon,
  PaperClipIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Button from '../../ui/Button';

interface EducatorProfileFormProps {
  formData: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
}

const EducatorProfileForm: React.FC<EducatorProfileFormProps> = ({ formData, onChange }) => {
  const { t } = useTranslation(['common', 'settings']);
  const { currentUser } = useAppContext();

  const handleSkillsChange = (value: string) => {
    const skillsArray = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    onChange('skills', skillsArray);
  };

  const handleCertificationsChange = (value: string) => {
    const certsArray = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    onChange('certifications', certsArray);
  };

  const handleAvatarChange = (url: string, assetId?: string) => {
    onChange('avatarUrl', url);
    onChange('avatarAssetId', assetId ?? '');
  };

  const handleCoverChange = (url: string, assetId?: string) => {
    onChange('coverImageUrl', url);
    onChange('coverAssetId', assetId ?? '');
  };

  const handleCvUpload = (asset: any) => {
    onChange('cvUrl', asset.url || asset.publicUrl);
    if (asset.id) {
      onChange('cvAssetId', asset.id);
    }
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
            {t('settings:educatorProfile.skillsLabel', 'Skills (comma-separated)')}
          </label>
          <input
            type="text"
            id="skills"
            value={Array.isArray(formData.skills) ? formData.skills.join(', ') : ''}
            onChange={(e) => handleSkillsChange(e.target.value)}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('settings:educatorProfile.skillsPlaceholder', 'e.g., Early Childhood Education, Special Needs, Bilingual')}
          />
          {Array.isArray(formData.skills) && formData.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-swiss-mint/10 text-swiss-mint"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Work Experience */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BriefcaseIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.workExperience', 'Work Experience')}
        </h3>
        <div>
          <label htmlFor="workExperience" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings:educatorProfile.workExperienceLabel', 'Work Experience')}
          </label>
          <textarea
            id="workExperience"
            rows={6}
            value={formData.workExperience || ''}
            onChange={(e) => onChange('workExperience', e.target.value)}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('settings:educatorProfile.workExperiencePlaceholder', 'Describe your work experience...')}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('settings:educatorProfile.workExperienceHint', 'You can use JSON format or plain text')}
          </p>
        </div>
      </div>

      {/* Education */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AcademicCapIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.education', 'Education')}
        </h3>
        <div>
          <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings:educatorProfile.educationLabel', 'Education')}
          </label>
          <textarea
            id="education"
            rows={6}
            value={formData.education || ''}
            onChange={(e) => onChange('education', e.target.value)}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('settings:educatorProfile.educationPlaceholder', 'List your educational background...')}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('settings:educatorProfile.educationHint', 'You can use JSON format or plain text')}
          </p>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <StarIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.certifications', 'Certifications')}
        </h3>
        <div>
          <label htmlFor="certifications" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings:educatorProfile.certificationsLabel', 'Certifications (comma-separated)')}
          </label>
          <input
            type="text"
            id="certifications"
            value={Array.isArray(formData.certifications) ? formData.certifications.join(', ') : ''}
            onChange={(e) => handleCertificationsChange(e.target.value)}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('settings:educatorProfile.certificationsPlaceholder', 'e.g., CPR Certified, Early Childhood Education Certificate')}
          />
        </div>
      </div>

      {/* Availability */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CalendarDaysIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.availability', 'Availability')}
        </h3>
        <div>
          <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings:educatorProfile.availabilityLabel', 'Availability Information')}
          </label>
          <textarea
            id="availability"
            rows={3}
            value={formData.availability || ''}
            onChange={(e) => onChange('availability', e.target.value)}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('settings:educatorProfile.availabilityPlaceholder', 'Describe your availability...')}
          />
        </div>
      </div>

      {/* CV / Resume Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <PaperClipIcon className="w-5 h-5 mr-2 text-swiss-mint" />
          {t('settings:educatorProfile.cv', 'CV / Resume')}
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('settings:educatorProfile.cvUpload', 'Upload CV')}
          </label>
          
          {formData.cvUrl ? (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <DocumentTextIcon className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {/* Extract filename from URL or show generic name */}
                    {formData.cvUrl.split('/').pop() || 'CV Document'}
                  </p>
                  <a 
                    href={formData.cvUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-green-700 hover:underline"
                  >
                    View Document
                  </a>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveCv}
                leftIcon={XMarkIcon}
              >
                {t('common:buttons.remove', 'Remove')}
              </Button>
            </div>
          ) : (
            <FileUploadZone
              label={t('settings:educatorProfile.cvDragDrop', 'Drag & drop your CV here')}
              acceptedMimeTypes=".pdf,.doc,.docx"
              maxFileSizeMB={5}
              assetKind="CV"
              onUploadSuccess={handleCvUpload}
              autoUpload={true}
            />
          )}
          <p className="mt-2 text-xs text-gray-500">
            {t('settings:educatorProfile.cvHint', 'Accepted formats: PDF, DOC, DOCX (Max 5MB). This will be shared with foundations when you apply for jobs.')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EducatorProfileForm;
