import React, { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { AssistantModalHandler, ChatMessageList, useAssistantChat } from '../../components/assistant';
import {
  Composer,
  DraftApprovalCard,
  MorningBriefingCard,
  QuickActionChips,
  TrustFooter,
  useBriefing,
} from '../../components/assistant-workspace';

const WorkspaceEmptyState: React.FC = () => {
  const { t } = useTranslation('assistant');

  return (
    <div className="my-auto flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
        <SparklesIcon className="h-7 w-7 text-emerald-600" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-swiss-charcoal">
        {t('workspace.emptyTitle', 'How can I help you today?')}
      </h2>
      <p className="max-w-md text-sm text-gray-500">
        {t(
          'workspace.emptySubtitle',
          'Ask about parent leads, staffing, orders or cantonal directives — or start with a quick action below.'
        )}
      </p>
    </div>
  );
};

/**
 * Full-page assistant workspace — the Foundation landing view when the
 * `v2_assistant_dashboard` flag is on. Shares the chat engine with the
 * floating widget via useAssistantChat/ChatMessageList; the widget itself
 * is suppressed on this route (see AssistantContainer).
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

  const { briefing, isLoading: briefingLoading } = useBriefing();

  // Reflect current conversation in URL so a reload resumes it
  useEffect(() => {
    if (conversationId && messages.length > 0 && requestedConversationId !== conversationId) {
      setSearchParams({ c: conversationId }, { replace: true });
    }
  }, [conversationId, messages.length, requestedConversationId, setSearchParams]);

  // Separate draft_lead_reply messages from the normal thread so we can
  // render DraftApprovalCard in place of the generic ToolCallCard.
  const DRAFT_TOOL = 'draft_lead_reply';
  const threadMessages = messages.filter((m) => m.toolCall?.toolName !== DRAFT_TOOL);
  const pendingDraft = [...messages]
    .reverse()
    .find((m) => m.toolCall?.toolName === DRAFT_TOOL && !m.cancelled);

  const handleDraftEdit = useCallback(
    (editedText: string, toolCallId: string) => {
      // Confirm the existing tool call with the edited draft text as an override,
      // preserving the stored leadId/foundationId context in the backend.
      const draft = messages.find((m) => m.id === toolCallId);
      if (draft?.toolCall) {
        void confirmTool(draft.toolCall, { draftText: editedText });
      }
    },
    [messages, confirmTool],
  );

  const composerDisabled = isStreaming || isLoadingHistory || !!initError || !conversationId;
  const showBriefing =
    messages.length === 0 && !isLoadingHistory && (briefing?.items.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col">
      <AssistantModalHandler pendingModal={pendingModal} onHandled={clearPendingModal} />

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
              <ArrowPathIcon className="h-6 w-6 animate-spin text-emerald-600" aria-hidden="true" />
            </div>
          )}

          {/* Morning briefing card — hidden once the user starts chatting */}
          {showBriefing && (
            <MorningBriefingCard
              briefing={briefing}
              isLoading={briefingLoading}
              onAction={sendMessage}
            />
          )}

          <ChatMessageList
            messages={threadMessages}
            isStreaming={isStreaming}
            pendingAssistantText={pendingAssistantText}
            thinkingLabel={thinkingLabel}
            onSend={sendMessage}
            onConfirmTool={confirmTool}
            onCancelTool={cancelTool}
            emptyState={isLoadingHistory ? undefined : <WorkspaceEmptyState />}
            userBubbleClassName="bg-emerald-700 text-white"
          />

          {/* Draft approval card for pending draft_lead_reply tool calls */}
          {pendingDraft?.toolCall && (
            <DraftApprovalCard
              toolCall={pendingDraft.toolCall}
              toolResult={pendingDraft.toolResult}
              onApprove={confirmTool}
              onDiscard={cancelTool}
              onEdit={handleDraftEdit}
            />
          )}
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
