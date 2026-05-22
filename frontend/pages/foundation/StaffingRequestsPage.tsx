import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  ClockIcon,
  MapPinIcon,
  StarIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAppContext } from '../../contexts/AppContext';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type StaffingStatus =
  | 'PENDING_PARSE'
  | 'PARSED'
  | 'MATCHING'
  | 'MATCHED'
  | 'NO_MATCHES'
  | 'ERROR';

interface StaffingRequest {
  id: string;
  rawText: string;
  status: StaffingStatus;
  roleRequired?: string;
  canton?: string;
  startDate?: string;
  hoursPerWeek?: number;
  contractType?: string;
  languages?: string[];
  ageGroups?: string[];
  createdAt: string;
}

interface MatchResult {
  id: string;
  staffingRequestId: string;
  candidateId: string;
  totalScore: number;
  distanceKm?: number;
  explanation?: string;
  candidate?: {
    id: string;
    firstName?: string;
    lastName?: string;
    jobRole?: string;
    region?: string;
    jobRoles?: string[];
  };
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<StaffingStatus, string> = {
  PENDING_PARSE: 'bg-yellow-100 text-yellow-700',
  PARSED:        'bg-blue-100 text-blue-700',
  MATCHING:      'bg-indigo-100 text-indigo-700',
  MATCHED:       'bg-green-100 text-green-700',
  NO_MATCHES:    'bg-gray-100 text-gray-600',
  ERROR:         'bg-red-100 text-red-700',
};

const StatusBadge: React.FC<{ status: StaffingStatus; label: string }> = ({ status, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
    {status === 'MATCHING' || status === 'PENDING_PARSE' ? (
      <span className="mr-1.5 w-2 h-2 rounded-full bg-current opacity-75 animate-pulse inline-block" />
    ) : null}
    {label}
  </span>
);

// ─── Score bar ────────────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ score: number }> = ({ score }) => {
  const pct = Math.min(100, Math.max(0, Math.round(score)));
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-swiss-charcoal w-8 text-right">{pct}</span>
    </div>
  );
};

// ─── Candidate row ────────────────────────────────────────────────────────────

