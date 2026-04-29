import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient, apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  Award,
  Star,
  Building2,
} from 'lucide-react';
import Card from '../components/design-system/Card';
import Button from '../components/design-system/Button';
import ChipInput from '../components/design-system/ChipInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ALL_REGIONS_OPTION, STANDARD_INPUT_FIELD, SWISS_CANTONS_WITH_ALL, EDUCATOR_JOB_ROLES } from '../constants/design-system';
import { UserRole } from '../types';

interface UserProfile {
  id: string;
  profileId: string;
  clerkId: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  contactEmail: string;
  phoneNumber: string;
  region: string;
  jobRole: string;
  cities: string[];
  workExperience: string;
  education: string;
  certifications: string[];
  skills: string[];
  availability: string;
  cvUrl: string;
  shortBio: string;
  candidatePoolVisible: boolean;
  avatarUrl: string | null;
  avatarAssetId: string | null;
  coverImageUrl: string | null;
  coverAssetId: string | null;
  organization?: {
    id: string;
    name: string;
    type: string;
    logoUrl: string | null;
  } | null;
}

const AdminUserProfileEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Fetch user profile
  const { data: profileResponse, isLoading, error } = useQuery({
    queryKey: ['admin-user-profile', id],
    queryFn: () => apiService.getAdminUserProfile(apiClient, id!),
    enabled: !!id && !!apiClient,
  });

  const profile = profileResponse?.data?.data;

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        contactEmail: profile.contactEmail || '',
        phoneNumber: profile.phoneNumber || '',
        region: profile.region || '',
        jobRole: (() => {
          const raw = profile.jobRole || '';
          return (EDUCATOR_JOB_ROLES as readonly string[]).includes(raw) ? raw : '';
        })(),
        cities: profile.cities || [],
        workExperience: profile.workExperience || '',
        education: profile.education || '',
        certifications: profile.certifications || [],
        skills: profile.skills || [],
        availability: profile.availability || '',
        cvUrl: profile.cvUrl || '',
        shortBio: profile.shortBio || '',
        candidatePoolVisible: profile.candidatePoolVisible || false,
      });
    }
  }, [profile]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) =>
      apiService.updateAdminUserProfile(apiClient, id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-profile', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsDirty(false);
      toast.success(t('admin:userProfile.updateSuccess', 'Profile updated successfully'));
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || t('admin:userProfile.updateError', 'Failed to update profile');
      toast.error(message);
    },
  });

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // Core submit logic - separated for reuse by both form submit and button click
  const submitForm = async () => {
    try {
      await updateMutation.mutateAsync(formData);
    } catch {
      // Error already handled by onError callback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  // Handler for Save button click (avoids MouseEvent/FormEvent type mismatch)
  const handleSaveClick = () => {
    submitForm();
  };

  const handleBack = () => {
    if (isDirty) {
      if (window.confirm(t('common:unsavedChangesPrompt', 'You have unsaved changes. Are you sure you want to leave?'))) {
        navigate('/users');
      }
    } else {
      navigate('/users');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{t('admin:userProfile.loadError', 'Failed to load user profile')}</div>
        <Button variant="secondary" onClick={() => navigate('/users')}>
          {t('common:back', 'Back')}
        </Button>
      </div>
    );
  }

  const isEducator = profile.role === UserRole.EDUCATOR;
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={handleBack}>
            {t('common:back', 'Back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-swiss-charcoal flex items-center">
              <User className="h-6 w-6 mr-2 text-swiss-teal" />
              {t('admin:userProfile.editTitle', 'Edit User Profile')}
            </h1>
            <p className="text-gray-600 mt-1">
              {fullName} • <span className="text-swiss-teal">{profile.role}</span>
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          leftIcon={Save}
          onClick={handleSaveClick}
          disabled={!isDirty || updateMutation.isPending}
        >
          {updateMutation.isPending ? t('common:saving', 'Saving...') : t('common:saveChanges', 'Save Changes')}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Info (if applicable) */}
        {profile.organization && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-swiss-teal" />
              {t('admin:userProfile.organization', 'Organization')}
            </h3>
            <div className="flex items-center space-x-4">
              {profile.organization.logoUrl && (
                <img
                  src={profile.organization.logoUrl}
                  alt={profile.organization.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-medium text-gray-900">{profile.organization.name}</p>
                <p className="text-sm text-gray-500">{profile.organization.type}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/organizations/${profile.organization!.id}/profile`)}
              >
                {t('admin:userProfile.editOrgProfile', 'Edit Organization Profile')}
              </Button>
            </div>
          </Card>
        )}

        {/* Basic Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-swiss-teal" />
            {t('admin:userProfile.basicInfo', 'Basic Information')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:userProfile.firstName', 'First Name')}
              </label>
              <input
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:userProfile.firstNamePlaceholder', 'Enter first name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:userProfile.lastName', 'Last Name')}
              </label>
              <input
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:userProfile.lastNamePlaceholder', 'Enter last name')}
              />
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-swiss-teal" />
            {t('admin:userProfile.contactInfo', 'Contact Information')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:userProfile.email', 'Email')}
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:userProfile.emailPlaceholder', 'user@example.com')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:userProfile.contactEmail', 'Contact Email')}
              </label>
              <input
                type="email"
                value={formData.contactEmail || ''}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:userProfile.contactEmailPlaceholder', 'contact@example.com')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('admin:userProfile.contactEmailHint', 'Public contact email (different from login email)')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:userProfile.phone', 'Phone Number')}
              </label>
              <input
                type="tel"
                value={formData.phoneNumber || ''}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="+41 XX XXX XX XX"
              />
            </div>
          </div>
        </Card>

        {/* Location (for Educators) */}
        {isEducator && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-swiss-teal" />
              {t('admin:userProfile.location', 'Location')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:userProfile.region', 'Region / Canton')}
                </label>
                <select
                  value={formData.region || ''}
                  onChange={(e) => handleChange('region', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                >
                  <option value="">{t('admin:userProfile.selectRegion', 'Select a region')}</option>
                  {SWISS_CANTONS_WITH_ALL.map((canton) => (
                    <option key={canton} value={canton}>
                      {canton === ALL_REGIONS_OPTION ? t('common:filters.all', 'All') : canton}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:userProfile.cities', 'Cities')}
                </label>
                <ChipInput
                  selectedChips={formData.cities || []}
                  onChange={(chips) => handleChange('cities', chips)}
                  placeholder={t('admin:userProfile.citiesPlaceholder', 'Add cities...')}
                  allowCustomValues={true}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Professional Details (for Educators) */}
        {isEducator && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-swiss-teal" />
              {t('admin:userProfile.professionalDetails', 'Professional Details')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:userProfile.jobRoles', 'Job Role')}
                </label>
                <select
                  value={formData.jobRole || ''}
                  onChange={(e) => {
                    const role = e.target.value;
                    handleChange('jobRole', role);
                  }}
                  className={STANDARD_INPUT_FIELD}
                >
                  <option value="">{t('admin:userProfile.jobRolesPlaceholder', 'Select a role')}</option>
                  {EDUCATOR_JOB_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:userProfile.availability', 'Availability')}
                </label>
                <input
                  type="text"
                  value={formData.availability || ''}
                  onChange={(e) => handleChange('availability', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('admin:userProfile.availabilityPlaceholder', 'e.g., Full-time, Available immediately')}
                />
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="candidatePoolVisible"
                  checked={formData.candidatePoolVisible || false}
                  onChange={(e) => handleChange('candidatePoolVisible', e.target.checked)}
                  className="h-4 w-4 text-swiss-teal focus:ring-swiss-teal border-gray-300 rounded"
                />
                <label htmlFor="candidatePoolVisible" className="text-sm text-gray-700">
                  {t('admin:userProfile.candidatePoolVisible', 'Visible in candidate pool')}
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* Bio Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-swiss-teal" />
            {t('admin:userProfile.bio', 'Bio / About')}
          </h3>
          <textarea
            value={formData.shortBio || ''}
            onChange={(e) => handleChange('shortBio', e.target.value)}
            rows={4}
            className={STANDARD_INPUT_FIELD}
            placeholder={t('admin:userProfile.bioPlaceholder', 'Tell us about this user...')}
          />
        </Card>

        {/* Skills & Certifications (for Educators) */}
        {isEducator && (
          <>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Star className="w-5 h-5 mr-2 text-swiss-teal" />
                {t('admin:userProfile.skills', 'Skills')}
              </h3>
              <ChipInput
                selectedChips={formData.skills || []}
                onChange={(chips) => handleChange('skills', chips)}
                placeholder={t('admin:userProfile.skillsPlaceholder', 'e.g., Montessori, Bilingual')}
                allowCustomValues={true}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-swiss-teal" />
                {t('admin:userProfile.certifications', 'Certifications')}
              </h3>
              <ChipInput
                selectedChips={formData.certifications || []}
                onChange={(chips) => handleChange('certifications', chips)}
                placeholder={t('admin:userProfile.certificationsPlaceholder', 'e.g., CPR Certified')}
                allowCustomValues={true}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2 text-swiss-teal" />
                {t('admin:userProfile.education', 'Education')}
              </h3>
              <textarea
                value={formData.education || ''}
                onChange={(e) => handleChange('education', e.target.value)}
                rows={4}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:userProfile.educationPlaceholder', 'List educational background...')}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-swiss-teal" />
                {t('admin:userProfile.workExperience', 'Work Experience')}
              </h3>
              <textarea
                value={formData.workExperience || ''}
                onChange={(e) => handleChange('workExperience', e.target.value)}
                rows={6}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:userProfile.workExperiencePlaceholder', 'Describe work experience...')}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-swiss-teal" />
                {t('admin:userProfile.cvUrl', 'CV / Resume URL')}
              </h3>
              <input
                type="url"
                value={formData.cvUrl || ''}
                onChange={(e) => handleChange('cvUrl', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="https://..."
              />
            </Card>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={handleBack}>
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            leftIcon={Save}
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? t('common:saving', 'Saving...') : t('common:saveChanges', 'Save Changes')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminUserProfileEdit;
