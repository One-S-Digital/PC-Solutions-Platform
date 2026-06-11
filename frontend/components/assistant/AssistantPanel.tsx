import React, { useCallback, useEffect, useRef, useState } from 'react';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { AssistantModalHandler } from './AssistantModalHandler';
import { ChatMessageList } from './ChatMessageList';
import { useAssistantChat } from './useAssistantChat';
import { UserRole } from '../../types';

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Per-role welcome suggestion chips.
const SUGGESTIONS_BY_ROLE: Record<string, { key: string; fallback: string }[]> = {
  [UserRole.FOUNDATION]: [
    { key: 'welcome.foundation.findCandidate', fallback: 'Find me an EDE in Geneva at 80%' },
    { key: 'welcome.foundation.postJob', fallback: 'Post a job for an educator' },
    { key: 'welcome.foundation.respondLead', fallback: 'Show my parent leads' },
  ],
  [UserRole.EDUCATOR]: [
    { key: 'welcome.educator.findJob', fallback: 'Find childcare jobs near me' },
    { key: 'welcome.educator.myApplications', fallback: 'Show my applications' },
    { key: 'welcome.educator.help', fallback: 'How do I apply to a job?' },
  ],
  [UserRole.PARENT]: [
    { key: 'welcome.parent.findFoundation', fallback: 'Find a crèche in my canton' },
    { key: 'welcome.parent.submitEnquiry', fallback: 'Submit a childcare enquiry' },
    { key: 'welcome.parent.myEnquiries', fallback: 'Show my enquiries' },
  ],
  [UserRole.PRODUCT_SUPPLIER]: [
    { key: 'welcome.supplier.myListings', fallback: 'Show my product listings' },
    { key: 'welcome.supplier.myOrders', fallback: 'Show my incoming orders' },
    { key: 'welcome.supplier.help', fallback: 'How do I add a product?' },
  ],
  [UserRole.SERVICE_PROVIDER]: [
    { key: 'welcome.serviceProvider.myListings', fallback: 'Show my service listings' },
    { key: 'welcome.serviceProvider.myRequests', fallback: 'Show my service requests' },
    { key: 'welcome.serviceProvider.help', fallback: 'How do I add a service?' },
  ],
  [UserRole.ADMIN]: [
    { key: 'welcome.admin.stats', fallback: 'Show platform stats' },
    { key: 'welcome.admin.findUser', fallback: 'Find a user by name' },
    { key: 'welcome.admin.findCandidate', fallback: 'Find candidates for a foundation' },
  ],
};
SUGGESTIONS_BY_ROLE[UserRole.SUPER_ADMIN] = SUGGESTIONS_BY_ROLE[UserRole.ADMIN];

const DEFAULT_SUGGESTIONS = [
  { key: 'welcome.suggestion1', fallback: 'What can you help me with?' },
  { key: 'welcome.suggestion2', fallback: 'How do I use this platform?' },
];

function getSuggestionsForRole(role?: UserRole | string | null) {
  return (role && SUGGESTIONS_BY_ROLE[role as string]) || DEFAULT_SUGGESTIONS;
}

// ─── WelcomeScreen ────────────────────────────────────────────────────────────

interface WelcomeScreenProps {
  onSuggestion: (text: string) => void;
  role?: UserRole | string | null;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestion, role }) => {
  const { t } = useTranslation('assistant');
  const suggestions = getSuggestionsForRole(role);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-swiss-teal/10">
        <SparklesIcon className="h-7 w-7 text-swiss-teal" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-swiss-charcoal">
        {t('welcome.title', "Hello, I'm your ProCrèche Assistant")}
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        {t(
          'welcome.subtitle',
          'I can help you find candidates, draft job posts, and navigate the platform.'
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map(({ key, fallback }) => (
          <button
            key={key}
            onClick={() => onSuggestion(t(key, fallback))}
            className="rounded-full border border-swiss-teal/40 bg-swiss-teal/5 px-3 py-1.5 text-sm text-swiss-teal transition-colors hover:bg-swiss-teal/10"
          >
            {t(key, fallback)}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── AssistantPanel ───────────────────────────────────────────────────────────

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('assistant');
  const { currentUser } = useAppContext();

  const {
    conversationId,
    messages,
    isStreaming,
    pendingAssistantText,
    thinkingLabel,
    initError,
    pendingModal,
    clearPendingModal,
    sendMessage,
    confirmTool,
    cancelTool,
  } = useAssistantChat(isOpen);

  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = useCallback(
    (text?: string) => {
      const msg = (text ?? inputText).trim();
      if (!msg || isStreaming || !conversationId) return;
      setInputText('');
      void sendMessage(msg);
    },
    [inputText, isStreaming, conversationId, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <>
      <AssistantModalHandler
        pendingModal={pendingModal}
        onHandled={clearPendingModal}
      />

      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('panel.title', 'ProCrèche Assistant')}
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col bg-white shadow-2xl md:w-[420px]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 bg-swiss-teal px-4 py-3">
          <SparklesIcon className="h-5 w-5 flex-shrink-0 text-white" aria-hidden="true" />
          <span className="flex-1 font-semibold text-white">
            {t('panel.title', 'ProCrèche Assistant')}
          </span>
          <button
            onClick={onClose}
            aria-label={t('panel.close', 'Close assistant')}
            className="rounded p-1 text-white/80 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {initError && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
              {initError}
            </div>
          )}

          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
            <ChatMessageList
              messages={messages}
              isStreaming={isStreaming}
              pendingAssistantText={pendingAssistantText}
              thinkingLabel={thinkingLabel}
              onSend={(text) => handleSend(text)}
              onConfirmTool={confirmTool}
              onCancelTool={cancelTool}
              emptyState={
                <WelcomeScreen onSuggestion={(text) => handleSend(text)} role={currentUser?.role} />
              }
            />
          </div>

          {/* Composer */}
          <div className="border-t border-gray-100 bg-white px-3 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={t('composer.placeholder', 'Ask me anything…')}
                disabled={isStreaming || !!initError || !conversationId}
                aria-label={t('composer.placeholder', 'Ask me anything…')}
                className="flex-1 resize-none bg-transparent text-sm text-swiss-charcoal placeholder-gray-400 focus:outline-none disabled:opacity-50"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isStreaming || !!initError || !conversationId}
                aria-label={t('composer.send', 'Send')}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-swiss-teal text-white transition-colors hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-swiss-teal focus:ring-offset-1 disabled:opacity-40"
              >
                <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-xs text-gray-400">
              {t('composer.hint', 'Press Enter to send · Shift+Enter for new line')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
