import React, { useCallback, useState } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

/** Workspace composer: rounded pill input with a circular green send button. */
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
    <div className="flex items-end gap-2 rounded-3xl border border-gray-200 bg-white py-2 pl-5 pr-2 shadow-soft focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        autoFocus
        placeholder={t('workspace.composerPlaceholder', "Ask me anything — I'll handle the rest…")}
        disabled={disabled}
        aria-label={t('workspace.composerPlaceholder', "Ask me anything — I'll handle the rest…")}
        className="flex-1 resize-none self-center bg-transparent py-1.5 text-sm text-swiss-charcoal placeholder-gray-400 focus:outline-none disabled:opacity-50"
        style={{ maxHeight: '120px', overflowY: 'auto' }}
      />
      <button
        onClick={handleSend}
        disabled={!inputText.trim() || disabled}
        aria-label={t('workspace.send', 'Send')}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-40"
      >
        <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
};
