import React, { useState, useEffect, useRef } from 'react';
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
  Lock,
  UserCheck,
  Image as ImageIcon,
  Upload,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAssetUpload } from '../hooks/useAssetUpload';
import Card from '../components/design-system/Card';
import Button from '../components/design-system/Button';
import ChipInput from '../components/design-system/ChipInput';
import Tabs from '../components/design-system/Tabs';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ImpersonationBanner } from '../components/ImpersonationBanner';
import { ItemListEditor, ItemFormModal } from '../components/ItemListEditor';
import { ImageUploadField } from '../components/ImageUploadField';
import { PermissionGate } from '../components/PermissionGate';
import {
  ALL_REGIONS_OPTION,
  STANDARD_INPUT_FIELD,
  SWISS_CANTONS_WITH_ALL,
  EDUCATOR_JOB_ROLES,
} from '../constants/design-system';
import { UserRole } from '../types';
import { useAdminRole } from '../hooks/useAdminRole';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface WorkExpItem {
  id: string;
  jobTitle: string;
  institutionName: string;
  startDate?: string;
  endDate?: string;
  descriptionPoints?: string[];
}

interface EducationItem {
  id: string;
  degree: string;
  institutionName: string;
  graduationYear?: string;
  description?: string;
}

interface CertificationItem {
  id: string;
  name: string;
  issuingOrganization?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialUrl?: string;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

// ─── Educator sub-sections ────────────────────────────────────────────────────

function WorkExperienceSection({ userId }: { userId: string }) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<WorkExpItem | null>(null);
  const [form, setForm] = useState({ jobTitle: '', institutionName: '', startDate: '', endDate: '' });

