import React from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Activity, CheckCircle2, XCircle, Repeat } from 'lucide-react';

import { useApiClient } from '../services/api';
import CantonsPage from './Cantons';
import CantonDetailPage from './CantonDetail';
import PolicyReviewPage from './PolicyReview';

type SchedulerMode = 'manual' | 'automatic';

type CrawlerHealth = {
  enabled?: boolean;
  schedulerEnabled?: boolean;
  schedulerEnvEnabled?: boolean;
  schedulerMode?: SchedulerMode;
  totalSources: number;
  activeSources: number;
  failedSources: number;
  pendingReviewCount: number;
};

export default function PolicyCrawlerPage() {
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const { data: healthResp, isLoading } = useQuery({
    queryKey: ['policy-crawler-health'],
    queryFn: async () => apiClient.get('/admin/crawler/health'),
    enabled: !!apiClient,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const health: CrawlerHealth | null = (healthResp?.data ?? null) as any;
  const enabled = Boolean(health?.enabled);
  const schedulerMode: SchedulerMode = (health?.schedulerMode as SchedulerMode) || (health?.schedulerEnabled ? 'automatic' : 'manual');
  const schedulerEnvEnabled = (health?.schedulerEnvEnabled ?? true) as boolean;
  const canToggleScheduler = Boolean(apiClient) && schedulerEnvEnabled;

  const toggleSchedulerMutation = useMutation({
    mutationFn: async (mode: SchedulerMode) => apiClient.patch('/admin/crawler/scheduler', { mode }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['policy-crawler-health'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-policy-crawler-health'] }),
      ]);
    },
    onError: (e: any) => {
      console.error('Failed to update crawler scheduler mode:', e);
      alert(t('admin:policyCrawler.scheduler.updateFailed', 'Failed to update crawler scheduler mode.'));
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('admin:policyCrawler.title', 'Policy Crawler')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('admin:policyCrawler.subtitle', 'Manage canton sources and review crawled policies')}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <Activity className="h-4 w-4 text-gray-400" />
            {isLoading ? (
              <span className="text-sm text-gray-600">{t('common:loading', 'Loading...')}</span>
            ) : enabled ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {t('admin:policyCrawler.status.enabled', 'Enabled')}
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">
                  {t('admin:policyCrawler.status.disabled', 'Disabled')}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <Repeat className="h-4 w-4 text-gray-400" />
              {!schedulerEnvEnabled ? (
                <span className="text-sm font-medium text-gray-700">
                  {t('admin:policyCrawler.scheduler.envDisabled', 'Scheduler disabled by environment')}
                </span>
              ) : schedulerMode === 'automatic' ? (
                <span className="text-sm font-medium text-green-700">
                  {t('admin:policyCrawler.scheduler.automatic', 'Automatic')}
                </span>
              ) : (
                <span className="text-sm font-medium text-gray-700">
                  {t('admin:policyCrawler.scheduler.manual', 'Manual')}
                </span>
              )}
            </div>

            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!canToggleScheduler || toggleSchedulerMutation.isPending || isLoading}
              onClick={() => {
                const next: SchedulerMode = schedulerMode === 'automatic' ? 'manual' : 'automatic';
                toggleSchedulerMutation.mutate(next);
              }}
              title={t(
                'admin:policyCrawler.scheduler.toggleHelp',
                'Switch between manual (no cron) and automatic (scheduled at 3AM) mode',
              )}
            >
              {toggleSchedulerMutation.isPending
                ? t('common:loading', 'Loading...')
                : schedulerMode === 'automatic'
                  ? t('admin:policyCrawler.scheduler.setManual', 'Set manual')
                  : t('admin:policyCrawler.scheduler.setAutomatic', 'Set automatic')}
            </button>
          </div>
        </div>
      </div>

      {!enabled && !isLoading ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
          {t(
            'admin:policyCrawler.disabledNotice',
            'The policy crawler is currently disabled on the API. Admin pages remain visible, but crawling and review queues will be empty until it is enabled.',
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-b border-gray-200">
        <NavLink
          to="/policy-crawler/cantons"
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-medium border-b-2 ${
              isActive ? 'border-swiss-mint text-swiss-mint' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`
          }
        >
          {t('admin:policyCrawler.tabs.cantons', 'Cantons')}
        </NavLink>
        <NavLink
          to="/policy-crawler/review"
          className={({ isActive }) =>
            `px-3 py-2 text-sm font-medium border-b-2 ${
              isActive ? 'border-swiss-mint text-swiss-mint' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`
          }
        >
          {t('admin:policyCrawler.tabs.review', 'Policy Review')}
        </NavLink>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/policy-crawler/cantons" replace />} />
        <Route path="cantons" element={<CantonsPage />} />
        <Route path="cantons/:code" element={<CantonDetailPage />} />
        <Route path="review" element={<PolicyReviewPage />} />
        <Route path="*" element={<Navigate to="/policy-crawler/cantons" replace />} />
      </Routes>
    </div>
  );
}

