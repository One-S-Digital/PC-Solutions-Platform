import React, { useState, useEffect } from 'react';
import { SettingsFormData, UserRole } from '../../../types';
import { STANDARD_INPUT_FIELD } from '../../../constants';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { UserCircleIcon, PhotoIcon, BriefcaseIcon, AcademicCapIcon, StarIcon, CalendarDaysIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import Button from '../../ui/Button';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../contexts/AppContext';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';

interface EducatorProfileSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const EducatorProfileSettings: React.FC<EducatorProfileSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation(['dashboard', 'common', 'settings']);
  const { currentUser } = useAppContext();
  const { request } = useAuthenticatedApi();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Initialize form fields from settings
  const [profileData, setProfileData] = useState({
    firstName: settings.firstName || currentUser?.firstName || '',
    lastName: settings.lastName || currentUser?.lastName || '',
    email: settings.email || currentUser?.email || '',
    phoneNumber: settings.phoneNumber || '',
    shortBio: settings.shortBio || '',
    workExperience: settings.workExperience || '',
    education: settings.education || '',
    certifications: Array.isArray(settings.certifications) ? settings.certifications : [],
    skills: Array.isArray(settings.skills) ? settings.skills : [],
    availability: settings.availability || '',
    cvUrl: settings.cvUrl || '',
    avatarAssetId: settings.avatarAssetId || '',
  });

  // Sync when settings change
  useEffect(() => {
    setProfileData({
      firstName: settings.firstName || currentUser?.firstName || '',
      lastName: settings.lastName || currentUser?.lastName || '',
      email: settings.email || currentUser?.email || '',
      phoneNumber: settings.phoneNumber || '',
      shortBio: settings.shortBio || '',
      workExperience: settings.workExperience || '',
      education: settings.education || '',
      certifications: Array.isArray(settings.certifications) ? settings.certifications : [],
      skills: Array.isArray(settings.skills) ? settings.skills : [],
      availability: settings.availability || '',
      cvUrl: settings.cvUrl || '',
      avatarAssetId: settings.avatarAssetId || '',
    });
  }, [settings, currentUser]);

  const handleFieldChange = (field: keyof typeof profileData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    onChange(field as keyof SettingsFormData, value);
  };

  const handleSkillsChange = (value: string) => {
    const skillsArray = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    handleFieldChange('skills', skillsArray);
  };

  const handleCertificationsChange = (value: string) => {
    const certsArray = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    handleFieldChange('certifications', certsArray);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      // TODO: Implement actual file upload to get asset ID
      // For now, this is a placeholder
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await request('/assets/upload', { method: 'POST', body: formData });
      // if (response.success && response.data?.id) {
      //   handleFieldChange('avatarAssetId', response.data.id);
      // }
      alert('Avatar upload functionality will be implemented with file upload service');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const avatarUrl = currentUser?.avatarUrl || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.firstName + ' ' + profileData.lastName)}&background=48CFAE&color=fff&size=128&rounded=true`;

  return (
    <SettingsSectionWrapper title={t('settings:page.educatorProfile', 'Profile Information')} icon={UserCircleIcon}>
      <div className="space-y-8">
        {/* Avatar Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PhotoIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.avatar', 'Profile Photo')}
          </h3>
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
            </div>
            <div>
              <label className="block">
                <span className="sr-only">{t('settings:educatorProfile.chooseAvatar', 'Choose avatar')}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-swiss-mint file:text-white hover:file:bg-swiss-teal disabled:opacity-50"
                />
              </label>
              <p className="mt-1 text-xs text-gray-500">
                {t('settings:educatorProfile.avatarHint', 'JPG, PNG or GIF. Max size 2MB')}
              </p>
            </div>
          </div>
        </div>

        <hr />

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('settings:educatorProfile.basicInfo', 'Basic Information')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label htmlFor="firstName" className="form-label md:pt-2">
              {t('settings:educatorProfile.firstName', 'First Name')}
            </label>
            <div className="form-input-container">
              <input
                type="text"
                id="firstName"
                value={profileData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                className={STANDARD_INPUT_FIELD}
              />
            </div>

            <label htmlFor="lastName" className="form-label md:pt-2">
              {t('settings:educatorProfile.lastName', 'Last Name')}
            </label>
            <div className="form-input-container">
              <input
                type="text"
                id="lastName"
                value={profileData.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                className={STANDARD_INPUT_FIELD}
              />
            </div>

            <label htmlFor="email" className="form-label md:pt-2">
              {t('settings:educatorProfile.email', 'Email')}
            </label>
            <div className="form-input-container">
              <input
                type="email"
                id="email"
                value={profileData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className={STANDARD_INPUT_FIELD}
              />
            </div>

            <label htmlFor="phoneNumber" className="form-label md:pt-2">
              {t('settings:educatorProfile.phoneNumber', 'Phone Number')}
            </label>
            <div className="form-input-container">
              <input
                type="tel"
                id="phoneNumber"
                value={profileData.phoneNumber}
                onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                className={STANDARD_INPUT_FIELD}
              />
            </div>
          </div>
        </div>

        <hr />

        {/* Bio Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <UserCircleIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.bio', 'Bio')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label htmlFor="shortBio" className="form-label">
              {t('settings:educatorProfile.shortBio', 'Short Bio / About Me')}
            </label>
            <div className="form-input-container">
              <textarea
                id="shortBio"
                rows={4}
                value={profileData.shortBio}
                onChange={(e) => handleFieldChange('shortBio', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:educatorProfile.shortBioPlaceholder', 'Tell others about yourself, your experience, and what makes you unique...')}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('settings:educatorProfile.bioHint', 'This will appear on your public profile')}
              </p>
            </div>
          </div>
        </div>

        <hr />

        {/* Skills Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <StarIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.skills', 'Skills & Specialties')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label htmlFor="skills" className="form-label">
              {t('settings:educatorProfile.skillsLabel', 'Skills (comma-separated)')}
            </label>
            <div className="form-input-container">
              <input
                type="text"
                id="skills"
                value={Array.isArray(profileData.skills) ? profileData.skills.join(', ') : ''}
                onChange={(e) => handleSkillsChange(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:educatorProfile.skillsPlaceholder', 'e.g., Early Childhood Education, Special Needs, Bilingual')}
              />
              {Array.isArray(profileData.skills) && profileData.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {profileData.skills.map((skill, index) => (
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
        </div>

        <hr />

        {/* Work Experience */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BriefcaseIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.workExperience', 'Work Experience')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label htmlFor="workExperience" className="form-label">
              {t('settings:educatorProfile.workExperienceLabel', 'Work Experience')}
            </label>
            <div className="form-input-container">
              <textarea
                id="workExperience"
                rows={6}
                value={profileData.workExperience}
                onChange={(e) => handleFieldChange('workExperience', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:educatorProfile.workExperiencePlaceholder', 'Describe your work experience...')}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('settings:educatorProfile.workExperienceHint', 'You can use JSON format or plain text')}
              </p>
            </div>
          </div>
        </div>

        <hr />

        {/* Education */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <AcademicCapIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.education', 'Education')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label htmlFor="education" className="form-label">
              {t('settings:educatorProfile.educationLabel', 'Education')}
            </label>
            <div className="form-input-container">
              <textarea
                id="education"
                rows={6}
                value={profileData.education}
                onChange={(e) => handleFieldChange('education', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:educatorProfile.educationPlaceholder', 'List your educational background...')}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('settings:educatorProfile.educationHint', 'You can use JSON format or plain text')}
              </p>
            </div>
          </div>
        </div>

        <hr />

        {/* Certifications */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <StarIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.certifications', 'Certifications')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label htmlFor="certifications" className="form-label">
              {t('settings:educatorProfile.certificationsLabel', 'Certifications (comma-separated)')}
            </label>
            <div className="form-input-container">
              <input
                type="text"
                id="certifications"
                value={Array.isArray(profileData.certifications) ? profileData.certifications.join(', ') : ''}
                onChange={(e) => handleCertificationsChange(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:educatorProfile.certificationsPlaceholder', 'e.g., CPR Certified, Early Childhood Education Certificate')}
              />
            </div>
          </div>
        </div>

        <hr />

        {/* Availability */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CalendarDaysIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.availability', 'Availability')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label htmlFor="availability" className="form-label">
              {t('settings:educatorProfile.availabilityLabel', 'Availability Information')}
            </label>
            <div className="form-input-container">
              <textarea
                id="availability"
                rows={3}
                value={profileData.availability}
                onChange={(e) => handleFieldChange('availability', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:educatorProfile.availabilityPlaceholder', 'Describe your availability...')}
              />
            </div>
          </div>
        </div>

        <hr />

        {/* CV URL */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PaperClipIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.cv', 'CV / Resume')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label htmlFor="cvUrl" className="form-label">
              {t('settings:educatorProfile.cvUrl', 'CV URL')}
            </label>
            <div className="form-input-container">
              <input
                type="url"
                id="cvUrl"
                value={profileData.cvUrl}
                onChange={(e) => handleFieldChange('cvUrl', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:educatorProfile.cvUrlPlaceholder', 'https://example.com/cv.pdf')}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('settings:educatorProfile.cvUrlHint', 'Link to your CV or resume document')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SettingsSectionWrapper>
  );
};

export default EducatorProfileSettings;
