import React, { useState, useEffect, useRef } from 'react';
import { SettingsFormData, UserRole } from '../../../types';
import { STANDARD_INPUT_FIELD, SWISS_CANTONS } from '../../../constants';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import ImageCropperModal from '../../shared/ImageCropperModal';
import FileUploadZone from '../../ui/FileUploadZone';
import ChipInput from '../../ui/ChipInput';
import Button from '../../ui/Button';
import { AvailabilityScheduler } from '../../availability';
import { EducatorAvailabilitySettings, createEmptyAvailabilitySettings } from '../../../types/availability';
import { 
  UserCircleIcon, 
  PhotoIcon, 
  MapPinIcon,
  BriefcaseIcon, 
  AcademicCapIcon, 
  StarIcon, 
  PaperClipIcon,
  CameraIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../contexts/AppContext';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';

// Helper function to parse availability settings from various formats
const parseAvailabilitySettings = (value: EducatorAvailabilitySettings | string | undefined): EducatorAvailabilitySettings => {
  if (!value) {
    return createEmptyAvailabilitySettings();
  }
  
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 'employmentType' in parsed) {
        return parsed as EducatorAvailabilitySettings;
      }
    } catch {
      // If string can't be parsed, return default with notes containing the old value
      return {
        ...createEmptyAvailabilitySettings(),
        notes: value,
      };
    }
  }
  
  if (typeof value === 'object' && 'employmentType' in value) {
    return value as EducatorAvailabilitySettings;
  }
  
  return createEmptyAvailabilitySettings();
};

interface EducatorProfileSettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const EducatorProfileSettings: React.FC<EducatorProfileSettingsProps> = ({ settings, onChange, userRole }) => {
  const { t } = useTranslation(['dashboard', 'common', 'settings']);
  const { currentUser } = useAppContext();
  const { upload, request } = useAuthenticatedApi();
  const navigate = useNavigate();
  const location = useLocation();

