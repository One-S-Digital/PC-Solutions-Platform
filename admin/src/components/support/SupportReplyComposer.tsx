import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';

interface SupportReplyComposerProps {
  ticketId: string;
  disabled?: boolean;
  onSend: (content: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

const SupportReplyComposer: React.FC<SupportReplyComposerProps> = ({
  ticketId,
  disabled = false,
  onSend,
  placeholder,
  className = '',
}) => {
  const { t } = useTranslation(['common', 'admin']);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      await onSend(content);
      setDraft(''); // Clear draft only after successful send
    } catch (error) {
      console.error('Error sending reply:', error);
      // Don't clear draft on error - user can retry
    } finally {
      setSending(false);
    }
  }, [draft, sending, onSend]);


  // Reset draft when ticketId changes
  React.useEffect(() => {
    setDraft('');
  }, [ticketId]);

  // DEV-ONLY: Focus tracing to identify what's stealing focus
  React.useEffect(() => {
    if (import.meta.env.PROD) return;

    // Wait for ref to be available
    const el = textareaRef.current;
    if (!el) {
      // Retry on next tick if ref not available yet
      const timeoutId = setTimeout(() => {
        const retryEl = textareaRef.current;
        if (!retryEl) return;
        setupFocusTracing(retryEl);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const setupFocusTracing = (element: HTMLTextAreaElement) => {

    const originalFocus = HTMLElement.prototype.focus;

    HTMLElement.prototype.focus = function (...args: any[]) {
      const target = this as HTMLElement;

      // If focus is being moved away from our textarea while it's active, log it
      const active = document.activeElement;
      const isTextareaActive = active === element;
      const isFocusingElsewhere = target !== element;

      if (isTextareaActive && isFocusingElsewhere) {
        // eslint-disable-next-line no-console
        console.warn('[FOCUS-STEAL] focus moved to:', target.tagName, target.className);
        // eslint-disable-next-line no-console
        console.warn(new Error('[FOCUS-STEAL] stack').stack);
      }

        return originalFocus.apply(this, args as any);
      };

      const onFocusIn = (e: FocusEvent) => {
        // eslint-disable-next-line no-console
        console.log('[focusin]', (e.target as HTMLElement)?.tagName, (e.target as HTMLElement)?.className);
      };

      document.addEventListener('focusin', onFocusIn, true);

      return () => {
        HTMLElement.prototype.focus = originalFocus;
        document.removeEventListener('focusin', onFocusIn, true);
      };
    };

    return setupFocusTracing(el);

    return setupFocusTracing(el);
  }, []);

  const displayPlaceholder = placeholder || t('admin:support.replyPlaceholder', { defaultValue: 'Type your reply...' });

  // Debug logging
  const log = useCallback((...args: any[]) => {
    console.log('[SupportReplyComposer]', ...args);
  }, []);

  // Stop event propagation to prevent parent click handlers from stealing focus
  const stopPropagation = useCallback((e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
  }, []);

  const stopKeyPropagation = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    log('FOCUS');
    e.stopPropagation();
  }, [log]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    const activeElement = document.activeElement as HTMLElement;
    log('BLUR', 'activeElement:', activeElement?.tagName, activeElement?.className);
    e.stopPropagation();
  }, [log]);

  const handleKeyDownWithLog = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    log('KEYDOWN', e.key);
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim() && !sending) {
        handleSubmit(e);
      }
    }
  }, [draft, sending, handleSubmit, log]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    log('KEYUP', e.key);
  }, [log]);

  return (
    <div
      onMouseDown={stopPropagation}
      onClick={stopPropagation}
      onKeyDownCapture={stopKeyPropagation}
      onKeyUpCapture={stopKeyPropagation}
      className={className}
    >
      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDownWithLog}
          onKeyUp={handleKeyUp}
          onMouseDown={stopPropagation}
          onClick={stopPropagation}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={displayPlaceholder}
          rows={3}
          disabled={disabled || sending}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      <div className="flex justify-end mt-2">
        <Button
          type="button"
          variant="primary"
          disabled={!draft.trim() || disabled || sending}
          size="sm"
          onClick={handleSubmit}
        >
          {sending ? t('common:buttons.sending', { defaultValue: 'Sending...' }) : t('common:buttons.reply', { defaultValue: 'Reply' })}
        </Button>
      </div>
      </form>
    </div>
  );
};

export default React.memo(SupportReplyComposer);

