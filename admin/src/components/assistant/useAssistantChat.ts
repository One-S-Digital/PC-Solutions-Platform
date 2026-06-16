import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import {
  createConversation,
  streamMessage,
  confirmToolCall,
  rejectToolCall,
  getConversationHistory,
  ToolCallEvent,
  ToolResultEvent,
  ConversationDetail,
} from '../../services/assistantService';

/** Fired whenever a turn completes or a conversation changes, so the sidebar list can refresh. */
export const CONVERSATIONS_UPDATED_EVENT = 'assistant:conversations-updated';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolCall?: ToolCallEvent;
  toolResult?: ToolResultEvent;
  toolStatus?: string;
  cancelled?: boolean;
  nextSteps?: string[];
}

export interface PendingModal {
  modal: string;
  prefill: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Returns a translation key + English fallback for the contextual thinking
 * label inferred from the admin's message. More-specific patterns first so
 * generic words like "find" don't shadow the actual subject.
 */
function getThinkingLabelKey(userMessage: string): { key: string; fallback: string } {
  const m = userMessage.toLowerCase();
  if (/approv|pending.*educator|educator.*approv|review.*profile/.test(m))
    return { key: 'thinking.approvals', fallback: 'Checking pending approvals…' };
  if (/support|ticket/.test(m))
    return { key: 'thinking.support', fallback: 'Checking support tickets…' };
  if (/stats|signal|overview|platform/.test(m))
    return { key: 'thinking.stats', fallback: 'Gathering platform stats…' };
  if (/invite/.test(m))
    return { key: 'thinking.invite', fallback: 'Preparing the invitation…' };
  if (/user|account/.test(m))
    return { key: 'thinking.findUser', fallback: 'Searching users…' };
  if (/foundation|crèche|creche|childcare/.test(m))
    return { key: 'thinking.foundations', fallback: 'Searching foundations…' };
  if (/candidate|staff|educator|replacement/.test(m))
    return { key: 'thinking.searchStaff', fallback: 'Searching available staff…' };
  if (/lead|parent/.test(m))
    return { key: 'thinking.leads', fallback: 'Checking parent leads…' };
  return { key: 'thinking.default', fallback: 'Processing your request…' };
}

/** Maps a persisted conversation (messages + tool calls) into thread messages, ordered chronologically. */
function mapConversationHistory(detail: ConversationDetail): ChatMessage[] {
  const items: Array<{ at: number; msg: ChatMessage }> = [];

  for (const m of detail.messages ?? []) {
    if ((m.sender !== 'USER' && m.sender !== 'ASSISTANT') || !m.content) continue;
    items.push({
      at: Date.parse(m.createdAt),
      msg: {
        id: m.id,
        sender: m.sender === 'USER' ? 'user' : 'assistant',
        text: m.content,
      },
    });
  }

  for (const tc of detail.toolCalls ?? []) {
    const hasOutcome =
      tc.status === 'EXECUTED' || tc.status === 'FAILED' || Boolean(tc.outputJson) || Boolean(tc.errorMessage);
    items.push({
      // +1ms so a tool card sorts after the assistant narration persisted in the same instant
      at: Date.parse(tc.createdAt) + 1,
      msg: {
        id: tc.id,
        sender: 'assistant',
        text: '',
        toolCall: {
          toolCallId: tc.id,
          toolName: tc.toolName,
          level: tc.level,
          approvalRequired: tc.approvalRequired,
          args: (tc.inputJson ?? {}) as Record<string, unknown>,
        },
        toolResult: hasOutcome
          ? {
              toolCallId: tc.id,
              toolName: tc.toolName,
              result: (tc.outputJson ?? undefined) as Record<string, unknown> | undefined,
              error: tc.errorMessage ?? undefined,
            }
          : undefined,
        cancelled: tc.status === 'REJECTED',
      },
    });
  }

  return items.sort((a, b) => a.at - b.at).map((i) => i.msg);
}

function notifyConversationsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONVERSATIONS_UPDATED_EVENT));
  }
}

// ─── useAssistantChat ─────────────────────────────────────────────────────────

/**
 * Shared chat state machine for the admin AI assistant. Owns conversation
 * creation, message history, SSE streaming, and the L3 tool-approval
 * round-trip. Used by both the floating AssistantPanel and the full-page
 * assistant workspace so streaming behavior never forks.
 * (Admin-side port of frontend/components/assistant/useAssistantChat.ts.)
 *
 * @param active  When false, conversation creation is deferred (the floating
 *                panel passes its `isOpen` state; the workspace passes `true`).
 * @param requestedConversationId  When set, that conversation is loaded with
 *                its persisted history instead of creating a fresh one; when
 *                it changes the thread switches; when it goes back to null
 *                after having been set, a fresh conversation starts ("+ New").
 */
