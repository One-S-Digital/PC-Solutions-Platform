import React, { useCallback, useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

/** Workspace composer: auto-focused input with a mint send button. */
export const Composer: React.FC<ComposerProps> = ({ onSend, disabled }) => {
  const { t } = useTranslation('assistant');
  const [inputText, setInputText] = useState('');

  const handleSend = useCallback(() => {
    const msg = inputText.trim();
    if (!msg || disabled) return;
    setInputText('');
    onSend(msg);
  }, [inputText, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex items-end gap-2 rounded-card border border-gray-200 bg-white px-4 py-3 shadow-minimal">
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        autoFocus
        placeholder={t('workspace.composerPlaceholder', "Ask me anything — I'll handle the rest…")}
        disabled={disabled}
        aria-label={t('workspace.composerPlaceholder', "Ask me anything — I'll handle the rest…")}
        className="flex-1 resize-none bg-transparent text-sm text-swiss-charcoal placeholder-gray-400 focus:outline-none disabled:opacity-50"
        style={{ maxHeight: '120px', overflowY: 'auto' }}
      />
      <button
        onClick={handleSend}
        disabled={!inputText.trim() || disabled}
        aria-label={t('workspace.send', 'Send')}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-swiss-mint text-white transition-colors hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:ring-offset-1 disabled:opacity-40"
      >
        <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