  const { data } = useQuery({
    queryKey: ['admin-work-experience', userId],
    queryFn: () => apiService.adminListWorkExperience(apiClient, userId),
    enabled: !!userId,
  });
  const items: WorkExpItem[] = data?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiService.adminCreateWorkExperience(apiClient, userId, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-work-experience', userId] });
      toast.success('Work experience added');
      closeForm();
    },
    onError: () => toast.error('Failed to save work experience'),
  });
  const updateMutation = useMutation({
    mutationFn: (d: typeof form) => apiService.adminUpdateWorkExperience(apiClient, userId, editItem!.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-work-experience', userId] });
      toast.success('Work experience updated');
      closeForm();
    },
    onError: () => toast.error('Failed to update work experience'),
  });
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiService.adminDeleteWorkExperience(apiClient, userId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-work-experience', userId] });
      toast.success('Work experience removed');
    },
    onError: () => toast.error('Failed to remove work experience'),
  });

  const openAdd = () => { setEditItem(null); setForm({ jobTitle: '', institutionName: '', startDate: '', endDate: '' }); setFormOpen(true); };
  const openEdit = (item: WorkExpItem) => { setEditItem(item); setForm({ jobTitle: item.jobTitle, institutionName: item.institutionName, startDate: item.startDate ?? '', endDate: item.endDate ?? '' }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditItem(null); };
  const handleSubmit = () => { editItem ? updateMutation.mutate(form) : createMutation.mutate(form); };

  return (
    <>
      <ItemListEditor
        title="Work Experience"
        items={items}
        columns={[
          { label: 'Job Title', render: (i) => i.jobTitle },
          { label: 'Institution', render: (i) => i.institutionName },
          { label: 'Period', render: (i) => [i.startDate, i.endDate].filter(Boolean).join(' – ') || '—' },
        ]}
        emptyMessage="No work experience entries yet."
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(i) => deleteMutation.mutate(i.id)}
      />
      <ItemFormModal
        title={editItem ? 'Edit Work Experience' : 'Add Work Experience'}
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <FormField label="Job Title *">
          <input className={STANDARD_INPUT_FIELD} value={form.jobTitle} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))} />
        </FormField>
        <FormField label="Institution *">
          <input className={STANDARD_INPUT_FIELD} value={form.institutionName} onChange={(e) => setForm((p) => ({ ...p, institutionName: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start Date">
            <input className={STANDARD_INPUT_FIELD} placeholder="e.g. 2020-01" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          </FormField>
          <FormField label="End Date">
            <input className={STANDARD_INPUT_FIELD} placeholder="e.g. 2023-06 or Present" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
          </FormField>
        </div>
      </ItemFormModal>
    </>
  );
}

function EducationSection({ userId }: { userId: string }) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<EducationItem | null>(null);
  const [form, setForm] = useState({ degree: '', institutionName: '', graduationYear: '', description: '' });

  const { data } = useQuery({
    queryKey: ['admin-education', userId],
    queryFn: () => apiService.adminListEducation(apiClient, userId),
    enabled: !!userId,
  });
  const items: EducationItem[] = data?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiService.adminCreateEducation(apiClient, userId, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-education', userId] });
      toast.success('Education added');
      closeForm();
    },
    onError: () => toast.error('Failed to save education'),
  });
  const updateMutation = useMutation({
    mutationFn: (d: typeof form) => apiService.adminUpdateEducation(apiClient, userId, editItem!.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-education', userId] });
      toast.success('Education updated');
      closeForm();
    },
    onError: () => toast.error('Failed to update education'),
  });
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiService.adminDeleteEducation(apiClient, userId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-education', userId] });
      toast.success('Education entry removed');
    },
    onError: () => toast.error('Failed to remove education entry'),
  });

  const openAdd = () => { setEditItem(null); setForm({ degree: '', institutionName: '', graduationYear: '', description: '' }); setFormOpen(true); };
  const openEdit = (item: EducationItem) => { setEditItem(item); setForm({ degree: item.degree, institutionName: item.institutionName, graduationYear: item.graduationYear ?? '', description: item.description ?? '' }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditItem(null); };
  const handleSubmit = () => { editItem ? updateMutation.mutate(form) : createMutation.mutate(form); };

  return (
    <>
      <ItemListEditor
        title="Education"
        items={items}
        columns={[
          { label: 'Degree', render: (i) => i.degree },
          { label: 'Institution', render: (i) => i.institutionName },
          { label: 'Year', render: (i) => i.graduationYear ?? '—' },
        ]}
        emptyMessage="No education entries yet."
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(i) => deleteMutation.mutate(i.id)}
      />
      <ItemFormModal
        title={editItem ? 'Edit Education' : 'Add Education'}
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <FormField label="Degree / Qualification *">
          <input className={STANDARD_INPUT_FIELD} value={form.degree} onChange={(e) => setForm((p) => ({ ...p, degree: e.target.value }))} />
        </FormField>
        <FormField label="Institution *">
          <input className={STANDARD_INPUT_FIELD} value={form.institutionName} onChange={(e) => setForm((p) => ({ ...p, institutionName: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Graduation Year">
            <input className={STANDARD_INPUT_FIELD} placeholder="e.g. 2019" value={form.graduationYear} onChange={(e) => setForm((p) => ({ ...p, graduationYear: e.target.value }))} />
          </FormField>
          <FormField label="Description">
            <input className={STANDARD_INPUT_FIELD} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </FormField>
        </div>
      </ItemFormModal>
    </>
  );
}

function CertificationsSection({ userId }: { userId: string }) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<CertificationItem | null>(null);
  const [form, setForm] = useState({ name: '', issuingOrganization: '', issueDate: '', expiryDate: '', credentialUrl: '' });

  const { data } = useQuery({
    queryKey: ['admin-certifications', userId],
    queryFn: () => apiService.adminListCertifications(apiClient, userId),
    enabled: !!userId,
  });
  const items: CertificationItem[] = data?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => apiService.adminCreateCertification(apiClient, userId, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-certifications', userId] });
      toast.success('Certification added');
      closeForm();
    },
    onError: () => toast.error('Failed to save certification'),
  });
  const updateMutation = useMutation({
    mutationFn: (d: typeof form) => apiService.adminUpdateCertification(apiClient, userId, editItem!.id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-certifications', userId] });
      toast.success('Certification updated');
      closeForm();
    },
    onError: () => toast.error('Failed to update certification'),
  });
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiService.adminDeleteCertification(apiClient, userId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-certifications', userId] });
      toast.success('Certification removed');
    },
    onError: () => toast.error('Failed to remove certification'),
  });

  const openAdd = () => { setEditItem(null); setForm({ name: '', issuingOrganization: '', issueDate: '', expiryDate: '', credentialUrl: '' }); setFormOpen(true); };
  const openEdit = (item: CertificationItem) => { setEditItem(item); setForm({ name: item.name, issuingOrganization: item.issuingOrganization ?? '', issueDate: item.issueDate ?? '', expiryDate: item.expiryDate ?? '', credentialUrl: item.credentialUrl ?? '' }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditItem(null); };
  const handleSubmit = () => { editItem ? updateMutation.mutate(form) : createMutation.mutate(form); };

  return (
    <>
      <ItemListEditor
        title="Certifications"
        items={items}
        columns={[
          { label: 'Name', render: (i) => i.name },
          { label: 'Issuer', render: (i) => i.issuingOrganization ?? '—' },
          { label: 'Expiry', render: (i) => i.expiryDate ?? '—' },
        ]}
        emptyMessage="No certifications yet."
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(i) => deleteMutation.mutate(i.id)}
      />
      <ItemFormModal
        title={editItem ? 'Edit Certification' : 'Add Certification'}
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <FormField label="Certification Name *">
          <input className={STANDARD_INPUT_FIELD} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </FormField>
        <FormField label="Issuing Organization">
          <input className={STANDARD_INPUT_FIELD} value={form.issuingOrganization} onChange={(e) => setForm((p) => ({ ...p, issuingOrganization: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Issue Date">
            <input className={STANDARD_INPUT_FIELD} placeholder="e.g. 2022-03" value={form.issueDate} onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))} />
          </FormField>
          <FormField label="Expiry Date">
            <input className={STANDARD_INPUT_FIELD} placeholder="e.g. 2025-03" value={form.expiryDate} onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))} />
          </FormField>
        </div>
        <FormField label="Credential URL">
          <input type="url" className={STANDARD_INPUT_FIELD} placeholder="https://..." value={form.credentialUrl} onChange={(e) => setForm((p) => ({ ...p, credentialUrl: e.target.value }))} />
        </FormField>
      </ItemFormModal>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const AdminUserProfileEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAdminRole();

  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const { uploadAsset, uploading: cvUploading } = useAssetUpload();

  // Impersonation state
  const [impersonating, setImpersonating] = useState(false);
  const [impersonationTarget, setImpersonationTarget] = useState<{ displayName: string; email: string } | null>(null);

  const { data: profileResponse, isLoading, error } = useQuery({
    queryKey: ['admin-user-profile', id],
    queryFn: () => apiService.getAdminUserProfile(apiClient, id!),
    enabled: !!id && !!apiClient,
  });

  const profile = profileResponse?.data?.data;

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
        skills: profile.skills || [],
        availability: profile.availability || '',
        cvUrl: profile.cvUrl || '',
        shortBio: profile.shortBio || '',
        candidatePoolVisible: profile.candidatePoolVisible || false,
        avatarAssetId: profile.avatarAssetId || undefined,
        coverAssetId: profile.coverAssetId || undefined,
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) =>
      apiService.updateAdminUserProfile(apiClient, id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-profile', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsDirty(false);
      toast.success('Profile updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: () => apiService.adminImpersonateUser(apiClient, id!),
    onSuccess: (res) => {
      const data = res.data?.data;
      setImpersonationTarget({ displayName: data.displayName, email: data.email });
      setImpersonating(true);
      toast.success(`Now editing as ${data.displayName}`);
    },
    onError: () => toast.error('Failed to start impersonation'),
  });

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const submitForm = async () => {
    try {
      await updateMutation.mutateAsync(formData);
    } catch {
      // handled by onError
    }
  };

  const handleBack = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
    navigate('/users');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-500">Failed to load user profile</div>
        <Button variant="secondary" onClick={() => navigate('/users')}>Back</Button>
      </div>
    );
  }

  const isEducator = profile.role === UserRole.EDUCATOR;
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email;

  // ── Tab content builders ────────────────────────────────────────────────────

  const identityTab = (
    <div className="space-y-6">
      {/* Avatar / Cover */}
      {isSuperAdmin && (
        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
            <ImageIcon className="mr-2 h-5 w-5 text-swiss-teal" />
            Profile Images
          </h3>
          <div className="space-y-5">
            <ImageUploadField
              label="Avatar"
              currentUrl={profile.avatarUrl}
              assetKind="AVATAR"
              onUploaded={(assetId) => handleChange('avatarAssetId', assetId)}
              onRemove={() => handleChange('avatarAssetId', '')}
            />
            <ImageUploadField
              label="Cover Image"
              currentUrl={profile.coverImageUrl}
              assetKind="COVER_IMAGE"
              aspectRatio="banner"
              onUploaded={(assetId) => handleChange('coverAssetId', assetId)}
              onRemove={() => handleChange('coverAssetId', '')}
            />
          </div>
        </Card>
      )}

      {/* Name */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
          <User className="mr-2 h-5 w-5 text-swiss-teal" />
          Basic Information
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="First Name">
            <input type="text" value={formData.firstName || ''} onChange={(e) => handleChange('firstName', e.target.value)} className={STANDARD_INPUT_FIELD} />
          </FormField>
          <FormField label="Last Name">
            <input type="text" value={formData.lastName || ''} onChange={(e) => handleChange('lastName', e.target.value)} className={STANDARD_INPUT_FIELD} />
          </FormField>
        </div>
      </Card>

      {/* Contact */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
          <Mail className="mr-2 h-5 w-5 text-swiss-teal" />
          Contact Information
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Login Email">
            <input type="email" value={formData.email || ''} onChange={(e) => handleChange('email', e.target.value)} className={STANDARD_INPUT_FIELD} />
          </FormField>
          <FormField label="Contact Email">
            <input type="email" value={formData.contactEmail || ''} onChange={(e) => handleChange('contactEmail', e.target.value)} className={STANDARD_INPUT_FIELD} />
            <p className="mt-1 text-xs text-gray-500">Public contact email shown to other users</p>
          </FormField>
          <FormField label="Phone Number">
            <input type="tel" value={formData.phoneNumber || ''} onChange={(e) => handleChange('phoneNumber', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="+41 XX XXX XX XX" />
          </FormField>
        </div>
      </Card>

      {/* Bio */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
          <FileText className="mr-2 h-5 w-5 text-swiss-teal" />
          Bio / About
        </h3>
        <textarea
          value={formData.shortBio || ''}
          onChange={(e) => handleChange('shortBio', e.target.value)}
          rows={4}
          className={STANDARD_INPUT_FIELD}
          placeholder="Tell us about this user..."
        />
      </Card>
    </div>
  );

  const professionalTab = (
    <PermissionGate
      role={UserRole.SUPER_ADMIN}
      fallback={
        <Card className="p-6 opacity-60">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-gray-500">Super Admin required to edit professional details.</span>
          </div>
        </Card>
      }
    >
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
            <Briefcase className="mr-2 h-5 w-5 text-swiss-teal" />
            Professional Details
          </h3>
          <div className="space-y-4">
            <FormField label="Job Role">
              <select value={formData.jobRole || ''} onChange={(e) => handleChange('jobRole', e.target.value)} className={STANDARD_INPUT_FIELD}>
                <option value="">Select a role</option>
                {EDUCATOR_JOB_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Availability">
              <input type="text" value={formData.availability || ''} onChange={(e) => handleChange('availability', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="e.g., Full-time, Available immediately" />
            </FormField>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="candidatePoolVisible"
                checked={formData.candidatePoolVisible || false}
                onChange={(e) => handleChange('candidatePoolVisible', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-swiss-teal focus:ring-swiss-teal"
              />
              <label htmlFor="candidatePoolVisible" className="text-sm text-gray-700">
                Visible in candidate pool
              </label>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
            <MapPin className="mr-2 h-5 w-5 text-swiss-teal" />
            Location
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Region / Canton">
              <select value={formData.region || ''} onChange={(e) => handleChange('region', e.target.value)} className={STANDARD_INPUT_FIELD}>
                <option value="">Select a region</option>
                {SWISS_CANTONS_WITH_ALL.map((canton) => (
                  <option key={canton} value={canton}>
                    {canton === ALL_REGIONS_OPTION ? 'All' : canton}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Cities">
              <ChipInput
                selectedChips={formData.cities || []}
                onChange={(chips) => handleChange('cities', chips)}
                placeholder="Add cities..."
                allowCustomValues={true}
              />
            </FormField>
          </div>
        </Card>
      </div>
    </PermissionGate>
  );

  const experienceTab = (
    <PermissionGate
      role={UserRole.SUPER_ADMIN}
      fallback={
        <Card className="p-6 opacity-60">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-gray-500">Super Admin required to edit experience and education.</span>
          </div>
        </Card>
      }
    >
      <div className="space-y-8">
        <Card className="p-6">
          <WorkExperienceSection userId={id!} />
        </Card>
        <Card className="p-6">
          <EducationSection userId={id!} />
        </Card>
        <Card className="p-6">
          <CertificationsSection userId={id!} />
        </Card>
      </div>
    </PermissionGate>
  );

  const skillsTab = (
    <PermissionGate
      role={UserRole.SUPER_ADMIN}
      fallback={
        <Card className="p-6 opacity-60">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-gray-500">Super Admin required to edit skills.</span>
          </div>
        </Card>
      }
    >
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
            <Star className="mr-2 h-5 w-5 text-swiss-teal" />
            Skills
          </h3>
          <ChipInput
            selectedChips={formData.skills || []}
            onChange={(chips) => handleChange('skills', chips)}
            placeholder="e.g., Montessori, Bilingual..."
            allowCustomValues={true}
          />
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
            <FileText className="mr-2 h-5 w-5 text-swiss-teal" />
            {t('admin:userProfileEdit.cv.title')}
          </h3>
          {formData.cvUrl ? (
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 shrink-0 text-green-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {formData.cvUrl.split('/').pop() || t('admin:userProfileEdit.cv.document')}
                  </p>
                  <a
                    href={formData.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-green-700 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('admin:userProfileEdit.cv.viewDocument')}
                  </a>
                </div>
              </div>
              <div className="ml-3 flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => cvInputRef.current?.click()}
                  disabled={cvUploading}
                  className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {cvUploading ? t('admin:userProfileEdit.cv.uploading') : t('admin:userProfileEdit.cv.replace')}
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('cvUrl', '')}
                  disabled={cvUploading}
                  className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('admin:userProfileEdit.cv.remove')}
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !cvUploading && cvInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-swiss-teal hover:bg-swiss-teal/5 ${cvUploading ? 'pointer-events-none opacity-50' : ''}`}
            >
              {cvUploading ? (
                <>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-swiss-teal border-t-transparent" />
                  <p className="mt-2 text-sm text-gray-500">{t('admin:userProfileEdit.cv.uploading')}</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-swiss-teal">{t('admin:userProfileEdit.cv.upload')}</p>
                  <p className="mt-1 text-xs text-gray-400">{t('admin:userProfileEdit.cv.hint')}</p>
                </>
              )}
            </div>
          )}
          <input
            ref={cvInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const asset = await uploadAsset(file, 'CV');
                handleChange('cvUrl', asset.publicUrl);
              } catch {
                toast.error(t('admin:userProfileEdit.cv.uploadFailed'));
              } finally {
                if (cvInputRef.current) cvInputRef.current.value = '';
              }
            }}
          />
        </Card>
      </div>
    </PermissionGate>
  );

  // ── Non-educator / ADMIN simple layout ──────────────────────────────────────

  const simpleLayout = (
    <div className="space-y-6">
      {!isSuperAdmin && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>You have limited access. Only basic profile fields can be saved. Full editing requires Super Admin.</span>
        </div>
      )}
      {identityTab}
    </div>
  );

  // ── Educator tab layout (SUPER_ADMIN gets all 4 tabs) ───────────────────────

  const educatorTabLayout = (
    <Tabs
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={[
        { label: 'Identity', icon: User, content: identityTab },
        { label: 'Professional', icon: Briefcase, content: professionalTab },
        { label: 'Experience & Education', icon: GraduationCap, content: experienceTab },
        { label: 'Skills', icon: Award, content: skillsTab },
      ]}
    />
  );

  return (
    <div>
      {/* Impersonation banner */}
      {impersonating && impersonationTarget && (
        <ImpersonationBanner
          targetName={impersonationTarget.displayName}
          targetEmail={impersonationTarget.email}
          onExit={() => { setImpersonating(false); setImpersonationTarget(null); }}
        />
      )}

      <div className="space-y-6 p-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" leftIcon={ArrowLeft} onClick={handleBack}>
              Back
            </Button>
            <div>
              <h1 className="flex items-center text-2xl font-bold text-swiss-charcoal">
                <User className="mr-2 h-6 w-6 text-swiss-teal" />
                Edit User Profile
              </h1>
              <p className="mt-1 text-gray-600">
                {fullName} • <span className="text-swiss-teal">{profile.role}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSuperAdmin && !impersonating && (
              <Button
                variant="secondary"
                leftIcon={UserCheck}
                onClick={() => impersonateMutation.mutate()}
                disabled={impersonateMutation.isPending}
              >
                {impersonateMutation.isPending ? 'Starting…' : 'Edit as User'}
              </Button>
            )}
            <Button
              variant="primary"
              leftIcon={Save}
              onClick={submitForm}
              disabled={!isDirty || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Organization info */}
        {profile.organization && (
          <Card className="p-6">
            <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
              <Building2 className="mr-2 h-5 w-5 text-swiss-teal" />
              Organization
            </h3>
            <div className="flex items-center gap-4">
              {profile.organization.logoUrl && (
                <img src={profile.organization.logoUrl} alt={profile.organization.name} className="h-12 w-12 rounded-lg object-cover" />
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
                Edit Organization Profile
              </Button>
            </div>
          </Card>
        )}

        {/* Main content */}
        {isEducator ? educatorTabLayout : simpleLayout}

        {/* Footer save row */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <Button variant="secondary" onClick={handleBack}>Cancel</Button>
          <Button
            variant="primary"
            leftIcon={Save}
            onClick={submitForm}
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserProfileEdit;
