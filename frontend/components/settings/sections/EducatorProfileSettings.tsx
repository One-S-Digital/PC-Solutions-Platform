import React, { useState, useEffect, useRef } from 'react';
import { SettingsFormData, UserRole, WorkExperienceItem, EducationItem, CertificationItem, DocumentItem } from '../../../types';
import { STANDARD_INPUT_FIELD, SWISS_CANTONS_WITH_ALL, ALL_REGIONS_OPTION, EDUCATOR_JOB_ROLES } from '../../../constants';
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
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../contexts/AppContext';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { getAvatarFallback } from '../../../utils/avatar';
import {
  certificationItemsFromNames,
  createTempId,
  fallbackEducationFromText,
  fallbackWorkExperienceFromText,
} from '../../../utils/educatorProfileHelpers';

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

const parseLegacyItems = <T,>(value: unknown): T[] => {
  const normalize = (items: unknown[]): T[] =>
    items.filter((item) => item && typeof item === 'object') as T[];

  if (Array.isArray(value)) {
    return normalize(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? normalize(parsed as unknown[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const buildProfileData = (settings: SettingsFormData, currentUser: any) => {
  const parsedWorkItems = parseLegacyItems<WorkExperienceItem>(settings.workExperienceItems);
  const parsedWorkLegacy = parseLegacyItems<WorkExperienceItem>(settings.workExperience);
  const parsedEducationItems = parseLegacyItems<EducationItem>(settings.educationItems);
  const parsedEducationLegacy = parseLegacyItems<EducationItem>(settings.education);
  const parsedCertItems = parseLegacyItems<CertificationItem>(settings.certificationItems);

  return {
    firstName: settings.firstName || currentUser?.firstName || '',
    lastName: settings.lastName || currentUser?.lastName || '',
    email: settings.email || currentUser?.email || '',
    phoneNumber: settings.phoneNumber || '',
    jobRole: (() => {
      const raw = (settings as any).jobRole || '';
      return (EDUCATOR_JOB_ROLES as readonly string[]).includes(raw) ? raw : '';
    })(),
    region: (settings as any).region || '',
    shortBio: settings.shortBio || '',
    workExperience: settings.workExperience || '',
    education: settings.education || '',
    certifications: Array.isArray(settings.certifications) ? settings.certifications : [],
    workExperienceItems:
      parsedWorkItems.length > 0
        ? parsedWorkItems
        : parsedWorkLegacy.length > 0
          ? parsedWorkLegacy
          : fallbackWorkExperienceFromText(settings.workExperience || ''),
    educationItems:
      parsedEducationItems.length > 0
        ? parsedEducationItems
        : parsedEducationLegacy.length > 0
          ? parsedEducationLegacy
          : fallbackEducationFromText(settings.education || ''),
    certificationItems:
      parsedCertItems.length > 0
        ? parsedCertItems
        : certificationItemsFromNames(
            Array.isArray(settings.certifications) ? settings.certifications : [],
          ),
    skills: Array.isArray(settings.skills) ? settings.skills : [],
    availability: settings.availability || '',
    cvUrl: settings.cvUrl || '',
    documents: Array.isArray(settings.documents) ? settings.documents : [],
    avatarAssetId: settings.avatarAssetId || '',
  };
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
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Initialize form fields from settings
  const [profileData, setProfileData] = useState(() =>
    buildProfileData(settings, currentUser),
  );

  // Sync when settings change
  useEffect(() => {
    setProfileData(buildProfileData(settings, currentUser));
  }, [settings, currentUser]);

  const handleFieldChange = (field: keyof typeof profileData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    onChange(field as keyof SettingsFormData, value);
  };

  const handleSkillsChange = (newSkills: string[]) => {
    handleFieldChange('skills', newSkills);
  };

  const handleAddWorkExperience = () => {
    const nextItems = [
      ...(profileData.workExperienceItems || []),
      {
        id: createTempId('work'),
        jobTitle: '',
        institutionName: '',
        startDate: '',
        endDate: '',
        descriptionPoints: [],
      },
    ];
    handleFieldChange('workExperienceItems', nextItems);
  };

  const handleUpdateWorkExperience = (
    index: number,
    field: keyof WorkExperienceItem,
    value: string | string[],
  ) => {
    const nextItems = [...(profileData.workExperienceItems || [])];
    const current = nextItems[index];
    if (!current) return;
    nextItems[index] = {
      ...current,
      [field]: value,
    } as WorkExperienceItem;
    handleFieldChange('workExperienceItems', nextItems);
  };

  const handleRemoveWorkExperience = (index: number) => {
    const nextItems = (profileData.workExperienceItems || []).filter((_, i) => i !== index);
    handleFieldChange('workExperienceItems', nextItems);
  };

  const handleAddEducation = () => {
    const nextItems = [
      ...(profileData.educationItems || []),
      {
        id: createTempId('edu'),
        degree: '',
        institutionName: '',
        graduationYear: '',
        description: '',
      },
    ];
    handleFieldChange('educationItems', nextItems);
  };

  const handleUpdateEducation = (
    index: number,
    field: keyof EducationItem,
    value: string,
  ) => {
    const nextItems = [...(profileData.educationItems || [])];
    const current = nextItems[index];
    if (!current) return;
    nextItems[index] = {
      ...current,
      [field]: value,
    } as EducationItem;
    handleFieldChange('educationItems', nextItems);
  };

  const handleRemoveEducation = (index: number) => {
    const nextItems = (profileData.educationItems || []).filter((_, i) => i !== index);
    handleFieldChange('educationItems', nextItems);
  };

  const handleAddCertification = () => {
    const nextItems = [
      ...(profileData.certificationItems || []),
      {
        id: createTempId('cert'),
        name: '',
        issuingOrganization: '',
        issueDate: '',
        expiryDate: '',
        credentialUrl: '',
      },
    ];
    handleFieldChange('certificationItems', nextItems);
  };

  const handleUpdateCertification = (
    index: number,
    field: keyof CertificationItem,
    value: string,
  ) => {
    const nextItems = [...(profileData.certificationItems || [])];
    const current = nextItems[index];
    if (!current) return;
    nextItems[index] = {
      ...current,
      [field]: value,
    } as CertificationItem;
    handleFieldChange('certificationItems', nextItems);
  };

  const handleRemoveCertification = (index: number) => {
    const nextItems = (profileData.certificationItems || []).filter((_, i) => i !== index);
    handleFieldChange('certificationItems', nextItems);
  };

  // Avatar handlers
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAvatarError(null);
    if (!file.type.startsWith('image/')) {
      setAvatarError(t('settings:educatorProfile.invalidImageType', 'Please select an image file'));
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      return;
    }

    const maxAvatarSizeMB = 10;
    if (file.size > maxAvatarSizeMB * 1024 * 1024) {
      setAvatarError(
        t('settings:educatorProfile.avatarTooLarge', {
          defaultValue: `Image must be less than ${maxAvatarSizeMB}MB.`,
          max: maxAvatarSizeMB,
        }),
      );
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
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
        if (response.asset.id) {
          handleFieldChange('avatarAssetId', response.asset.id);
          // Also update avatarUrl so the preview updates immediately without waiting for save+reload
          const uploadedUrl = response.asset.publicUrl || response.asset.url;
          if (uploadedUrl) {
            onChange('avatarUrl', uploadedUrl);
          }
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

  const MAX_DOCUMENTS = 5;
  const documents: DocumentItem[] = Array.isArray(profileData.documents) ? profileData.documents : [];
  const totalDocs = documents.length + (profileData.cvUrl ? 1 : 0);

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
    const updated = [...documents, newDoc];
    handleFieldChange('documents', updated);
    onChange('documents', updated);
    if (isFirst && !profileData.cvUrl) {
      handleFieldChange('cvUrl', url);
      if (asset.id) onChange('cvAssetId', asset.id);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    const updated = documents.filter((d) => d.id !== docId);
    handleFieldChange('documents', updated);
    onChange('documents', updated);
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
    getAvatarFallback(profileData.firstName + ' ' + profileData.lastName);

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
              {avatarError && (
                <p className="mt-1 text-xs text-swiss-coral">{avatarError}</p>
              )}
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
              <select
                id="jobRole"
                value={(profileData as any).jobRole}
                onChange={(e) => {
                  const role = e.target.value;
                  handleFieldChange('jobRole', role);
                }}
                className={STANDARD_INPUT_FIELD}
                required
              >
                <option value="">{t('settings:educatorProfile.rolePlaceholder', 'Select a role')}</option>
                {EDUCATOR_JOB_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
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
                {SWISS_CANTONS_WITH_ALL.map((canton) => (
                  <option key={canton} value={canton}>
                    {canton === ALL_REGIONS_OPTION ? t('common:filters.all', 'All') : canton}
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
          <div className="space-y-4">
            {(profileData.workExperienceItems || []).length > 0 ? (
              (profileData.workExperienceItems || []).map((item, index) => (
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

        <hr />

        {/* Education */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <AcademicCapIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.education', 'Education')}
          </h3>
          <div className="space-y-4">
            {(profileData.educationItems || []).length > 0 ? (
              (profileData.educationItems || []).map((item, index) => (
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
                      onChange={(e) =>
                        handleUpdateEducation(index, 'description', e.target.value)
                      }
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

        <hr />

        {/* Certifications */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <StarIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.certifications', 'Certifications')}
          </h3>
          <div className="space-y-4">
            {(profileData.certificationItems || []).length > 0 ? (
              (profileData.certificationItems || []).map((item, index) => (
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

        {/* Documents / CV Upload */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <PaperClipIcon className="w-5 h-5 mr-2 text-swiss-mint" />
            {t('settings:educatorProfile.cv', 'CV / Resume')}
          </h3>
          <div className="space-y-3">
            {totalDocs === 0 && (
              <p className="text-sm text-gray-500 text-center">
                {t('settings:educatorProfile.noDocuments', 'No documents uploaded yet.')}
              </p>
            )}

            {totalDocs > 0 && (
              <div className="space-y-2">
                {profileData.cvUrl && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <DocumentTextIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
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

            {totalDocs < MAX_DOCUMENTS && (
              <div className="space-y-2">
                <FileUploadZone
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

            <button
              type="button"
              onClick={openDeleteFilesHelp}
              className="text-xs text-swiss-teal hover:underline"
            >
              {t('settings:educatorProfile.deleteHelpCta', 'How do I delete files?')}
            </button>
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
