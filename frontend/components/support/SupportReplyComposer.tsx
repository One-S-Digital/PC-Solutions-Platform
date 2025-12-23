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
  const { t } = useTranslation(['common']);
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim() && !sending) {
        handleSubmit(e);
      }
    }
  }, [draft, sending, handleSubmit]);

  // Reset draft when ticketId changes
  React.useEffect(() => {
    setDraft('');
  }, [ticketId]);

  const displayPlaceholder = placeholder || t('common:supportPage.ticketForm.responsePlaceholder', { defaultValue: 'Type your reply...' });

  return (
    <form onSubmit={handleSubmit} className={className}>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={displayPlaceholder}
        rows={3}
        disabled={disabled || sending}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div className="flex justify-end mt-2">
        <Button
          type="submit"
          variant="primary"
          disabled={!draft.trim() || disabled || sending}
          size="sm"
        >
          {sending ? t('common:buttons.sending', { defaultValue: 'Sending...' }) : t('common:buttons.reply', { defaultValue: 'Reply' })}
        </Button>
      </div>
    </form>
  );
};

export default React.memo(SupportReplyComposer);

