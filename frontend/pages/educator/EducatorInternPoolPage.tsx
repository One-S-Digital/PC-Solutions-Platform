import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAppContext } from '../../contexts/AppContext';
import {
  internPoolService,
  InternPoolRequest,
  InternPoolApplication,
  CompensationType,
} from '../../services/internPoolService';

const COMPENSATION_LABELS: Record<CompensationType, string> = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  STIPEND: 'Stipend',
};

const APP_STATUS_COLORS: Record<string, string> = {
  APPLIED: 'bg-blue-100 text-blue-700',
  REVIEWING: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
};

// ── Apply modal ───────────────────────────────────────────────────────────────

interface ApplyModalProps {
  request: InternPoolRequest;
  onClose: () => void;
  onApplied: () => void;
}

function ApplyModal({ request, onClose, onApplied }: ApplyModalProps) {
  const { t } = useTranslation('dashboard');
  const [letter, setLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await internPoolService.applyToRequest(request.id, letter || undefined);
      onApplied();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{t('internPoolPage.applyTo', 'Apply to')}: {request.title}</h3>
              <p className="text-sm text-gray-500">{request.foundation?.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('internPoolPage.motivationLetter', 'Motivation Letter')}
                <span className="text-gray-400 font-normal ml-1">({t('common:optional', 'optional')})</span>
              </label>
              <textarea
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                value={letter}
                onChange={e => setLetter(e.target.value)}
                placeholder="Tell them why you're interested and what you bring to the role…"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={onClose}>
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? t('common:submitting', 'Submitting…') : t('internPoolPage.submitApplication', 'Submit Application')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Open placement card ───────────────────────────────────────────────────────

interface PlacementCardProps {
  request: InternPoolRequest;
  alreadyApplied: boolean;
  onApply: (r: InternPoolRequest) => void;
}

function PlacementCard({ request, alreadyApplied, onApply }: PlacementCardProps) {
  const { t } = useTranslation('dashboard');
  const start = new Date(request.startDate).toLocaleDateString();
  const end = new Date(request.endDate).toLocaleDateString();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{request.title}</h3>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
            <BuildingOfficeIcon className="w-3.5 h-3.5" />
            {request.foundation?.name ?? '—'}
          </p>
        </div>
        {alreadyApplied && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold whitespace-nowrap">
            {t('internPoolPage.applied', 'Applied')}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
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
      {request.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
      )}
      {!alreadyApplied && (
        <Button variant="primary" size="sm" leftIcon={CheckCircleIcon} onClick={() => onApply(request)}>
          {t('internPoolPage.apply', 'Apply')}
        </Button>
      )}
    </div>
  );
}

// ── My application card ───────────────────────────────────────────────────────

function MyApplicationCard({ app }: { app: InternPoolApplication }) {
  const { t } = useTranslation('dashboard');
  const request = app.request;
  const start = request?.startDate ? new Date(request.startDate).toLocaleDateString() : '—';
  const end = request?.endDate ? new Date(request.endDate).toLocaleDateString() : '—';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{request?.title ?? '—'}</h3>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
            <BuildingOfficeIcon className="w-3.5 h-3.5" />
            {request?.foundation?.name ?? '—'}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${APP_STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {app.status}
        </span>
      </div>
      <div className="text-xs text-gray-400 flex items-center gap-1">
        <CalendarDaysIcon className="w-3.5 h-3.5" />
        {start} – {end}
      </div>
      {app.note && (
        <p className="text-xs text-gray-500 italic">Foundation note: {app.note}</p>
      )}
      {app.status === 'ACCEPTED' && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg">
          <CheckCircleIcon className="w-4 h-4" />
          {t('internPoolPage.acceptedHint', 'The foundation has accepted your application. Awaiting final confirmation.')}
        </div>
      )}
      {app.status === 'CONFIRMED' && (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg">
          <CheckCircleIcon className="w-4 h-4" />
          {t('internPoolPage.confirmedHint', 'Placement confirmed! You are set to start this internship.')}
        </div>
      )}
      {app.status === 'DECLINED' && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
          <XCircleIcon className="w-4 h-4" />
          {t('internPoolPage.declinedHint', 'Your application was not selected this time.')}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EducatorInternPoolPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();

  const [tab, setTab] = useState<'browse' | 'mine'>('browse');
  const [openRequests, setOpenRequests] = useState<InternPoolRequest[]>([]);
  const [myApplications, setMyApplications] = useState<InternPoolApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [available, setAvailable] = useState<boolean>((currentUser as { availableForInternship?: boolean })?.availableForInternship ?? false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [applyingTo, setApplyingTo] = useState<InternPoolRequest | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [requests, mine] = await Promise.all([
        internPoolService.getRequests({ status: 'OPEN' }),
        internPoolService.getMyApplications(),
      ]);
      setOpenRequests(requests);
      setMyApplications(mine);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleAvailability = async () => {
    setTogglingAvailability(true);
    try {
      const res = await internPoolService.toggleAvailability(!available);
      setAvailable(res.availableForInternship);
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingAvailability(false);
    }
  };

  const appliedRequestIds = new Set(myApplications.map(a => a.requestId));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AcademicCapIcon className="w-7 h-7 text-indigo-600" />
            {t('internPoolPage.educatorTitle', 'Intern Placements')}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t('internPoolPage.educatorSubtitle', 'Browse open internship placements and track your applications')}</p>
        </div>

        {/* Availability toggle */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2">
          <UserGroupIcon className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-xs font-medium text-gray-700">{t('internPoolPage.availableLabel', 'Available for internships')}</p>
            <p className="text-xs text-gray-400">{available ? t('internPoolPage.visibleToFoundations', 'Visible to foundations') : t('internPoolPage.hiddenFromFoundations', 'Hidden from foundations')}</p>
          </div>
          <button
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${available ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${available ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['browse', 'mine'] as const).map(tab_ => (
          <button
            key={tab_}
            onClick={() => setTab(tab_)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tab_
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab_ === 'browse'
              ? t('internPoolPage.browseTab', 'Browse Placements')
              : `${t('internPoolPage.myAppsTab', 'My Applications')} (${myApplications.length})`
            }
          </button>
        ))}
      </div>

      {/* Apply modal */}
      {applyingTo && (
        <ApplyModal
          request={applyingTo}
          onClose={() => setApplyingTo(null)}
          onApplied={async () => {
            setApplyingTo(null);
            await fetchAll();
          }}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">{t('common:loading', 'Loading…')}</div>
      ) : tab === 'browse' ? (
        openRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AcademicCapIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t('internPoolPage.noOpenPlacements', 'No open placements right now')}</p>
            <p className="text-sm mt-1">{t('internPoolPage.checkBack', 'Check back soon — new placements are posted regularly')}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {openRequests.map(r => (
              <PlacementCard
                key={r.id}
                request={r}
                alreadyApplied={appliedRequestIds.has(r.id)}
                onApply={setApplyingTo}
              />
            ))}
          </div>
        )
      ) : (
        myApplications.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <AcademicCapIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t('internPoolPage.noApplications', 'No applications yet')}</p>
            <p className="text-sm mt-1">{t('internPoolPage.browseHint', 'Browse open placements and submit your application')}</p>
            <Button className="mt-4" variant="outline" onClick={() => setTab('browse')}>
              {t('internPoolPage.browseTab', 'Browse Placements')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {myApplications.map(app => (
              <MyApplicationCard key={app.id} app={app} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
