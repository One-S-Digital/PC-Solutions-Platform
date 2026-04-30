import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Briefcase, Plus, Trash2, X } from 'lucide-react';
import { useApiClient, apiService } from '../../services/api';
import Card from '../design-system/Card';
import Button from '../design-system/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { STANDARD_INPUT_FIELD } from '../../constants/design-system';

interface OrgServicesPanelProps {
  orgId: string;
}

const API_SERVICE_CATEGORIES = ['CLEANING', 'IT_SUPPORT', 'MAINTENANCE', 'CONSULTING', 'TRAINING', 'OTHER'] as const;
type ApiCategory = (typeof API_SERVICE_CATEGORIES)[number];

const CATEGORY_LABELS: Record<ApiCategory, string> = {
  CLEANING: 'Cleaning',
  IT_SUPPORT: 'IT Support',
  MAINTENANCE: 'Maintenance',
  CONSULTING: 'Consulting',
  TRAINING: 'Training',
  OTHER: 'Other',
};

interface ServiceFormState {
  title: string;
  description: string;
  category: ApiCategory;
  priceInfo: string;
  isActive: boolean;
}

const EMPTY_FORM: ServiceFormState = {
  title: '',
  description: '',
  category: 'OTHER',
  priceInfo: '',
  isActive: true,
};

const OrgServicesPanel: React.FC<OrgServicesPanelProps> = ({ orgId }) => {
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [addForm, setAddForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-org-services', orgId],
    queryFn: () => apiService.getAdminOrgServices(apiClient, orgId),
    enabled: !!apiClient && !!orgId,
  });

  const services: any[] = data?.data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-org-services', orgId] });

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiService.createAdminOrgService(apiClient, orgId, payload),
    onSuccess: () => {
      invalidate();
      setIsAddFormOpen(false);
      setAddForm(EMPTY_FORM);
      toast.success(t('admin:orgServices.created', 'Service created'));
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t('admin:orgServices.createError', 'Failed to create service')),
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: string) => apiService.deleteAdminOrgService(apiClient, orgId, serviceId),
    onSuccess: () => {
      invalidate();
      setDeleteId(null);
      toast.success(t('admin:orgServices.deleted', 'Service deleted'));
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t('admin:orgServices.deleteError', 'Failed to delete service')),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!addForm.title.trim()) {
      setAddError(t('admin:orgServices.titleRequired', 'Title is required'));
      return;
    }
    createMutation.mutate({
      title: addForm.title.trim(),
      description: addForm.description.trim() || undefined,
      category: addForm.category,
      priceInfo: addForm.priceInfo.trim() || undefined,
      isActive: addForm.isActive,
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Briefcase className="w-5 h-5 mr-2 text-indigo-600" />
          {t('admin:orgServices.title', 'Services')}
          {services.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({services.length})</span>
          )}
        </h3>
        <Button
          variant="secondary"
          leftIcon={Plus}
          size="sm"
          onClick={() => { setIsAddFormOpen(true); setAddError(null); setAddForm(EMPTY_FORM); }}
        >
          {t('admin:orgServices.addService', 'Add Service')}
        </Button>
      </div>

      {/* Inline create form */}
      {isAddFormOpen && (
        <div className="mb-4 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-sm text-gray-800">{t('admin:orgServices.newService', 'New Service')}</p>
            <button type="button" onClick={() => setIsAddFormOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            {addError && <p className="text-red-600 text-sm">{addError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('admin:servicesPage.fields.title', 'Title')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                  className={STANDARD_INPUT_FIELD}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('admin:servicesPage.fields.description', 'Description')}
                </label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className={STANDARD_INPUT_FIELD}
                  disabled={createMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('admin:servicesPage.fields.category', 'Category')}
                </label>
                <select
                  value={addForm.category}
                  onChange={(e) => setAddForm((p) => ({ ...p, category: e.target.value as ApiCategory }))}
                  className={STANDARD_INPUT_FIELD}
                  disabled={createMutation.isPending}
                >
                  {API_SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('admin:servicesPage.fields.priceInfo', 'Price info')}
                </label>
                <input
                  type="text"
                  value={addForm.priceInfo}
                  onChange={(e) => setAddForm((p) => ({ ...p, priceInfo: e.target.value }))}
                  className={STANDARD_INPUT_FIELD}
                  placeholder="e.g. CHF 150 / session"
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  id="addServiceActive"
                  type="checkbox"
                  checked={addForm.isActive}
                  onChange={(e) => setAddForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 text-swiss-teal border-gray-300 rounded"
                  disabled={createMutation.isPending}
                />
                <label htmlFor="addServiceActive" className="text-xs text-gray-700">
                  {t('admin:servicesPage.status.active', 'Active (visible)')}
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={createMutation.isPending}
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <LoadingSpinner size="small" />}
                {t('common:create', 'Create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Service list */}
      {isLoading ? (
        <div className="flex justify-center py-6"><LoadingSpinner /></div>
      ) : services.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          {t('admin:orgServices.noServices', 'No services yet. Click "Add Service" to get started.')}
        </p>
      ) : (
        <div className="space-y-2">
          {services.map((service: any) => (
            <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900 truncate">{service.title}</p>
                <p className="text-xs text-gray-500">
                  {service.category && <span>{CATEGORY_LABELS[service.category as ApiCategory] ?? service.category} · </span>}
                  {service.priceInfo && <span>{service.priceInfo} · </span>}
                  <span className={service.isActive !== false ? 'text-green-600' : 'text-red-500'}>
                    {service.isActive !== false
                      ? t('admin:servicesPage.status.active', 'Active')
                      : t('admin:servicesPage.status.blocked', 'Blocked')}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteId(service.id)}
                className="ml-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded"
                title={t('common:delete', 'Delete')}
                disabled={deleteMutation.isPending && deleteId === service.id}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="mt-3 p-3 border border-red-200 rounded-lg bg-red-50 flex items-center justify-between">
          <p className="text-sm text-red-700">
            {t('admin:orgServices.deleteConfirm', 'Delete this service? This cannot be undone.')}
          </p>
          <div className="flex gap-2 ml-3">
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className="px-3 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
            >
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1"
            >
              {deleteMutation.isPending && <LoadingSpinner size="small" />}
              {t('common:delete', 'Delete')}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default OrgServicesPanel;
