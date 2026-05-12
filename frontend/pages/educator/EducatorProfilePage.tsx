
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ChipInput from '../../components/ui/ChipInput';
import { STANDARD_INPUT_FIELD } from '../../constants';
import {
    UserCircleIcon, IdentificationIcon, CalendarDaysIcon,
    BriefcaseIcon, AcademicCapIcon, PaperClipIcon, StarIcon, PencilSquareIcon, XMarkIcon,
    PlusIcon, TrashIcon, DocumentTextIcon, MapPinIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import FileUploadZone from '../../components/ui/FileUploadZone';
import { WorkExperienceItem, EducationItem, CertificationItem, DocumentItem } from '../../types';

const MAX_DOCUMENTS = 5;

interface EducatorProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  workExperience: string;
  education: string;
  certifications: string[];
  workExperienceItems?: WorkExperienceItem[];
  educationItems?: EducationItem[];
  certificationItems?: CertificationItem[];
  skills: string[];
  availability: string;
  cvUrl: string;
  documents: DocumentItem[];
  shortBio: string;
  avatarAssetId: string;
  avatarUrl?: string;
  candidatePoolVisible: boolean;
  availableForReplacement: boolean;
  region: string;
  jobRole: string;
  cities: string[];
}

const SectionCard: React.FC<{ 
  titleKey: string; 
  icon: React.ElementType; 
  children: React.ReactNode; 
  onEdit?: () => void; 
  isEditing?: boolean;
  onAdd?: () => void;
  addLabel?: string;
}> = ({ titleKey, icon: Icon, children, onEdit, isEditing, onAdd, addLabel }) => {
    const { t } = useTranslation(['dashboard', 'common']);
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-swiss-charcoal flex items-center">
            <Icon className="w-6 h-6 mr-3 text-swiss-teal" />
            {t(titleKey)}
          </h2>
          <div className="flex items-center space-x-2">
            {onAdd && !isEditing && (
              <Button variant="ghost" size="sm" onClick={onAdd} leftIcon={PlusIcon}>
                {addLabel || t('common:buttons.add')}
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit} leftIcon={isEditing ? XMarkIcon : PencilSquareIcon}>
                {isEditing ? t('common:buttons.cancel') : t('common:buttons.edit')}
              </Button>
            )}
          </div>
        </div>
        {children}
      </Card>
    );
};

