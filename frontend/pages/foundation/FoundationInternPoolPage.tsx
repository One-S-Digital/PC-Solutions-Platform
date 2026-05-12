import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusCircleIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UserGroupIcon,
  EyeIcon,
  TrashIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAppContext } from '../../contexts/AppContext';
import {
  internPoolService,
  InternPoolRequest,
  InternPoolApplication,
  InternPoolApplicationStatus,
  CreateInternPoolRequestData,
  CompensationType,
} from '../../services/internPoolService';
import { EDUCATOR_JOB_ROLES, STANDARD_INPUT_FIELD } from '../../constants';

type FilterStatus = 'ALL' | 'OPEN' | 'REVIEWING' | 'FILLED' | 'CANCELLED';

interface RequestFormData {
  title: string;
  startDate: string;
  endDate: string;
  role: string;
  description: string;
  location: string;
  supervisorName: string;
  compensationType: CompensationType;
  weeklyHours: string;
}

const emptyForm = (): RequestFormData => ({
  title: '',
  startDate: '',
  endDate: '',
  role: '',
  description: '',
  location: '',
  supervisorName: '',
  compensationType: 'UNPAID',
  weeklyHours: '',
});

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  REVIEWING: 'bg-yellow-100 text-yellow-800',
  FILLED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const APP_STATUS_COLORS: Record<string, string> = {
  APPLIED: 'bg-blue-100 text-blue-700',
  REVIEWING: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
};

const COMPENSATION_LABELS: Record<CompensationType, string> = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  STIPEND: 'Stipend',
};

// ── KPI pill ──────────────────────────────────────────────────────────────────

interface KpiPillProps {
  label: string;
  value: number | string | null;
  icon: React.ElementType;
  color: string;
}

function KpiPill({ label, value, icon: Icon, color }: KpiPillProps) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-lg font-bold">{value ?? '—'}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

// ── Application card (inside detail panel) ────────────────────────────────────

interface AppCardProps {
  app: InternPoolApplication;
  onRespond: (appId: string, status: InternPoolApplicationStatus, note?: string) => void;
}

function ApplicationCard({ app, onRespond }: AppCardProps) {
  const { t } = useTranslation('dashboard');
  const applicant = app.applicant;
  const fullName = [applicant?.firstName, applicant?.lastName].filter(Boolean).join(' ') || applicant?.email || '—';

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900 text-sm">{fullName}</p>
          <p className="text-xs text-gray-500">{applicant?.jobRole} {applicant?.region ? `· ${applicant.region}` : ''}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${APP_STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {app.status}
        </span>
      </div>
      {app.motivationLetter && (
        <p className="text-xs text-gray-600 italic line-clamp-2">"{app.motivationLetter}"</p>
      )}
      {app.note && (
        <p className="text-xs text-gray-500">Note: {app.note}</p>
      )}
      {(app.status === 'APPLIED' || app.status === 'REVIEWING') && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onRespond(app.id, 'ACCEPTED')}
            className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            {t('internPoolPage.accept', 'Accept')}
          </button>
          <button
            onClick={() => onRespond(app.id, 'DECLINED')}
            className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
          >
            {t('internPoolPage.decline', 'Decline')}
          </button>
        </div>
      )}
      {app.status === 'ACCEPTED' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onRespond(app.id, 'CONFIRMED')}
            className="text-xs px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            {t('internPoolPage.confirm', 'Confirm Placement')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Request card ─────────────────────────────────────────────────────────────

interface RequestCardProps {
  request: InternPoolRequest;
  onSelect: (r: InternPoolRequest) => void;
  onCancel: (id: string) => void;
}

