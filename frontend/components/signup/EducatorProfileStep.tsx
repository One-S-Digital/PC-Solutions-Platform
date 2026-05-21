import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserCircleIcon,
  BriefcaseIcon,
  MapPinIcon,
  PaperClipIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import FileUploadZone from '../ui/FileUploadZone';
import { STANDARD_INPUT_FIELD, SWISS_CANTONS, EDUCATOR_JOB_ROLES, type EducatorJobRole } from '../../constants';

export interface EducatorProfileStepData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  canton: string;
  city: string;
  shortBio: string;
  professionalExperience: string;
  cvUrl: string;
  cvAssetId: string;
  jobRole: EducatorJobRole | '';
}

interface EducatorProfileStepErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  canton?: string;
  city?: string;
  shortBio?: string;
  professionalExperience?: string;
  jobRole?: string;
  cvUrl?: string;
}

interface EducatorProfileStepProps {
  initialData: Partial<EducatorProfileStepData>;
  onSubmit: (data: EducatorProfileStepData) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

const EducatorProfileStep: React.FC<EducatorProfileStepProps> = ({
  initialData,
  onSubmit,
  onBack,
  isLoading,
}) => {
  const { t } = useTranslation(['signup', 'common', 'settings']);

  const [data, setData] = useState<EducatorProfileStepData>({
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    phone: initialData.phone || '',
    email: initialData.email || '',
    canton: initialData.canton || '',
    city: initialData.city || '',
    shortBio: initialData.shortBio || '',
    professionalExperience: initialData.professionalExperience || '',
    cvUrl: initialData.cvUrl || '',
    cvAssetId: initialData.cvAssetId || '',
    jobRole: initialData.jobRole || '',
  });

  const [errors, setErrors] = useState<EducatorProfileStepErrors>({});

  const set = (field: keyof EducatorProfileStepData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof EducatorProfileStepErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCvUpload = (asset: any) => {
    const url = asset.url || asset.publicUrl || '';
    const id = asset.id || '';
    setData(prev => ({ ...prev, cvUrl: url, cvAssetId: id }));
    if (url) setErrors(prev => ({ ...prev, cvUrl: undefined }));
  };

  const handleRemoveCv = () => {
    setData(prev => ({ ...prev, cvUrl: '', cvAssetId: '' }));
  };

  const validate = (): boolean => {
    const newErrors: EducatorProfileStepErrors = {};

    if (!data.firstName.trim()) newErrors.firstName = t('signup:errors.firstNameRequired', 'First name is required');
    if (!data.lastName.trim()) newErrors.lastName = t('signup:errors.lastNameRequired', 'Last name is required');
    if (!data.phone.trim()) newErrors.phone = t('signup:errors.phoneRequired', 'Phone number is required');
    if (!data.canton) newErrors.canton = t('signup:errors.cantonRequired', 'Canton is required');
    if (!data.city.trim()) newErrors.city = t('signup:errors.cityRequired', 'City is required');
    if (!data.shortBio.trim()) newErrors.shortBio = t('signup:errors.shortBioRequired', 'Short biography is required');
    if (!data.professionalExperience.trim()) newErrors.professionalExperience = t('signup:errors.professionalExperienceRequired', 'Professional experience is required');
    if (!data.jobRole) newErrors.jobRole = t('signup:errors.jobRoleRequired', 'Please select your profile type');
    if (!data.cvUrl) newErrors.cvUrl = t('signup:errors.cvRequired', 'Please upload your CV');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(data);
  };

  const inputClass = (field: keyof EducatorProfileStepErrors) =>
    `${STANDARD_INPUT_FIELD} ${errors[field] ? 'border-swiss-coral' : ''}`;

  const ErrorMsg = ({ field }: { field: keyof EducatorProfileStepErrors }) =>
    errors[field] ? <p className="text-xs text-swiss-coral mt-1">{errors[field]}</p> : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Basic Information */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <UserCircleIcon className="w-4 h-4 text-swiss-mint" />
          {t('signup:educatorProfile.basicInfo', 'Basic Information')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:educatorProfile.firstName', 'First Name')}<span className="text-swiss-coral">*</span>
            </label>
            <input
              type="text"
              value={data.firstName}
              onChange={e => set('firstName', e.target.value)}
              className={inputClass('firstName')}
              placeholder={t('signup:educatorProfile.firstNamePlaceholder', 'Enter your first name')}
            />
            <ErrorMsg field="firstName" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:educatorProfile.lastName', 'Last Name')}<span className="text-swiss-coral">*</span>
            </label>
            <input
              type="text"
              value={data.lastName}
              onChange={e => set('lastName', e.target.value)}
              className={inputClass('lastName')}
              placeholder={t('signup:educatorProfile.lastNamePlaceholder', 'Enter your last name')}
            />
            <ErrorMsg field="lastName" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:educatorProfile.phone', 'Phone Number')}<span className="text-swiss-coral">*</span>
            </label>
            <input
              type="tel"
              value={data.phone}
              onChange={e => set('phone', e.target.value)}
              className={inputClass('phone')}
              placeholder="+41 79 000 00 00"
            />
            <ErrorMsg field="phone" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:labels.email', 'Email Address')}<span className="text-swiss-coral">*</span>
            </label>
            <input
              type="email"
              value={data.email}
              readOnly
              className={`${STANDARD_INPUT_FIELD} bg-gray-100 cursor-not-allowed`}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('signup:educatorProfile.emailFromAccount', 'Email from your account')}
            </p>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <MapPinIcon className="w-4 h-4 text-swiss-mint" />
          {t('signup:educatorProfile.location', 'Location')}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:labels.canton', 'Canton')}<span className="text-swiss-coral">*</span>
            </label>
            <select
              value={data.canton}
              onChange={e => set('canton', e.target.value)}
              className={inputClass('canton')}
            >
              <option value="">{t('signup:placeholders.select', 'Select...')}</option>
              {SWISS_CANTONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ErrorMsg field="canton" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:educatorProfile.city', 'City')}<span className="text-swiss-coral">*</span>
            </label>
            <input
              type="text"
              value={data.city}
              onChange={e => set('city', e.target.value)}
              className={inputClass('city')}
              placeholder={t('signup:educatorProfile.cityPlaceholder', 'e.g. Zurich')}
            />
            <ErrorMsg field="city" />
          </div>
        </div>
      </div>

      {/* Profile Type */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">
          {t('signup:educatorProfile.profileType', 'Your Profile Type')}<span className="text-swiss-coral">*</span>
        </h3>
        <p className="text-xs text-gray-500">
          {t('signup:educatorProfile.profileTypeHint', 'Select the qualification that best describes your role')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EDUCATOR_JOB_ROLES.map(role => (
            <button
              key={role}
              type="button"
              onClick={() => set('jobRole', role)}
              className={`p-3 border-2 rounded-lg text-center text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:ring-offset-1 ${
                data.jobRole === role
                  ? 'border-swiss-mint bg-swiss-mint bg-opacity-10 text-swiss-charcoal'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-swiss-mint hover:bg-gray-50'
              }`}
            >
              {t(`common:educatorJobRoles.${role.replace(/\s+/g, '')}`, role)}
            </button>
          ))}
        </div>
        <ErrorMsg field="jobRole" />
      </div>

      {/* Biography */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <UserCircleIcon className="w-4 h-4 text-swiss-mint" />
          {t('signup:educatorProfile.biography', 'Short Biography')}<span className="text-swiss-coral">*</span>
        </h3>
        <textarea
          rows={3}
          value={data.shortBio}
          onChange={e => set('shortBio', e.target.value)}
          className={inputClass('shortBio')}
          placeholder={t('signup:educatorProfile.shortBioPlaceholder', 'Tell us about yourself, your values, and what motivates you in early childhood education...')}
        />
        <ErrorMsg field="shortBio" />
      </div>

      {/* Professional Experience */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <BriefcaseIcon className="w-4 h-4 text-swiss-mint" />
          {t('signup:educatorProfile.professionalExperience', 'Professional Experience')}<span className="text-swiss-coral">*</span>
        </h3>
        <textarea
          rows={4}
          value={data.professionalExperience}
          onChange={e => set('professionalExperience', e.target.value)}
          className={inputClass('professionalExperience')}
          placeholder={t('signup:educatorProfile.professionalExperiencePlaceholder', 'Describe your work history, institutions you have worked at, years of experience, and key responsibilities...')}
        />
        <ErrorMsg field="professionalExperience" />
        <p className="text-xs text-gray-500">
          {t('signup:educatorProfile.professionalExperienceHint', 'You can add structured work experience entries later from your profile settings.')}
        </p>
      </div>

      {/* CV Upload */}
      <div className={`bg-gray-50 rounded-lg p-4 space-y-3 ${errors.cvUrl ? 'ring-1 ring-swiss-coral' : ''}`}>
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <PaperClipIcon className="w-4 h-4 text-swiss-mint" />
          {t('signup:educatorProfile.cvUpload', 'Upload your CV')}<span className="text-swiss-coral">*</span>
        </h3>

        {data.cvUrl ? (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {data.cvUrl.split('/').pop() || t('signup:educatorProfile.cvDocument', 'CV document')}
                </p>
                <a
                  href={data.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 hover:underline"
                >
                  {t('common:buttons.view', 'View')}
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
            label={t('signup:educatorProfile.cvDragDrop', 'Drag & drop your CV here, or click to browse')}
            acceptedMimeTypes=".pdf,.doc,.docx"
            maxFileSizeMB={5}
            assetKind="CV"
            onUploadSuccess={handleCvUpload}
            autoUpload={true}
          />
        )}
        {errors.cvUrl && <p className="text-xs text-swiss-coral">{errors.cvUrl}</p>}
        <p className="text-xs text-gray-500">
          {t('signup:educatorProfile.cvHint', 'PDF, DOC or DOCX — max 5 MB.')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
        <Button
          type="button"
          variant="light"
          onClick={onBack}
          leftIcon={ArrowLeftIcon}
          className="w-full sm:w-auto text-sm"
        >
          {t('common:buttons.goBack', 'Go Back')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full sm:w-auto bg-swiss-mint hover:bg-opacity-90 text-sm"
          disabled={isLoading}
        >
          {isLoading
            ? t('signup:educatorProfile.savingProfile', 'Saving Profile...')
            : t('signup:educatorProfile.completeSetup', 'Complete Setup')}
        </Button>
      </div>
    </form>
  );
};

export default EducatorProfileStep;
