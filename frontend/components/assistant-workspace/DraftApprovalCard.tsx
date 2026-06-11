import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ToolCallEvent, ToolResultEvent } from '../../services/assistantService';

type DraftState = 'PENDING' | 'APPROVED' | 'SENT';

interface DraftApprovalCardProps {
  toolCall: ToolCallEvent;
  toolResult?: ToolResultEvent;
  onApprove: (toolCall: ToolCallEvent) => void;
  onDiscard: (toolCallId: string) => void;
  onEdit: (editedText: string, toolCallId: string) => void;
}

/**
 * Inline draft-approval card rendered in the workspace when the assistant
 * proposes a draft_lead_reply (L3 awaiting approval). Replaces the generic
 * ToolCallCard for this specific tool so the user sees the draft text and
 * has a clear Send / Edit / Discard flow without modal context-switching.
 */
export const DraftApprovalCard: React.FC<DraftApprovalCardProps> = ({
  toolCall,
  toolResult,
  onApprove,
  onDiscard,
  onEdit,
}) => {
  const { t } = useTranslation('assistant');

  const draftText =
    (toolCall.args?.draftText as string) ||
    (toolCall.args?.message as string) ||
    (toolCall.args?.context as string) ||
    '';

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(draftText);

  // Derive visual state from external props so parent-managed message state drives the card.
  let displayState: DraftState = 'PENDING';
  if (toolResult) {
    displayState = toolResult.error ? 'PENDING' : 'SENT';
  }

  if (displayState === 'SENT') {
    return (
      <div className="my-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        <CheckIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="font-medium">
          {t('workspace.draft.sent', 'Reply sent successfully')}
        </span>
      </div>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-swiss-teal/30 bg-white shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-swiss-teal/5 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-swiss-teal">
          {t('workspace.draft.heading', 'Draft reply — review before sending')}
        </span>
        <span className="rounded-full bg-swiss-teal/10 px-2 py-0.5 text-xs text-swiss-teal">
          {t('workspace.draft.levelBadge', 'awaiting approval')}
        </span>
      </div>

      {/* Draft text */}
      <div className="p-4">
        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-lg border border-gray-200 p-3 text-sm text-swiss-charcoal focus:border-swiss-teal focus:outline-none focus:ring-1 focus:ring-swiss-teal/30"
            autoFocus
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-swiss-charcoal">
            {draftText || <span className="italic text-gray-400">{t('workspace.draft.noContent', 'No draft content')}</span>}
          </p>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                onEdit(editedText, toolCall.toolCallId);
                setIsEditing(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-swiss-teal px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-swiss-teal/90 focus:outline-none focus:ring-2 focus:ring-swiss-teal/40"
            >
              <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {t('workspace.draft.sendEdited', 'Send edited')}
            </button>
            <button
              onClick={() => {
                setEditedText(draftText);
                setIsEditing(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none"
            >
              {t('workspace.draft.cancelEdit', 'Cancel')}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onApprove(toolCall)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-swiss-mint px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-swiss-mint/90 focus:outline-none focus:ring-2 focus:ring-swiss-mint/40"
            >
              <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {t('workspace.draft.approve', 'Send')}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {t('workspace.draft.edit', 'Edit')}
            </button>
            <button
              onClick={() => onDiscard(toolCall.toolCallId)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 focus:outline-none"
            >
              <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {t('workspace.draft.discard', 'Discard')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
