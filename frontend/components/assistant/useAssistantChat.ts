import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import {
  createConversation,
  streamMessage,
  confirmToolCall,
  rejectToolCall,
  ToolCallEvent,
  ToolResultEvent,
} from '../../services/assistantService';
import { useAppContext } from '../../contexts/AppContext';

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
 * label inferred from the user's message. The caller is responsible for
 * calling t(key, fallback) so the label is always rendered in the user's locale.
 *
 * More-specific patterns are checked first so that generic words like
 * "find" / "search" / "looking for" don't shadow the actual subject.
 */
function getThinkingLabelKey(userMessage: string): { key: string; fallback: string } {
  const m = userMessage.toLowerCase();
  // Specific subjects first — order matters
  if (/product|supplier|supply|food|milk|toy|material|equipment|place.*order|order.*product|purchase/.test(m))
    return { key: 'thinking.marketplace', fallback: 'Searching marketplace…' };
  if (/service|provider|cleaning|catering|training/.test(m))
    return { key: 'thinking.services', fallback: 'Searching services…' };
  if (/post.*job|create.*job|publish.*job|job.*post|new.*position/.test(m))
    return { key: 'thinking.prepareJob', fallback: 'Preparing job posting…' };
  if (/replace|replacement/.test(m))
    return { key: 'thinking.replacement', fallback: 'Checking replacement options…' };
  if (/apply|application|my.*applic/.test(m))
    return { key: 'thinking.applications', fallback: 'Reviewing applications…' };
  if (/candidate|staff|educator|ede|personnel/.test(m))
    return { key: 'thinking.searchStaff', fallback: 'Searching available staff…' };
  if (/foundation|crèche|creche|childcare|facility/.test(m))
    return { key: 'thinking.foundations', fallback: 'Searching foundations…' };
  if (/message|send.*to|write.*to/.test(m))
    return { key: 'thinking.message', fallback: 'Composing message…' };
  if (/admin|support|ticket|report/.test(m))
    return { key: 'thinking.admin', fallback: 'Preparing your request…' };
  return { key: 'thinking.default', fallback: 'Processing your request…' };
}

// ─── useAssistantChat ─────────────────────────────────────────────────────────

/**
 * Shared chat state machine for the AI assistant.
 *
 * Owns conversation creation, message history, SSE streaming, and the
 * L3 tool-approval round-trip. Used by both the floating AssistantPanel
 * and the full-page assistant workspace so streaming behavior never forks.
 *
 * @param active  When false, conversation creation is deferred (the floating
 *                panel passes its `isOpen` state; the workspace passes `true`).
 */
export function useAssistantChat(active: boolean) {
  const { t } = useTranslation('assistant');
  const { getToken } = useAuth();
  const { language } = useAppContext();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAssistantText, setPendingAssistantText] = useState('');
  const [thinkingLabel, setThinkingLabel] = useState(() => t('panel.thinking', 'Thinking…'));
  const [initError, setInitError] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingModal | null>(null);

  const doneFiredRef = useRef(false);
  // Accumulates nextSteps from SSE until flush time
  const pendingNextStepsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!active || conversationId) return;

    const locale = (language as string)?.toLowerCase() ?? 'en';

    createConversation(getToken, locale)
      .then(({ id }) => setConversationId(id))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to start conversation';
        setInitError(msg);
      });
  }, [active, conversationId, getToken, language]);

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
  }, []);

  // ─── Send a message ────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || isStreaming || !conversationId) return;

      doneFiredRef.current = false;
      pendingNextStepsRef.current = [];

      setMessages((prev) => [...prev, { id: genId(), sender: 'user', text: msg }]);
      setIsStreaming(true);
      setPendingAssistantText('');
      const labelKey = getThinkingLabelKey(msg);
      setThinkingLabel(t(labelKey.key, labelKey.fallback));

      await streamMessage(getToken, conversationId, msg, {
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
    [isStreaming, conversationId, getToken, flushPending, t]
  );

  // ─── L3 tool approval round-trip ───────────────────────────────────────────

  const confirmTool = useCallback(
    async (toolCall: ToolCallEvent) => {
      if (toolCall.modal) {
        setPendingModal({
          modal: toolCall.modal,
          prefill: toolCall.args as Record<string, unknown>,
        });
        return;
      }
      if (!conversationId) return;
      try {
        const res = await confirmToolCall(getToken, conversationId, toolCall.toolCallId);
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
