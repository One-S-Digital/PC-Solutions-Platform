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
  Copy,
  ChevronDown,
  Ban,
  Trash2,
  UserCog,
  CheckCircle,
  Calendar,
  Clock,
  Shield,
} from 'lucide-react';
import { useAssetUpload } from '../hooks/useAssetUpload';
import Card from '../components/design-system/Card';
import Button from '../components/design-system/Button';
import ChipInput from '../components/design-system/ChipInput';
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
import { UserActivityHeatmap } from '../components/UserActivityHeatmap';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  profileId: string;
  clerkId: string;
  role: UserRole;
  email: string;
  createdAt: string | null;
  updatedAt: string | null;
  lastActiveAt: string | null;
  isActive: boolean;
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
  organizations?: {
    id: string;
    name: string;
    type: string;
    logoUrl: string | null;
    joinedAt: string | null;
  }[];
}

interface WorkExpItem {
  id: string;
  jobTitle: string;
  institutionName: string;
  startDate?: string;
  endDate?: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1.5 rounded p-0.5 text-gray-400 hover:text-gray-600"
      title="Copy"
    >
      {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-work-experience', userId] }); toast.success('Work experience added'); closeForm(); },
    onError: () => toast.error('Failed to save work experience'),
  });
  const updateMutation = useMutation({
    mutationFn: (d: typeof form) => apiService.adminUpdateWorkExperience(apiClient, userId, editItem!.id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-work-experience', userId] }); toast.success('Work experience updated'); closeForm(); },
    onError: () => toast.error('Failed to update work experience'),
  });
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiService.adminDeleteWorkExperience(apiClient, userId, itemId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-work-experience', userId] }); toast.success('Work experience removed'); },
    onError: () => toast.error('Failed to remove work experience'),
  });

  const openAdd = () => { setEditItem(null); setForm({ jobTitle: '', institutionName: '', startDate: '', endDate: '' }); setFormOpen(true); };
  const openEdit = (item: WorkExpItem) => { setEditItem(item); setForm({ jobTitle: item.jobTitle, institutionName: item.institutionName, startDate: item.startDate ?? '', endDate: item.endDate ?? '' }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditItem(null); };

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
      <ItemFormModal title={editItem ? 'Edit Work Experience' : 'Add Work Experience'} isOpen={formOpen} onClose={closeForm} onSubmit={() => editItem ? updateMutation.mutate(form) : createMutation.mutate(form)} isLoading={createMutation.isPending || updateMutation.isPending}>
        <FormField label="Job Title *"><input className={STANDARD_INPUT_FIELD} value={form.jobTitle} onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))} /></FormField>
        <FormField label="Institution *"><input className={STANDARD_INPUT_FIELD} value={form.institutionName} onChange={(e) => setForm((p) => ({ ...p, institutionName: e.target.value }))} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start Date"><input className={STANDARD_INPUT_FIELD} placeholder="e.g. 2020-01" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} /></FormField>
          <FormField label="End Date"><input className={STANDARD_INPUT_FIELD} placeholder="e.g. 2023-06 or Present" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} /></FormField>
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-education', userId] }); toast.success('Education added'); closeForm(); },
    onError: () => toast.error('Failed to save education'),
  });
  const updateMutation = useMutation({
    mutationFn: (d: typeof form) => apiService.adminUpdateEducation(apiClient, userId, editItem!.id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-education', userId] }); toast.success('Education updated'); closeForm(); },
    onError: () => toast.error('Failed to update education'),
  });
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiService.adminDeleteEducation(apiClient, userId, itemId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-education', userId] }); toast.success('Education entry removed'); },
    onError: () => toast.error('Failed to remove education entry'),
  });

  const openAdd = () => { setEditItem(null); setForm({ degree: '', institutionName: '', graduationYear: '', description: '' }); setFormOpen(true); };
  const openEdit = (item: EducationItem) => { setEditItem(item); setForm({ degree: item.degree, institutionName: item.institutionName, graduationYear: item.graduationYear ?? '', description: item.description ?? '' }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditItem(null); };

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
      <ItemFormModal title={editItem ? 'Edit Education' : 'Add Education'} isOpen={formOpen} onClose={closeForm} onSubmit={() => editItem ? updateMutation.mutate(form) : createMutation.mutate(form)} isLoading={createMutation.isPending || updateMutation.isPending}>
        <FormField label="Degree / Qualification *"><input className={STANDARD_INPUT_FIELD} value={form.degree} onChange={(e) => setForm((p) => ({ ...p, degree: e.target.value }))} /></FormField>
        <FormField label="Institution *"><input className={STANDARD_INPUT_FIELD} value={form.institutionName} onChange={(e) => setForm((p) => ({ ...p, institutionName: e.target.value }))} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Graduation Year"><input className={STANDARD_INPUT_FIELD} placeholder="e.g. 2019" value={form.graduationYear} onChange={(e) => setForm((p) => ({ ...p, graduationYear: e.target.value }))} /></FormField>
          <FormField label="Description"><input className={STANDARD_INPUT_FIELD} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></FormField>
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-certifications', userId] }); toast.success('Certification added'); closeForm(); },
    onError: () => toast.error('Failed to save certification'),
  });
  const updateMutation = useMutation({
    mutationFn: (d: typeof form) => apiService.adminUpdateCertification(apiClient, userId, editItem!.id, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-certifications', userId] }); toast.success('Certification updated'); closeForm(); },
    onError: () => toast.error('Failed to update certification'),
  });
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiService.adminDeleteCertification(apiClient, userId, itemId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-certifications', userId] }); toast.success('Certification removed'); },
    onError: () => toast.error('Failed to remove certification'),
  });

  const openAdd = () => { setEditItem(null); setForm({ name: '', issuingOrganization: '', issueDate: '', expiryDate: '', credentialUrl: '' }); setFormOpen(true); };
  const openEdit = (item: CertificationItem) => { setEditItem(item); setForm({ name: item.name, issuingOrganization: item.issuingOrganization ?? '', issueDate: item.issueDate ?? '', expiryDate: item.expiryDate ?? '', credentialUrl: item.credentialUrl ?? '' }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditItem(null); };

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
      <ItemFormModal title={editItem ? 'Edit Certification' : 'Add Certification'} isOpen={formOpen} onClose={closeForm} onSubmit={() => editItem ? updateMutation.mutate(form) : createMutation.mutate(form)} isLoading={createMutation.isPending || updateMutation.isPending}>
        <FormField label="Certification Name *"><input className={STANDARD_INPUT_FIELD} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></FormField>
        <FormField label="Issuing Organization"><input className={STANDARD_INPUT_FIELD} value={form.issuingOrganization} onChange={(e) => setForm((p) => ({ ...p, issuingOrganization: e.target.value }))} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Issue Date"><input className={STANDARD_INPUT_FIELD} placeholder="e.g. 2022-03" value={form.issueDate} onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))} /></FormField>
          <FormField label="Expiry Date"><input className={STANDARD_INPUT_FIELD} placeholder="e.g. 2025-03" value={form.expiryDate} onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))} /></FormField>
        </div>
        <FormField label="Credential URL"><input type="url" className={STANDARD_INPUT_FIELD} placeholder="https://..." value={form.credentialUrl} onChange={(e) => setForm((p) => ({ ...p, credentialUrl: e.target.value }))} /></FormField>
      </ItemFormModal>
    </>
  );
}

