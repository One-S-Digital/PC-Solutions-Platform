import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { getBriefing, Briefing, BriefingItem, BriefingItemType } from '../../services/assistantService';
import { useAppContext } from '../../contexts/AppContext';

const ITEM_PROMPTS: Record<BriefingItemType, string> = {
  parent_leads: 'Show my new parent leads and help me reply to them.',
  stale_applications: 'Show me applications waiting more than 5 days and help me action them.',
  pending_replacements: 'Show pending replacement matches and help me review them.',
  canton_updates: 'Summarise the latest cantonal policy updates relevant to my crèche.',
  unread_notifications: 'Show my unread notifications.',
};

const ITEM_BUTTON_LABELS: Record<BriefingItemType, string> = {
  parent_leads: 'Respond to leads',
  stale_applications: 'Review applications',
  pending_replacements: 'Check replacements',
  canton_updates: 'See update',
  unread_notifications: 'View notifications',
};

const HANDLE_ALL_PROMPT =
  "Give me a summary of everything that needs attention today and let's handle it together.";

type TFn = (key: string, fallback: string, opts?: Record<string, unknown>) => string;

function buildNarrativeParts(items: BriefingItem[], t: TFn): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const parts = items.map((item) => {
    const n = item.count;
    switch (item.type) {
      case 'parent_leads':
        return (
          <span key={item.type}>
            <strong className="font-semibold text-white">
              {t('briefing.narrative.parentLeads', '{{count}} new parent lead', { count: n })}
              {n !== 1 ? t('briefing.narrative.plural_s', 's') : ''}
            </strong>
          </span>
        );
      case 'stale_applications':
        return (
          <span key={item.type}>
            <strong className="font-semibold text-white">
              {t('briefing.narrative.applications', '{{count}} application', { count: n })}
              {n !== 1 ? t('briefing.narrative.plural_s', 's') : ''}
            </strong>{' '}
            {t('briefing.narrative.waitingFeedback', 'waiting for feedback')}
          </span>
        );
      case 'pending_replacements':
        return (
          <span key={item.type}>
            <strong className="font-semibold text-white">
              {t('briefing.narrative.pendingReplacements', '{{count}} pending replacement', { count: n })}
              {n !== 1 ? t('briefing.narrative.plural_s', 's') : ''}
            </strong>
          </span>
        );
      case 'canton_updates':
        return (
          <span key={item.type}>
            {n === 1
              ? <>{t('briefing.narrative.cantonPrefix', 'a')}{' '}<strong className="font-semibold text-white">{t('briefing.narrative.cantonUpdate', 'cantonal directive update')}</strong></>
              : <strong className="font-semibold text-white">{n} {t('briefing.narrative.cantonUpdates', 'cantonal directive updates')}</strong>
            }
          </span>
        );
      case 'unread_notifications':
        return (
          <span key={item.type}>
            <strong className="font-semibold text-white">
              {t('briefing.narrative.unreadNotifications', '{{count}} unread notification', { count: n })}
              {n !== 1 ? t('briefing.narrative.plural_s', 's') : ''}
            </strong>
          </span>
        );
      default:
        return null;
    }
  }).filter(Boolean) as React.ReactNode[];

  if (parts.length === 0) return nodes;

  nodes.push(<span key="prefix">{t('briefing.narrative.prefix', 'Overnight: ')}</span>);
  parts.forEach((part, i) => {
    nodes.push(part);
    if (i < parts.length - 2) nodes.push(<span key={`sep-${i}`}>{t('briefing.narrative.listSep', ', ')}</span>);
    if (i === parts.length - 2) nodes.push(<span key="and">{t('briefing.narrative.and', ' and ')}</span>);
  });
  nodes.push(<span key="suffix">{t('briefing.narrative.suffix', ' — I\'ve already prepared the summary.')}</span>);
  return nodes;
}

// ─── useBriefing hook ─────────────────────────────────────────────────────────

export function useBriefing(): { briefing: Briefing | null; isLoading: boolean } {
  const { getToken } = useAuth();
  const { language } = useAppContext();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const locale = (language as string)?.toLowerCase() ?? 'fr';
    setIsLoading(true);
    getBriefing(getToken, locale)
      .then(setBriefing)
      .catch((err: unknown) => {
        console.error('[useBriefing] Failed to fetch morning briefing:', err);
        setBriefing(null);
      })
      .finally(() => setIsLoading(false));
  }, [getToken, language]);

  return { briefing, isLoading };
}

// ─── MorningBriefingCard ──────────────────────────────────────────────────────

interface MorningBriefingCardProps {
  briefing: Briefing | null;
  isLoading: boolean;
  onAction: (prompt: string) => void;
}

export const MorningBriefingCard: React.FC<MorningBriefingCardProps> = ({
  briefing,
  isLoading,
  onAction,
}) => {
  const { t } = useTranslation('assistant');

  if (isLoading) {
    return (
      <div className="mb-6 animate-pulse rounded-2xl bg-emerald-900/30 p-6">
        <div className="mb-2 h-3 w-24 rounded bg-emerald-700/40" />
        <div className="mb-3 h-6 w-2/3 rounded bg-emerald-800/40" />
        <div className="mb-4 space-y-1.5">
          <div className="h-4 w-full rounded bg-emerald-800/30" />
          <div className="h-4 w-4/5 rounded bg-emerald-800/20" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-44 rounded-full bg-emerald-700/40" />
          <div className="h-8 w-32 rounded-full bg-emerald-800/30" />
        </div>
      </div>
    );
  }

  if (!briefing || briefing.items.length === 0) return null;

  const count = briefing.items.length;
  const headline =
    count === 1
      ? t('workspace.briefing.headline_one', '1 thing needs your attention today', { count })
      : t('workspace.briefing.headline_other', '{{count}} things need your attention today', { count });

  const narrativeParts = buildNarrativeParts(briefing.items, t);

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e5c42] to-[#163d2b] text-white shadow-xl">
      {/* Decorative circles */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full border border-white/10 bg-white/[0.07]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-10 top-16 h-32 w-32 rounded-full border border-white/10 bg-white/[0.09]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-4 top-2 h-24 w-24 rounded-full bg-white/[0.06]"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative px-6 pt-5 pb-3">
        {/* Section label */}
        <div className="mb-3 flex items-center gap-1.5">
          <SparklesIcon className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
            {t('workspace.briefing.label', 'Morning Briefing')}
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-xl font-bold leading-tight capitalize-first">
          {headline}.
        </h2>

        {/* Narrative */}
        {narrativeParts.length > 0 && (
          <p className="mt-2.5 text-sm leading-relaxed text-white/60">
            {narrativeParts}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="relative flex flex-wrap items-center gap-2 px-6 pb-5 pt-2">
        <button
          onClick={() => onAction(HANDLE_ALL_PROMPT)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0f2d1e] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0a2018] focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <SparklesIcon className="h-3 w-3" aria-hidden="true" />
          {t('workspace.briefing.handleAll', 'Handle everything with me')}
        </button>
        {briefing.items.slice(0, 2).map((item) => (
          <button
            key={item.type}
            onClick={() => onAction(ITEM_PROMPTS[item.type])}
            className="inline-flex items-center rounded-full border border-white/25 px-4 py-1.5 text-xs font-medium text-white/90 transition-colors hover:border-white/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            {t(`workspace.briefing.btn_${item.type}`, ITEM_BUTTON_LABELS[item.type])}
          </button>
        ))}
      </div>
    </div>
  );
};