function RequestCard({ request, onSelect, onCancel }: RequestCardProps) {
  const { t } = useTranslation('dashboard');
  const start = new Date(request.startDate).toLocaleDateString();
  const end = new Date(request.endDate).toLocaleDateString();
  const appCount = request.applications?.length ?? 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{request.title}</h3>
          <p className="text-sm text-gray-500">{request.role}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${STATUS_COLORS[request.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {request.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <CalendarDaysIcon className="w-3.5 h-3.5" />
          {start} – {end}
        </span>
        {request.location && (
          <span className="flex items-center gap-1">
            <MapPinIcon className="w-3.5 h-3.5" />
            {request.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <CurrencyDollarIcon className="w-3.5 h-3.5" />
          {COMPENSATION_LABELS[request.compensationType]}
        </span>
        {request.weeklyHours && (
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            {request.weeklyHours}h/week
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <UserGroupIcon className="w-3.5 h-3.5" />
          {appCount} {t('internPoolPage.applicants', 'applicants')}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={EyeIcon} onClick={() => onSelect(request)}>
            {t('internPoolPage.review', 'Review')}
          </Button>
          {(request.status === 'OPEN' || request.status === 'REVIEWING') && (
            <Button variant="danger" size="sm" leftIcon={TrashIcon} onClick={() => onCancel(request.id)}>
              {t('internPoolPage.cancel', 'Cancel')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FoundationInternPoolPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();

  const [requests, setRequests] = useState<InternPoolRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<RequestFormData>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InternPoolRequest | null>(null);
  const [signals, setSignals] = useState<{ openRequests: number; reviewingRequests: number; filledRequests: number; internPoolSize: number } | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reqs, sigs] = await Promise.all([
        internPoolService.getRequests(),
        internPoolService.getSignals().catch(() => null),
      ]);
      setRequests(reqs);
      if (sigs) setSignals(sigs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate || !formData.role) return;
    setIsSubmitting(true);
    try {
      const payload: CreateInternPoolRequestData = {
        title: formData.title,
        startDate: formData.startDate,
        endDate: formData.endDate,
        role: formData.role,
        description: formData.description || undefined,
        location: formData.location || undefined,
        supervisorName: formData.supervisorName || undefined,
        compensationType: formData.compensationType,
        weeklyHours: formData.weeklyHours ? parseInt(formData.weeklyHours, 10) : undefined,
      };
      await internPoolService.createRequest(payload);
      setFormData(emptyForm());
      setShowForm(false);
      await fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await internPoolService.cancelRequest(id);
      await fetchAll();
      if (selectedRequest?.id === id) setSelectedRequest(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRespond = async (appId: string, status: InternPoolApplicationStatus, note?: string) => {
    try {
      await internPoolService.respondToApplication(appId, status, note);
      await fetchAll();
      if (selectedRequest) {
        const updated = await internPoolService.getRequestById(selectedRequest.id);
        setSelectedRequest(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filterStatus === 'ALL' ? requests : requests.filter(r => r.status === filterStatus);
  const filters: FilterStatus[] = ['ALL', 'OPEN', 'REVIEWING', 'FILLED', 'CANCELLED'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center gap-3">
            <AcademicCapIcon className="w-8 h-8 text-swiss-teal" />
            {t('internPoolPage.title', 'Intern Pool')}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{t('internPoolPage.subtitle', 'Post placements and review intern applications')}</p>
        </div>
        <Button variant="primary" leftIcon={PlusCircleIcon} onClick={() => setShowForm(true)}>
          {t('internPoolPage.postPlacement', 'Post Placement')}
        </Button>
      </div>

      {/* KPI bar */}
      {signals && (
        <div className="flex flex-wrap gap-3">
          <KpiPill label={t('internPoolPage.kpiOpen', 'Open')} value={signals.openRequests} icon={ChartBarIcon} color="bg-blue-50 text-blue-700" />
          <KpiPill label={t('internPoolPage.kpiReviewing', 'Reviewing')} value={signals.reviewingRequests} icon={EyeIcon} color="bg-yellow-50 text-yellow-700" />
          <KpiPill label={t('internPoolPage.kpiFilled', 'Filled')} value={signals.filledRequests} icon={UserPlusIcon} color="bg-green-50 text-green-700" />
          <KpiPill label={t('internPoolPage.kpiPool', 'Available Interns')} value={signals.internPoolSize} icon={UserGroupIcon} color="bg-swiss-mint/10 text-swiss-teal" />
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <Card>
          <h2 className="text-lg font-semibold text-swiss-charcoal mb-5">{t('internPoolPage.newPlacement', 'New Intern Placement')}</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('internPoolPage.placementTitle', 'Placement Title')} *</label>
              <input
                className={STANDARD_INPUT_FIELD}
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Childcare Intern – Summer 2026"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('internPoolPage.startDate', 'Start Date')} *</label>
                <input
                  type="date"
                  className={STANDARD_INPUT_FIELD}
                  value={formData.startDate}
                  onChange={e => setFormData(f => ({ ...f, startDate: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('internPoolPage.endDate', 'End Date')} *</label>
                <input
                  type="date"
                  className={STANDARD_INPUT_FIELD}
                  value={formData.endDate}
                  onChange={e => setFormData(f => ({ ...f, endDate: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('internPoolPage.role', 'Role')} *</label>
                <select
                  className={STANDARD_INPUT_FIELD}
                  value={formData.role}
                  onChange={e => setFormData(f => ({ ...f, role: e.target.value }))}
                  required
                >
                  <option value="">{t('internPoolPage.selectRole', 'Select role…')}</option>
                  {EDUCATOR_JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('internPoolPage.location', 'Location')}</label>
                <input
                  className={STANDARD_INPUT_FIELD}
                  value={formData.location}
                  onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Geneva, on-site"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('internPoolPage.compensation', 'Compensation')}</label>
                <select
                  className={STANDARD_INPUT_FIELD}
                  value={formData.compensationType}
                  onChange={e => setFormData(f => ({ ...f, compensationType: e.target.value as CompensationType }))}
                >
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="STIPEND">Stipend</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('internPoolPage.weeklyHours', 'Weekly Hours')}</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  className={STANDARD_INPUT_FIELD}
                  value={formData.weeklyHours}
                  onChange={e => setFormData(f => ({ ...f, weeklyHours: e.target.value }))}
                  placeholder="e.g. 20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('internPoolPage.supervisor', 'Supervisor')}</label>
                <input
                  className={STANDARD_INPUT_FIELD}
                  value={formData.supervisorName}
                  onChange={e => setFormData(f => ({ ...f, supervisorName: e.target.value }))}
                  placeholder="Supervisor name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('internPoolPage.description', 'Description')}</label>
              <textarea
                rows={4}
                className={`${STANDARD_INPUT_FIELD} resize-none`}
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the internship tasks and expectations…"
              />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common:saving', 'Saving…') : t('internPoolPage.post', 'Post Placement')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              filterStatus === f
                ? 'border-swiss-mint text-swiss-teal'
                : 'border-transparent text-gray-500 hover:text-swiss-charcoal'
            }`}
          >
            {f === 'ALL' ? t('internPoolPage.filterAll', 'All') : f}
            {f !== 'ALL' && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {requests.filter(r => r.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className={`grid gap-6 ${selectedRequest ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Requests list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">{t('common:loading', 'Loading…')}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AcademicCapIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t('internPoolPage.empty', 'No placements yet')}</p>
              <p className="text-sm mt-1">{t('internPoolPage.emptyHint', 'Post your first intern placement to get started')}</p>
              {!showForm && (
                <Button className="mt-4" variant="outline" onClick={() => setShowForm(true)}>
                  {t('internPoolPage.postPlacement', 'Post Placement')}
                </Button>
              )}
            </div>
          ) : (
            filtered.map(r => (
              <RequestCard
                key={r.id}
                request={r}
                onSelect={setSelectedRequest}
                onCancel={handleCancel}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        {selectedRequest && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 self-start sticky top-20">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedRequest.title}</h3>
                <p className="text-sm text-gray-500">{selectedRequest.role}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
              <span>📅 {new Date(selectedRequest.startDate).toLocaleDateString()} – {new Date(selectedRequest.endDate).toLocaleDateString()}</span>
              {selectedRequest.location && <span>📍 {selectedRequest.location}</span>}
              <span>💼 {COMPENSATION_LABELS[selectedRequest.compensationType]}</span>
              {selectedRequest.weeklyHours && <span>⏱ {selectedRequest.weeklyHours}h/week</span>}
              {selectedRequest.supervisorName && <span>👤 {selectedRequest.supervisorName}</span>}
            </div>
            {selectedRequest.description && (
              <p className="text-sm text-gray-600">{selectedRequest.description}</p>
            )}
            <div>
              <h4 className="font-medium text-gray-800 mb-2 text-sm">
                {t('internPoolPage.applications', 'Applications')} ({selectedRequest.applications?.length ?? 0})
              </h4>
              {(selectedRequest.applications?.length ?? 0) === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">{t('internPoolPage.noApplications', 'No applications yet')}</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedRequest.applications?.map(app => (
                    <ApplicationCard key={app.id} app={app} onRespond={handleRespond} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
