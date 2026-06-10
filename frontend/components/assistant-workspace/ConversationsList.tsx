import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  SunIcon,
  ShoppingBagIcon,
  PlusIcon,
  PencilIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import {
  listConversations,
  updateConversation,
  ConversationSummary,
  ConversationKind,
} from '../../services/assistantService';
import { CONVERSATIONS_UPDATED_EVENT } from '../assistant/useAssistantChat';
import { useFeatureFlag } from '../../hooks/useFeatureFlags';

const KIND_ICONS: Record<ConversationKind, React.ElementType> = {
  CHAT: ChatBubbleLeftRightIcon,
  DRAFT: PencilSquareIcon,
  BRIEFING: SunIcon,
  ORDER: ShoppingBagIcon,
};

type GroupKey = 'today' | 'yesterday' | 'lastWeek' | 'older';

function groupKeyFor(isoDate: string, now: Date): GroupKey {
  const date = new Date(isoDate);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfLastWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday) return 'yesterday';
  if (date >= startOfLastWeek) return 'lastWeek';
  return 'older';
}

const GROUP_ORDER: GroupKey[] = ['today', 'yesterday', 'lastWeek', 'older'];

interface ConversationsListProps {
  /** Mobile: close the sidebar drawer after navigating. */
  onNavigate?: () => void;
}

/**
 * AI conversations section rendered beneath the existing sidebar nav
 * (additive only — the nav itself is strategy-locked). Foundation +
 * v2_assistant_dashboard flag only.
 */
export const ConversationsList: React.FC<ConversationsListProps> = ({ onNavigate }) => {
  const { t } = useTranslation('assistant');
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { enabled } = useFeatureFlag('v2_assistant_dashboard');

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const activeId = new URLSearchParams(location.search).get('c');
  const onAssistantPage = location.pathname.startsWith('/foundation/assistant');

  const refresh = useCallback(() => {
    listConversations(getToken)
      .then(setConversations)
      .catch(() => {
        // Sidebar list is non-critical; keep whatever we had
      });
  }, [getToken]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    window.addEventListener(CONVERSATIONS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CONVERSATIONS_UPDATED_EVENT, refresh);
  }, [enabled, refresh]);

  if (!enabled) return null;

  const goTo = (conversationId?: string) => {
    navigate(conversationId ? `/foundation/assistant?c=${conversationId}` : '/foundation/assistant');
    onNavigate?.();
  };

  const commitRename = async (conversation: ConversationSummary) => {
    const title = editingTitle.trim();
    setEditingId(null);
    if (!title || title === conversation.title) return;
    setConversations((prev) => prev.map((c) => (c.id === conversation.id ? { ...c, title } : c)));
    try {
      await updateConversation(getToken, conversation.id, { title });
    } catch {
      refresh();
    }
  };

  const archive = async (conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    try {
      await updateConversation(getToken, conversationId, { archived: true });
    } catch {
      refresh();
    }
    if (activeId === conversationId) goTo();
  };

  const now = new Date();
  const groups = GROUP_ORDER.map((key) => ({
    key,
    items: conversations.filter((c) => groupKeyFor(c.lastActivityAt, now) === key),
  })).filter((g) => g.items.length > 0);

  const groupLabels: Record<GroupKey, string> = {
    today: t('workspace.conversations.today', 'Today'),
    yesterday: t('workspace.conversations.yesterday', 'Yesterday'),
    lastWeek: t('workspace.conversations.lastWeek', 'Last week'),
    older: t('workspace.conversations.older', 'Older'),
  };

  return (
    <div className="mt-4 border-t border-gray-200/80 pt-3">
      <div className="mb-1 flex items-center justify-between px-2 md:px-3 lg:px-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {t('workspace.conversations.title', 'Conversations')}
        </span>
        <button
          onClick={() => goTo()}
          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium text-swiss-teal transition-colors hover:bg-swiss-teal/10 focus:outline-none focus:ring-2 focus:ring-swiss-teal/40"
        >
          <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {t('workspace.conversations.new', 'New')}
        </button>
      </div>

      {groups.length === 0 && (
        <p className="px-2 py-1 text-xs text-gray-400 md:px-3 lg:px-4">
          {t('workspace.conversations.empty', 'No conversations yet')}
        </p>
      )}

      {groups.map((group) => (
        <div key={group.key} className="mb-1.5">
          <p className="px-2 py-1 text-[11px] text-gray-400 md:px-3 lg:px-4">{groupLabels[group.key]}</p>
          {group.items.map((conversation) => {
            const Icon = KIND_ICONS[conversation.kind] ?? ChatBubbleLeftRightIcon;
            const isActive = onAssistantPage && activeId === conversation.id;
            const title =
              conversation.title || t('workspace.conversations.untitled', 'New conversation');

            return (
              <div
                key={conversation.id}
                className={`group flex items-center gap-2 rounded-button px-2 py-1.5 text-xs transition-colors md:px-3 lg:px-4 ${
                  isActive
                    ? 'bg-swiss-mint/10 text-swiss-mint font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-swiss-charcoal'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {editingId === conversation.id ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => void commitRename(conversation)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void commitRename(conversation);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="min-w-0 flex-1 rounded border border-swiss-teal/40 bg-white px-1 py-0.5 text-xs text-swiss-charcoal focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => goTo(conversation.id)}
                    className="min-w-0 flex-1 text-left focus:outline-none"
                  >
                    <span className="block truncate">{title}</span>
                    {conversation.statusLabel && (
                      <span className="block truncate text-[11px] text-gray-400">
                        {conversation.statusLabel}
                      </span>
                    )}
                  </button>
                )}
                <span className="hidden flex-shrink-0 items-center gap-0.5 group-hover:flex">
                  <button
                    onClick={() => {
                      setEditingId(conversation.id);
                      setEditingTitle(conversation.title ?? '');
                    }}
                    aria-label={t('workspace.conversations.rename', 'Rename conversation')}
                    className="rounded p-0.5 text-gray-400 hover:text-swiss-teal focus:outline-none"
                  >
                    <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => void archive(conversation.id)}
                    aria-label={t('workspace.conversations.archive', 'Archive conversation')}
                    className="rounded p-0.5 text-gray-400 hover:text-swiss-coral focus:outline-none"
                  >
                    <ArchiveBoxIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
