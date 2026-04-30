import React, { useState, useEffect } from 'react';
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
  Link,
  Lock,
} from 'lucide-react';
import Card from '../components/design-system/Card';
import Button from '../components/design-system/Button';
import ChipInput from '../components/design-system/ChipInput';
import Tabs from '../components/design-system/Tabs';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ItemListEditor, ItemFormModal } from '../components/ItemListEditor';
import { PermissionGate } from '../components/PermissionGate';
import { UserRole } from '../types';
import { ALL_REGIONS_OPTION, STANDARD_INPUT_FIELD, SWISS_CANTONS_WITH_ALL, SWISS_CANTONS, SERVICE_CATEGORIES, SERVICE_DELIVERY_TYPES } from '../constants/design-system';

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
  members: Array<{
    userId: string;
    role: string;
    name: string;
    email: string;
  }>;
}

// Use the same pedagogy options as frontend for consistency
// These match the values defined in frontend/constants.ts PEDAGOGY_OPTIONS
const PEDAGOGY_OPTIONS = [
  'Montessori',
  'Reggio Emilia',
  'Waldorf',
  'Play-based',
  'Academic-focused',
  'Bilingual',
  'Nature-based',
  'Inclusive',
  'Other',
];

const LANGUAGE_OPTIONS = ['EN', 'FR', 'DE', 'IT'];

const PRODUCT_CATEGORIES = [
  'Educational Toys', 'Furniture', 'Books', 'Safety Equipment',
  'Food & Nutrition', 'Clothing', 'Arts & Crafts', 'Outdoor Equipment',
  'Technology', 'Other',
] as const;

const API_SERVICE_CATEGORIES = ['CLEANING', 'IT_SUPPORT', 'MAINTENANCE', 'CONSULTING', 'TRAINING', 'OTHER'] as const;
const API_DELIVERY_TYPES = ['On-site', 'Remote', 'Hybrid'] as const;
const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  CLEANING: 'Cleaning', IT_SUPPORT: 'IT Support', MAINTENANCE: 'Maintenance',
  CONSULTING: 'Consulting', TRAINING: 'Training', OTHER: 'Other',
};

// ─── Products sub-resource section ────────────────────────────────────────────

function ProductsSection({ orgId }: { orgId: string }) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category: '', price: '', tagsText: '', isActive: true,
  });

  const { data } = useQuery({
    queryKey: ['admin-org-products', orgId],
    queryFn: () => apiService.adminListOrgProducts(apiClient, orgId),
    enabled: !!orgId,
  });
  const items: any[] = data?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: typeof form) =>
      apiService.adminCreateOrgProduct(apiClient, orgId, {
        title: d.title,
        description: d.description || undefined,
        category: d.category || undefined,
        price: d.price ? parseFloat(d.price) : undefined,
        tags: d.tagsText ? d.tagsText.split(',').map((t) => t.trim()).filter(Boolean) : [],
        isActive: d.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-products', orgId] });
      toast.success('Product created');
      closeForm();
    },
    onError: () => toast.error('Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: (d: typeof form) =>
      apiService.adminUpdateOrgProduct(apiClient, orgId, editItem!.id, {
        title: d.title,
        description: d.description || undefined,
        category: d.category || undefined,
        price: d.price ? parseFloat(d.price) : undefined,
        tags: d.tagsText ? d.tagsText.split(',').map((t) => t.trim()).filter(Boolean) : [],
        isActive: d.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-products', orgId] });
      toast.success('Product updated');
      closeForm();
    },
    onError: () => toast.error('Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiService.adminDeleteOrgProduct(apiClient, orgId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-products', orgId] });
      toast.success('Product deleted');
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ title: '', description: '', category: '', price: '', tagsText: '', isActive: true });
    setFormOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category || '',
      price: item.price !== null && item.price !== undefined ? String(item.price) : '',
      tagsText: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      isActive: item.isActive !== false,
    });
    setFormOpen(true);
  };

  const closeForm = () => { setFormOpen(false); setEditItem(null); };
  const handleSubmit = () => { editItem ? updateMutation.mutate(form) : createMutation.mutate(form); };

  return (
    <>
      <PermissionGate
        role={UserRole.SUPER_ADMIN}
        fallback={
          <Card className="p-6 opacity-60">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-gray-500">Super Admin required to manage products.</span>
            </div>
          </Card>
        }
      >
        <Card className="p-6">
          <ItemListEditor
            title="Products"
            items={items}
            columns={[
              { label: 'Title', render: (i) => i.title },
              { label: 'Category', render: (i) => i.category || '—' },
              { label: 'Price', render: (i) => i.price !== undefined && i.price !== null ? `CHF ${i.price}` : '—' },
              { label: 'Status', render: (i) => i.isActive !== false ? 'Active' : 'Hidden' },
            ]}
            emptyMessage="No products yet. Add the first product."
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={(i) => deleteMutation.mutate(i.id)}
          />
        </Card>
      </PermissionGate>
      <ItemFormModal
        title={editItem ? 'Edit Product' : 'Add Product'}
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input className={STANDARD_INPUT_FIELD} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className={STANDARD_INPUT_FIELD} rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className={STANDARD_INPUT_FIELD} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              <option value="">Select category</option>
              {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (CHF)</label>
            <input type="number" min="0" step="0.01" className={STANDARD_INPUT_FIELD} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input className={STANDARD_INPUT_FIELD} placeholder="e.g. toys, educational, wooden" value={form.tagsText} onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className={STANDARD_INPUT_FIELD} value={form.isActive ? 'active' : 'hidden'} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'active' }))}>
            <option value="active">Active (visible)</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </ItemFormModal>
    </>
  );
}

