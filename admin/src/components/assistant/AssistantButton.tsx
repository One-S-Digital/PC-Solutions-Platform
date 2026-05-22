import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface AssistantButtonProps {
  onOpen: () => void;
}

export const AssistantButton: React.FC<AssistantButtonProps> = ({ onOpen }) => {
  const { t } = useTranslation('assistant');

  return (
    <button
      onClick={onOpen}
      aria-label={t('button.open', 'Open AI Assistant')}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-swiss-teal text-white shadow-lg transition-all duration-200 hover:bg-opacity-90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-2"
    >
      <SparklesIcon className="h-6 w-6" aria-hidden="true" />
    </button>
  );
};
