import React, { useEffect, useRef } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { ToolCallEvent, ToolResultEvent } from '../../services/assistantService';
import { SearchResultCards, isResultCardTool } from './ResultCards';
import { ActionPreviewCard, hasActionPreview } from './ActionPreviewCard';
import { ChatMessage } from './useAssistantChat';

// ─── Markdown ─────────────────────────────────────────────────────────────────

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-1 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="ml-4 mt-1 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="ml-4 mt-1 list-decimal space-y-0.5">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="underline hover:opacity-80" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

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

// ─── ThinkingBubble ───────────────────────────────────────────────────────────

interface ThinkingBubbleProps {
  text: string;
  label: string;
}

const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({ text, label }) => (
  <div className="mb-3 flex justify-start">
    <div className="max-w-[85%] rounded-xl bg-gray-100 px-4 py-2 text-sm leading-relaxed text-swiss-charcoal">
      {text ? (
        <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
      ) : (
        <span className="text-gray-400">{label}</span>
      )}
      <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-swiss-teal align-middle" />
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
  /** Bubble style override for user messages (default: teal, workspace: deep teal). */
  userBubbleClassName?: string;
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
  userBubbleClassName = 'bg-swiss-teal text-white',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAssistantText]);

  return (
    <>
      {messages.length === 0 && !isStreaming && emptyState}

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
              onConfirm={onConfirmTool}
              onCancel={onCancelTool}
            />
          );
        }

        if (!msg.text) return null;

        return (
          <React.Fragment key={msg.id}>
            <div className={`mb-2 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2 text-sm leading-relaxed ${
                  msg.sender === 'user' ? userBubbleClassName : 'bg-gray-100 text-swiss-charcoal'
                }`}
              >
                {msg.sender === 'assistant' ? (
                  <ReactMarkdown components={markdownComponents}>{msg.text}</ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            </div>
            {/* Clickable next-step chips below the assistant message */}
            {msg.sender === 'assistant' && msg.nextSteps && msg.nextSteps.length > 0 && (
              <NextStepChips steps={msg.nextSteps} onSelect={onSend} />
            )}
          </React.Fragment>
        );
      })}

      {/* Streaming bubble with contextual thinking label */}
      {isStreaming && <ThinkingBubble text={pendingAssistantText} label={thinkingLabel} />}

      <div ref={messagesEndRef} />
    </>
  );
};
