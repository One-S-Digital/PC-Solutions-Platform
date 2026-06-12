import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

interface QuickActionChipsProps {
  onAction: (prompt: string) => void;
  disabled?: boolean;
}

// Admin prompt templates (ADMIN_ASSISTANT_WORKSPACE_PLAN §2) — each chip
// submits a pre-built prompt into the normal chat pipeline, no special
// orchestration.
const ACTIONS = [
  {
    labelKey: 'adminWorkspace.quickActions.approvals',
    labelFallback: 'Educator approvals',
    promptKey: 'adminWorkspace.quickPrompts.approvals',
    promptFallback: 'Review pending educator approvals with me.',
    icon: ClipboardDocumentCheckIcon,
  },
  {
    labelKey: 'adminWorkspace.quickActions.stats',
    labelFallback: 'Platform stats',
    promptKey: 'adminWorkspace.quickPrompts.stats',
    promptFallback: 'Show me the platform stats and staffing signals this week.',
    icon: ChartBarIcon,
  },
  {
    labelKey: 'adminWorkspace.quickActions.findUser',
    labelFallback: 'Find a user',
    promptKey: 'adminWorkspace.quickPrompts.findUser',
    promptFallback: 'Help me find a user on the platform.',
    icon: MagnifyingGlassIcon,
  },
  {
    labelKey: 'adminWorkspace.quickActions.invite',
    labelFallback: 'Draft an invite',
    promptKey: 'adminWorkspace.quickPrompts.invite',
    promptFallback: 'Draft an invitation for a new user joining the platform.',
    icon: EnvelopeIcon,
  },
];

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
