import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient, apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Users,
  Package,
  Wrench,
  Home,
  ShoppingCart,
  Briefcase,
  Image as ImageIcon,
  Lock,
} from 'lucide-react';
import Card from '../components/design-system/Card';
import Button from '../components/design-system/Button';
import ChipInput from '../components/design-system/ChipInput';
import Tabs from '../components/design-system/Tabs';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ImageUploadField } from '../components/ImageUploadField';
import { ItemListEditor, ItemFormModal } from '../components/ItemListEditor';
import { PermissionGate } from '../components/PermissionGate';
import { useAdminRole } from '../hooks/useAdminRole';
import {
  ALL_REGIONS_OPTION,
  STANDARD_INPUT_FIELD,
  SWISS_CANTONS_WITH_ALL,
  SWISS_CANTONS,
  SERVICE_CATEGORIES,
  SERVICE_DELIVERY_TYPES,
} from '../constants/design-system';
import { UserRole } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrganizationProfile {
  id: string;
  name: string;
  type: string;
  contactEmail: string;
  phoneNumber: string;
  contactPerson: string;
  region: string;
  canton: string;
  city: string;
  regionsServed: string[];
  description: string;
  vatNumber: string;
  languages: string[];
  websiteUrl: string;
  logoUrl: string | null;
  logoAssetId: string | null;
  coverImageUrl: string | null;
  coverAssetId: string | null;
  // Foundation-specific
  capacity: number;
  pedagogy: string[];
  // Supplier-specific
  productCategory: string;
  minimumOrderQuantity: number;
  directOrderLink: string;
  catalogUrl: string;
  // Service Provider-specific
  serviceType: string;
  serviceCategories: string[];
  deliveryType: string;
  bookingLink: string;
  // Members
  members: Array<{ userId: string; role: string; name: string; email: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PEDAGOGY_OPTIONS = [
  'Montessori', 'Reggio Emilia', 'Waldorf', 'Play-based',
  'Academic-focused', 'Bilingual', 'Nature-based', 'Inclusive', 'Other',
];
const LANGUAGE_OPTIONS = ['EN', 'FR', 'DE', 'IT'];
const STAFF_ROLE_OPTIONS = [
  UserRole.EDUCATOR, UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER,
  UserRole.SERVICE_PROVIDER, UserRole.PARENT, UserRole.ADMIN,
];
const VALID_DOCUMENT_TYPES = ['CATALOG', 'COMPANY_PROFILE', 'BROCHURE', 'PRICE_LIST', 'CERTIFICATE', 'OTHER'];

// ─── Accessible dialog wrapper ────────────────────────────────────────────────

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  children: React.ReactNode;
  maxWidth?: string;
}

function Dialog({ isOpen, onClose, title, titleId, children, maxWidth = 'max-w-sm' }: DialogProps) {
  const firstFocusRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    // defer so the DOM is rendered
    const t = setTimeout(() => firstFocusRef.current?.focus(), 0);
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', handleKey);
      prev?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${maxWidth} rounded-lg bg-white shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 id={titleId} className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            ref={firstFocusRef as React.RefObject<HTMLButtonElement>}
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Products section (Phase 5) ───────────────────────────────────────────────

interface ProductItem { id: string; title: string; price?: number; category?: string; isActive?: boolean }

function ProductsSection({ orgId, apiClient }: { orgId: string; apiClient: any }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', price: '', category: '', isActive: true });

  const { data } = useQuery({
    queryKey: ['admin-org-products', orgId],
    queryFn: () => apiService.adminListOrgProducts(apiClient, orgId),
    enabled: !!orgId && !!apiClient,
  });
  const items: ProductItem[] = data?.data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-org-products', orgId] });

  const createMutation = useMutation({
    mutationFn: () => apiService.adminCreateOrgProduct(apiClient, orgId, {
      title: form.title,
      description: form.description || undefined,
      price: form.price ? Number(form.price) : undefined,
      category: form.category || undefined,
      isActive: form.isActive,
    }),
    onSuccess: () => { invalidate(); toast.success('Product added'); closeForm(); },
    onError: (e: any) => toast.error(normMsg(e, 'Failed to add product')),
  });
  const updateMutation = useMutation({
    mutationFn: () => apiService.adminUpdateOrgProduct(apiClient, orgId, editItem!.id, {
      title: form.title,
      description: form.description || undefined,
      price: form.price ? Number(form.price) : undefined,
      category: form.category || undefined,
      isActive: form.isActive,
    }),
    onSuccess: () => { invalidate(); toast.success('Product updated'); closeForm(); },
    onError: (e: any) => toast.error(normMsg(e, 'Failed to update product')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.adminDeleteOrgProduct(apiClient, orgId, id),
    onSuccess: () => { invalidate(); toast.success('Product removed'); },
    onError: (e: any) => toast.error(normMsg(e, 'Failed to remove product')),
  });

  const openAdd = () => { setEditItem(null); setForm({ title: '', description: '', price: '', category: '', isActive: true }); setFormOpen(true); };
  const openEdit = (p: ProductItem) => { setEditItem(p); setForm({ title: p.title, description: '', price: p.price?.toString() ?? '', category: p.category ?? '', isActive: p.isActive ?? true }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditItem(null); };

  return (
    <>
      <ItemListEditor
        title="Products"
        items={items}
        columns={[
          { label: 'Title', render: (p) => p.title },
          { label: 'Category', render: (p) => p.category ?? '—' },
          { label: 'Price', render: (p) => p.price != null ? `CHF ${p.price}` : '—' },
          { label: 'Status', render: (p) => <span className={`text-xs font-medium ${p.isActive ? 'text-green-600' : 'text-gray-400'}`}>{p.isActive ? 'Active' : 'Inactive'}</span> },
        ]}
        emptyMessage="No products yet."
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(p) => deleteMutation.mutate(p.id)}
      />
      <ItemFormModal
        title={editItem ? 'Edit Product' : 'Add Product'}
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={() => editItem ? updateMutation.mutate() : createMutation.mutate()}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
          <input className={STANDARD_INPUT_FIELD} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea rows={2} className={STANDARD_INPUT_FIELD} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Price (CHF)</label>
            <input type="number" min="0" step="0.01" className={STANDARD_INPUT_FIELD} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
            <input className={STANDARD_INPUT_FIELD} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="rounded border-gray-300" />
          Active (visible in marketplace)
        </label>
      </ItemFormModal>
    </>
  );
}

// ─── Services section (Phase 6) ───────────────────────────────────────────────

interface ServiceItem { id: string; title: string; category?: string; price?: number; isActive?: boolean; deliveryType?: string }

function ServicesSection({ orgId, apiClient }: { orgId: string; apiClient: any }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', price: '', priceInfo: '', deliveryType: '', isActive: true });

  const { data } = useQuery({
    queryKey: ['admin-org-services', orgId],
    queryFn: () => apiService.adminListOrgServices(apiClient, orgId),
    enabled: !!orgId && !!apiClient,
  });
  const items: ServiceItem[] = data?.data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });

  const createMutation = useMutation({
    mutationFn: () => apiService.adminCreateOrgService(apiClient, orgId, {
      title: form.title,
      description: form.description || undefined,
      category: form.category || undefined,
      price: form.price ? Number(form.price) : undefined,
      priceInfo: form.priceInfo || undefined,
      deliveryType: form.deliveryType || undefined,
      isActive: form.isActive,
    }),
    onSuccess: () => { invalidate(); toast.success('Service added'); closeForm(); },
    onError: (e: any) => toast.error(normMsg(e, 'Failed to add service')),
  });
  const updateMutation = useMutation({
    mutationFn: () => apiService.adminUpdateOrgService(apiClient, orgId, editItem!.id, {
      title: form.title,
      description: form.description || undefined,
      category: form.category || undefined,
      price: form.price ? Number(form.price) : undefined,
      priceInfo: form.priceInfo || undefined,
      deliveryType: form.deliveryType || undefined,
      isActive: form.isActive,
    }),
    onSuccess: () => { invalidate(); toast.success('Service updated'); closeForm(); },
    onError: (e: any) => toast.error(normMsg(e, 'Failed to update service')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.adminDeleteOrgService(apiClient, orgId, id),
    onSuccess: () => { invalidate(); toast.success('Service removed'); },
    onError: (e: any) => toast.error(normMsg(e, 'Failed to remove service')),
  });

  const openAdd = () => { setEditItem(null); setForm({ title: '', description: '', category: '', price: '', priceInfo: '', deliveryType: '', isActive: true }); setFormOpen(true); };
  const openEdit = (s: ServiceItem) => { setEditItem(s); setForm({ title: s.title, description: '', category: s.category ?? '', price: s.price?.toString() ?? '', priceInfo: '', deliveryType: s.deliveryType ?? '', isActive: s.isActive ?? true }); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditItem(null); };

  return (
    <>
      <ItemListEditor
        title="Services"
        items={items}
        columns={[
          { label: 'Title', render: (s) => s.title },
          { label: 'Category', render: (s) => s.category?.replace(/_/g, ' ') ?? '—' },
          { label: 'Delivery', render: (s) => s.deliveryType?.replace(/_/g, ' ') ?? '—' },
          { label: 'Status', render: (s) => <span className={`text-xs font-medium ${s.isActive ? 'text-green-600' : 'text-gray-400'}`}>{s.isActive ? 'Active' : 'Inactive'}</span> },
        ]}
        emptyMessage="No services yet."
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(s) => deleteMutation.mutate(s.id)}
      />
      <ItemFormModal
        title={editItem ? 'Edit Service' : 'Add Service'}
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={() => editItem ? updateMutation.mutate() : createMutation.mutate()}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
          <input className={STANDARD_INPUT_FIELD} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea rows={2} className={STANDARD_INPUT_FIELD} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
            <select className={STANDARD_INPUT_FIELD} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              <option value="">Select…</option>
              {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Delivery Type</label>
            <select className={STANDARD_INPUT_FIELD} value={form.deliveryType} onChange={(e) => setForm((p) => ({ ...p, deliveryType: e.target.value }))}>
              <option value="">Select…</option>
              {SERVICE_DELIVERY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Price (CHF)</label>
            <input type="number" min="0" step="0.01" className={STANDARD_INPUT_FIELD} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Price Info</label>
            <input className={STANDARD_INPUT_FIELD} placeholder="e.g. per hour" value={form.priceInfo} onChange={(e) => setForm((p) => ({ ...p, priceInfo: e.target.value }))} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="rounded border-gray-300" />
          Active (visible in marketplace)
        </label>
      </ItemFormModal>
    </>
  );
}

// ─── Documents section ────────────────────────────────────────────────────────

interface DocItem { id: string; title?: string; documentType?: string; asset?: { publicUrl: string; filename: string } }

function DocumentsSection({ orgId, apiClient }: { orgId: string; apiClient: any }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', documentType: 'OTHER' });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const { data } = useQuery({
    queryKey: ['admin-org-documents', orgId],
    queryFn: () => apiService.adminListOrgDocuments(apiClient, orgId),
    enabled: !!orgId && !!apiClient,
  });
  const docs: DocItem[] = data?.data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-org-documents', orgId] });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => apiService.adminDeleteOrgDocument(apiClient, orgId, docId),
    onSuccess: () => { invalidate(); toast.success('Document removed'); },
    onError: (e: any) => toast.error(normMsg(e, 'Failed to remove document')),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setUploadForm((p) => ({ ...p, title: file.name.replace(/\.[^.]+$/, '') }));
    setUploadOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', pendingFile);
      fd.append('kind', 'DOCUMENT');
      const uploadRes = await apiClient.post('/admin/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const assetId: string = uploadRes.data?.data?.id;
      if (!assetId) throw new Error('Upload failed');
      await apiService.adminCreateOrgDocument(apiClient, orgId, {
        assetId,
        documentType: uploadForm.documentType,
        title: uploadForm.title || undefined,
      });
      invalidate();
      toast.success('Document uploaded');
      setUploadOpen(false);
      setPendingFile(null);
    } catch (e: any) {
      toast.error(normMsg(e, 'Failed to upload document'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Documents</h4>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          + Upload
        </button>
      </div>
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.png" onChange={handleFileSelect} />

      {docs.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-200 py-4 text-center text-sm text-gray-400">No documents yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">{doc.title || doc.asset?.filename || 'Untitled'}</p>
                {doc.documentType && <p className="text-xs text-gray-400">{doc.documentType}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {doc.asset?.publicUrl && (
                  <a href={doc.asset.publicUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">View</a>
                )}
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(doc.id)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog isOpen={uploadOpen} onClose={() => { setUploadOpen(false); setPendingFile(null); }} title="Upload Document" titleId="upload-doc-dialog">
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-gray-600">{pendingFile?.name}</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input className={STANDARD_INPUT_FIELD} value={uploadForm.title} onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Document Type</label>
            <select className={STANDARD_INPUT_FIELD} value={uploadForm.documentType} onChange={(e) => setUploadForm((p) => ({ ...p, documentType: e.target.value }))}>
              {VALID_DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={() => { setUploadOpen(false); setPendingFile(null); }} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleUpload} disabled={uploading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{uploading ? 'Uploading…' : 'Upload'}</button>
        </div>
      </Dialog>
    </div>
  );
}

// ─── Staff section ────────────────────────────────────────────────────────────

interface StaffMember { userId: string; role: string; user?: { firstName?: string; lastName?: string; email: string } }

interface StaffSectionProps {
  orgId: string;
  orgProfileId: string;
  apiClient: any;
  safeNavigate: (path: string) => void;
}

function StaffSection({ orgId, orgProfileId, apiClient, safeNavigate }: StaffSectionProps) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<string>(UserRole.EDUCATOR);
  const [roleModalUserId, setRoleModalUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>(UserRole.EDUCATOR);

  const { data } = useQuery({
    queryKey: ['admin-org-members', orgId],
    queryFn: () => apiService.adminListOrgMembers(apiClient, orgId),
    enabled: !!orgId && !!apiClient,
  });
  const members: StaffMember[] = data?.data?.data ?? [];
  const roleTarget = roleModalUserId ? members.find((m) => m.userId === roleModalUserId) ?? null : null;

  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-org-members', orgId] });
    queryClient.invalidateQueries({ queryKey: ['admin-organization-profile', orgProfileId] });
  };

  const addMutation = useMutation({
    mutationFn: () => apiService.adminAddOrgMember(apiClient, orgId, { userId: newUserId.trim(), role: newRole }),
    onSuccess: () => { invalidateBoth(); toast.success('Staff member added'); setAddOpen(false); setNewUserId(''); setNewRole(UserRole.EDUCATOR); },
    onError: (e: any) => toast.error(normMsg(e, 'Failed to add staff member')),
  });
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => apiService.adminUpdateOrgMemberRole(apiClient, orgId, userId, role),
    onSuccess: () => { invalidateBoth(); toast.success('Role updated'); setRoleModalUserId(null); },
    onError: (e: any) => toast.error(normMsg(e, 'Failed to update role')),
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => apiService.adminRemoveOrgMember(apiClient, orgId, userId),
    onSuccess: () => { invalidateBoth(); toast.success('Staff member removed'); },
    onError: (e: any) => toast.error(normMsg(e, 'Failed to remove staff member')),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Staff Members</h4>
        <button type="button" onClick={() => setAddOpen(true)} className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">+ Add</button>
      </div>

      {members.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-200 py-4 text-center text-sm text-gray-400">No staff members yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
          {members.map((m) => {
            const name = m.user ? `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() || m.user.email : m.userId;
            return (
              <div key={m.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{name}</p>
                  {m.user?.email && <p className="text-xs text-gray-400">{m.user.email}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-swiss-teal/10 px-2 py-0.5 text-xs font-medium text-swiss-teal">{m.role}</span>
                  <button type="button" onClick={() => { setSelectedRole(m.role); setRoleModalUserId(m.userId); }} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">Role</button>
                  <button
                    type="button"
                    onClick={() => safeNavigate(`/users/${m.userId}/profile`)}
                    className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  >
                    Profile
                  </button>
                  <button type="button" onClick={() => removeMutation.mutate(m.userId)} disabled={removeMutation.isPending} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add staff dialog */}
      <Dialog isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Staff Member" titleId="add-staff-dialog">
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">User ID *</label>
            <input
              className={STANDARD_INPUT_FIELD}
              placeholder="Paste user ID from the Users page"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">Find user IDs on the Users page.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <select className={STANDARD_INPUT_FIELD} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={() => setAddOpen(false)} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={() => addMutation.mutate()} disabled={!newUserId.trim() || addMutation.isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{addMutation.isPending ? 'Adding…' : 'Add'}</button>
        </div>
      </Dialog>

      {/* Change role dialog */}
      <Dialog isOpen={!!roleModalUserId} onClose={() => setRoleModalUserId(null)} title="Change Role" titleId="change-role-dialog">
        <div className="px-6 py-5">
          {roleTarget && (
            <p className="mb-3 text-sm text-gray-600">
              {roleTarget.user ? `${roleTarget.user.firstName ?? ''} ${roleTarget.user.lastName ?? ''}`.trim() || roleTarget.user.email : roleTarget.userId}
            </p>
          )}
          <select className={STANDARD_INPUT_FIELD} value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={() => setRoleModalUserId(null)} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={() => updateRoleMutation.mutate({ userId: roleModalUserId!, role: selectedRole })} disabled={updateRoleMutation.isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{updateRoleMutation.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </Dialog>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function normMsg(err: any, fallback: string): string {
  const raw = err?.response?.data?.message;
  return Array.isArray(raw) ? raw.join('; ') : (raw ?? fallback);
}

// ─── Main component ───────────────────────────────────────────────────────────

const AdminOrganizationProfileEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAdminRole();

  const [formData, setFormData] = useState<Partial<OrganizationProfile>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const { data: profileResponse, isLoading, error } = useQuery({
    queryKey: ['admin-organization-profile', id],
    queryFn: () => apiService.getAdminOrganizationProfile(apiClient, id!),
    enabled: !!id && !!apiClient,
  });

  const profile = profileResponse?.data?.data;

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        type: profile.type || '',
        contactEmail: profile.contactEmail || '',
        phoneNumber: profile.phoneNumber || '',
        contactPerson: profile.contactPerson || '',
        region: profile.region || '',
        canton: profile.canton || '',
        city: profile.city || '',
        regionsServed: profile.regionsServed || [],
        description: profile.description || '',
        vatNumber: profile.vatNumber || '',
        languages: profile.languages || [],
        websiteUrl: profile.websiteUrl || (profile as any).website || '',
        capacity: profile.capacity || 0,
        pedagogy: profile.pedagogy || [],
        productCategory: profile.productCategory || '',
        minimumOrderQuantity: profile.minimumOrderQuantity ?? undefined,
        directOrderLink: profile.directOrderLink || '',
        catalogUrl: profile.catalogUrl || '',
        serviceType: profile.serviceType || '',
        serviceCategories: profile.serviceCategories || [],
        deliveryType: profile.deliveryType || '',
        bookingLink: profile.bookingLink || '',
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<OrganizationProfile>) =>
      apiService.updateAdminOrganizationProfile(apiClient, id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organization-profile', id] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setIsDirty(false);
      toast.success(t('admin:orgProfile.updateSuccess', 'Organization profile updated successfully'));
    },
    onError: (err: any) => {
      toast.error(normMsg(err, t('admin:orgProfile.updateError', 'Failed to update organization profile')));
    },
  });

  const handleChange = (field: keyof OrganizationProfile, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleMultiSelectChange = (field: keyof OrganizationProfile, value: string) => {
    const currentValues = (formData[field] as string[]) || [];
    let newValues: string[];
    if (field === 'regionsServed') {
      const hasAll = currentValues.includes(ALL_REGIONS_OPTION);
      const isAllValue = value === ALL_REGIONS_OPTION;
      if (isAllValue) {
        newValues = hasAll ? currentValues.filter((v) => v !== ALL_REGIONS_OPTION) : [ALL_REGIONS_OPTION];
      } else {
        const withoutAll = currentValues.filter((v) => v !== ALL_REGIONS_OPTION);
        newValues = withoutAll.includes(value) ? withoutAll.filter((v) => v !== value) : [...withoutAll, value];
      }
    } else if (currentValues.includes(value)) {
      newValues = currentValues.filter((v) => v !== value);
    } else {
      newValues = [...currentValues, value];
    }
    handleChange(field, newValues);
  };

  const submitForm = async () => {
    try { await updateMutation.mutateAsync(formData); } catch { /* handled by onError */ }
  };

  const handleBack = () => {
    if (isDirty && !window.confirm(t('common:unsavedChangesPrompt', 'You have unsaved changes. Are you sure you want to leave?'))) return;
    navigate('/organizations');
  };

  // Used by StaffSection to navigate away with dirty-form guard
  const safeNavigate = (path: string) => {
    if (isDirty && !window.confirm(t('common:unsavedChangesPrompt', 'You have unsaved changes. Are you sure you want to leave?'))) return;
    navigate(path);
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="large" /></div>;
  }
  if (error || !profile) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-500">{t('admin:orgProfile.loadError', 'Failed to load organization profile')}</div>
        <Button variant="secondary" onClick={() => navigate('/organizations')}>{t('common:back', 'Back')}</Button>
      </div>
    );
  }

  const isFoundation = profile.type === 'FOUNDATION';
  const isSupplier = profile.type === 'PRODUCT_SUPPLIER';
  const isServiceProvider = profile.type === 'SERVICE_PROVIDER';

  const typeIcon = isFoundation ? <Home className="h-6 w-6 text-swiss-teal" />
    : isServiceProvider ? <Wrench className="h-6 w-6 text-indigo-600" />
    : isSupplier ? <Package className="h-6 w-6 text-amber-600" />
    : <Building2 className="h-6 w-6 text-swiss-teal" />;

  const typeLabel = isFoundation ? t('admin:orgProfile.foundation', 'Foundation / Daycare')
    : isServiceProvider ? t('admin:orgProfile.serviceProvider', 'Service Provider')
    : isSupplier ? t('admin:orgProfile.supplier', 'Product Supplier')
    : profile.type;

  // ── Tab: Profile ────────────────────────────────────────────────────────────

  const profileTab = (
    <form onSubmit={(e) => { e.preventDefault(); submitForm(); }} className="space-y-6">
      {/* Logo / Cover */}
      {isSuperAdmin && (
        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
            <ImageIcon className="mr-2 h-5 w-5 text-swiss-teal" />
            Images
          </h3>
          <div className="space-y-5">
            <ImageUploadField
              label="Logo"
              currentUrl={profile.logoUrl}
              assetKind="AVATAR"
              onUploaded={(assetId) => handleChange('logoAssetId', assetId)}
              onRemove={() => handleChange('logoAssetId', '')}
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

      {/* Basic Info */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
          <Building2 className="mr-2 h-5 w-5 text-swiss-teal" />
          {t('admin:orgProfile.basicInfo', 'Basic Information')}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.name', 'Organization Name')} <span className="text-red-500">*</span></label>
            <input type="text" value={formData.name || ''} onChange={(e) => handleChange('name', e.target.value)} className={STANDARD_INPUT_FIELD} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.description', 'Description')}</label>
            <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={4} maxLength={1000} className={STANDARD_INPUT_FIELD} />
            <p className="mt-1 text-right text-xs text-gray-400">{(formData.description || '').length} / 1000</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.vatNumber', 'VAT Number')}</label>
            <input type="text" value={formData.vatNumber || ''} onChange={(e) => handleChange('vatNumber', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="CHE-XXX.XXX.XXX" />
          </div>
        </div>
      </Card>

      {/* Contact */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
          <Mail className="mr-2 h-5 w-5 text-swiss-teal" />
          {t('admin:orgProfile.contactInfo', 'Contact Information')}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.contactEmail', 'Contact Email')}</label>
            <input type="email" value={formData.contactEmail || ''} onChange={(e) => handleChange('contactEmail', e.target.value)} className={STANDARD_INPUT_FIELD} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.phone', 'Phone Number')}</label>
            <input type="tel" value={formData.phoneNumber || ''} onChange={(e) => handleChange('phoneNumber', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="+41 XX XXX XX XX" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.contactPerson', 'Contact Person')}</label>
            <input type="text" value={formData.contactPerson || ''} onChange={(e) => handleChange('contactPerson', e.target.value)} className={STANDARD_INPUT_FIELD} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              <Globe className="mr-1 inline h-3.5 w-3.5" />
              {t('admin:orgProfile.website', 'Website')}
            </label>
            <input type="url" value={formData.websiteUrl || ''} onChange={(e) => handleChange('websiteUrl', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="https://example.com" />
          </div>
        </div>
      </Card>

      {/* Location */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
          <MapPin className="mr-2 h-5 w-5 text-swiss-teal" />
          {t('admin:orgProfile.location', 'Location')}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.canton', 'Canton')}</label>
              <select value={formData.canton || ''} onChange={(e) => handleChange('canton', e.target.value)} className={STANDARD_INPUT_FIELD}>
                <option value="">{t('admin:orgProfile.selectCanton', 'Select canton')}</option>
                {SWISS_CANTONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.city', 'City')}</label>
              <input type="text" value={formData.city || ''} onChange={(e) => handleChange('city', e.target.value)} className={STANDARD_INPUT_FIELD} />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{t('admin:orgProfile.regionsServed', 'Regions Served')}</label>
            <div className="flex flex-wrap gap-2">
              {SWISS_CANTONS_WITH_ALL.map((canton) => (
                <button key={canton} type="button" onClick={() => handleMultiSelectChange('regionsServed', canton)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${(formData.regionsServed || []).includes(canton) ? 'border-swiss-teal bg-swiss-teal text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-swiss-teal'}`}>
                  {canton === ALL_REGIONS_OPTION ? t('common:filters.all', 'All') : canton}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{t('admin:orgProfile.languages', 'Languages Spoken')}</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button key={lang} type="button" onClick={() => handleMultiSelectChange('languages', lang)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${(formData.languages || []).includes(lang) ? 'border-swiss-teal bg-swiss-teal text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-swiss-teal'}`}>
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Foundation-specific */}
      {isFoundation && (
        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
            <Home className="mr-2 h-5 w-5 text-swiss-teal" />
            {t('admin:orgProfile.foundationInfo', 'Foundation Information')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.capacity', 'Capacity (Number of Children)')}</label>
              <input type="number" min="0" value={formData.capacity || ''} onChange={(e) => handleChange('capacity', e.target.value ? parseInt(e.target.value, 10) : 0)} className={STANDARD_INPUT_FIELD} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">{t('admin:orgProfile.pedagogy', 'Pedagogical Approaches')}</label>
              <div className="flex flex-wrap gap-2">
                {PEDAGOGY_OPTIONS.map((opt) => (
                  <button key={opt} type="button" onClick={() => handleMultiSelectChange('pedagogy', opt)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${(formData.pedagogy || []).includes(opt) ? 'border-swiss-teal bg-swiss-teal text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-swiss-teal'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Supplier-specific */}
      {isSupplier && (
        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
            <ShoppingCart className="mr-2 h-5 w-5 text-swiss-teal" />
            {t('admin:orgProfile.supplierInfo', 'Supplier Information')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.productCategory', 'Product Category')}</label>
              <input type="text" value={formData.productCategory || ''} onChange={(e) => handleChange('productCategory', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="e.g., Educational Toys" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.minimumOrderQuantity', 'Minimum Order Quantity')}</label>
              <input type="number" min="1" value={formData.minimumOrderQuantity ?? ''} onChange={(e) => handleChange('minimumOrderQuantity', e.target.value ? parseInt(e.target.value, 10) : undefined)} className={STANDARD_INPUT_FIELD} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.directOrderLink', 'Direct Order Link')}</label>
              <input type="url" value={formData.directOrderLink || ''} onChange={(e) => handleChange('directOrderLink', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="https://..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.catalogUrl', 'Catalog URL')}</label>
              <input type="url" value={formData.catalogUrl || ''} onChange={(e) => handleChange('catalogUrl', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="https://..." />
            </div>
          </div>
        </Card>
      )}

      {/* Service Provider-specific */}
      {isServiceProvider && (
        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-base font-semibold text-gray-900">
            <Briefcase className="mr-2 h-5 w-5 text-swiss-teal" />
            {t('admin:orgProfile.serviceProviderInfo', 'Service Provider Information')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.serviceType', 'Service Type')}</label>
              <input type="text" value={formData.serviceType || ''} onChange={(e) => handleChange('serviceType', e.target.value)} className={STANDARD_INPUT_FIELD} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">{t('admin:orgProfile.serviceCategories', 'Service Categories')}</label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => handleMultiSelectChange('serviceCategories', cat)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${(formData.serviceCategories || []).includes(cat) ? 'border-swiss-teal bg-swiss-teal text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-swiss-teal'}`}>
                    {cat.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.deliveryType', 'Delivery Type')}</label>
              <select value={formData.deliveryType || ''} onChange={(e) => handleChange('deliveryType', e.target.value)} className={STANDARD_INPUT_FIELD}>
                <option value="">{t('admin:orgProfile.selectDeliveryType', 'Select delivery type')}</option>
                {SERVICE_DELIVERY_TYPES.map((dt) => <option key={dt} value={dt}>{dt.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('admin:orgProfile.bookingLink', 'Booking Link')}</label>
              <input type="url" value={formData.bookingLink || ''} onChange={(e) => handleChange('bookingLink', e.target.value)} className={STANDARD_INPUT_FIELD} placeholder="https://..." />
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
        <Button variant="secondary" onClick={handleBack}>{t('common:cancel', 'Cancel')}</Button>
        <Button variant="primary" leftIcon={Save} type="submit" disabled={!isDirty || updateMutation.isPending}>
          {updateMutation.isPending ? t('common:saving', 'Saving...') : t('common:saveChanges', 'Save Changes')}
        </Button>
      </div>
    </form>
  );

  // ── Tab: Products / Services ─────────────────────────────────────────────────

  const catalogTab = (
    <PermissionGate
      role={UserRole.SUPER_ADMIN}
      fallback={
        <Card className="p-6 opacity-60">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-gray-500">Super Admin required to manage {isSupplier ? 'products' : 'services'}.</span>
          </div>
        </Card>
      }
    >
      <Card className="p-6">
        {isSupplier
          ? <ProductsSection orgId={id!} apiClient={apiClient} />
          : <ServicesSection orgId={id!} apiClient={apiClient} />}
      </Card>
    </PermissionGate>
  );

  // ── Tab: Documents ───────────────────────────────────────────────────────────

  const documentsTab = (
    <PermissionGate
      role={UserRole.SUPER_ADMIN}
      fallback={
        <Card className="p-6 opacity-60">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-gray-500">Super Admin required to manage documents.</span>
          </div>
        </Card>
      }
    >
      <Card className="p-6">
        <DocumentsSection orgId={id!} apiClient={apiClient} />
      </Card>
    </PermissionGate>
  );

  // ── Tab: Staff ───────────────────────────────────────────────────────────────

  const staffTab = (
    <PermissionGate
      role={UserRole.SUPER_ADMIN}
      fallback={
        <Card className="p-6 opacity-60">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-gray-500">Super Admin required to manage staff.</span>
          </div>
        </Card>
      }
    >
      <Card className="p-6">
        <StaffSection orgId={id!} orgProfileId={id!} apiClient={apiClient} safeNavigate={safeNavigate} />
      </Card>
    </PermissionGate>
  );

  // ── Assemble tabs ────────────────────────────────────────────────────────────

  const tabs = [
    { label: 'Profile', icon: Building2, content: profileTab },
    ...(isSupplier || isServiceProvider
      ? [{ label: isSupplier ? 'Products' : 'Services', icon: isSupplier ? Package : Wrench, content: catalogTab }]
      : []),
    { label: 'Documents', icon: FileText, content: documentsTab },
    { label: 'Staff', icon: Users, content: staffTab },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={handleBack}>{t('common:back', 'Back')}</Button>
          <div>
            <h1 className="flex items-center text-2xl font-bold text-swiss-charcoal">
              {typeIcon}
              <span className="ml-2">{t('admin:orgProfile.editTitle', 'Edit Organization Profile')}</span>
            </h1>
            <p className="mt-1 text-gray-600">
              {profile.name} • <span className="text-swiss-teal">{typeLabel}</span>
            </p>
          </div>
        </div>
        <Button variant="primary" leftIcon={Save} onClick={submitForm} disabled={!isDirty || updateMutation.isPending}>
          {updateMutation.isPending ? t('common:saving', 'Saving...') : t('common:saveChanges', 'Save Changes')}
        </Button>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default AdminOrganizationProfileEdit;
