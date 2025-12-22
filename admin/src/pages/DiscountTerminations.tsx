import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Tag, Plus } from 'lucide-react';
import Card from '../components/design-system/Card';
import Button from '../components/design-system/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useApiClient, apiService } from '../services/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type VendorClientReason = 'NEW' | 'TRIAL' | 'CONTRACT' | 'PAUSED' | 'TERMINATED';

type OrganizationLite = {
  id: string;
  name: string;
  type: 'FOUNDATION' | 'PRODUCT_SUPPLIER' | 'SERVICE_PROVIDER';
  isActive?: boolean;
};

type VendorClient = {
  id: string;
  vendorId: string;
  orgId: string;
  isActive: boolean;
  reason?: VendorClientReason | null;
  note?: string | null;
  markedAt: string;
  deactivatedAt?: string | null;
  vendor?: OrganizationLite;
  org?: OrganizationLite;
};

const DiscountTerminationsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'dashboard', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [vendorId, setVendorId] = React.useState('');
  const [orgId, setOrgId] = React.useState('');
  const [reason, setReason] = React.useState<VendorClientReason>('CONTRACT');
  const [note, setNote] = React.useState('');

  const { data: orgsRes, isLoading: orgsLoading, isError: orgsIsError } = useQuery({
    queryKey: ['discount-terminations-orgs'],
    queryFn: () => apiService.getOrganizations(apiClient),
    enabled: !!apiClient,
  });

  const organizations: OrganizationLite[] = React.useMemo(() => {
    const payload: any = orgsRes?.data?.data;
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.organizations)) return payload.organizations;
    return [];
  }, [orgsRes]);

  const vendorOptions = organizations.filter((o) =>
    o?.type === 'PRODUCT_SUPPLIER' || o?.type === 'SERVICE_PROVIDER'
  );
  const daycareOptions = organizations.filter((o) => o?.type === 'FOUNDATION');

  const { data: vcRes, isLoading: vcLoading, isError: vcIsError } = useQuery({
    queryKey: ['vendor-clients'],
    queryFn: () => apiService.getVendorClients(apiClient),
    enabled: !!apiClient,
  });

  const vendorClients: VendorClient[] = React.useMemo(() => {
    const payload: any = vcRes?.data?.data;
    if (!payload) return [];
    return Array.isArray(payload) ? payload : [];
  }, [vcRes]);

  const terminationQueue = vendorClients.filter(
    (vc) => vc.isActive && vc.org?.isActive === false
  );
  const allActiveDiscounts = vendorClients.filter(
    (vc) => vc.isActive && vc.org?.isActive !== false
  );

  const upsertMutation = useMutation({
    mutationFn: (payload: { vendorId: string; orgId: string; isActive: boolean; reason?: VendorClientReason; note?: string }) =>
      apiService.upsertVendorClient(apiClient, payload as any),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vendor-clients'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || t('common:error', 'Error'));
    },
  });

  const handleCreate = async () => {
    if (!vendorId || !orgId) {
      toast.error(t('common:validation.required', 'Please select vendor and daycare'));
      return;
    }
    await upsertMutation.mutateAsync({
      vendorId,
      orgId,
      isActive: true,
      reason,
      note: note.trim() ? note.trim() : undefined,
    });
    toast.success(t('common:saved', 'Saved'));
    setNote('');
  };

  const markTerminated = async (vc: VendorClient) => {
    await upsertMutation.mutateAsync({
      vendorId: vc.vendorId,
      orgId: vc.orgId,
      isActive: false,
      reason: 'TERMINATED',
      note: vc.note || 'Terminated due to daycare churn.',
    });
    toast.success(t('admin:admin.discountTerminations.actions.markCompleted', 'Marked completed'));
  };

  const loading = orgsLoading || vcLoading;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Tag className="w-8 h-8 text-swiss-mint" />
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal">
            {t('dashboard:adminDiscountTerminationsPage.title', t('admin:sidebar.discountTerminations', 'Discount Terminations'))}
          </h1>
          <p className="text-sm text-gray-600">
            {t(
              'admin:admin.discountTerminations.queue.description',
              'Clients pending discount termination'
            )}
          </p>
        </div>
      </div>

      {vcIsError && (
        <Card className="p-6 border-l-4 border-red-500 bg-red-50">
          <p className="text-sm text-red-700">
            {t('common:errors.loadFailed', 'Failed to load data')}
          </p>
        </Card>
      )}

      {orgsIsError && (
        <Card className="p-6 border-l-4 border-yellow-500 bg-yellow-50">
          <p className="text-sm text-yellow-700">
            {t('common:errors.loadFailed', 'Failed to load organizations')}
          </p>
        </Card>
      )}

      {/* Create / Upsert relationship */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">
          {t('admin:admin.discountTerminations.manage', 'Manage Terminations')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:admin.discountTerminations.table.vendor', 'Vendor')}
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            >
              <option value="">{t('common:placeholders.select', 'Select')}</option>
              {vendorOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:admin.discountTerminations.table.daycare', 'Daycare')}
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              <option value="">{t('common:placeholders.select', 'Select')}</option>
              {daycareOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:admin.discountTerminations.table.reason', 'Reason')}
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value as VendorClientReason)}
            >
              {(['NEW', 'TRIAL', 'CONTRACT', 'PAUSED', 'TERMINATED'] as VendorClientReason[]).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common:notes', 'Notes')}
            </label>
            <input
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('common:optional', 'Optional')}
              maxLength={1000}
            />
          </div>
        </div>

        <div className="mt-4">
          <Button
            onClick={handleCreate}
            disabled={upsertMutation.isPending}
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {upsertMutation.isPending ? t('common:saving', 'Saving...') : t('common:add', 'Add / Update')}
          </Button>
        </div>
      </Card>

      {/* Termination Queue */}
      <Card className="p-6 border-l-4 border-swiss-coral bg-swiss-coral/10">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-swiss-coral" />
          <h2 className="text-xl font-semibold text-swiss-coral">
            {t('admin:admin.discountTerminations.queue.title', 'Termination Queue')}
          </h2>
        </div>
        <p className="text-sm text-gray-700 mb-4">
          {t('admin:admin.discountTerminations.queue.description', 'Clients pending discount termination')}
        </p>

        {terminationQueue.length === 0 ? (
          <p className="text-sm text-gray-600">{t('admin:admin.discountTerminations.queue.empty', 'No pending terminations')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:admin.discountTerminations.table.vendor', 'Vendor')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:admin.discountTerminations.table.daycare', 'Daycare')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:admin.discountTerminations.table.activeSince', 'Active Since')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:admin.discountTerminations.table.reason', 'Reason')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:admin.discountTerminations.table.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {terminationQueue.map((vc) => (
                  <tr key={vc.id}>
                    <td className="px-4 py-3 font-medium">{vc.vendor?.name || vc.vendorId}</td>
                    <td className="px-4 py-3">{vc.org?.name || vc.orgId}</td>
                    <td className="px-4 py-3">{new Date(vc.markedAt).toLocaleDateString(i18n.language)}</td>
                    <td className="px-4 py-3">{vc.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => markTerminated(vc)}
                        disabled={upsertMutation.isPending}
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        {t('admin:admin.discountTerminations.actions.markCompleted', 'Mark Completed')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* All Active Discounts */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-swiss-mint" />
          <h2 className="text-xl font-semibold text-swiss-charcoal">
            {t('admin:admin.discountTerminations.allActive.title', 'Active Discounts')}
          </h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {t('admin:admin.discountTerminations.allActive.description', 'All active vendor discounts')}
        </p>

        {allActiveDiscounts.length === 0 ? (
          <p className="text-sm text-gray-600">{t('admin:admin.discountTerminations.allActive.empty', 'No active discounts')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:admin.discountTerminations.table.vendor', 'Vendor')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:admin.discountTerminations.table.daycare', 'Daycare')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:admin.discountTerminations.table.activeSince', 'Active Since')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:admin.discountTerminations.table.reason', 'Reason')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allActiveDiscounts.map((vc) => (
                  <tr key={vc.id}>
                    <td className="px-4 py-3 font-medium">{vc.vendor?.name || vc.vendorId}</td>
                    <td className="px-4 py-3">{vc.org?.name || vc.orgId}</td>
                    <td className="px-4 py-3">{new Date(vc.markedAt).toLocaleDateString(i18n.language)}</td>
                    <td className="px-4 py-3">{vc.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DiscountTerminationsPage;

