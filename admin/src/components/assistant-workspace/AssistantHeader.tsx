import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/clerk-react';

/**
 * Workspace header: time-of-day greeting + date/"Platform overview" line on
 * the left, the Assistant | Dashboard toggle and "Assistant active" pill on
 * the right. Bell and avatar stay in the global Header above — not duplicated.
 */
export const AssistantHeader: React.FC = () => {
  const { t, i18n } = useTranslation('assistant');
  const { user } = useUser();

  const hour = new Date().getHours();
  const greetingKey =
    hour < 12 ? 'workspace.greetingMorning' : hour < 18 ? 'workspace.greetingAfternoon' : 'workspace.greetingEvening';
  const greetingFallback =
    hour < 12 ? 'Good morning, {{name}} 👋' : hour < 18 ? 'Good afternoon, {{name}} 👋' : 'Good evening, {{name}} 👋';

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || '';

  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-swiss-charcoal sm:text-2xl">
          {t(greetingKey, greetingFallback, { name: firstName })}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {dateLabel} · {t('adminWorkspace.subtitle', 'Platform overview')}
        </p>
      </div>
      <span className="hidden items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-swiss-mint" aria-hidden="true" />
        {t('workspace.activePill', 'Assistant active')}
      </span>
    </div>
  );
};
