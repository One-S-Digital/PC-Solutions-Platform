import React, { useEffect, useRef } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { ToolCallEvent, ToolResultEvent } from '../../services/assistantService';
import { SearchResultCards, isResultCardTool } from './ResultCards';
import { ActionPreviewCard, hasActionPreview } from './ActionPreviewCard';
import { ChatMessage } from './useAssistantChat';

// ─── Date / time helpers ──────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── DateSeparator ────────────────────────────────────────────────────────────

const DateSeparator: React.FC<{ date: Date }> = ({ date }) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let label: string;
  if (isSameDay(date, today)) {
    label = 'TODAY';
  } else if (isSameDay(date, yesterday)) {
    label = 'YESTERDAY';
  } else {
    label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <div className="my-1 flex items-center gap-3 py-3">
      <div className="flex-1 border-t border-gray-200" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        {label} · {formatTime(date)}
      </span>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  );
};

// ─── Markdown ─────────────────────────────────────────────────────────────────

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="ml-4 mt-1.5 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="ml-4 mt-1.5 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="underline hover:opacity-80" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

// ─── AssistantAvatar ──────────────────────────────────────────────────────────

const AssistantAvatar: React.FC = () => (
  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 shadow-sm">
    <SparklesIcon className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
  </div>
);

// ─── ToolCallCard ─────────────────────────────────────────────────────────────

interface ToolCallCardProps {
  toolCall: ToolCallEvent;
  result?: ToolResultEvent;
  cancelled?: boolean;
  onConfirm?: (toolCall: ToolCallEvent) => void;
  onCancel?: (toolCallId: string) => void;
  assistantName?: string;
}