// ─── Services sub-resource section ────────────────────────────────────────────

function ServicesSection({ orgId }: { orgId: string }) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'OTHER', deliveryType: 'On-site',
    priceInfo: '', availability: '', tagsText: '', isActive: true,
  });

  const { data } = useQuery({
    queryKey: ['admin-org-services', orgId],
    queryFn: () => apiService.adminListOrgServices(apiClient, orgId),
    enabled: !!orgId,
  });
  const items: any[] = data?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (d: typeof form) =>
      apiService.adminCreateOrgService(apiClient, orgId, {
        title: d.title,
        description: d.description || undefined,
        category: d.category,
        deliveryType: d.deliveryType,
        priceInfo: d.priceInfo || undefined,
        availability: d.availability || undefined,
        tags: d.tagsText ? d.tagsText.split(',').map((t) => t.trim()).filter(Boolean) : [],
        isActive: d.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });
      toast.success('Service created');
      closeForm();
    },
    onError: () => toast.error('Failed to create service'),
  });

  const updateMutation = useMutation({
    mutationFn: (d: typeof form) =>
      apiService.adminUpdateOrgService(apiClient, orgId, editItem!.id, {
        title: d.title,
        description: d.description || undefined,
        category: d.category,
        deliveryType: d.deliveryType,
        priceInfo: d.priceInfo || undefined,
        availability: d.availability || undefined,
        tags: d.tagsText ? d.tagsText.split(',').map((t) => t.trim()).filter(Boolean) : [],
        isActive: d.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });
      toast.success('Service updated');
      closeForm();
    },
    onError: () => toast.error('Failed to update service'),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiService.adminDeleteOrgService(apiClient, orgId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });
      toast.success('Service deleted');
    },
    onError: () => toast.error('Failed to delete service'),
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ title: '', description: '', category: 'OTHER', deliveryType: 'On-site', priceInfo: '', availability: '', tagsText: '', isActive: true });
    setFormOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      title: item.title || '',
      description: item.description || '',
      category: API_SERVICE_CATEGORIES.includes(item.category) ? item.category : 'OTHER',
      deliveryType: API_DELIVERY_TYPES.includes(item.deliveryType) ? item.deliveryType : 'On-site',
      priceInfo: item.priceInfo || '',
      availability: item.availability || '',
      tagsText: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      isActive: item.isActive !== false,
    });
    setFormOpen(true);
  };

  const closeForm = () => { setFormOpen(false); setEditItem(null); };
  const handleSubmit = () => { editItem ? updateMutation.mutate(form) : createMutation.mutate(form); };

  return (
    <>
      <PermissionGate
        role={UserRole.SUPER_ADMIN}
        fallback={
          <Card className="p-6 opacity-60">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-gray-500">Super Admin required to manage services.</span>
            </div>
          </Card>
        }
      >
        <Card className="p-6">
          <ItemListEditor
            title="Services"
            items={items}
            columns={[
              { label: 'Title', render: (i) => i.title },
              { label: 'Category', render: (i) => SERVICE_CATEGORY_LABELS[i.category] ?? i.category ?? '—' },
              { label: 'Delivery', render: (i) => i.deliveryType || '—' },
              { label: 'Status', render: (i) => i.isActive !== false ? 'Active' : 'Hidden' },
            ]}
            emptyMessage="No services yet. Add the first service."
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={(i) => deleteMutation.mutate(i.id)}
          />
        </Card>
      </PermissionGate>
      <ItemFormModal
        title={editItem ? 'Edit Service' : 'Add Service'}
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input className={STANDARD_INPUT_FIELD} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className={STANDARD_INPUT_FIELD} rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className={STANDARD_INPUT_FIELD} value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              {API_SERVICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{SERVICE_CATEGORY_LABELS[c] ?? c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
            <select className={STANDARD_INPUT_FIELD} value={form.deliveryType} onChange={(e) => setForm((p) => ({ ...p, deliveryType: e.target.value }))}>
              {API_DELIVERY_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price Info</label>
            <input className={STANDARD_INPUT_FIELD} placeholder="e.g. From CHF 150/h" value={form.priceInfo} onChange={(e) => setForm((p) => ({ ...p, priceInfo: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
            <input className={STANDARD_INPUT_FIELD} placeholder="e.g. Mon–Fri, on demand" value={form.availability} onChange={(e) => setForm((p) => ({ ...p, availability: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input className={STANDARD_INPUT_FIELD} placeholder="e.g. consulting, hr, legal" value={form.tagsText} onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className={STANDARD_INPUT_FIELD} value={form.isActive ? 'active' : 'hidden'} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'active' }))}>
            <option value="active">Active (visible)</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </ItemFormModal>
    </>
  );
}

// ─── Staff sub-resource section (Foundation orgs) ────────────────────────────

const STAFF_ROLE_OPTIONS = ['EDUCATOR', 'FOUNDATION', 'ADMIN', 'PARENT'] as const;

function StaffSection({ orgId }: { orgId: string }) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [roleModalUserId, setRoleModalUserId] = useState<string | null>(null);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState<string>('EDUCATOR');
  const [selectedRole, setSelectedRole] = useState<string>('EDUCATOR');

  const { data } = useQuery({
    queryKey: ['admin-org-members', orgId],
    queryFn: () => apiService.adminListOrgMembers(apiClient, orgId),
    enabled: !!orgId,
  });
  const members: any[] = data?.data?.data ?? [];

  const addMutation = useMutation({
    mutationFn: () => apiService.adminAddOrgMember(apiClient, orgId, { userId: newUserId.trim(), role: newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-members', orgId] });
      toast.success('Staff member added');
      setAddOpen(false);
      setNewUserId('');
      setNewRole('EDUCATOR');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add staff member'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiService.adminUpdateOrgMemberRole(apiClient, orgId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-members', orgId] });
      toast.success('Role updated');
      setRoleModalUserId(null);
    },
    onError: () => toast.error('Failed to update role'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => apiService.adminRemoveOrgMember(apiClient, orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org-members', orgId] });
      toast.success('Staff member removed');
    },
    onError: () => toast.error('Failed to remove staff member'),
  });

  const roleTarget = members.find((m) => m.userId === roleModalUserId);

  return (
    <>
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
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700">Staff Members</h4>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              + Add Staff
            </button>
          </div>
          {members.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-200 py-4 text-center text-sm text-gray-400">
              No staff members yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {m.user ? `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() || m.user.email : m.userId}
                    </p>
                    {m.user?.email && <p className="truncate text-xs text-gray-400">{m.user.email}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-swiss-teal/10 px-2 py-0.5 text-xs font-medium text-swiss-teal">
                    {m.role}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setRoleModalUserId(m.userId); setSelectedRole(m.role); }}
                      className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                    >
                      Role
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/users/${m.userId}/profile`)}
                      className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (window.confirm('Remove this staff member?')) removeMutation.mutate(m.userId); }}
                      className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </PermissionGate>

      {/* Add staff modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Add Staff Member</h3>
              <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label>
                <input
                  className={STANDARD_INPUT_FIELD}
                  placeholder="Paste user ID from the Users page"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-400">Find user IDs on the Users page.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select className={STANDARD_INPUT_FIELD} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => addMutation.mutate()}
                disabled={!newUserId.trim() || addMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {addMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change role modal */}
      {roleModalUserId && roleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Change Role</h3>
              <button onClick={() => setRoleModalUserId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-5">
              <p className="mb-3 text-sm text-gray-600">
                {roleTarget.user ? `${roleTarget.user.firstName ?? ''} ${roleTarget.user.lastName ?? ''}`.trim() || roleTarget.user.email : roleTarget.userId}
              </p>
              <select className={STANDARD_INPUT_FIELD} value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setRoleModalUserId(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateRoleMutation.mutate({ userId: roleModalUserId, role: selectedRole })}
                disabled={updateRoleMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateRoleMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const AdminOrganizationProfileEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<OrganizationProfile>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch organization profile
  const { data: profileResponse, isLoading, error } = useQuery({
    queryKey: ['admin-organization-profile', id],
    queryFn: () => apiService.getAdminOrganizationProfile(apiClient, id!),
    enabled: !!id && !!apiClient,
  });

  const profile = profileResponse?.data?.data;

  // Initialize form data when profile loads
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
        // Backend canonical field is `websiteUrl` (older admin UIs used `website`)
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

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<OrganizationProfile>) =>
      apiService.updateAdminOrganizationProfile(apiClient, id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organization-profile', id] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setIsDirty(false);
      toast.success(t('admin:orgProfile.updateSuccess', 'Organization profile updated successfully'));
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || t('admin:orgProfile.updateError', 'Failed to update organization profile');
      toast.error(message);
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
        newValues = withoutAll.includes(value)
          ? withoutAll.filter((v) => v !== value)
          : [...withoutAll, value];
      }
    } else if (currentValues.includes(value)) {
      newValues = currentValues.filter((v) => v !== value);
    } else {
      newValues = [...currentValues, value];
    }
    handleChange(field, newValues);
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
        navigate('/organizations');
      }
    } else {
      navigate('/organizations');
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
        <div className="text-red-500 mb-4">{t('admin:orgProfile.loadError', 'Failed to load organization profile')}</div>
        <Button variant="secondary" onClick={() => navigate('/organizations')}>
          {t('common:back', 'Back')}
        </Button>
      </div>
    );
  }

  const isFoundation = profile.type === 'FOUNDATION';
  const isSupplier = profile.type === 'PRODUCT_SUPPLIER';
  const isServiceProvider = profile.type === 'SERVICE_PROVIDER';

  const getTypeIcon = () => {
    switch (profile.type) {
      case 'FOUNDATION':
        return <Home className="h-6 w-6 text-swiss-teal" />;
      case 'SERVICE_PROVIDER':
        return <Wrench className="h-6 w-6 text-indigo-600" />;
      case 'PRODUCT_SUPPLIER':
        return <Package className="h-6 w-6 text-amber-600" />;
      default:
        return <Building2 className="h-6 w-6 text-swiss-teal" />;
    }
  };

  const getTypeLabel = () => {
    switch (profile.type) {
      case 'FOUNDATION':
        return t('admin:orgProfile.foundation', 'Foundation / Daycare');
      case 'SERVICE_PROVIDER':
        return t('admin:orgProfile.serviceProvider', 'Service Provider');
      case 'PRODUCT_SUPPLIER':
        return t('admin:orgProfile.supplier', 'Product Supplier');
      default:
        return profile.type;
    }
  };

  const orgDetailsForm = (
    <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-swiss-teal" />
            {t('admin:orgProfile.basicInfo', 'Basic Information')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.name', 'Organization Name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                required
                placeholder={t('admin:orgProfile.namePlaceholder', 'Enter organization name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.description', 'Description')}
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                maxLength={1000}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:orgProfile.descriptionPlaceholder', 'Describe the organization...')}
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {(formData.description || '').length} / 1000
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.vatNumber', 'VAT Number')}
              </label>
              <input
                type="text"
                value={formData.vatNumber || ''}
                onChange={(e) => handleChange('vatNumber', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="CHE-XXX.XXX.XXX"
              />
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-swiss-teal" />
            {t('admin:orgProfile.contactInfo', 'Contact Information')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.contactEmail', 'Contact Email')}
              </label>
              <input
                type="email"
                value={formData.contactEmail || ''}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.phone', 'Phone Number')}
              </label>
              <input
                type="tel"
                value={formData.phoneNumber || ''}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="+41 XX XXX XX XX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.contactPerson', 'Contact Person')}
              </label>
              <input
                type="text"
                value={formData.contactPerson || ''}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('admin:orgProfile.contactPersonPlaceholder', 'Name of contact person')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:orgProfile.website', 'Website')}
              </label>
              <input
                type="url"
                value={formData.websiteUrl || ''}
                onChange={(e) => handleChange('websiteUrl', e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-swiss-teal" />
            {t('admin:orgProfile.location', 'Location')}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.canton', 'Canton')}
                </label>
                <select
                  value={formData.canton || ''}
                  onChange={(e) => handleChange('canton', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                >
                  <option value="">{t('admin:orgProfile.selectCanton', 'Select canton')}</option>
                  {SWISS_CANTONS.map((canton) => (
                    <option key={canton} value={canton}>
                      {canton}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.city', 'City')}
                </label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('admin:orgProfile.cityPlaceholder', 'Enter city')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:orgProfile.regionsServed', 'Regions Served')}
              </label>
              <p className="text-xs text-gray-500 mb-3">
                {t('admin:orgProfile.regionsServedHint', 'Select all cantons where this organization operates')}
              </p>
              <div className="flex flex-wrap gap-2">
                {SWISS_CANTONS_WITH_ALL.map((canton) => (
                  <button
                    key={canton}
                    type="button"
                    onClick={() => handleMultiSelectChange('regionsServed', canton)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                      (formData.regionsServed || []).includes(canton)
                        ? 'bg-swiss-teal text-white border-swiss-teal'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                    }`}
                  >
                    {canton === ALL_REGIONS_OPTION ? t('common:filters.all', 'All') : canton}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin:orgProfile.languages', 'Languages Spoken')}
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleMultiSelectChange('languages', lang)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                      (formData.languages || []).includes(lang)
                        ? 'bg-swiss-teal text-white border-swiss-teal'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Foundation-specific fields */}
        {isFoundation && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2 text-swiss-teal" />
              {t('admin:orgProfile.foundationInfo', 'Foundation Information')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.capacity', 'Capacity (Number of Children)')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.capacity || ''}
                  onChange={(e) => handleChange('capacity', e.target.value ? parseInt(e.target.value, 10) : 0)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:orgProfile.pedagogy', 'Pedagogical Approaches')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {PEDAGOGY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleMultiSelectChange('pedagogy', option)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                        (formData.pedagogy || []).includes(option)
                          ? 'bg-swiss-teal text-white border-swiss-teal'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Supplier-specific fields */}
        {isSupplier && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-swiss-teal" />
              {t('admin:orgProfile.supplierInfo', 'Supplier Information')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.productCategory', 'Product Category')}
                </label>
                <input
                  type="text"
                  value={formData.productCategory || ''}
                  onChange={(e) => handleChange('productCategory', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('admin:orgProfile.productCategoryPlaceholder', 'e.g., Educational Toys, Furniture')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.minimumOrderQuantity', 'Minimum Order Quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.minimumOrderQuantity ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'minimumOrderQuantity',
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  className={STANDARD_INPUT_FIELD}
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.directOrderLink', 'Direct Order Link')}
                </label>
                <input
                  type="url"
                  value={formData.directOrderLink || ''}
                  onChange={(e) => handleChange('directOrderLink', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.catalogUrl', 'Catalog URL')}
                </label>
                <input
                  type="url"
                  value={formData.catalogUrl || ''}
                  onChange={(e) => handleChange('catalogUrl', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder="https://..."
                />
              </div>
            </div>
          </Card>
        )}

        {/* Service Provider-specific fields */}
        {isServiceProvider && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-swiss-teal" />
              {t('admin:orgProfile.serviceProviderInfo', 'Service Provider Information')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.serviceType', 'Service Type')}
                </label>
                <input
                  type="text"
                  value={formData.serviceType || ''}
                  onChange={(e) => handleChange('serviceType', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder={t('admin:orgProfile.serviceTypePlaceholder', 'e.g., IT Support, Cleaning')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin:orgProfile.serviceCategories', 'Service Categories')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleMultiSelectChange('serviceCategories', category)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors duration-150 ${
                        (formData.serviceCategories || []).includes(category)
                          ? 'bg-swiss-teal text-white border-swiss-teal'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal'
                      }`}
                    >
                      {category.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.deliveryType', 'Delivery Type')}
                </label>
                <select
                  value={formData.deliveryType || ''}
                  onChange={(e) => handleChange('deliveryType', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                >
                  <option value="">{t('admin:orgProfile.selectDeliveryType', 'Select delivery type')}</option>
                  {SERVICE_DELIVERY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:orgProfile.bookingLink', 'Booking Link')}
                </label>
                <input
                  type="url"
                  value={formData.bookingLink || ''}
                  onChange={(e) => handleChange('bookingLink', e.target.value)}
                  className={STANDARD_INPUT_FIELD}
                  placeholder="https://..."
                />
              </div>
            </div>
          </Card>
        )}

        {/* Members */}
        {profile.members && profile.members.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-swiss-teal" />
              {t('admin:orgProfile.members', 'Organization Members')}
            </h3>
            <div className="space-y-3">
              {profile.members.map((member: any) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{member.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-1 text-xs font-medium bg-swiss-teal/10 text-swiss-teal rounded-full">
                      {member.role}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/users/${member.userId}/profile`)}
                    >
                      {t('admin:orgProfile.editMember', 'Edit')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
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
  );

  const mainContent = isSupplier ? (
    <Tabs
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={[
        { label: 'Organization', icon: Building2, content: orgDetailsForm },
        { label: 'Products', icon: ShoppingCart, content: <ProductsSection orgId={id!} /> },
      ]}
    />
  ) : isServiceProvider ? (
    <Tabs
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={[
        { label: 'Organization', icon: Building2, content: orgDetailsForm },
        { label: 'Services', icon: Wrench, content: <ServicesSection orgId={id!} /> },
      ]}
    />
  ) : isFoundation ? (
    <Tabs
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={[
        { label: 'Organization', icon: Home, content: orgDetailsForm },
        { label: 'Staff', icon: Users, content: <StaffSection orgId={id!} /> },
      ]}
    />
  ) : (
    orgDetailsForm
  );

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
              {getTypeIcon()}
              <span className="ml-2">{t('admin:orgProfile.editTitle', 'Edit Organization Profile')}</span>
            </h1>
            <p className="text-gray-600 mt-1">
              {profile.name} • <span className="text-swiss-teal">{getTypeLabel()}</span>
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

      {mainContent}
    </div>
  );
};

export default AdminOrganizationProfileEdit;
