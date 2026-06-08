import React, { useCallback, useEffect, useRef, useState } from 'react';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import ReactMarkdown from 'react-markdown';
import {
  createConversation,
  streamMessage,
  confirmToolCall,
  rejectToolCall,
  ToolCallEvent,
  ToolResultEvent,
  ModalActionEvent,
} from '../../services/assistantService';
import { useAppContext } from '../../contexts/AppContext';
import { AssistantModalHandler } from './AssistantModalHandler';
import { SearchResultCards, isResultCardTool } from './ResultCards';
import { ActionPreviewCard, hasActionPreview } from './ActionPreviewCard';
import { UserRole } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolCall?: ToolCallEvent;
  toolResult?: ToolResultEvent;
  toolStatus?: string;
  cancelled?: boolean;
  nextSteps?: string[];
}

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
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

// Per-role welcome suggestion chips.
const SUGGESTIONS_BY_ROLE: Record<string, { key: string; fallback: string }[]> = {
  [UserRole.FOUNDATION]: [
    { key: 'welcome.foundation.findCandidate', fallback: 'Find me an EDE in Geneva at 80%' },
    { key: 'welcome.foundation.postJob', fallback: 'Post a job for an educator' },
    { key: 'welcome.foundation.respondLead', fallback: 'Show my parent leads' },
  ],
  [UserRole.EDUCATOR]: [
    { key: 'welcome.educator.findJob', fallback: 'Find childcare jobs near me' },
    { key: 'welcome.educator.myApplications', fallback: 'Show my applications' },
    { key: 'welcome.educator.help', fallback: 'How do I apply to a job?' },
  ],
  [UserRole.PARENT]: [
    { key: 'welcome.parent.findFoundation', fallback: 'Find a crèche in my canton' },
    { key: 'welcome.parent.submitEnquiry', fallback: 'Submit a childcare enquiry' },
    { key: 'welcome.parent.myEnquiries', fallback: 'Show my enquiries' },
  ],
  [UserRole.PRODUCT_SUPPLIER]: [
    { key: 'welcome.supplier.myListings', fallback: 'Show my product listings' },
    { key: 'welcome.supplier.myOrders', fallback: 'Show my incoming orders' },
    { key: 'welcome.supplier.help', fallback: 'How do I add a product?' },
  ],
  [UserRole.SERVICE_PROVIDER]: [
    { key: 'welcome.serviceProvider.myListings', fallback: 'Show my service listings' },
    { key: 'welcome.serviceProvider.myRequests', fallback: 'Show my service requests' },
    { key: 'welcome.serviceProvider.help', fallback: 'How do I add a service?' },
  ],
  [UserRole.ADMIN]: [
    { key: 'welcome.admin.stats', fallback: 'Show platform stats' },
    { key: 'welcome.admin.findUser', fallback: 'Find a user by name' },
    { key: 'welcome.admin.findCandidate', fallback: 'Find candidates for a foundation' },
  ],
};
SUGGESTIONS_BY_ROLE[UserRole.SUPER_ADMIN] = SUGGESTIONS_BY_ROLE[UserRole.ADMIN];

const DEFAULT_SUGGESTIONS = [
  { key: 'welcome.suggestion1', fallback: 'What can you help me with?' },
  { key: 'welcome.suggestion2', fallback: 'How do I use this platform?' },
];

function getSuggestionsForRole(role?: UserRole | string | null) {
  return (role && SUGGESTIONS_BY_ROLE[role as string]) || DEFAULT_SUGGESTIONS;
}

// ─── ToolCallCard ─────────────────────────────────────────────────────────────

interface ToolCallCardProps {
  toolCall: ToolCallEvent;
  result?: ToolResultEvent;
  cancelled?: boolean;
  onConfirm?: (toolCall: ToolCallEvent) => void;
  onCancel?: (toolCallId: string) => void;
}

