import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import {
  ClipboardDocumentCheckIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowsRightLeftIcon,
  LifebuoyIcon,
  DocumentTextIcon,
  BellIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { getBriefing, Briefing, BriefingItemType } from '../../services/assistantService';

const ICONS: Record<BriefingItemType, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  pending_educator_approvals: ClipboardDocumentCheckIcon,
  stale_applications_platform: ClockIcon,
  unassigned_parent_leads: UserGroupIcon,
  replacements_without_matches: ArrowsRightLeftIcon,
  open_support_tickets: LifebuoyIcon,
  canton_policy_updates: DocumentTextIcon,
  unread_notifications: BellIcon,
};

const ITEM_PROMPTS: Record<BriefingItemType, string> = {
  pending_educator_approvals: 'Review pending educator approvals with me.',
  stale_applications_platform: 'Show me applications waiting more than 5 days across the platform.',
  unassigned_parent_leads: 'Show me new parent leads without a response and help me action them.',
  replacements_without_matches: 'Show me open replacement requests with no proposed match.',
  open_support_tickets: 'Show me the open support tickets.',
  canton_policy_updates: 'Summarise the latest cantonal policy updates across all cantons.',
  unread_notifications: 'Show my unread notifications.',
};

const HANDLE_ALL_PROMPT =
  "Give me a summary of everything that needs review on the platform today and let's handle it together.";

// ─── useAdminBriefing hook ────────────────────────────────────────────────────

export function useAdminBriefing(): { briefing: Briefing | null; isLoading: boolean } {
  const { getToken } = useAuth();
  const { i18n } = useTranslation('assistant');
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const locale = i18n.language?.toLowerCase() ?? 'en';
    setIsLoading(true);
    getBriefing(getToken, locale)
      .then(setBriefing)
      .catch((err: unknown) => {
        console.error('[useAdminBriefing] Failed to fetch briefing:', err);
        setBriefing(null);
      })
      .finally(() => setIsLoading(false));
  }, [getToken, i18n.language]);

  return { briefing, isLoading };
}

// ─── AdminBriefingCard ────────────────────────────────────────────────────────

interface AdminBriefingCardProps {
  briefing: Briefing | null;
  isLoading: boolean;
  onAction: (prompt: string) => void;
}

export const AdminBriefingCard: React.FC<AdminBriefingCardProps> = ({
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
      ? t('adminBriefing.headline_one', '{{count}} item needs review today', { count })
      : t('adminBriefing.headline_other', '{{count}} items need review today', { count });

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

      {/* Header */}
      <div className="relative px-6 pt-5 pb-3">
        <div className="mb-3 flex items-center gap-1.5">
          <SparklesIcon className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
            {t('adminBriefing.label', 'Platform Briefing')}
          </span>
        </div>
        <h2 className="text-xl font-bold leading-tight">{headline}</h2>
      </div>

      {/* Items */}
      <div className="relative space-y-1.5 px-6 pb-3">
        {briefing.items.map((item) => {
          const Icon = ICONS[item.type] ?? BellIcon;
          const singularKey = `adminBriefing.${item.type}`;
          const pluralKey = `adminBriefing.${item.type}_plural`;
          const label = t(
            item.count === 1 ? singularKey : pluralKey,
            String(item.count),
            { count: item.count },
          );
          return (
            <button
              key={item.type}
              onClick={() => onAction(ITEM_PROMPTS[item.type] ?? HANDLE_ALL_PROMPT)}
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
      <div className="relative px-6 pb-5 pt-2">
        <button
          onClick={() => onAction(HANDLE_ALL_PROMPT)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0f2d1e] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0a2018] focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <SparklesIcon className="h-3 w-3" aria-hidden="true" />
          {t('workspace.briefing.handleAll', 'Handle everything with me')}
        </button>
      </div>
    </div>
  );
};