const CandidateRow: React.FC<{ match: MatchResult; t: ReturnType<typeof useTranslation>['t'] }> = ({ match, t }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const initials = [match.candidate?.firstName, match.candidate?.lastName]
    .filter(Boolean)
    .map((n) => n![0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="py-3 px-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-swiss-teal/15 flex items-center justify-center text-swiss-teal font-semibold text-sm shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-swiss-charcoal text-sm">
              {match.candidate?.firstName ?? '—'} {match.candidate?.lastName ?? ''}
            </span>
            {match.candidate?.jobRole && (
              <span className="text-xs text-gray-500">{match.candidate.jobRole}</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {match.candidate?.region && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPinIcon className="w-3.5 h-3.5" />
                {match.candidate.region}
              </span>
            )}
            {match.distanceKm !== undefined && match.distanceKm !== null && (
              <span className="text-xs text-gray-400">
                {t('staffing:matches.distance', { km: Math.round(Number(match.distanceKm)) })}
              </span>
            )}
          </div>

          <div className="mt-2 max-w-xs">
            <p className="text-xs text-gray-500 mb-1">{t('staffing:matches.score')}</p>
            <ScoreBar score={Number(match.totalScore) * 100} />
          </div>

          {match.explanation && (
            <div className="mt-2">
              <button
                onClick={() => setShowExplanation((v) => !v)}
                className="text-xs text-swiss-teal hover:underline flex items-center gap-1"
              >
                <StarIcon className="w-3.5 h-3.5" />
                {t('staffing:matches.explanation')}
              </button>
              {showExplanation && (
                <p className="mt-1 text-xs text-gray-600 bg-swiss-teal/5 rounded p-2 border border-swiss-teal/10">
                  {match.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const StaffingRequestsPage: React.FC = () => {
  const { t } = useTranslation(['staffing', 'common']);
  const { addNotification } = useAppContext();
  const { request } = useAuthenticatedApi();

  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History of requests (local state — most recent first)
  const [history, setHistory] = useState<StaffingRequest[]>([]);

  // Currently selected/viewed request
  const [activeRequest, setActiveRequest] = useState<StaffingRequest | null>(null);

  // Matches for active request
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Polling interval ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch matches for a given request
  const fetchMatches = useCallback(
    async (requestId: string) => {
      setLoadingMatches(true);
      try {
        const res = await request<MatchResult[]>(`/staffing/requests/${requestId}/matches`);
        if (res.success && Array.isArray(res.data)) {
          setMatches(res.data);
        }
      } catch {
        addNotification({ type: 'error', message: t('staffing:errors.fetchFailed') });
      } finally {
        setLoadingMatches(false);
      }
    },
    [request, addNotification, t],
  );

  // Refresh the status of the active request
  const refreshActiveRequest = useCallback(
    async (id: string) => {
      try {
        const res = await request<StaffingRequest>(`/staffing/requests/${id}`);
        if (res.success && res.data) {
          setActiveRequest(res.data);
          // Update in history
          setHistory((prev) =>
            prev.map((r) => (r.id === id ? (res.data as StaffingRequest) : r)),
          );
          // If matched or no_matches, fetch matches and stop polling
          if (res.data.status === 'MATCHED' || res.data.status === 'NO_MATCHES' || res.data.status === 'ERROR') {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            if (res.data.status === 'MATCHED') {
              await fetchMatches(id);
            }
          }
        }
      } catch {
        // Silently ignore poll errors
      }
    },
    [request, fetchMatches],
  );

  // Start polling when activeRequest changes to a pending status
  useEffect(() => {
    if (!activeRequest) return;

    const shouldPoll =
      activeRequest.status === 'PENDING_PARSE' || activeRequest.status === 'MATCHING' || activeRequest.status === 'PARSED';

    // Clear any existing poll
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (shouldPoll) {
      pollRef.current = setInterval(() => {
        refreshActiveRequest(activeRequest.id);
      }, 3000);
    } else if (activeRequest.status === 'MATCHED') {
      fetchMatches(activeRequest.id);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeRequest?.id, activeRequest?.status, refreshActiveRequest, fetchMatches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setIsSubmitting(true);
    setMatches([]);

    try {
      const res = await request<StaffingRequest>('/staffing/requests', {
        method: 'POST',
        body: JSON.stringify({ rawText: rawText.trim() }),
      });

      if (res.success && res.data) {
        const newRequest = res.data;
        setHistory((prev) => [newRequest, ...prev]);
        setActiveRequest(newRequest);
        setRawText('');
      } else {
        throw new Error('Unexpected response shape');
      }
    } catch {
      addNotification({ type: 'error', message: t('staffing:errors.createFailed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectHistory = (req: StaffingRequest) => {
    setActiveRequest(req);
    setMatches([]);
  };

  const statusLabel = (status: StaffingStatus): string =>
    t(`staffing:status.${status}`, status);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-swiss-charcoal">
            {t('staffing:page.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('staffing:page.subtitle')}
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={PlusCircleIcon}
          onClick={() => { setActiveRequest(null); setMatches([]); setRawText(''); }}
        >
          {t('staffing:history.newRequest')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form + History */}
        <div className="lg:col-span-1 space-y-4">
          {/* Free-text form */}
          <Card className="p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={t('staffing:form.placeholder')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-swiss-teal placeholder:text-gray-400"
                disabled={isSubmitting}
              />
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting || !rawText.trim()}
                leftIcon={MagnifyingGlassIcon}
                className="w-full"
              >
                {isSubmitting ? t('staffing:form.submitting') : t('staffing:form.submit')}
              </Button>
            </form>
          </Card>

          {/* History list */}
          {history.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-swiss-charcoal">
                  {t('staffing:history.title')}
                </h3>
              </div>
              <ul className="divide-y divide-gray-50">
                {history.map((req) => (
                  <li key={req.id}>
                    <button
                      onClick={() => handleSelectHistory(req)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${activeRequest?.id === req.id ? 'bg-swiss-teal/5' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-swiss-charcoal truncate flex-1">
                          {req.roleRequired || req.rawText.slice(0, 40) + '…'}
                        </span>
                        <StatusBadge status={req.status} label={statusLabel(req.status)} />
                      </div>
                      {req.canton && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPinIcon className="w-3 h-3" /> {req.canton}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {history.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              {t('staffing:history.empty')}
            </p>
          )}
        </div>

        {/* Right: Active request + matches */}
        <div className="lg:col-span-2 space-y-4">
          {!activeRequest ? (
            <Card className="p-10 text-center">
              <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">{t('staffing:matches.empty')}</p>
            </Card>
          ) : (
            <>
              {/* Request details card */}
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-base font-semibold text-swiss-charcoal">
                    {t('staffing:request.label')}
                  </h2>
                  <StatusBadge status={activeRequest.status} label={statusLabel(activeRequest.status)} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-3">
                  {activeRequest.roleRequired && (
                    <div>
                      <p className="text-xs text-gray-400">{t('staffing:request.role')}</p>
                      <p className="font-medium text-swiss-charcoal">{activeRequest.roleRequired}</p>
                    </div>
                  )}
                  {activeRequest.canton && (
                    <div>
                      <p className="text-xs text-gray-400">{t('staffing:request.canton')}</p>
                      <p className="font-medium text-swiss-charcoal">{activeRequest.canton}</p>
                    </div>
                  )}
                  {activeRequest.startDate && (
                    <div>
                      <p className="text-xs text-gray-400">{t('staffing:request.startDate')}</p>
                      <p className="font-medium text-swiss-charcoal">
                        {new Date(activeRequest.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {activeRequest.hoursPerWeek && (
                    <div>
                      <p className="text-xs text-gray-400">{t('staffing:request.hours')}</p>
                      <p className="font-medium text-swiss-charcoal">
                        {activeRequest.hoursPerWeek}h
                      </p>
                    </div>
                  )}
                  {activeRequest.contractType && (
                    <div>
                      <p className="text-xs text-gray-400">{t('staffing:request.contract')}</p>
                      <p className="font-medium text-swiss-charcoal">{activeRequest.contractType}</p>
                    </div>
                  )}
                  {activeRequest.languages && activeRequest.languages.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400">{t('staffing:request.languages')}</p>
                      <p className="font-medium text-swiss-charcoal">{activeRequest.languages.join(', ')}</p>
                    </div>
                  )}
                  {activeRequest.ageGroups && activeRequest.ageGroups.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400">{t('staffing:request.ageGroups')}</p>
                      <p className="font-medium text-swiss-charcoal">{activeRequest.ageGroups.join(', ')}</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs text-gray-400 mb-1 font-medium">{t('staffing:form.placeholder').slice(0, 30)}</p>
                  <p className="text-sm text-gray-600 line-clamp-3">{activeRequest.rawText}</p>
                </div>
              </Card>

              {/* Matches */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-swiss-charcoal">
                    {t('staffing:matches.title')}
                  </h3>
                  {matches.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {t('staffing:matches.count_other', { count: matches.length })}
                    </span>
                  )}
                </div>

                {/* Loading/polling state */}
                {(activeRequest.status === 'PENDING_PARSE' || activeRequest.status === 'MATCHING' || activeRequest.status === 'PARSED') && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-8 h-8 border-4 border-swiss-teal border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">{statusLabel(activeRequest.status)}</p>
                  </div>
                )}

                {/* No matches */}
                {(activeRequest.status === 'MATCHED' || activeRequest.status === 'NO_MATCHES') && matches.length === 0 && !loadingMatches && (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <UserGroupIcon className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">{t('staffing:matches.empty')}</p>
                  </div>
                )}

                {/* Match list */}
                {matches.length > 0 && (
                  <div>
                    {matches.map((match) => (
                      <CandidateRow key={match.id} match={match} t={t} />
                    ))}
                  </div>
                )}

                {/* Error state */}
                {activeRequest.status === 'ERROR' && (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <p className="text-sm text-red-500">{t('staffing:status.ERROR')}</p>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffingRequestsPage;
