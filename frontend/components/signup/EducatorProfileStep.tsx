import React, { useEffect, useId, useRef, useState } from 'react';
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
import { SignupTraceEvent, traceSignup } from '../../utils/signupTrace';

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

// Top-to-bottom order of the fields on screen. The first one with an error is
// the one the user is taken to.
const FIELD_ORDER: Array<keyof EducatorProfileStepErrors> = [
  'firstName',
  'lastName',
  'phone',
  'canton',
  'city',
  'jobRole',
  'shortBio',
  'professionalExperience',
  'cvUrl',
];

/** Bring an element to the middle of the screen, without animation if the user asks for none. */
const scrollToCenter = (el: HTMLElement) => {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  el.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
};

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

  // Ids tie each label, input and error message together, and give the submit
  // handler something to scroll to.
  const uid = useId();
  const fieldId = (field: string) => `${uid}-${field}`;

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

    // Precedence matters: anything the user has ALREADY TYPED must win over the
    // stored draft. `buildFrom` gives its first argument priority, so the typed
    // values are layered on top of the draft there — not passed as `base`, which
    // would let a stale draft silently overwrite live input. That window is real:
    // the form is editable before `initialData.email` resolves, and the persist
    // effect is skipped while the email is unknown.
    const draft = readEducatorDraft<Partial<EducatorProfileStepData>>(email);

    // Whether the draft came back is the difference between "the user walked
    // away" and "we lost what they typed". Both end in an INCOMPLETE profile
    // and look identical in the admin list, so the trace has to record which.
    traceSignup(
      draft ? SignupTraceEvent.DRAFT_RESTORED : SignupTraceEvent.DRAFT_MISSING,
      {
        email,
        outcome: draft ? 'OK' : 'SKIP',
        detail: draft
          ? {
              // Presence only. Enough to tell a full draft from a stub that
              // would not have promoted the profile anyway.
              hasShortBio: Boolean(draft.shortBio?.trim()),
              hasCvUrl: Boolean(draft.cvUrl?.trim()),
              hasProfessionalExperience: Boolean(draft.professionalExperience?.trim()),
              fieldCount: Object.keys(draft).length,
            }
          : undefined,
      },
    );

    setData(prev =>
      buildFrom({ ...(draft ?? {}), ...stripEmpty(prev) }, { ...initialData, email }),
    );
  }, [initialData.email]);

  // Persist the draft as the user edits so nothing typed here is lost before the
  // "Complete Setup" PATCH succeeds. The parent clears it once step 4 is reached.
  // Skipped while the email is unknown — an anonymous draft could never be
  // safely matched back to its owner.
  const hasTracedDraftSaveRef = useRef(false);
  useEffect(() => {
    if (!data.email) return;
    writeEducatorDraft(data.email, data);

    // Once per mount, not per keystroke: this only needs to confirm that
    // persistence is working at all for this user, and a row per character
    // would drown the timeline it is meant to make readable.
    if (!hasTracedDraftSaveRef.current) {
      hasTracedDraftSaveRef.current = true;
      traceSignup(SignupTraceEvent.DRAFT_SAVED, { email: data.email });
    }
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

  const computeErrors = (): EducatorProfileStepErrors => {
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

    return newErrors;
  };

  /**
   * Take the user to the field that needs attention.
   *
   * The form is two to three screens tall on a phone and the submit button is at
   * the bottom, so without this a failed submit changes nothing the user can
   * see: every error but the last one or two is above the fold.
   */
  const focusField = (field: keyof EducatorProfileStepErrors) => {
    const el = document.getElementById(fieldId(field));
    if (!el) return;
    scrollToCenter(el);
    // preventScroll: the smooth scroll above is the one that should win.
    el.focus({ preventScroll: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = computeErrors();
    setErrors(found);

    const firstInvalid = FIELD_ORDER.find(field => found[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }
    await onSubmit(data);
  };

  // A failed save is reported in a banner at the TOP of the form, but it is the
  // button at the bottom that was just pressed — so bring the banner to the user.
  const submitErrorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (submitError && submitErrorRef.current) scrollToCenter(submitErrorRef.current);
  }, [submitError]);

  const fieldProps = (field: keyof EducatorProfileStepErrors) => ({
    id: fieldId(field),
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${fieldId(field)}-error` : undefined,
  });

  const inputClass = (field: keyof EducatorProfileStepErrors) =>
    `${STANDARD_INPUT_FIELD} ${errors[field] ? 'border-swiss-coral' : ''}`;

  const ErrorMsg = ({ field }: { field: keyof EducatorProfileStepErrors }) =>
    errors[field] ? (
      <p id={`${fieldId(field)}-error`} className="text-xs text-swiss-coral mt-1">
        {errors[field]}
      </p>
    ) : null;

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
        <div ref={submitErrorRef} className="rounded-lg border border-swiss-coral bg-red-50 p-3" role="alert">
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
            <label htmlFor={fieldId('firstName')} className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:educatorProfile.firstName', 'First Name')}<span className="text-swiss-coral">*</span>
            </label>
            <input
              {...fieldProps('firstName')}
              type="text"
              autoComplete="given-name"
              autoCapitalize="words"
              value={data.firstName}
              onChange={e => set('firstName', e.target.value)}
              className={inputClass('firstName')}
              placeholder={t('signup:educatorProfile.firstNamePlaceholder', 'Enter your first name')}
            />
            <ErrorMsg field="firstName" />
          </div>

          <div>
            <label htmlFor={fieldId('lastName')} className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:educatorProfile.lastName', 'Last Name')}<span className="text-swiss-coral">*</span>
            </label>
            <input
              {...fieldProps('lastName')}
              type="text"
              autoComplete="family-name"
              autoCapitalize="words"
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
            <label htmlFor={fieldId('phone')} className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:educatorProfile.phone', 'Phone Number')}<span className="text-swiss-coral">*</span>
            </label>
            <input
              {...fieldProps('phone')}
              type="tel"
              autoComplete="tel"
              value={data.phone}
              onChange={e => set('phone', e.target.value)}
              className={inputClass('phone')}
              placeholder="+41 79 000 00 00"
            />
            <ErrorMsg field="phone" />
          </div>

          <div>
            <label htmlFor={fieldId('email')} className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:labels.email', 'Email Address')}<span className="text-swiss-coral">*</span>
            </label>
            <input
              id={fieldId('email')}
              type="email"
              autoComplete="email"
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
            <label htmlFor={fieldId('canton')} className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:labels.canton', 'Canton')}<span className="text-swiss-coral">*</span>
            </label>
            <select
              {...fieldProps('canton')}
              autoComplete="address-level1"
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
            <label htmlFor={fieldId('city')} className="block text-sm font-medium text-gray-700 mb-1">
              {t('signup:educatorProfile.city', 'City')}<span className="text-swiss-coral">*</span>
            </label>
            <input
              {...fieldProps('city')}
              type="text"
              autoComplete="address-level2"
              autoCapitalize="words"
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
      <div
        {...fieldProps('jobRole')}
        tabIndex={-1}
        role="group"
        aria-labelledby={`${fieldId('jobRole')}-label`}
        className="bg-gray-50 rounded-lg p-4 space-y-3 focus:outline-none"
      >
        <h3 id={`${fieldId('jobRole')}-label`} className="text-sm font-semibold text-gray-700">
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
              aria-pressed={data.jobRole === role}
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
        <h3 id={`${fieldId('shortBio')}-label`} className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <UserCircleIcon className="w-4 h-4 text-swiss-mint" />
          {t('signup:educatorProfile.biography', 'Short Biography')}<span className="text-swiss-coral">*</span>
        </h3>
        <textarea
          {...fieldProps('shortBio')}
          aria-labelledby={`${fieldId('shortBio')}-label`}
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
        <h3 id={`${fieldId('professionalExperience')}-label`} className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <BriefcaseIcon className="w-4 h-4 text-swiss-mint" />
          {t('signup:educatorProfile.professionalExperience', 'Professional Experience')}<span className="text-swiss-coral">*</span>
        </h3>
        <textarea
          {...fieldProps('professionalExperience')}
          aria-labelledby={`${fieldId('professionalExperience')}-label`}
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
      <div
        {...fieldProps('cvUrl')}
        tabIndex={-1}
        className={`bg-gray-50 rounded-lg p-4 space-y-3 focus:outline-none ${errors.cvUrl ? 'ring-1 ring-swiss-coral' : ''}`}
      >
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
            label={t('signup:educatorProfile.cvSelect', 'Select your CV')}
            acceptedMimeTypes=".pdf,.doc,.docx"
            maxFileSizeMB={5}
            assetKind="CV"
            onUploadSuccess={handleCvUpload}
            autoUpload={true}
          />
        )}
        {errors.cvUrl && (
          <p id={`${fieldId('cvUrl')}-error`} className="text-xs text-swiss-coral">{errors.cvUrl}</p>
        )}
        <p className="text-xs text-gray-500">
          {t('signup:educatorProfile.cvHint', 'PDF, DOC or DOCX — max 5 MB. Required.')}
        </p>
      </div>

      {/* Actions. The submit button comes first in the DOM so it is the top one when
          they stack on a phone — with "Sign out" directly above it, one slipped tap
          ended the session — and `sm:flex-row-reverse` puts it back on the right
          from the sm breakpoint up. */}
      <div className="flex flex-col sm:flex-row-reverse justify-between items-center gap-3 pt-2">
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
      </div>
    </form>
  );
};

export default EducatorProfileStep;
