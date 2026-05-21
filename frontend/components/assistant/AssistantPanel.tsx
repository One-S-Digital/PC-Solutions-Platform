import React, { useCallback, useEffect, useRef, useState } from 'react';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import {
  createConversation,
  streamMessage,
  ToolCallEvent,
  ToolResultEvent,
  ModalActionEvent,
} from '../../services/assistantService';
import { useAppContext } from '../../contexts/AppContext';
import { AssistantModalHandler } from './AssistantModalHandler';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolCall?: ToolCallEvent;
  toolResult?: ToolResultEvent;
}

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const SUGGESTION_KEYS = [
  { key: 'welcome.suggestion1', fallback: 'Find me an educator' },
  { key: 'welcome.suggestion2', fallback: 'Draft a job post' },
  { key: 'welcome.suggestion3', fallback: 'How do I add a staff request?' },
];

// ─── ToolCallCard ─────────────────────────────────────────────────────────────

interface ToolCallCardProps {
  toolCall: ToolCallEvent;
  result?: ToolResultEvent;
  onConfirm?: (toolCall: ToolCallEvent) => void;
  onCancel?: (toolCallId: string) => void;
}

const ToolCallCard: React.FC<ToolCallCardProps> = ({ toolCall, result, onConfirm, onCancel }) => {
  const { t } = useTranslation('assistant');

  const argsPreview = Object.entries(toolCall.args || {})
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ');

  const hasResult = Boolean(result);
  const hasError = Boolean(result?.error);

  return (
    <div className="my-2 max-w-xs rounded-lg border border-swiss-teal/30 bg-white p-3 text-sm shadow-sm">
      {/* Tool name header */}
      <div className="mb-1 flex items-center gap-2">
        <SparklesIcon className="h-3.5 w-3.5 flex-shrink-0 text-swiss-teal" aria-hidden="true" />
        <span className="font-medium text-swiss-charcoal">{toolCall.toolName}</span>
        <span className="ml-auto rounded-full bg-swiss-teal/10 px-1.5 py-0.5 text-xs text-swiss-teal">
          {toolCall.level}
        </span>
      </div>

      {/* Args preview */}
      {argsPreview && (
        <p className="mb-2 truncate text-xs text-gray-500">{argsPreview}</p>
      )}

      {/* Result / error */}
      {hasResult && (
        <div className={`mb-2 rounded px-2 py-1 text-xs ${hasError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {hasError ? result!.error : t('toolCard.success', 'Done')}
        </div>
      )}

      {/* L2 approval buttons — only shown when not yet resolved */}
      {toolCall.approvalRequired && !hasResult && (
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

      {/* L1/auto-execute indicator */}
      {!toolCall.approvalRequired && !hasResult && (
        <p className="text-xs text-gray-400">{t('toolCard.autoExecuting', 'Executing…')}</p>
      )}
    </div>
  );
};

// ─── WelcomeScreen ────────────────────────────────────────────────────────────

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestion }) => {
  const { t } = useTranslation('assistant');

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
        {SUGGESTION_KEYS.map(({ key, fallback }) => (
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

// ─── AssistantPanel ───────────────────────────────────────────────────────────

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('assistant');
  const { getToken } = useAuth();
  const { language } = useAppContext();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingAssistantText, setPendingAssistantText] = useState('');
  const [initError, setInitError] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<{ modal: string; prefill: Record<string, unknown> } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Track whether onDone has already been called for the current stream to avoid double-flush
  const doneFiredRef = useRef(false);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAssistantText]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Initialise conversation on first open
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
    setPendingAssistantText((prev) => {
      if (prev.trim()) {
        setMessages((msgs) => [
          ...msgs,
          { id: genId(), sender: 'assistant', text: prev },
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

      // Append user message
      setMessages((prev) => [...prev, { id: genId(), sender: 'user', text: msg }]);
      setIsStreaming(true);
      setPendingAssistantText('');

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
        },
      });
    },
    [inputText, isStreaming, conversationId, getToken, flushPending]
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
    (toolCall: ToolCallEvent) => {
      if (toolCall.modal) {
        setPendingModal({
          modal: toolCall.modal,
          prefill: toolCall.args as Record<string, unknown>,
        });
      }
    },
    []
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <>
      {/* Modal handler */}
      <AssistantModalHandler
        pendingModal={pendingModal}
        onHandled={() => setPendingModal(null)}
      />

      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
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
          {/* Error banner */}
          {initError && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
              {initError}
            </div>
          )}

          {/* Messages area */}
          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
            {/* Welcome screen */}
            {messages.length === 0 && !isStreaming && (
              <WelcomeScreen onSuggestion={(text) => handleSend(text)} />
            )}

            {/* Chat bubbles */}
            {messages.map((msg) => {
              if (msg.toolCall) {
                return (
                  <ToolCallCard
                    key={msg.id}
                    toolCall={msg.toolCall}
                    result={msg.toolResult}
                    onConfirm={handleToolConfirm}
                    onCancel={() => {/* no-op cancel */}}
                  />
                );
              }

              if (!msg.text) return null;

              return (
                <div
                  key={msg.id}
                  className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2 text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-swiss-teal text-white'
                        : 'bg-gray-100 text-swiss-charcoal'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {/* Streaming bubble with blinking cursor */}
            {isStreaming && (
              <div className="mb-3 flex justify-start">
                <div className="max-w-[85%] rounded-xl bg-gray-100 px-4 py-2 text-sm leading-relaxed text-swiss-charcoal">
                  {pendingAssistantText || (
                    <span className="text-gray-400">{t('panel.thinking', 'Thinking…')}</span>
                  )}
                  <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-swiss-teal align-middle" />
                </div>
              </div>
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
