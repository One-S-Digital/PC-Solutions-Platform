import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserCircleIcon,
  BriefcaseIcon,
  MapPinIcon,
  PaperClipIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import FileUploadZone from '../ui/FileUploadZone';
import { STANDARD_INPUT_FIELD, SWISS_CANTONS, EDUCATOR_JOB_ROLES, type EducatorJobRole } from '../../constants';
import { readEducatorDraft, writeEducatorDraft } from '../../utils/signupDraft';

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
  /** Set when the last save attempt failed, so the user can retry without retyping. */
  submitError?: string | null;
  /** Set when the account is still being provisioned in the background. */
  provisioningDelayed?: boolean;
  /**
   * True once a Clerk account exists. There is then no earlier wizard step to
   * return to — step 2 is the account-creation form and would reject the
   * already-registered email — so "Go Back" becomes "Sign out".
   */
  accountExists?: boolean;
}

// Drop blank values so already-typed input wins over a stale draft field, but
// an untouched field still falls back to the draft.
const stripEmpty = (
  value: Partial<EducatorProfileStepData>,
): Partial<EducatorProfileStepData> =>
  Object.fromEntries(
    Object.entries(value).filter(([, v]) => typeof v === 'string' && v.trim() !== ''),
  ) as Partial<EducatorProfileStepData>;

const EducatorProfileStep: React.FC<EducatorProfileStepProps> = ({
  initialData,
  onSubmit,
  onBack,
  isLoading,
  submitError = null,
  provisioningDelayed = false,
  accountExists = false,
}) => {
  const { t } = useTranslation(['signup', 'common', 'settings']);

  const buildFrom = (
    draft: Partial<EducatorProfileStepData> | null,
    base: Partial<EducatorProfileStepData>,
  ): EducatorProfileStepData => {
    const pick = (field: keyof EducatorProfileStepData) =>
      (draft?.[field] as string | undefined) || (base[field] as string | undefined) || '';
    return {
      firstName: pick('firstName'),
      lastName: pick('lastName'),
      phone: pick('phone'),
      email: base.email || (draft?.email as string) || '',
      canton: pick('canton'),
      city: pick('city'),
      shortBio: pick('shortBio'),
      professionalExperience: pick('professionalExperience'),
      cvUrl: pick('cvUrl'),
      cvAssetId: pick('cvAssetId'),
      jobRole: (draft?.jobRole as EducatorJobRole | '') || base.jobRole || '',
    };
  };

  const [data, setData] = useState<EducatorProfileStepData>(() =>
    buildFrom(readEducatorDraft<Partial<EducatorProfileStepData>>(initialData.email), initialData),
  );

  const [errors, setErrors] = useState<EducatorProfileStepErrors>({});

  // The authenticated account often resolves *after* this form first mounts, so
  // `initialData.email` starts empty and no draft can be looked up yet. Restore
  // once, as soon as the email is known, layering the saved draft over whatever
  // the user has already typed. Without this the draft written during an earlier
  // visit is never found and the educator silently re-types everything.
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    const email = initialData.email;
    if (!email || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const draft = readEducatorDraft<Partial<EducatorProfileStepData>>(email);
    setData(prev => buildFrom(draft, { ...initialData, ...stripEmpty(prev), email }));
  }, [initialData.email]);

  // Persist the draft as the user edits so nothing typed here is lost before the
  // "Complete Setup" PATCH succeeds. The parent clears it once step 4 is reached.
  // Skipped while the email is unknown — an anonymous draft could never be
  // safely matched back to its owner.
  useEffect(() => {
    if (!data.email) return;
    writeEducatorDraft(data.email, data);
  }, [data]);

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

      {/* Account still provisioning — non-blocking. The educator can fill the
          form now; the save retries until the backend account is ready. */}
      {provisioningDelayed && !submitError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            {t(
              'signup:educatorProfile.provisioningDelayed',
              'Your account is still being set up. You can fill in your details now — we will save them as soon as it is ready.',
            )}
          </p>
        </div>
      )}

      {/* Save failure — surfaced inline (never as an alert() that can be
          dismissed while the typed data is discarded). The draft is kept, so
          "Complete Setup" can simply be pressed again. */}
      {submitError && (
        <div className="rounded-lg border border-swiss-coral bg-red-50 p-3" role="alert">
          <p className="text-sm font-medium text-swiss-coral">
            {t('signup:educatorProfile.saveFailedTitle', 'We could not save your profile')}
          </p>
          <p className="text-sm text-gray-700 mt-1">{submitError}</p>
          <p className="text-xs text-gray-600 mt-2">
            {t(
              'signup:educatorProfile.saveFailedHint',
              'Your answers have been kept on this device. Press "Complete Setup" again to retry.',
            )}
          </p>
        </div>
      )}

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
          leftIcon={accountExists ? ArrowRightOnRectangleIcon : ArrowLeftIcon}
          className="w-full sm:w-auto text-sm"
        >
          {accountExists
            ? t('common:loginPage.signOutButton', 'Sign Out')
            : t('common:buttons.goBack', 'Go Back')}
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
