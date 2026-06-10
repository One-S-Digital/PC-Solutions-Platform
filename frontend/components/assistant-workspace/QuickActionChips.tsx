import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';

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
    icon: ClipboardDocumentCheckIcon,
  },
  {
    labelKey: 'workspace.quickActions.cantonDirective',
    labelFallback: 'Canton directive',
    promptKey: 'workspace.quickPrompts.cantonDirective',
    promptFallback: 'Summarize the latest cantonal directive changes relevant to my crèche.',
    icon: DocumentTextIcon,
  },
  {
    labelKey: 'workspace.quickActions.newsletter',
    labelFallback: 'Parent newsletter',
    promptKey: 'workspace.quickPrompts.newsletter',
    promptFallback: "Draft a newsletter to our parents with this month's news and reminders.",
    icon: EnvelopeIcon,
  },
  {
    labelKey: 'workspace.quickActions.orderSupplies',
    labelFallback: 'Order supplies',
    promptKey: 'workspace.quickPrompts.orderSupplies',
    promptFallback: 'Help me order supplies for the crèche.',
    icon: ShoppingBagIcon,
  },
];

/**
 * Prompt-template chips above the composer. Each chip submits a pre-built
 * prompt into the normal chat pipeline — no special orchestration.
 */
export const QuickActionChips: React.FC<QuickActionChipsProps> = ({ onAction, disabled }) => {
  const { t } = useTranslation('assistant');

  return (
    <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
      {ACTIONS.map(({ labelKey, labelFallback, promptKey, promptFallback, icon: Icon }) => (
        <button
          key={labelKey}
          onClick={() => onAction(t(promptKey, promptFallback))}
          disabled={disabled}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-swiss-charcoal shadow-minimal transition-colors hover:border-swiss-teal/40 hover:bg-swiss-teal/5 focus:outline-none focus:ring-2 focus:ring-swiss-teal/40 disabled:opacity-50"
        >
          <Icon className="h-3.5 w-3.5 text-swiss-teal" aria-hidden="true" />
          {t(labelKey, labelFallback)}
        </button>
      ))}
    </div>
  );
};
