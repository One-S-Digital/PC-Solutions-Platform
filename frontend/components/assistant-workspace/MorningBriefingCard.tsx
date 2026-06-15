import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import {
  UserGroupIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  DocumentTextIcon,
  BellIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { getBriefing, Briefing, BriefingItemType } from '../../services/assistantService';
import { useAppContext } from '../../contexts/AppContext';

const ICONS: Record<BriefingItemType, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  parent_leads: UserGroupIcon,
  stale_applications: ClockIcon,
  pending_replacements: ArrowsRightLeftIcon,
  canton_updates: DocumentTextIcon,
  unread_notifications: BellIcon,
};

const ITEM_PROMPTS: Record<BriefingItemType, string> = {
  parent_leads: 'Show my new parent leads and help me reply to them.',
  stale_applications: 'Show me applications waiting more than 5 days and help me action them.',
  pending_replacements: 'Show pending replacement matches and help me review them.',
  canton_updates: 'Summarise the latest cantonal policy updates relevant to my crèche.',
  unread_notifications: 'Show my unread notifications.',
};

const HANDLE_ALL_PROMPT =
  "Give me a summary of everything that needs attention today and let's handle it together.";

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
      <div className="mb-6 animate-pulse rounded-2xl bg-emerald-800/20 p-6">
        <div className="mb-4 h-5 w-2/3 rounded bg-emerald-800/30" />
        <div className="space-y-2">
          <div className="h-10 rounded-xl bg-emerald-800/20" />
          <div className="h-10 rounded-xl bg-emerald-800/15" />
        </div>
      </div>
    );
  }

  if (!briefing || briefing.items.length === 0) return null;

  const count = briefing.items.length;
  const headline =
    count === 1
      ? t('workspace.briefing.headline_one', '{{count}} thing needs your attention today', { count })
      : t('workspace.briefing.headline_other', '{{count}} things need your attention today', { count });

  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-emerald-800 text-white shadow-lg">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
          <SparklesIcon className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold leading-snug">{headline}</h2>
      </div>

      {/* Items */}
      <div className="space-y-2 px-5 pb-3">
        {briefing.items.map((item) => {
          const Icon = ICONS[item.type];
          const singularKey = `workspace.briefing.${item.type}`;
          const pluralKey = `workspace.briefing.${item.type}_plural`;
          const label = t(
            item.count === 1 ? singularKey : pluralKey,
            String(item.count),
            { count: item.count },
          );
          return (
            <button
              key={item.type}
              onClick={() => onAction(ITEM_PROMPTS[item.type])}
              className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <Icon className="h-4 w-4 flex-shrink-0 text-white/80" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              <span className="flex-shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div className="border-t border-white/15 px-5 py-3">
        <button
          onClick={() => onAction(HANDLE_ALL_PROMPT)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <SparklesIcon className="h-4 w-4" aria-hidden="true" />
          {t('workspace.briefing.handleAll', 'Handle everything with me')}
        </button>
      </div>
    </div>
  );
};