  const openDeleteFilesHelp = () => {
    const params = new URLSearchParams(location.search);
    params.set('help', 'delete-files');
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: false },
    );
  };
  
  // Avatar cropping state
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Initialize form fields from settings
  const [profileData, setProfileData] = useState({
    firstName: settings.firstName || currentUser?.firstName || '',
    lastName: settings.lastName || currentUser?.lastName || '',
    email: settings.email || currentUser?.email || '',
    phoneNumber: settings.phoneNumber || '',
    jobRole: (settings as any).jobRole || '',
    region: (settings as any).region || '',
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
      jobRole: (settings as any).jobRole || '',
      region: (settings as any).region || '',
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

  const handleSkillsChange = (newSkills: string[]) => {
    handleFieldChange('skills', newSkills);
  };

  const handleCertificationsChange = (newCertifications: string[]) => {
    handleFieldChange('certifications', newCertifications);
  };

  // Avatar handlers
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert(t('settings:educatorProfile.invalidImageType', 'Please select an image file'));
      return;
    }
    
    setSelectedAvatarFile(file);
    setShowAvatarCropper(true);
    
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };
  
  const handleAvatarCropComplete = async (croppedFile: File) => {
    setShowAvatarCropper(false);
    setSelectedAvatarFile(null);
    setUploadingAvatar(true);
    
    try {
      const response = await upload('/upload/file', croppedFile, { assetKind: 'AVATAR' });
      
      if (response.success && response.asset) {
        // Only save the avatarAssetId, not the URL
        // The URL will be computed from the asset relation on the backend
        if (response.asset.id) {
          handleFieldChange('avatarAssetId', response.asset.id);
        }
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      alert(error.message || t('settings:educatorProfile.uploadFailed', 'Upload failed. Please try again.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCvUpload = (asset: any) => {
    const url = asset.url || asset.publicUrl;
    handleFieldChange('cvUrl', url);
    if (asset.id) {
      onChange('cvAssetId', asset.id);
    }
  };

  const handleRemoveCv = async () => {
    const confirmed = window.confirm(
      t(
        'settings:educatorProfile.confirmDeleteCv',
        'Delete your CV permanently? This cannot be undone.',
      ),
    );
    if (!confirmed) return;

    try {
      await request('/settings/educator/cv', { method: 'DELETE' });
      handleFieldChange('cvUrl', '');
      onChange('cvAssetId', '');
    } catch (e: any) {
      console.error('CV delete failed:', e);
      alert(
        t(
          'settings:educatorProfile.deleteCvFailed',
          'Failed to delete CV. Please try again.',
        ),
      );
    }
  };

  // Use avatarUrl from settings (computed from asset relation on backend)
  const avatarUrl = settings.avatarUrl || currentUser?.avatarUrl || 
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
            <div className="relative group">
              <img
                src={avatarUrl}
                alt={t('common.profile')}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <ArrowPathIcon className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
              {!uploadingAvatar && (
                <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full cursor-pointer transition-all">
                  <CameraIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileSelect}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-swiss-mint bg-swiss-mint/10 rounded-md hover:bg-swiss-mint/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint disabled:opacity-50 transition-colors"
              >
                <CameraIcon className="w-4 h-4 mr-2" />
                {uploadingAvatar 
                  ? t('settings:educatorProfile.uploading', 'Uploading...') 
                  : t('settings:educatorProfile.chooseAvatar', 'Choose avatar')
                }
              </button>
              <p className="mt-1 text-xs text-gray-500">
                {t('settings:educatorProfile.avatarHint', 'JPG, PNG or GIF. Will be cropped to 256×256px')}
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
                placeholder={t('settings:educatorProfile.firstNamePlaceholder', 'Enter your first name')}
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
                placeholder={t('settings:educatorProfile.lastNamePlaceholder', 'Enter your last name')}
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
                placeholder={t('settings:educatorProfile.emailPlaceholder', 'Enter your email address')}
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
                placeholder={t('settings:educatorProfile.phoneNumberPlaceholder', '+41 XX XXX XX XX')}
              />
            </div>

            <label htmlFor="jobRole" className="form-label md:pt-2">
              {t('settings:educatorProfile.role', 'Role')} <span className="text-swiss-coral">*</span>
            </label>
            <div className="form-input-container">
              <input
                type="text"
                id="jobRole"
                value={(profileData as any).jobRole}
                onChange={(e) => handleFieldChange('jobRole', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('settings:educatorProfile.rolePlaceholder', 'e.g., Educator, Assistant')}
                required
              />
            </div>

            <label htmlFor="region" className="form-label md:pt-2">
              <span className="inline-flex items-center">
                <MapPinIcon className="w-4 h-4 mr-2 text-gray-400" />
                {t('settings:educatorProfile.location', 'Location')} <span className="text-swiss-coral">*</span>
              </span>
            </label>
            <div className="form-input-container">
              <select
                id="region"
                value={(profileData as any).region}
                onChange={(e) => handleFieldChange('region', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                required
              >
                <option value="">{t('settings:educatorProfile.locationPlaceholder', 'Select a canton')}</option>
                {SWISS_CANTONS.map((canton) => (
                  <option key={canton} value={canton}>
                    {canton}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {t(
                  'settings:educatorProfile.locationHint',
                  'This helps foundations find you in the candidate pool.',
                )}
              </p>
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
              {t('settings:educatorProfile.skillsLabel', 'Skills')}
            </label>
            <div className="form-input-container">
              <ChipInput
                selectedChips={Array.isArray(profileData.skills) ? profileData.skills : []}
                onChange={handleSkillsChange}
                placeholder={t('settings:educatorProfile.skillsPlaceholder', 'e.g., Early Childhood Education, Special Needs, Bilingual')}
                allowCustomValues={true}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('settings:educatorProfile.skillsHint', 'Type and press Enter to add skills')}
              </p>
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
              {t('settings:educatorProfile.certificationsLabel', 'Certifications')}
            </label>
            <div className="form-input-container">
              <ChipInput
                selectedChips={Array.isArray(profileData.certifications) ? profileData.certifications : []}
                onChange={handleCertificationsChange}
                placeholder={t('settings:educatorProfile.certificationsPlaceholder', 'e.g., CPR Certified, Early Childhood Education Certificate')}
                allowCustomValues={true}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('settings:educatorProfile.certificationsHint', 'Type and press Enter to add certifications')}
              </p>
            </div>
          </div>
        </div>

        <hr />

        {/* Availability Schedule */}
        <div>
          <AvailabilityScheduler
            value={parseAvailabilitySettings(settings.availabilitySettings)}
            onChange={(newSettings) => onChange('availabilitySettings', newSettings)}
            showPreview={true}
          />
        </div>

        <hr />

        {/* CV / Resume Upload */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PaperClipIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.cv', 'CV / Resume')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4">
            <label className="form-label">
              {t('settings:educatorProfile.cvUpload', 'Upload CV')}
            </label>
            <div className="form-input-container">
              {profileData.cvUrl ? (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <DocumentTextIcon className="w-6 h-6 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {profileData.cvUrl.split('/').pop() || t('settings:educatorProfile.cvDocument', 'CV document')}
                      </p>
                      <a 
                        href={profileData.cvUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-green-700 hover:underline"
                      >
                        {t('settings:educatorProfile.viewDocument', 'View document')}
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
              <button
                type="button"
                onClick={openDeleteFilesHelp}
                className="text-xs text-swiss-teal hover:underline mt-2"
              >
                {t('settings:educatorProfile.deleteHelpCta', 'How do I delete files?')}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Avatar Cropper Modal */}
      <ImageCropperModal
        isOpen={showAvatarCropper}
        onClose={() => {
          setShowAvatarCropper(false);
          setSelectedAvatarFile(null);
        }}
        imageFile={selectedAvatarFile}
        preset="AVATAR"
        onCropComplete={handleAvatarCropComplete}
        circular={true}
      />
    </SettingsSectionWrapper>
  );
};

export default EducatorProfileSettings;
