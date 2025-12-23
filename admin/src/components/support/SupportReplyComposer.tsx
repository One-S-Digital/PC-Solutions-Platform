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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const displayPlaceholder = placeholder || t('admin:support.replyPlaceholder', { defaultValue: 'Type your reply...' });

  // Focus lock refs
  const ignoreNextBlurRef = useRef(false);

  // Stop event propagation to prevent parent click handlers from stealing focus
  const stopPropagation = useCallback((e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
  }, []);

  const stopKeyPropagation = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  // Mark when user intentionally blurs (e.g., clicking Send button)
  const markUserIntentionalBlur = useCallback(() => {
    ignoreNextBlurRef.current = true;
    setTimeout(() => {
      ignoreNextBlurRef.current = false;
    }, 250);
  }, []);

  // Safe focus lock: refocus textarea if focus is stolen while typing
  const handleBlur = useCallback(() => {
    if (ignoreNextBlurRef.current) return;

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;

      // Only refocus if the textarea was the intended typing target:
      // - element exists
      // - it's not disabled
      // - user is still on this page
      if (!el.disabled && document.visibilityState === 'visible') {
        el.focus();
      }
    });
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim() && !sending) {
        handleSubmit(e);
      }
    }
  }, [draft, sending, handleSubmit]);

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
          onKeyDown={handleKeyDown}
          onMouseDown={stopPropagation}
          onClick={stopPropagation}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={displayPlaceholder}
          rows={3}
          disabled={disabled || sending}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      <div 
        className="flex justify-end mt-2"
        onMouseDown={markUserIntentionalBlur}
        onPointerDown={markUserIntentionalBlur}
      >
        <Button
          type="button"
          variant="primary"
          disabled={!draft.trim() || disabled || sending}
          size="sm"
          onClick={handleSubmit}
          onMouseDown={markUserIntentionalBlur}
          onPointerDown={markUserIntentionalBlur}
        >
          {sending ? t('common:buttons.sending', { defaultValue: 'Sending...' }) : t('common:buttons.reply', { defaultValue: 'Reply' })}
        </Button>
      </div>
      </form>
    </div>
  );
};

export default React.memo(SupportReplyComposer);