export function useAssistantChat(active: boolean, requestedConversationId?: string | null) {
  const { t, i18n } = useTranslation('assistant');
  const { getToken } = useAuth();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pendingAssistantText, setPendingAssistantText] = useState('');
  const [thinkingLabel, setThinkingLabel] = useState(() => t('panel.thinking', 'Thinking…'));
  const [initError, setInitError] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingModal | null>(null);

  const doneFiredRef = useRef(false);
  // Accumulates nextSteps from SSE until flush time
  const pendingNextStepsRef = useRef<string[]>([]);
  // Tracks the previous requested id so "param removed" (+ New) is distinguishable
  // from "never had a param" (floating panel).
  const lastRequestedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;

    const requested = requestedConversationId ?? null;
    const previousRequested = lastRequestedRef.current;
    lastRequestedRef.current = requested;

    if (requested) {
      if (requested === conversationId) return;
      // Switch to the requested conversation and load its history
      setInitError(null);
      setConversationId(requested);
      setMessages([]);
      setIsLoadingHistory(true);
      getConversationHistory(getToken, requested)
        .then((detail) => setMessages(mapConversationHistory(detail)))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to load conversation';
          setInitError(msg);
        })
        .finally(() => setIsLoadingHistory(false));
      return;
    }

    // Requested id was cleared (e.g. "+ New") → drop the old thread and start fresh
    if (conversationId && previousRequested) {
      setMessages([]);
      setInitError(null);
      setConversationId(null);
      return; // the next effect run creates the new conversation
    }

    // No active conversation and no requested one — conversation is created
    // lazily on the first sendMessage so empty conversations never appear in
    // the sidebar list.
  }, [active, requestedConversationId, conversationId, getToken, i18n.language]);

  // ─── Flush pending streaming text into messages ───────────────────────────

  const flushPending = useCallback(() => {
    const steps = pendingNextStepsRef.current;
    pendingNextStepsRef.current = [];
    setPendingAssistantText((prev) => {
      if (prev.trim()) {
        setMessages((msgs) => [
          ...msgs,
          {
            id: genId(),
            sender: 'assistant',
            text: prev,
            nextSteps: steps.length > 0 ? steps : undefined,
          },
        ]);
      }
      return '';
    });
    setIsStreaming(false);
    // A completed turn may have created/auto-titled the conversation
    notifyConversationsUpdated();
  }, []);

  // ─── Send a message ────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || isStreaming) return;

      doneFiredRef.current = false;
      pendingNextStepsRef.current = [];

      // Lazy conversation creation: create only on first send so empty
      // conversations never appear in the sidebar list.
      let activeConvId = conversationId;
      if (!activeConvId) {
        const locale = i18n.language?.toLowerCase() ?? 'en';
        try {
          const { id } = await createConversation(getToken, locale);
          setConversationId(id);
          activeConvId = id;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to start conversation';
          setMessages((prev) => [
            ...prev,
            { id: genId(), sender: 'assistant', text: `⚠️ ${errMsg}` },
          ]);
          return;
        }
      }

      setMessages((prev) => [...prev, { id: genId(), sender: 'user', text: msg }]);
      setIsStreaming(true);
      setPendingAssistantText('');
      const labelKey = getThinkingLabelKey(msg);
      setThinkingLabel(t(labelKey.key, labelKey.fallback));

      await streamMessage(getToken, activeConvId, msg, {
        onToken: (chunk) => {
          setPendingAssistantText((prev) => prev + chunk);
        },
        onToolCall: (toolCall) => {
          setMessages((prev) => [
            ...prev,
            { id: toolCall.toolCallId, sender: 'assistant', text: '', toolCall },
          ]);
        },
        onToolResult: (result) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === result.toolCallId ? { ...m, toolResult: result } : m
            )
          );
        },
        onToolStatus: (status) => {
          const label = t(`toolStatus.${status.toolName}`, status.label);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === status.toolCallId ? { ...m, toolStatus: label } : m
            )
          );
        },
        onNextSteps: (event) => {
          pendingNextStepsRef.current = [...pendingNextStepsRef.current, ...event.nextSteps];
        },
        onModalAction: (action) => {
          setPendingModal(action);
        },
        onDone: () => {
          if (!doneFiredRef.current) {
            doneFiredRef.current = true;
            flushPending();
          }
        },
        onError: (errMsg) => {
          setMessages((prev) => [
            ...prev,
            { id: genId(), sender: 'assistant', text: `⚠️ ${errMsg}` },
          ]);
          setIsStreaming(false);
          setPendingAssistantText('');
          pendingNextStepsRef.current = [];
        },
      });
    },
    [isStreaming, conversationId, i18n.language, getToken, flushPending, t]
  );

  // ─── L3 tool approval round-trip ───────────────────────────────────────────

  const confirmTool = useCallback(
    async (toolCall: ToolCallEvent, overrideArgs?: Record<string, unknown>) => {
      if (toolCall.modal && !overrideArgs) {
        setPendingModal({
          modal: toolCall.modal,
          prefill: toolCall.args as Record<string, unknown>,
        });
        return;
      }
      if (!conversationId) return;
      try {
        const res = await confirmToolCall(getToken, conversationId, toolCall.toolCallId, overrideArgs);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === toolCall.toolCallId
              ? {
                  ...m,
                  toolResult: {
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    result: res.result,
                    error: res.error,
                  },
                }
              : m
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Action failed';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === toolCall.toolCallId
              ? { ...m, toolResult: { toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, error: msg } }
              : m
          )
        );
      }
    },
    [conversationId, getToken]
  );

  const cancelTool = useCallback(
    (toolCallId: string) => {
      setMessages((prev) => prev.map((m) => (m.id === toolCallId ? { ...m, cancelled: true } : m)));
      if (conversationId) {
        void rejectToolCall(getToken, conversationId, toolCallId);
      }
    },
    [conversationId, getToken]
  );

  const clearPendingModal = useCallback(() => setPendingModal(null), []);

  return {
    conversationId,
    messages,
    isStreaming,
    isLoadingHistory,
    pendingAssistantText,
    thinkingLabel,
    initError,
    pendingModal,
    clearPendingModal,
    sendMessage,
    confirmTool,
    cancelTool,
  };
}
