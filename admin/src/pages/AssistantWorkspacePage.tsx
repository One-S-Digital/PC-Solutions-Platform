import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { AssistantModalHandler } from '../components/assistant/AssistantModalHandler';
import { ChatMessageList } from '../components/assistant/ChatMessageList';
import { useAssistantChat } from '../components/assistant/useAssistantChat';
import {
  AssistantHeader,
  AdminBriefingCard,
  Composer,
  QuickActionChips,
  TrustFooter,
  useAdminBriefing,
} from '../components/assistant-workspace';

const WorkspaceEmptyState: React.FC = () => {
  const { t } = useTranslation('assistant');

  return (
    <div className="my-auto flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-swiss-teal/10">
        <SparklesIcon className="h-7 w-7 text-swiss-teal" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-swiss-charcoal">
        {t('workspace.emptyTitle', 'How can I help you today?')}
      </h2>
      <p className="max-w-md text-sm text-gray-500">
        {t(
          'adminWorkspace.emptySubtitle',
          'Ask about educator approvals, platform stats, users or support tickets — or start with a quick action below.'
        )}
      </p>
    </div>
  );
};

/**
 * Full-page admin assistant workspace — the admin landing view when the
 * `v2_admin_assistant` flag is on. Shares the chat engine with the floating
 * widget via useAssistantChat/ChatMessageList; the widget itself is
 * suppressed on this route (see AdminLayout).
 */
const AssistantWorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedConversationId = searchParams.get('c');

  const {
    conversationId,
    messages,
    isStreaming,
    isLoadingHistory,
    pendingAssistantText,
    thinkingLabel,
    initError,
    pendingModal,
    clearPendingModal,
    sendMessage,
    confirmTool,
    cancelTool,
  } = useAssistantChat(true, requestedConversationId);

  const { briefing, isLoading: briefingLoading } = useAdminBriefing();

  // Reflect current conversation in URL so a reload resumes it
  useEffect(() => {
    if (conversationId && messages.length > 0 && requestedConversationId !== conversationId) {
      setSearchParams({ c: conversationId }, { replace: true });
    }
  }, [conversationId, messages.length, requestedConversationId, setSearchParams]);

  const composerDisabled = isStreaming || isLoadingHistory || !!initError || !conversationId;
  const showBriefing =
    messages.length === 0 && !isLoadingHistory && (briefing?.items.length ?? 0) > 0;

  return (
    <div className="flex h-full min-h-[calc(100dvh-8rem)] flex-col">
      <AssistantModalHandler pendingModal={pendingModal} onHandled={clearPendingModal} />

      <AssistantHeader />

      {initError && (
        <div className="mb-3 rounded-card border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600">
          {initError}
        </div>
      )}

      {/* Thread */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end py-2">
          {isLoadingHistory && (
            <div className="flex flex-1 items-center justify-center py-16">
              <ArrowPathIcon className="h-6 w-6 animate-spin text-swiss-teal" aria-hidden="true" />
            </div>
          )}

          {/* Platform briefing card — hidden once the admin starts chatting */}
          {showBriefing && (
            <AdminBriefingCard
              briefing={briefing}
              isLoading={briefingLoading}
              onAction={sendMessage}
            />
          )}

          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            pendingAssistantText={pendingAssistantText}
            thinkingLabel={thinkingLabel}
            onSend={sendMessage}
            onConfirmTool={confirmTool}
            onCancelTool={cancelTool}
            emptyState={isLoadingHistory ? undefined : <WorkspaceEmptyState />}
            userBubbleClassName="bg-swiss-deep-teal text-white"
          />
        </div>
      </div>

      {/* Quick actions + composer + trust line */}
      <div className="mx-auto w-full max-w-3xl pt-3">
        <QuickActionChips onAction={sendMessage} disabled={composerDisabled} />
        <Composer onSend={sendMessage} disabled={composerDisabled} />
        <TrustFooter />
      </div>
    </div>
  );
};

export default AssistantWorkspacePage;