const EducatorProfilePage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common', 'settings']);
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { addNotification } = useNotifications();
  const { request } = useAuthenticatedApi();
  
  const [profile, setProfile] = useState<EducatorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Editing states for each section
  const [editingBio, setEditingBio] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [editingExperience, setEditingExperience] = useState(false);
  const [editingEducation, setEditingEducation] = useState(false);
  const [editingCertifications, setEditingCertifications] = useState(false);
  
  // Temporary edit values
  const [tempBio, setTempBio] = useState('');
  const [tempSkills, setTempSkills] = useState<string[]>([]);
  const [tempAvailability, setTempAvailability] = useState('');
  const [tempExperience, setTempExperience] = useState('');
  const [tempEducation, setTempEducation] = useState('');
  const [tempCertifications, setTempCertifications] = useState<string[]>([]);
  const [tempCandidatePoolVisible, setTempCandidatePoolVisible] = useState<boolean | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await request<{ success: boolean; data?: any }>('/settings/educator');
      if (response.success && response.data) {
        const data = response.data as any;
        setProfile({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || currentUser.email || '',
          phoneNumber: data.phoneNumber || '',
          region: data.region || '',
          jobRole: data.jobRole || '',
          cities: Array.isArray(data.cities) ? data.cities : [],
          workExperience: data.workExperience || '',
          education: data.education || '',
          certifications: Array.isArray(data.certifications) ? data.certifications : [],
          workExperienceItems: Array.isArray(data.workExperienceItems) ? data.workExperienceItems : [],
          educationItems: Array.isArray(data.educationItems) ? data.educationItems : [],
          certificationItems: Array.isArray(data.certificationItems) ? data.certificationItems : [],
          skills: Array.isArray(data.skills) ? data.skills : [],
          availability: data.availability || '',
          cvUrl: data.cvUrl || '',
          documents: Array.isArray(data.documents) ? data.documents : [],
          shortBio: data.shortBio || '',
          avatarAssetId: data.avatarAssetId || '',
          avatarUrl: data.avatarUrl || currentUser.avatarUrl, // Use backend avatarUrl, fallback to currentUser
          candidatePoolVisible: !!data.candidatePoolVisible,
          availableForReplacement: !!data.availableForReplacement,
        });
      } else {
        // Initialize with defaults if no data
        setProfile({
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          email: currentUser.email || '',
          phoneNumber: '',
          region: '',
          jobRole: '',
          cities: [],
          workExperience: '',
          education: '',
          certifications: [],
          workExperienceItems: [],
          educationItems: [],
          certificationItems: [],
          skills: [],
          availability: '',
          cvUrl: '',
          documents: [],
          shortBio: '',
          avatarAssetId: '',
          avatarUrl: currentUser.avatarUrl || '', // Fallback to currentUser
          candidatePoolVisible: false,
          availableForReplacement: false,
        });
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('educatorProfilePage.loadError', 'Unable to load profile.'));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [currentUser, request, t]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async (updates: Partial<EducatorProfileData>) => {
    if (!profile) return false;
    
    setSaving(true);
    try {
      // PATCH semantics: only send changed fields (prevents validation failures
      // for users with missing/empty optional fields like email).
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) continue;
        if (key === 'email' && typeof value === 'string' && value.trim().length === 0) {
          continue;
        }
        payload[key] = value;
      }

      const response = await request<{ success: boolean; message?: string }>('/settings/educator', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        setProfile(prev => prev ? { ...prev, ...updates } : null);
        addNotification({
          title: t('common:notifications.successTitle', 'Success'),
          message: t('educatorProfilePage.saveSuccess', 'Profile updated successfully!'),
          type: 'success',
        });
        return true;
      } else {
        throw new Error(response.message || 'Failed to save');
      }
    } catch (err) {
      console.error(err);
      addNotification({
        title: t('common:errors.genericErrorTitle', 'Error'),
        message: err instanceof Error ? err.message : t('educatorProfilePage.saveError', 'Failed to save profile changes.'),
        type: 'error',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Bio editing handlers
  const handleEditBio = () => {
    setTempBio(profile?.shortBio || '');
    setEditingBio(true);
  };
  const handleSaveBio = async () => {
    const success = await saveProfile({ shortBio: tempBio });
    if (success) setEditingBio(false);
  };
  const handleCancelBio = () => {
    setEditingBio(false);
    setTempBio('');
  };

  // Skills editing handlers
  const handleEditSkills = () => {
    setTempSkills(profile?.skills || []);
    setEditingSkills(true);
  };
  const handleSaveSkills = async () => {
    const success = await saveProfile({ skills: tempSkills });
    if (success) setEditingSkills(false);
  };
  const handleCancelSkills = () => {
    setEditingSkills(false);
    setTempSkills([]);
  };

  // Availability editing handlers
  const handleEditAvailability = () => {
    setTempAvailability(profile?.availability || '');
    setEditingAvailability(true);
  };
  const handleSaveAvailability = async () => {
    const success = await saveProfile({ availability: tempAvailability });
    if (success) setEditingAvailability(false);
  };
  const handleCancelAvailability = () => {
    setEditingAvailability(false);
    setTempAvailability('');
  };

  // Experience editing handlers
  const handleEditExperience = () => {
    setTempExperience(profile?.workExperience || '');
    setEditingExperience(true);
  };
  const handleSaveExperience = async () => {
    const success = await saveProfile({ workExperience: tempExperience });
    if (success) setEditingExperience(false);
  };
  const handleCancelExperience = () => {
    setEditingExperience(false);
    setTempExperience('');
  };

  // Education editing handlers
  const handleEditEducation = () => {
    setTempEducation(profile?.education || '');
    setEditingEducation(true);
  };
  const handleSaveEducation = async () => {
    const success = await saveProfile({ education: tempEducation });
    if (success) setEditingEducation(false);
  };
  const handleCancelEducation = () => {
    setEditingEducation(false);
    setTempEducation('');
  };

  // Certifications editing handlers
  const handleEditCertifications = () => {
    setTempCertifications(profile?.certifications || []);
    setEditingCertifications(true);
  };
  const handleSaveCertifications = async () => {
    const success = await saveProfile({ certifications: tempCertifications });
    if (success) setEditingCertifications(false);
  };
  const handleCancelCertifications = () => {
    setEditingCertifications(false);
    setTempCertifications([]);
  };

  const handleSaveCandidatePoolVisibility = async () => {
    const nextValue = tempCandidatePoolVisible ?? profile?.candidatePoolVisible ?? false;
    const success = await saveProfile({ candidatePoolVisible: nextValue });
    if (success) {
      setTempCandidatePoolVisible(null);
    }
  };

  // Document management handlers
  const handleDocumentUpload = async (asset: { url: string; id: string }, fileName: string) => {
    if (!profile) return;
    const existing = profile.documents || [];
    if (existing.length >= MAX_DOCUMENTS) return;
    const newDoc: DocumentItem = {
      id: asset.id,
      name: fileName,
      url: asset.url,
      type: existing.length === 0 ? 'CV' : 'Other',
      uploadDate: new Date().toISOString(),
      size: 0,
    };
    const updated = [...existing, newDoc];
    await saveProfile({ documents: updated });
  };

  const handleRemoveDocument = async (docId: string) => {
    if (!profile) return;
    if (!window.confirm(t('educatorProfilePage.documents.confirmRemove', 'Are you sure you want to remove this document?'))) {
      return;
    }
    const updated = (profile.documents || []).filter((d) => d.id !== docId);
    await saveProfile({ documents: updated });
  };

  // Legacy CV upload handler (kept for backward compat — adds as first document)
  const handleCvUpload = async (asset: { url: string; id: string }) => {
    await handleDocumentUpload(asset, asset.url.split('/').pop() || 'CV Document');
  };

  const handleRemoveCv = async () => {
    if (!window.confirm(t('educatorProfilePage.documents.confirmRemove', 'Are you sure you want to remove your CV?'))) {
      return;
    }
    await saveProfile({ cvUrl: '' });
  };

  // Parse JSON data for display
  const parseWorkExperience = (data: string): WorkExperienceItem[] => {
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // If not JSON, return empty - user can add structured data
      return [];
    }
  };

  const parseEducation = (data: string): EducationItem[] => {
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint mx-auto mb-4"></div>
          <p className="text-gray-500">{t('common:loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 min-h-[400px]">
        <UserCircleIcon className="w-16 h-16 text-gray-300" />
        <p className="text-red-600">{error || t('educatorProfilePage.loadError', 'Unable to load profile.')}</p>
        <Button variant="primary" onClick={fetchProfile}>{t('common:buttons.retry', 'Retry')}</Button>
      </div>
    );
  }

  const workExperienceItems =
    profile.workExperienceItems && profile.workExperienceItems.length > 0
      ? profile.workExperienceItems
      : parseWorkExperience(profile.workExperience);
  const educationItems =
    profile.educationItems && profile.educationItems.length > 0
      ? profile.educationItems
      : parseEducation(profile.education);
  const hasStructuredExperience = workExperienceItems.length > 0;
  const hasStructuredEducation = educationItems.length > 0;

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || t('educatorProfilePage.unnamed', 'Unnamed Educator');
  const avatarUrl = profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=48CFAE&color=fff&size=128`;
  const roleDisplay = profile.jobRole
    ? profile.jobRole
    : t('educatorProfilePage.roleNotProvided', 'Role not provided');
  const locationDisplay = [
    ...(profile.cities.length > 0 ? [profile.cities.join(', ')] : []),
    ...(profile.region ? [profile.region] : []),
  ].join(' • ') || t('educatorProfilePage.locationNotProvided', 'Location not provided');
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center mb-4 sm:mb-0">
          <IdentificationIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('dashboard:sidebar.myProfile')}
        </h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/settings/profile')}
            leftIcon={PencilSquareIcon}
          >
            {t('educatorProfilePage.editFullProfile', 'Edit Full Profile')}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card className="p-6 text-center">
            <img
              src={avatarUrl}
              alt={t('common:profile', 'Profile')}
              className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white shadow-lg bg-gray-200"
            />
            <h2 className="text-2xl font-bold text-swiss-charcoal mt-4">{fullName}</h2>
            <p className="text-md text-swiss-teal">{t('educatorProfilePage.educator', 'EDUCATOR')}</p>
            <p className="text-sm text-gray-500">{profile.email}</p>
            {profile.phoneNumber && (
              <p className="text-sm text-gray-500">{profile.phoneNumber}</p>
            )}
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <p className="flex items-center justify-center">
                <BriefcaseIcon className="w-4 h-4 mr-2 text-gray-400" />
                {roleDisplay}
              </p>
              <p className="flex items-center justify-center">
                <MapPinIcon className="w-4 h-4 mr-2 text-gray-400" />
                {locationDisplay}
              </p>
            </div>
          </Card>

          {/* Candidate Pool Visibility */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-swiss-charcoal mb-2">
              {t('dashboard:educatorProfilePage.visibility.title', 'Candidate Pool Visibility')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t(
                'educatorProfilePage.visibility.description',
                'Control whether daycares can find your profile in the candidate pool.',
              )}
            </p>
            <div className="flex items-start justify-between gap-4">
              <label className="text-sm text-gray-700 leading-snug">
                <span className="font-medium">
                  {t('dashboard:educatorProfilePage.visibility.toggleLabel', 'Make my profile visible')}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  {t(
                    'educatorProfilePage.visibility.toggleHint',
                    'When enabled, foundations can view your profile in the candidate pool.',
                  )}
                </div>
              </label>
              <input
                type="checkbox"
                className="h-5 w-5 mt-0.5 accent-swiss-mint"
                checked={tempCandidatePoolVisible ?? profile.candidatePoolVisible}
                onChange={(e) => setTempCandidatePoolVisible(e.target.checked)}
                aria-label={t('dashboard:educatorProfilePage.visibility.toggleLabel', 'Make my profile visible')}
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveCandidatePoolVisibility}
                disabled={saving || tempCandidatePoolVisible === null}
              >
                {saving ? t('common:buttons.saving', 'Saving...') : t('common:buttons.save')}
              </Button>
            </div>
          </Card>

          {/* Skills Section */}
          <SectionCard 
            titleKey="educatorProfilePage.skills.title" 
            icon={StarIcon}
            onEdit={editingSkills ? handleCancelSkills : handleEditSkills}
            isEditing={editingSkills}
          >
            {editingSkills ? (
              <div className="space-y-3">
                <ChipInput
                  selectedChips={tempSkills}
                  onChange={setTempSkills}
                  placeholder={t('educatorProfilePage.skills.placeholder', 'e.g., Early Childhood Education, First Aid, Bilingual')}
                  allowCustomValues={true}
                />
                <p className="text-xs text-gray-500">{t('educatorProfilePage.skills.hint', 'Type and press Enter to add skills')}</p>
                <div className="flex justify-end space-x-2">
                  <Button variant="light" size="sm" onClick={handleCancelSkills}>
                    {t('common:buttons.cancel')}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveSkills} disabled={saving}>
                    {saving ? t('common:buttons.saving', 'Saving...') : t('common:buttons.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skills.length > 0 ? (
                  profile.skills.map((skill, idx) => (
                    <span key={idx} className="bg-swiss-mint/10 text-swiss-mint text-xs font-medium px-2.5 py-1 rounded-full">
                      {skill}
                    </span>
                  ))
                ) : (
                  <div className="text-center w-full py-4">
                    <p className="text-sm text-gray-500 mb-2">{t('educatorProfilePage.skills.empty', 'No skills listed yet.')}</p>
                    <Button variant="ghost" size="sm" onClick={handleEditSkills} leftIcon={PlusIcon}>
                      {t('educatorProfilePage.skills.add', 'Add Skills')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Availability Section */}
          <SectionCard 
            titleKey="educatorProfilePage.availability.title" 
            icon={CalendarDaysIcon}
            onEdit={editingAvailability ? handleCancelAvailability : handleEditAvailability}
            isEditing={editingAvailability}
          >
            {editingAvailability ? (
              <div className="space-y-3">
                <textarea
                  value={tempAvailability}
                  onChange={(e) => setTempAvailability(e.target.value)}
                  rows={3}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('educatorProfilePage.availability.placeholder', 'e.g., Available Monday-Friday, mornings preferred. Looking for full-time positions.')}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="light" size="sm" onClick={handleCancelAvailability}>
                    {t('common:buttons.cancel')}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveAvailability} disabled={saving}>
                    {saving ? t('common:buttons.saving', 'Saving...') : t('common:buttons.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                {profile.availability ? (
                  <p className="whitespace-pre-line">{profile.availability}</p>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">{t('educatorProfilePage.availability.empty', 'Availability not provided.')}</p>
                    <Button variant="ghost" size="sm" onClick={handleEditAvailability} leftIcon={PlusIcon}>
                      {t('educatorProfilePage.availability.add', 'Add Availability')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Documents Section */}
          <SectionCard titleKey="educatorProfilePage.documents.title" icon={PaperClipIcon}>
            <div className="space-y-3">
              {/* Existing documents list */}
              {(profile.documents && profile.documents.length > 0) || profile.cvUrl ? (
                <div className="space-y-2">
                  {/* Legacy cvUrl shown as first doc if documents array is empty */}
                  {profile.cvUrl && (!profile.documents || profile.documents.length === 0) && (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <DocumentTextIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {profile.cvUrl.split('/').pop() || t('educatorProfilePage.documents.cvDocument', 'CV Document')}
                          </p>
                          <a
                            href={profile.cvUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 hover:underline"
                          >
                            {t('educatorProfilePage.documents.viewDocument', 'View Document')}
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCv}
                        disabled={saving}
                        className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                        aria-label={t('common:buttons.remove', 'Remove')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Multi-document list */}
                  {(profile.documents || []).map((doc) => (
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
                            {t('educatorProfilePage.documents.viewDocument', 'View Document')}
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id)}
                        disabled={saving}
                        className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                        aria-label={t('common:buttons.remove', 'Remove')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center">
                  {t('educatorProfilePage.documents.empty', 'No documents uploaded yet.')}
                </p>
              )}

              {/* Upload zone — shown while under limit */}
              {((profile.documents?.length ?? 0) + (profile.cvUrl ? 1 : 0)) < MAX_DOCUMENTS && (
                <div className="space-y-2">
                  <FileUploadZone
                    label={t('educatorProfilePage.documents.uploadDocument', 'Upload a document (CV, diploma, certificate…)')}
                    acceptedMimeTypes=".pdf,.doc,.docx"
                    maxFileSizeMB={5}
                    assetKind="CV"
                    onUploadSuccess={(asset) =>
                      handleDocumentUpload(asset, asset.url.split('/').pop() || 'Document')
                    }
                    autoUpload={true}
                  />
                  <p className="text-xs text-gray-500 text-center">
                    {t(
                      'educatorProfilePage.documents.hint',
                      `PDF, DOC, DOCX · Max 5 MB · Up to ${MAX_DOCUMENTS} documents (${(profile.documents?.length ?? 0) + (profile.cvUrl ? 1 : 0)}/${MAX_DOCUMENTS} used)`,
                      { max: MAX_DOCUMENTS, used: (profile.documents?.length ?? 0) + (profile.cvUrl ? 1 : 0) },
                    )}
                  </p>
                </div>
              )}

              {((profile.documents?.length ?? 0) + (profile.cvUrl ? 1 : 0)) >= MAX_DOCUMENTS && (
                <p className="text-xs text-amber-600 text-center">
                  {t('educatorProfilePage.documents.maxReached', `Maximum of ${MAX_DOCUMENTS} documents reached. Remove one to upload another.`)}
                </p>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Bio Section */}
          <SectionCard 
            titleKey="educatorProfilePage.bio.title" 
            icon={UserCircleIcon}
            onEdit={editingBio ? handleCancelBio : handleEditBio}
            isEditing={editingBio}
          >
            {editingBio ? (
              <div className="space-y-3">
                <textarea 
                  value={tempBio} 
                  onChange={e => setTempBio(e.target.value)} 
                  rows={4} 
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('educatorProfilePage.bio.placeholder', 'Tell employers about yourself, your experience, and what makes you a great educator...')}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="light" size="sm" onClick={handleCancelBio}>
                    {t('common:buttons.cancel')}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveBio} disabled={saving}>
                    {saving ? t('common:buttons.saving', 'Saving...') : t('common:buttons.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {profile.shortBio ? (
                  <p className="text-gray-700 whitespace-pre-line">{profile.shortBio}</p>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">{t('educatorProfilePage.bio.empty', 'No bio information yet.')}</p>
                    <Button variant="ghost" size="sm" onClick={handleEditBio} leftIcon={PlusIcon}>
                      {t('educatorProfilePage.bio.add', 'Add Bio')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Experience Section */}
          <SectionCard 
            titleKey="educatorProfilePage.experience.title" 
            icon={BriefcaseIcon}
            onEdit={
              hasStructuredExperience
                ? undefined
                : editingExperience
                ? handleCancelExperience
                : handleEditExperience
            }
            isEditing={editingExperience}
          >
            {editingExperience ? (
              <div className="space-y-3">
                <textarea
                  value={tempExperience}
                  onChange={(e) => setTempExperience(e.target.value)}
                  rows={6}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('educatorProfilePage.experience.placeholder', 'Describe your work experience. You can use plain text or JSON format for structured data.')}
                />
                <p className="text-xs text-gray-500">
                  {t('educatorProfilePage.experience.hint', 'Tip: For best results, use the full profile editor to add structured experience entries.')}
                </p>
                <div className="flex justify-end space-x-2">
                  <Button variant="light" size="sm" onClick={handleCancelExperience}>
                    {t('common:buttons.cancel')}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveExperience} disabled={saving}>
                    {saving ? t('common:buttons.saving', 'Saving...') : t('common:buttons.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {workExperienceItems.length > 0 ? (
                  <>
                    {workExperienceItems.map((exp) => (
                      <div key={exp.id} className="p-3 bg-gray-50 rounded-md">
                        <h3 className="font-semibold text-swiss-charcoal">{exp.jobTitle}</h3>
                        <p className="text-sm text-swiss-teal">{exp.institutionName}</p>
                        <p className="text-xs text-gray-500">{exp.startDate} – {exp.endDate}</p>
                        {exp.descriptionPoints && exp.descriptionPoints.length > 0 && (
                          <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-0.5">
                            {exp.descriptionPoints.map((point, i) => <li key={i}>{point}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">
                      {t(
                        'educatorProfilePage.experience.managedHint',
                        'Structured experience entries are managed in the full profile editor.',
                      )}
                    </p>
                  </>
                ) : profile.workExperience ? (
                  <p className="text-gray-700 whitespace-pre-line">{profile.workExperience}</p>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">{t('educatorProfilePage.experience.empty', 'No experience added yet.')}</p>
                    <Button variant="ghost" size="sm" onClick={handleEditExperience} leftIcon={PlusIcon}>
                      {t('educatorProfilePage.experience.add', 'Add Experience')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Education Section */}
          <SectionCard 
            titleKey="educatorProfilePage.education.title" 
            icon={AcademicCapIcon}
            onEdit={
              hasStructuredEducation
                ? undefined
                : editingEducation
                ? handleCancelEducation
                : handleEditEducation
            }
            isEditing={editingEducation}
          >
            {editingEducation ? (
              <div className="space-y-3">
                <textarea
                  value={tempEducation}
                  onChange={(e) => setTempEducation(e.target.value)}
                  rows={6}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('educatorProfilePage.education.placeholder', 'Describe your educational background. You can use plain text or JSON format for structured data.')}
                />
                <p className="text-xs text-gray-500">
                  {t('educatorProfilePage.education.hint', 'Tip: For best results, use the full profile editor to add structured education entries.')}
                </p>
                <div className="flex justify-end space-x-2">
                  <Button variant="light" size="sm" onClick={handleCancelEducation}>
                    {t('common:buttons.cancel')}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveEducation} disabled={saving}>
                    {saving ? t('common:buttons.saving', 'Saving...') : t('common:buttons.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {educationItems.length > 0 ? (
                  <>
                    {educationItems.map((edu) => (
                      <div key={edu.id} className="p-3 bg-gray-50 rounded-md">
                        <h3 className="font-semibold text-swiss-charcoal">{edu.degree}</h3>
                        <p className="text-sm text-swiss-teal">{edu.institutionName}</p>
                        <p className="text-xs text-gray-500">
                          {t('educatorProfilePage.education.graduated', 'Graduated')}: {edu.graduationYear}
                        </p>
                        {edu.description && <p className="text-sm text-gray-600 mt-1">{edu.description}</p>}
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">
                      {t(
                        'educatorProfilePage.education.managedHint',
                        'Structured education entries are managed in the full profile editor.',
                      )}
                    </p>
                  </>
                ) : profile.education ? (
                  <p className="text-gray-700 whitespace-pre-line">{profile.education}</p>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">{t('educatorProfilePage.education.empty', 'No education added yet.')}</p>
                    <Button variant="ghost" size="sm" onClick={handleEditEducation} leftIcon={PlusIcon}>
                      {t('educatorProfilePage.education.add', 'Add Education')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Certifications Section */}
          <SectionCard 
            titleKey="educatorProfilePage.certifications.title" 
            icon={StarIcon}
            onEdit={editingCertifications ? handleCancelCertifications : handleEditCertifications}
            isEditing={editingCertifications}
          >
            {editingCertifications ? (
              <div className="space-y-3">
                <ChipInput
                  selectedChips={tempCertifications}
                  onChange={setTempCertifications}
                  placeholder={t('educatorProfilePage.certifications.placeholder', 'e.g., CPR Certified, Early Childhood Education Certificate, First Aid')}
                  allowCustomValues={true}
                />
                <p className="text-xs text-gray-500">{t('educatorProfilePage.certifications.hint', 'Type and press Enter to add certifications')}</p>
                <div className="flex justify-end space-x-2">
                  <Button variant="light" size="sm" onClick={handleCancelCertifications}>
                    {t('common:buttons.cancel')}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSaveCertifications} disabled={saving}>
                    {saving ? t('common:buttons.saving', 'Saving...') : t('common:buttons.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {profile.certifications.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.certifications.map((cert, idx) => (
                      <span key={idx} className="bg-swiss-teal/10 text-swiss-teal text-xs font-medium px-3 py-1.5 rounded-full">
                        {cert}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">{t('educatorProfilePage.certifications.empty', 'No certifications added yet.')}</p>
                    <Button variant="ghost" size="sm" onClick={handleEditCertifications} leftIcon={PlusIcon}>
                      {t('educatorProfilePage.certifications.add', 'Add Certifications')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default EducatorProfilePage;
