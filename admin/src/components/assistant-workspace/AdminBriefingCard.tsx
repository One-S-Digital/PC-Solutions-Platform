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

// Each briefing item CTA is just a prompt template submitted into the normal
// chat pipeline — exactly as in the Foundation build.
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

/**
 * Deep-teal hero card with the platform-wide review items ("N items need
 * review today"). Dumb renderer over GET /assistant/briefing — the items are
 * deterministic counts computed server-side (BriefingService admin branch).
 */
export const AdminBriefingCard: React.FC<AdminBriefingCardProps> = ({
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
      ? t('adminBriefing.headline_one', '{{count}} item needs review today', { count })
      : t('adminBriefing.headline_other', '{{count}} items need review today', { count });

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