// ─── Actions dropdown ─────────────────────────────────────────────────────────

function ActionsDropdown({
  profile,
  isSuperAdmin,
  impersonating,
  onImpersonate,
  impersonatePending,
  onSuspend,
  onDelete,
  onNavigateOrg,
}: {
  profile: UserProfile;
  isSuperAdmin: boolean;
  impersonating: boolean;
  onImpersonate: () => void;
  impersonatePending: boolean;
  onSuspend: () => void;
  onDelete: () => void;
  onNavigateOrg: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        Actions
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
          {isSuperAdmin && !impersonating && (
            <button
              onClick={() => { setOpen(false); onImpersonate(); }}
              disabled={impersonatePending}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4 text-swiss-teal" />
              Edit as User
            </button>
          )}
          {profile.organization && (
            <button
              onClick={() => { setOpen(false); onNavigateOrg(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Building2 className="h-4 w-4 text-gray-400" />
              View Organization
            </button>
          )}
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={() => { setOpen(false); onSuspend(); }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50"
          >
            <Ban className="h-4 w-4" />
            {profile.isActive ? 'Suspend User' : 'Reactivate User'}
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete User
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({
  profile,
  formData,
  handleChange,
  isSuperAdmin,
  heatmapYear,
  setHeatmapYear,
  activityHeatmap,
  activityLoading,
  cvUploading,
  cvInputRef,
  uploadAsset,
  userId,
  isEducator,
}: {
  profile: UserProfile;
  formData: Partial<UserProfile>;
  handleChange: (field: keyof UserProfile, value: any) => void;
  isSuperAdmin: boolean;
  heatmapYear: number;
  setHeatmapYear: (y: number) => void;
  activityHeatmap: any;
  activityLoading: boolean;
  cvUploading: boolean;
  cvInputRef: React.RefObject<HTMLInputElement>;
  uploadAsset: (file: File, kind: string) => Promise<any>;
  userId: string;
  isEducator: boolean;
}) {
  const { t } = useTranslation(['admin']);

  return (
    <div className="space-y-6">
      {/* Activity heatmap */}
      <UserActivityHeatmap
        userId={profile.id}
        activeDays={activityHeatmap?.activeDays ?? []}
        totalActiveDays={activityHeatmap?.totalActiveDays ?? 0}
        currentStreak={activityHeatmap?.currentStreak ?? 0}
        year={heatmapYear}
        onYearChange={setHeatmapYear}
        isLoading={activityLoading || !activityHeatmap}
      />

      {/* Personal information */}
      <Card className="p-6">
        <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
          <ImageIcon className="mr-2 h-5 w-5 text-swiss-teal" />
          Personal Information
        </h3>

        {/* Avatar */}
        {isSuperAdmin && (
          <div className="mb-5">
            <ImageUploadField
              label="Profile Image"
              currentUrl={profile.avatarUrl}
              assetKind="AVATAR"
              onUploaded={(assetId) => handleChange('avatarAssetId', assetId)}
              onRemove={() => handleChange('avatarAssetId', '')}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="First name">
            <input type="text" value={formData.firstName || ''} onChange={(e) => handleChange('firstName', e.target.value)} className={STANDARD_INPUT_FIELD} />
          </FormField>
          <FormField label="Last name">
            <input type="text" value={formData.lastName || ''} onChange={(e) => handleChange('lastName', e.target.value)} className={STANDARD_INPUT_FIELD} />
          </FormField>
        </div>
      </Card>

      {/* Email addresses */}
      <Card className="p-6">
        <h3 className="mb-5 flex items-center justify-between text-base font-semibold text-gray-900">
          <span className="flex items-center">
            <Mail className="mr-2 h-5 w-5 text-swiss-teal" />
            Email Addresses
          </span>
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{profile.email}</p>
                <p className="text-xs text-gray-500">Login email</p>
              </div>
            </div>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Primary</span>
          </div>
          <FormField label="Contact Email (public)">
            <input type="email" value={formData.contactEmail || ''} onChange={(e) => handleChange('contactEmail', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="contact@example.com" />
          </FormField>
        </div>
      </Card>

      {/* Phone */}
      <Card className="p-6">
        <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
          <Phone className="mr-2 h-5 w-5 text-swiss-teal" />
          Phone Number
        </h3>
        <FormField label="Phone">
          <input type="tel" value={formData.phoneNumber || ''} onChange={(e) => handleChange('phoneNumber', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="+41 XX XXX XX XX" />
        </FormField>
      </Card>

      {/* Bio */}
      <Card className="p-6">
        <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
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

      {/* Educator-specific sections */}
      {isEducator && (
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
          <>
            {/* Professional */}
            <Card className="p-6">
              <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
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
                  <label htmlFor="candidatePoolVisible" className="text-sm text-gray-700">Visible in candidate pool</label>
                </div>
              </div>
            </Card>

            {/* Location */}
            <Card className="p-6">
              <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
                <MapPin className="mr-2 h-5 w-5 text-swiss-teal" />
                Location
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Region / Canton">
                  <select value={formData.region || ''} onChange={(e) => handleChange('region', e.target.value)} className={STANDARD_INPUT_FIELD}>
                    <option value="">Select a region</option>
                    {SWISS_CANTONS_WITH_ALL.map((canton) => (
                      <option key={canton} value={canton}>{canton === ALL_REGIONS_OPTION ? 'All' : canton}</option>
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

            {/* Skills */}
            <Card className="p-6">
              <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
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

            {/* Experience, Education, Certifications */}
            <Card className="p-6">
              <WorkExperienceSection userId={userId} />
            </Card>
            <Card className="p-6">
              <EducationSection userId={userId} />
            </Card>
            <Card className="p-6">
              <CertificationsSection userId={userId} />
            </Card>

            {/* CV */}
            <Card className="p-6">
              <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
                <FileText className="mr-2 h-5 w-5 text-swiss-teal" />
                {t('admin:userProfileEdit.cv.title')}
              </h3>
              {formData.cvUrl ? (
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-green-600" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{formData.cvUrl.split('/').pop() || 'Document'}</p>
                      <a href={formData.cvUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-green-700 hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        View document
                      </a>
                    </div>
                  </div>
                  <div className="ml-3 flex shrink-0 gap-2">
                    <button type="button" onClick={() => cvInputRef.current?.click()} disabled={cvUploading} className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      <Upload className="h-3.5 w-3.5" />
                      {cvUploading ? 'Uploading…' : 'Replace'}
                    </button>
                    <button type="button" onClick={() => handleChange('cvUrl', '')} disabled={cvUploading} className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !cvUploading && cvInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-swiss-teal hover:bg-swiss-teal/5 ${cvUploading ? 'pointer-events-none opacity-50' : ''}`}
                >
                  {cvUploading ? (
                    <><div className="h-8 w-8 animate-spin rounded-full border-2 border-swiss-teal border-t-transparent" /><p className="mt-2 text-sm text-gray-500">Uploading…</p></>
                  ) : (
                    <><Upload className="h-8 w-8 text-gray-400" /><p className="mt-2 text-sm font-medium text-swiss-teal">Upload CV</p><p className="mt-1 text-xs text-gray-400">PDF, DOC or DOCX</p></>
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
                    toast.error('CV upload failed');
                  } finally {
                    if (cvInputRef.current) cvInputRef.current.value = '';
                  }
                }}
              />
            </Card>

            {/* Cover Image */}
            {isSuperAdmin && (
              <Card className="p-6">
                <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
                  <ImageIcon className="mr-2 h-5 w-5 text-swiss-teal" />
                  Cover Image
                </h3>
                <ImageUploadField
                  label="Cover Image"
                  currentUrl={profile.coverImageUrl}
                  assetKind="COVER_IMAGE"
                  aspectRatio="banner"
                  onUploaded={(assetId) => handleChange('coverAssetId', assetId)}
                  onRemove={() => handleChange('coverAssetId', '')}
                />
              </Card>
            )}
          </>
        </PermissionGate>
      )}
    </div>
  );
}

// ─── Tab: Organizations ───────────────────────────────────────────────────────

function OrganizationsTab({ profile, navigate }: { profile: UserProfile; navigate: (path: string) => void }) {
  const orgs = profile.organizations ?? (profile.organization ? [{ ...profile.organization, joinedAt: null }] : []);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="flex items-center text-base font-semibold text-gray-900">
            <Building2 className="mr-2 h-5 w-5 text-swiss-teal" />
            Organization Memberships
          </h3>
        </div>
        {orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Building2 className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No organization memberships yet</p>
            <p className="mt-1 text-xs text-gray-500">This user is not a member of any organization.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date Added</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-swiss-teal/10">
                          <Building2 className="h-4 w-4 text-swiss-teal" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">{org.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{org.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(org.joinedAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/organizations/${org.id}/profile`)}
                      className="flex items-center gap-1 text-xs font-medium text-swiss-teal hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function SettingsTab({
  profile,
  isSuperAdmin,
  onSuspend,
  onDelete,
  onElevate,
  suspendPending,
}: {
  profile: UserProfile;
  isSuperAdmin: boolean;
  onSuspend: () => void;
  onDelete: () => void;
  onElevate: () => void;
  suspendPending: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* User permissions */}
      <Card className="p-6">
        <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
          <Shield className="mr-2 h-5 w-5 text-swiss-teal" />
          User Permissions
        </h3>
        <div className="divide-y divide-gray-100">
          {/* Account status */}
          <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium text-gray-900">Account Status</p>
              <p className="mt-0.5 text-xs text-gray-500">Suspend to immediately block this user from accessing the platform.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${profile.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {profile.isActive ? 'Active' : 'Suspended'}
              </span>
              <button
                onClick={onSuspend}
                disabled={suspendPending}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  profile.isActive
                    ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                    : 'border-green-200 text-green-700 hover:bg-green-50'
                }`}
              >
                {profile.isActive ? <><Ban className="h-4 w-4" /> Suspend</> : <><CheckCircle className="h-4 w-4" /> Reactivate</>}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Role */}
      <Card className="p-6">
        <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
          <UserCog className="mr-2 h-5 w-5 text-swiss-teal" />
          Role & Permissions
        </h3>
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Current Role</p>
            <p className="mt-0.5 text-xs text-gray-500">{profile.role}</p>
          </div>
          {isSuperAdmin && (
            <button
              onClick={onElevate}
              className="flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50"
            >
              <UserCog className="h-4 w-4" />
              Change Role
            </button>
          )}
        </div>
      </Card>

      {/* Account metadata */}
      <Card className="p-6">
        <h3 className="mb-5 flex items-center text-base font-semibold text-gray-900">
          <Lock className="mr-2 h-5 w-5 text-swiss-teal" />
          Account Metadata
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Clerk ID</span>
            <span className="flex items-center font-mono text-xs text-gray-700">
              {profile.clerkId}
              <CopyButton value={profile.clerkId} />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">App User ID</span>
            <span className="flex items-center font-mono text-xs text-gray-700">
              {profile.id}
              <CopyButton value={profile.id} />
            </span>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      {isSuperAdmin && (
        <Card className="border-red-200 p-6">
          <h3 className="mb-3 flex items-center text-base font-semibold text-red-700">
            <Trash2 className="mr-2 h-5 w-5" />
            Danger Zone
          </h3>
          <p className="mb-4 text-sm text-gray-600">Permanently delete this user account and all associated data. This action cannot be undone.</p>
          <button
            onClick={onDelete}
            className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete User Account
          </button>
        </Card>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS = ['Profile', 'Organizations', 'Settings'] as const;
type TabKey = typeof TABS[number];

const AdminUserProfileEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAdminRole();

  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('Profile');
  const [heatmapYear, setHeatmapYear] = useState(new Date().getUTCFullYear());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const cvInputRef = useRef<HTMLInputElement>(null);
  const { uploadAsset, uploading: cvUploading } = useAssetUpload();

  const [impersonating, setImpersonating] = useState(false);
  const [impersonationTarget, setImpersonationTarget] = useState<{ displayName: string; email: string } | null>(null);

  const { data: profileResponse, isLoading, error } = useQuery({
    queryKey: ['admin-user-profile', id],
    queryFn: () => apiService.getAdminUserProfile(apiClient, id!),
    enabled: !!id && !!apiClient,
  });

  const profile = profileResponse?.data?.data as UserProfile | undefined;

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['user-activity-heatmap', profile?.id, heatmapYear],
    queryFn: () => apiService.getUserActivityHeatmap(apiClient, profile!.id, heatmapYear),
    enabled: !!apiClient && !!profile?.id,
  });
  const activityHeatmap = activityData?.data?.data;

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
    mutationFn: (data: Partial<UserProfile>) => apiService.updateAdminUserProfile(apiClient, id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-profile', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsDirty(false);
      toast.success('Profile updated successfully');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update profile'),
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      apiService.updateUser(apiClient, id!, { status: profile?.isActive ? 'INACTIVE' : 'ACTIVE' } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-profile', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(profile?.isActive ? 'User suspended' : 'User reactivated');
    },
    onError: () => toast.error('Failed to update user status'),
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
  const initials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      {impersonating && impersonationTarget && (
        <ImpersonationBanner
          targetName={impersonationTarget.displayName}
          targetEmail={impersonationTarget.email}
          onExit={() => { setImpersonating(false); setImpersonationTarget(null); }}
        />
      )}

      <div className="space-y-0">
        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="border-b border-gray-200 bg-white px-6 pb-0 pt-6">
          {/* Back */}
          <button
            onClick={handleBack}
            className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Users
          </button>

          {/* Identity row */}
          <div className="flex items-start justify-between pb-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={fullName} className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-swiss-teal text-white text-xl font-semibold shadow ring-2 ring-white">
                    {initials || <User className="h-7 w-7" />}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  Last active {formatRelativeTime(profile.lastActiveAt)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isDirty && (
                <Button
                  variant="primary"
                  leftIcon={Save}
                  onClick={() => updateMutation.mutate(formData)}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              )}
              <ActionsDropdown
                profile={profile}
                isSuperAdmin={isSuperAdmin}
                impersonating={impersonating}
                onImpersonate={() => impersonateMutation.mutate()}
                impersonatePending={impersonateMutation.isPending}
                onSuspend={() => suspendMutation.mutate()}
                onDelete={() => setShowDeleteConfirm(true)}
                onNavigateOrg={() => profile.organization && navigate(`/organizations/${profile.organization.id}/profile`)}
              />
            </div>
          </div>

          {/* Meta sidebar row (Clerk-style right panel rendered inline under name on mobile, or as grid) */}
          <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-2 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 text-xs sm:grid-cols-4">
            <div>
              <p className="text-gray-400">User ID</p>
              <p className="mt-0.5 flex items-center font-mono font-medium text-gray-800 truncate">
                <span className="truncate max-w-[120px]" title={profile.id}>{profile.id}</span>
                <CopyButton value={profile.id} />
              </p>
            </div>
            <div>
              <p className="text-gray-400">Primary email</p>
              <p className="mt-0.5 font-medium text-gray-800 truncate">{profile.email}</p>
            </div>
            <div>
              <p className="text-gray-400">User since</p>
              <p className="mt-0.5 font-medium text-gray-800">{formatDate(profile.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-400">Profile updated</p>
              <p className="mt-0.5 font-medium text-gray-800">{formatRelativeTime(profile.updatedAt)}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-swiss-teal text-swiss-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ─────────────────────────────────────────── */}
        <div className="p-6">
          {/* Admin-only warning banner */}
          {!isSuperAdmin && activeTab === 'Profile' && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>You have limited access. Only basic profile fields can be saved. Full editing requires Super Admin.</span>
            </div>
          )}

          {activeTab === 'Profile' && (
            <ProfileTab
              profile={profile}
              formData={formData}
              handleChange={handleChange}
              isSuperAdmin={isSuperAdmin}
              heatmapYear={heatmapYear}
              setHeatmapYear={setHeatmapYear}
              activityHeatmap={activityHeatmap}
              activityLoading={activityLoading}
              cvUploading={cvUploading}
              cvInputRef={cvInputRef}
              uploadAsset={uploadAsset}
              userId={id!}
              isEducator={isEducator}
            />
          )}

          {activeTab === 'Organizations' && (
            <OrganizationsTab profile={profile} navigate={navigate} />
          )}

          {activeTab === 'Settings' && (
            <SettingsTab
              profile={profile}
              isSuperAdmin={isSuperAdmin}
              onSuspend={() => suspendMutation.mutate()}
              onDelete={() => setShowDeleteConfirm(true)}
              onElevate={() => navigate(`/users?elevate=${id}`)}
              suspendPending={suspendMutation.isPending}
            />
          )}

          {/* Save footer (Profile tab only) */}
          {activeTab === 'Profile' && isDirty && (
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button variant="secondary" onClick={handleBack}>Cancel</Button>
              <Button
                variant="primary"
                leftIcon={Save}
                onClick={() => updateMutation.mutate(formData)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal ──────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-bold text-gray-900">Delete User Account</h2>
            <p className="mb-4 text-sm text-gray-600">
              This will permanently delete <strong>{fullName}</strong> and all associated data. This action cannot be undone.
            </p>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Type <span className="font-mono font-bold">SUDO DELETE USER</span> to confirm:
            </p>
            <input
              type="text"
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              className={STANDARD_INPUT_FIELD + ' mb-4'}
              placeholder="SUDO DELETE USER"
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowDeleteConfirm(false); setDeletePhrase(''); }}>Cancel</Button>
              <button
                disabled={deletePhrase !== 'SUDO DELETE USER'}
                onClick={() => {
                  // navigate back and let parent handle the delete via the Users page flow
                  setShowDeleteConfirm(false);
                  navigate(`/users?deleteConfirmed=${id}`);
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserProfileEdit;