const ToolCallCard: React.FC<ToolCallCardProps> = ({ toolCall, result, cancelled, onConfirm, onCancel }) => {
  const { t } = useTranslation('assistant');

  const showRichPreview = hasActionPreview(toolCall.toolName);
  const argsPreview = Object.entries(toolCall.args || {})
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ');

  const hasResult = Boolean(result);
  const hasError = Boolean(result?.error);

  return (
    <div className="my-2 max-w-xs rounded-lg border border-swiss-teal/30 bg-white p-3 text-sm shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <SparklesIcon className="h-3.5 w-3.5 flex-shrink-0 text-swiss-teal" aria-hidden="true" />
        <span className="font-medium text-swiss-charcoal">{toolCall.toolName}</span>
        <span className="ml-auto rounded-full bg-swiss-teal/10 px-1.5 py-0.5 text-xs text-swiss-teal">
          {toolCall.level}
        </span>
      </div>

      {showRichPreview ? (
        <ActionPreviewCard toolName={toolCall.toolName} args={toolCall.args || {}} />
      ) : (
        argsPreview && <p className="mb-2 truncate text-xs text-gray-500">{argsPreview}</p>
      )}

      {hasResult && (
        <div className={`mb-2 rounded px-2 py-1 text-xs ${hasError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {hasError ? result!.error : t('toolCard.success', 'Done')}
        </div>
      )}

      {cancelled && !hasResult && (
        <p className="text-xs text-gray-400">{t('toolCard.cancelled', 'Cancelled')}</p>
      )}

      {toolCall.approvalRequired && !hasResult && !cancelled && (
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm?.(toolCall)}
            className="flex-1 rounded bg-swiss-teal px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-opacity-90"
          >
            {t('toolCard.confirm', 'Confirm')}
          </button>
          <button
            onClick={() => onCancel?.(toolCall.toolCallId)}
            className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            {t('toolCard.cancel', 'Cancel')}
          </button>
        </div>
      )}

      {!toolCall.approvalRequired && !hasResult && !cancelled && (
        <p className="text-xs text-gray-400">{t('toolCard.autoExecuting', 'Executing…')}</p>
      )}
    </div>
  );
};

// ─── NextStepChips ────────────────────────────────────────────────────────────

interface NextStepChipsProps {
  steps: string[];
  onSelect: (step: string) => void;
}

const NextStepChips: React.FC<NextStepChipsProps> = ({ steps, onSelect }) => (
  <div className="mb-3 flex flex-wrap gap-2 pl-1">
    {steps.map((step) => (
      <button
        key={step}
        onClick={() => onSelect(step)}
        className="rounded-full border border-swiss-teal/50 bg-swiss-teal/5 px-3 py-1 text-xs font-medium text-swiss-teal transition-colors hover:bg-swiss-teal/15 focus:outline-none focus:ring-2 focus:ring-swiss-teal/40"
      >
        {step}
      </button>
    ))}
  </div>
);

// ─── WelcomeScreen ────────────────────────────────────────────────────────────

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
  role?: UserRole | string | null;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestion, role }) => {
  const { t } = useTranslation('assistant');
  const suggestions = getSuggestionsForRole(role);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-swiss-teal/10">
        <SparklesIcon className="h-7 w-7 text-swiss-teal" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-swiss-charcoal">
        {t('welcome.title', "Hello, I'm your ProCrèche Assistant")}
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        {t(
          'welcome.subtitle',
          'I can help you find candidates, draft job posts, and navigate the platform.'
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map(({ key, fallback }) => (
          <button
            key={key}
            onClick={() => onSuggestion(t(key, fallback))}
            className="rounded-full border border-swiss-teal/40 bg-swiss-teal/5 px-3 py-1.5 text-sm text-swiss-teal transition-colors hover:bg-swiss-teal/10"
          >
            {t(key, fallback)}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── ThinkingBubble ───────────────────────────────────────────────────────────

interface ThinkingBubbleProps {
  text: string;
  label: string;
}

const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({ text, label }) => (
  <div className="mb-3 flex justify-start">
    <div className="max-w-[85%] rounded-xl bg-gray-100 px-4 py-2 text-sm leading-relaxed text-swiss-charcoal">
      {text ? (
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            ul: ({ children }) => <ul className="ml-4 mt-1 list-disc space-y-0.5">{children}</ul>,
            ol: ({ children }) => <ol className="ml-4 mt-1 list-decimal space-y-0.5">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            a: ({ href, children }) => (
              <a href={href} className="underline hover:opacity-80" target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      ) : (
        <span className="text-gray-400">{label}</span>
      )}
      <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-swiss-teal align-middle" />
    </div>
  </div>
);

// ─── AssistantPanel ───────────────────────────────────────────────────────────

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('assistant');
  const { getToken } = useAuth();
  const { language, currentUser } = useAppContext();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAssistantText, setPendingAssistantText] = useState('');
  const [thinkingLabel, setThinkingLabel] = useState(() => t('panel.thinking', 'Thinking…'));
  const [initError, setInitError] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<{ modal: string; prefill: Record<string, unknown> } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const doneFiredRef = useRef(false);
  // Accumulates nextSteps from SSE until flush time
  const pendingNextStepsRef = useRef<string[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAssistantText]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || conversationId) return;

    const locale = (language as string)?.toLowerCase() ?? 'en';

    createConversation(getToken, locale)
      .then(({ id }) => setConversationId(id))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to start conversation';
        setInitError(msg);
      });
  }, [isOpen, conversationId, getToken, language]);

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

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? inputText).trim();
      if (!msg || isStreaming || !conversationId) return;

      setInputText('');
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
    [inputText, isStreaming, conversationId, getToken, flushPending, t]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleToolConfirm = useCallback(
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

  const handleToolCancel = useCallback(
    (toolCallId: string) => {
      setMessages((prev) => prev.map((m) => (m.id === toolCallId ? { ...m, cancelled: true } : m)));
      if (conversationId) {
        void rejectToolCall(getToken, conversationId, toolCallId);
      }
    },
    [conversationId, getToken]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <>
      <AssistantModalHandler
        pendingModal={pendingModal}
        onHandled={() => setPendingModal(null)}
      />

      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('panel.title', 'ProCrèche Assistant')}
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col bg-white shadow-2xl md:w-[420px]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 bg-swiss-teal px-4 py-3">
          <SparklesIcon className="h-5 w-5 flex-shrink-0 text-white" aria-hidden="true" />
          <span className="flex-1 font-semibold text-white">
            {t('panel.title', 'ProCrèche Assistant')}
          </span>
          <button
            onClick={onClose}
            aria-label={t('panel.close', 'Close assistant')}
            className="rounded p-1 text-white/80 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {initError && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
              {initError}
            </div>
          )}

          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
            {messages.length === 0 && !isStreaming && (
              <WelcomeScreen onSuggestion={(text) => handleSend(text)} role={currentUser?.role} />
            )}

            {messages.map((msg) => {
              if (msg.toolCall) {
                if (isResultCardTool(msg.toolCall.toolName)) {
                  return (
                    <SearchResultCards
                      key={msg.id}
                      toolName={msg.toolCall.toolName}
                      result={msg.toolResult}
                      statusLabel={msg.toolStatus}
                    />
                  );
                }
                return (
                  <ToolCallCard
                    key={msg.id}
                    toolCall={msg.toolCall}
                    result={msg.toolResult}
                    cancelled={msg.cancelled}
                    onConfirm={handleToolConfirm}
                    onCancel={handleToolCancel}
                  />
                );
              }

              if (!msg.text) return null;

              return (
                <React.Fragment key={msg.id}>
                  <div className={`mb-2 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-2 text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-swiss-teal text-white'
                          : 'bg-gray-100 text-swiss-charcoal'
                      }`}
                    >
                      {msg.sender === 'assistant' ? (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="ml-4 mt-1 list-disc space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="ml-4 mt-1 list-decimal space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li>{children}</li>,
                            a: ({ href, children }) => (
                              <a href={href} className="underline hover:opacity-80" target="_blank" rel="noreferrer">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                  {/* Clickable next-step chips below the assistant message */}
                  {msg.sender === 'assistant' && msg.nextSteps && msg.nextSteps.length > 0 && (
                    <NextStepChips steps={msg.nextSteps} onSelect={(step) => handleSend(step)} />
                  )}
                </React.Fragment>
              );
            })}

            {/* Streaming bubble with contextual thinking label */}
            {isStreaming && (
              <ThinkingBubble text={pendingAssistantText} label={thinkingLabel} />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-gray-100 bg-white px-3 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={t('composer.placeholder', 'Ask me anything…')}
                disabled={isStreaming || !!initError || !conversationId}
                aria-label={t('composer.placeholder', 'Ask me anything…')}
                className="flex-1 resize-none bg-transparent text-sm text-swiss-charcoal placeholder-gray-400 focus:outline-none disabled:opacity-50"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isStreaming || !!initError || !conversationId}
                aria-label={t('composer.send', 'Send')}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-swiss-teal text-white transition-colors hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-1 disabled:opacity-40"
              >
                <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-xs text-gray-400">
              {t('composer.hint', 'Press Enter to send · Shift+Enter for new line')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