const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolCall,
  result,
  cancelled,
  onConfirm,
  onCancel,
  assistantName = 'ProCrèche Assistant',
}) => {
  const { t } = useTranslation('assistant');

  const showRichPreview = hasActionPreview(toolCall.toolName);
  const argsPreview = Object.entries(toolCall.args || {})
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ');

  const hasResult = Boolean(result);
  const hasError = Boolean(result?.error);

  return (
    <div className="mb-4 flex items-start gap-2.5">
      <AssistantAvatar />
      <div className="flex min-w-0 flex-col">
        <span className="mb-1.5 text-xs font-medium text-gray-400">{assistantName}</span>
        <div className="max-w-sm rounded-2xl rounded-tl-sm border border-gray-100 bg-white p-3 shadow-sm">
          <div className="mb-1.5 flex items-center gap-2">
            <SparklesIcon className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-swiss-charcoal">{toolCall.toolName}</span>
            <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              {toolCall.level}
            </span>
          </div>

          {showRichPreview ? (
            <ActionPreviewCard toolName={toolCall.toolName} args={toolCall.args || {}} />
          ) : (
            argsPreview && (
              <p className="mb-2 truncate text-xs text-gray-400">{argsPreview}</p>
            )
          )}

          {hasResult && (
            <div
              className={`mb-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
                hasError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
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
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {t('toolCard.confirm', 'Confirm')}
              </button>
              <button
                onClick={() => onCancel?.(toolCall.toolCallId)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none"
              >
                {t('toolCard.cancel', 'Cancel')}
              </button>
            </div>
          )}

          {!toolCall.approvalRequired && !hasResult && !cancelled && (
            <p className="text-xs text-gray-400">{t('toolCard.autoExecuting', 'Executing…')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── NextStepChips ────────────────────────────────────────────────────────────

interface NextStepChipsProps {
  steps: string[];
  onSelect: (step: string) => void;
}

const NextStepChips: React.FC<NextStepChipsProps> = ({ steps, onSelect }) => (
  <div className="mb-3 mt-1.5 flex flex-wrap gap-2 pl-9">
    {steps.map((step) => (
      <button
        key={step}
        onClick={() => onSelect(step)}
        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      >
        {step}
      </button>
    ))}
  </div>
);

// ─── ThinkingBubble ───────────────────────────────────────────────────────────

interface ThinkingBubbleProps {
  text: string;
  label: string;
  assistantName?: string;
}

const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({
  text,
  label,
  assistantName = 'ProCrèche Assistant',
}) => (
  <div className="mb-4 flex items-start gap-2.5">
    <div className="mt-[22px] flex-shrink-0">
      <AssistantAvatar />
    </div>
    <div className="flex flex-col">
      <span className="mb-1.5 text-xs font-medium text-gray-400">{assistantName}</span>
      <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-swiss-charcoal shadow-sm">
        {text ? (
          <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
        ) : (
          <span className="text-gray-400">{label}</span>
        )}
        <span className="ml-1 inline-block h-4 w-0.5 animate-pulse rounded-full bg-emerald-500 align-middle" />
      </div>
    </div>
  </div>
);

// ─── ChatMessageList ──────────────────────────────────────────────────────────

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  pendingAssistantText: string;
  thinkingLabel: string;
  onSend: (text: string) => void;
  onConfirmTool: (toolCall: ToolCallEvent) => void;
  onCancelTool: (toolCallId: string) => void;
  /** Rendered when the thread has no messages and nothing is streaming. */
  emptyState?: React.ReactNode;
  /** Bubble style override for user messages (default: teal, workspace: deep emerald). */
  userBubbleClassName?: string;
  /** Name label shown above user bubbles. */
  userDisplayName?: string;
  /** Two-letter initials shown in the user avatar. */
  userInitials?: string;
  /** Display name for the AI assistant. */
  assistantName?: string;
}

/**
 * Shared thread renderer for the AI assistant: message bubbles, tool cards,
 * next-step chips, and the streaming "thinking" bubble. Used by both the
 * floating AssistantPanel and the full-page assistant workspace.
 */
export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isStreaming,
  pendingAssistantText,
  thinkingLabel,
  onSend,
  onConfirmTool,
  onCancelTool,
  emptyState,
  userBubbleClassName = 'bg-emerald-700 text-white',
  userDisplayName,
  userInitials,
  assistantName = 'ProCrèche Assistant',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAssistantText]);

  // Tracks the last rendered date to know when to insert a day separator
  let lastRenderedDate: Date | undefined;

  return (
    <>
      {messages.length === 0 && !isStreaming && emptyState}

      {messages.map((msg) => {
        const showSeparator =
          msg.createdAt != null &&
          (lastRenderedDate == null || !isSameDay(lastRenderedDate, msg.createdAt));
        if (msg.createdAt) lastRenderedDate = msg.createdAt;

        // ── Tool call card ──────────────────────────────────────────────────
        if (msg.toolCall) {
          if (isResultCardTool(msg.toolCall.toolName)) {
            return (
              <React.Fragment key={msg.id}>
                {showSeparator && msg.createdAt && <DateSeparator date={msg.createdAt} />}
                <SearchResultCards
                  toolName={msg.toolCall.toolName}
                  result={msg.toolResult}
                  statusLabel={msg.toolStatus}
                />
              </React.Fragment>
            );
          }
          return (
            <React.Fragment key={msg.id}>
              {showSeparator && msg.createdAt && <DateSeparator date={msg.createdAt} />}
              <ToolCallCard
                toolCall={msg.toolCall}
                result={msg.toolResult}
                cancelled={msg.cancelled}
                onConfirm={onConfirmTool}
                onCancel={onCancelTool}
                assistantName={assistantName}
              />
            </React.Fragment>
          );
        }

        if (!msg.text) return null;

        // ── User bubble ─────────────────────────────────────────────────────
        if (msg.sender === 'user') {
          return (
            <React.Fragment key={msg.id}>
              {showSeparator && msg.createdAt && <DateSeparator date={msg.createdAt} />}
              <div className="mb-1 flex items-end justify-end gap-2.5">
                <div className="flex min-w-0 flex-col items-end">
                  {userDisplayName && (
                    <span className="mb-1.5 text-xs font-medium text-gray-400">
                      {userDisplayName}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed ${userBubbleClassName}`}
                  >
                    {msg.text}
                  </div>
                </div>
                {userInitials && (
                  <div className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white ring-2 ring-white">
                    {userInitials}
                  </div>
                )}
              </div>
              {msg.createdAt && (
                <div className="mb-4 flex justify-end pr-10">
                  <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                </div>
              )}
            </React.Fragment>
          );
        }

        // ── Assistant bubble ────────────────────────────────────────────────
        return (
          <React.Fragment key={msg.id}>
            {showSeparator && msg.createdAt && <DateSeparator date={msg.createdAt} />}
            <div className="mb-1 flex items-start gap-2.5">
              <div className="mt-[22px] flex-shrink-0">
                <AssistantAvatar />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="mb-1.5 text-xs font-medium text-gray-400">{assistantName}</span>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-swiss-charcoal shadow-sm">
                  <ReactMarkdown components={markdownComponents}>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </div>
            {msg.nextSteps && msg.nextSteps.length > 0 && (
              <NextStepChips steps={msg.nextSteps} onSelect={onSend} />
            )}
          </React.Fragment>
        );
      })}

      {/* Streaming bubble */}
      {isStreaming && (
        <ThinkingBubble
          text={pendingAssistantText}
          label={thinkingLabel}
          assistantName={assistantName}
        />
      )}

      <div ref={messagesEndRef} />
    </>
  );
};
