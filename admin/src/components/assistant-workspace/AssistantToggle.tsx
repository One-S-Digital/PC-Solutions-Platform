import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface AssistantToggleProps {
  active: 'assistant' | 'dashboard';
}

/**
 * Segmented `Assistant | Dashboard` switch. A pure navigation control:
 * Assistant → /assistant (chat workspace),
 * Dashboard → /dashboard (the classic admin dashboard).
 */
export const AssistantToggle: React.FC<AssistantToggleProps> = ({ active }) => {
  const { t } = useTranslation('assistant');
  const navigate = useNavigate();

  const tabClass = (isActive: boolean) =>
    `rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-swiss-teal/40 ${
      isActive
        ? 'bg-white text-swiss-charcoal shadow-minimal'
        : 'text-gray-500 hover:text-swiss-charcoal'
    }`;

  return (
    <div
      role="tablist"
      aria-label={t('workspace.tabsLabel', 'Workspace view')}
      className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1"
    >
      <button
        role="tab"
        aria-selected={active === 'assistant'}
        onClick={() => active !== 'assistant' && navigate('/assistant')}
        className={tabClass(active === 'assistant')}
      >
        {t('workspace.tabAssistant', 'Assistant')}
      </button>
      <button
        role="tab"
        aria-selected={active === 'dashboard'}
        onClick={() => active !== 'dashboard' && navigate('/dashboard')}
        className={tabClass(active === 'dashboard')}
      >
        {t('workspace.tabDashboard', 'Dashboard')}
      </button>
    </div>
  );
};
