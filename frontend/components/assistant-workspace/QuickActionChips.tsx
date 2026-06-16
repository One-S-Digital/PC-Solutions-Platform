import React from 'react';
import { useTranslation } from 'react-i18next';

interface QuickActionChipsProps {
  onAction: (prompt: string) => void;
  disabled?: boolean;
}

const ACTIONS = [
  {
    labelKey: 'workspace.quickActions.onboarding',
    labelFallback: 'Prepare onboarding',
    promptKey: 'workspace.quickPrompts.onboarding',
    promptFallback: 'Help me prepare an onboarding pack for a new family joining our crèche.',
    emoji: '📋',
  },
  {
    labelKey: 'workspace.quickActions.cantonDirective',
    labelFallback: 'Canton directive',
    promptKey: 'workspace.quickPrompts.cantonDirective',
    promptFallback: 'Summarize the latest cantonal directive changes relevant to my crèche.',
    emoji: '⚖️',
  },
  {
    labelKey: 'workspace.quickActions.newsletter',
    labelFallback: 'Parent newsletter',
    promptKey: 'workspace.quickPrompts.newsletter',
    promptFallback: "Draft a newsletter to our parents with this month's news and reminders.",
    emoji: '✉️',
  },
  {
    labelKey: 'workspace.quickActions.orderSupplies',
    labelFallback: 'Order supplies',
    promptKey: 'workspace.quickPrompts.orderSupplies',
    promptFallback: 'Help me order supplies for the crèche.',
    emoji: '🛒',
  },
];

/**
 * Prompt-template chips above the composer. Each chip submits a pre-built
 * prompt into the normal chat pipeline — no special orchestration.
 */
export const QuickActionChips: React.FC<QuickActionChipsProps> = ({ onAction, disabled }) => {
  const { t } = useTranslation('assistant');

  return (
    <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
      {ACTIONS.map(({ labelKey, labelFallback, promptKey, promptFallback, emoji }) => (
        <button
          key={labelKey}
          onClick={() => onAction(t(promptKey, promptFallback))}
          disabled={disabled}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-swiss-charcoal shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50"
        >
          <span aria-hidden="true">{emoji}</span>
          {t(labelKey, labelFallback)}
        </button>
      ))}
    </div>
  );
};
