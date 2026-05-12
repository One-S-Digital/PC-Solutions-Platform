import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircleIcon, CalendarDaysIcon, MapPinIcon, UserGroupIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon, EyeIcon, TrashIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAppContext } from '../../contexts/AppContext';
import { replacementsService, ReplacementRequest, ReplacementRequestStatus, CreateReplacementRequestData, StaffingSignals } from '../../services/replacementsService';
import { EDUCATOR_JOB_ROLES } from '../../constants';

const KpiPill: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="bg-white rounded-xl border px-4 py-3 text-center shadow-minimal">
    <p className="text-xl font-bold text-swiss-charcoal">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

type FilterStatus = 'ALL' | ReplacementRequestStatus;

const STATUS_META: Record<ReplacementRequestStatus, { label: string; className: string }> = {
  OPEN:      { label: 'Open',      className: 'bg-blue-100 text-blue-700' },
  MATCHED:   { label: 'Matched',   className: 'bg-yellow-100 text-yellow-700' },
  FILLED:    { label: 'Filled',    className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
};

interface RequestFormData {
  startDate: string;
  endDate: string;
  shiftStart: string;
  shiftEnd: string;
  role: string;
  description: string;
  location: string;
  urgency: 'NORMAL' | 'URGENT';
}

const emptyForm = (): RequestFormData => ({
  startDate: '',
  endDate: '',
  shiftStart: '',
  shiftEnd: '',
  role: '',
  description: '',
  location: '',
  urgency: 'NORMAL',
});

const FoundationReplacementsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common', 'recruitment']);
  const { currentUser, addNotification } = useAppContext();

  const [requests, setRequests] = useState<ReplacementRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<RequestFormData>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReplacementRequest | null>(null);
  const [kpi, setKpi] = useState<(StaffingSignals & { avgFulfillmentDays: number | null; filledCount: number }) | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, kpiData] = await Promise.all([
        replacementsService.getRequests(filterStatus !== 'ALL' ? { status: filterStatus } : undefined),
        replacementsService.getKpiMetrics().catch(() => null),
      ]);
      setRequests(data);
      if (kpiData) setKpi(kpiData);
    } catch {
      addNotification({ type: 'error', message: t('dashboard:replacementsPage.loadError', 'Failed to load replacement requests') });
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, addNotification, t]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.role) return;

    setIsSubmitting(true);
    try {
      const payload: CreateReplacementRequestData = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        role: formData.role,
        description: formData.description || undefined,
        location: formData.location || undefined,
        urgency: formData.urgency,
        shiftStart: formData.shiftStart || undefined,
        shiftEnd: formData.shiftEnd || undefined,
      };
      await replacementsService.createRequest(payload);
      addNotification({ type: 'success', message: t('dashboard:replacementsPage.createSuccess', 'Replacement request posted') });
      setShowForm(false);
      setFormData(emptyForm());
      fetchRequests();
    } catch {
      addNotification({ type: 'error', message: t('dashboard:replacementsPage.createError', 'Failed to post replacement request') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await replacementsService.cancelRequest(id);
      addNotification({ type: 'success', message: t('dashboard:replacementsPage.cancelSuccess', 'Request cancelled') });
      fetchRequests();
      if (selectedRequest?.id === id) setSelectedRequest(null);
    } catch {
      addNotification({ type: 'error', message: t('dashboard:replacementsPage.cancelError', 'Failed to cancel request') });
    }
  };

  const filtered = filterStatus === 'ALL'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  const filters: { label: string; value: FilterStatus }[] = [
    { label: t('common:all', 'All'), value: 'ALL' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Matched', value: 'MATCHED' },
    { label: 'Filled', value: 'FILLED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {t('dashboard:replacementsPage.title', 'Replacement Staffing')}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('dashboard:replacementsPage.subtitle', 'Post and manage short-notice replacement requests')}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => { setShowForm(true); setSelectedRequest(null); }}
          leftIcon={PlusCircleIcon}
        >
          {t('dashboard:replacementsPage.newRequest', 'New Request')}
        </Button>
      </div>

      {/* KPI bar */}
      {kpi && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiPill label={t('dashboard:replacementsPage.kpiOpen', 'Open')} value={kpi.openRequests} />
          <KpiPill label={t('dashboard:replacementsPage.kpiMatched', 'Matched')} value={kpi.matchedRequests} />
          <KpiPill label={t('dashboard:replacementsPage.kpiFilled', 'Filled')} value={kpi.filledRequests} />
          <KpiPill
            label={t('dashboard:replacementsPage.kpiAvgFulfillment', 'Avg Fulfil. (days)')}
            value={kpi.avgFulfillmentDays !== null ? kpi.avgFulfillmentDays : '—'}
          />
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold mb-4">{t('dashboard:replacementsPage.formTitle', 'Post a Replacement Request')}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard:replacementsPage.startDate', 'Start Date')} *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-swiss-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard:replacementsPage.endDate', 'End Date')} *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-swiss-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard:replacementsPage.shiftStart', 'Shift Start')}
              </label>
              <input
                type="time"
                value={formData.shiftStart}
                onChange={e => setFormData(p => ({ ...p, shiftStart: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-swiss-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard:replacementsPage.shiftEnd', 'Shift End')}
              </label>
              <input
                type="time"
                value={formData.shiftEnd}
                onChange={e => setFormData(p => ({ ...p, shiftEnd: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-swiss-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard:replacementsPage.role', 'Role Required')} *
              </label>
              <select
                required
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-swiss-teal"
              >
                <option value="">{t('common:selectPlaceholder', 'Select a role…')}</option>
                {EDUCATOR_JOB_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard:replacementsPage.location', 'Location')}
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                placeholder={t('dashboard:replacementsPage.locationPlaceholder', 'e.g. Geneva')}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-swiss-teal"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dashboard:replacementsPage.description', 'Description / Notes')}
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-swiss-teal"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.urgency === 'URGENT'}
                  onChange={e => setFormData(p => ({ ...p, urgency: e.target.checked ? 'URGENT' : 'NORMAL' }))}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm font-medium text-red-600">
                  {t('dashboard:replacementsPage.markUrgent', 'Mark as Urgent')}
                </span>
              </label>
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {t('dashboard:replacementsPage.submit', 'Post Request')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === f.value
                ? 'bg-swiss-teal text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Request list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-swiss-teal border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{t('dashboard:replacementsPage.empty', 'No replacement requests found')}</p>
          <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
            {t('dashboard:replacementsPage.newRequest', 'New Request')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <ReplacementRequestCard
              key={req.id}
              request={req}
              onView={() => setSelectedRequest(req)}
              onCancel={handleCancel}
              isSelected={selectedRequest?.id === req.id}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedRequest && (
        <RequestDetailPanel
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onCancel={handleCancel}
          t={t}
        />
      )}
    </div>
  );
};

interface CardProps {
  request: ReplacementRequest;
  onView: () => void;
  onCancel: (id: string) => void;
  isSelected: boolean;
}

const ReplacementRequestCard: React.FC<CardProps> = ({ request, onView, onCancel, isSelected }) => {
  const { label, className } = STATUS_META[request.status] || STATUS_META.OPEN;
  const start = new Date(request.startDate).toLocaleDateString();
  const end = new Date(request.endDate).toLocaleDateString();

  return (
    <Card className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${isSelected ? 'ring-2 ring-swiss-teal' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-gray-800">{request.role}</span>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${className}`}>{label}</span>
          {request.urgency === 'URGENT' && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
              <ExclamationTriangleIcon className="w-3 h-3" /> Urgent
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><CalendarDaysIcon className="w-3.5 h-3.5" />{start} – {end}</span>
          {request.shiftStart && request.shiftEnd && (
            <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" />{request.shiftStart}–{request.shiftEnd}</span>
          )}
          {request.location && (
            <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" />{request.location}</span>
          )}
          {request.matches && (
            <span className="flex items-center gap-1"><UserGroupIcon className="w-3.5 h-3.5" />{request.matches.length} match(es)</span>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onView} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-swiss-teal transition-colors">
          <EyeIcon className="w-5 h-5" />
        </button>
        {(request.status === 'OPEN' || request.status === 'MATCHED') && (
          <button
            onClick={() => onCancel(request.id)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </Card>
  );
};

interface DetailPanelProps {
  request: ReplacementRequest;
  onClose: () => void;
  onCancel: (id: string) => void;
  t: (key: string, fallback?: string) => string;
}

const RequestDetailPanel: React.FC<DetailPanelProps> = ({ request, onClose, onCancel, t }) => {
  const { label, className } = STATUS_META[request.status] || STATUS_META.OPEN;
  const start = new Date(request.startDate).toLocaleDateString();
  const end = new Date(request.endDate).toLocaleDateString();

  return (
    <Card className="p-5 border-l-4 border-swiss-teal">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{request.role}</h2>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${className}`}>{label}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          <XCircleIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
        <div><span className="font-medium">Dates:</span> {start} – {end}</div>
        {request.shiftStart && <div><span className="font-medium">Shift:</span> {request.shiftStart}–{request.shiftEnd}</div>}
        {request.location && <div><span className="font-medium">Location:</span> {request.location}</div>}
        {request.urgency === 'URGENT' && (
          <div className="text-red-600 font-medium flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4" /> Urgent
          </div>
        )}
      </div>
      {request.description && (
        <p className="text-sm text-gray-600 mb-4 border-t pt-3">{request.description}</p>
      )}

      {request.matches && request.matches.length > 0 && (
        <div className="border-t pt-3">
          <h3 className="text-sm font-semibold mb-2">Matched Educators ({request.matches.length})</h3>
          <ul className="space-y-2">
            {request.matches.map(m => (
              <li key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.educator?.firstName} {m.educator?.lastName}</p>
                  <p className="text-xs text-gray-500">{m.educator?.jobRole} {m.educator?.region ? `· ${m.educator.region}` : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  m.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                  m.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                  m.status === 'DECLINED' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>{m.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(request.status === 'OPEN' || request.status === 'MATCHED') && (
        <div className="mt-4 flex justify-end">
          <Button variant="danger" size="sm" onClick={() => onCancel(request.id)}>
            {t('dashboard:replacementsPage.cancelRequest', 'Cancel Request')}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default FoundationReplacementsPage;
