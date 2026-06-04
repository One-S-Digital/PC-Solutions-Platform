import React from 'react';
import { useTranslation } from 'react-i18next';

// ─── Per-action preview field definitions ────────────────────────────────────
//
// L3 tools mutate platform state, so before executing we show the user a concrete
// preview of what will happen. Each tool maps its raw args to a labelled field
// list. Fields with no value are skipped so the card stays clean.

type FieldDef = { key: string; labelKey: string; fallback: string; long?: boolean };

const PREVIEWS: Record<string, { titleKey: string; titleFallback: string; fields: FieldDef[] }> = {
  post_job: {
    titleKey: 'preview.postJob',
    titleFallback: 'Publish job listing',
    fields: [
      { key: 'title', labelKey: 'preview.field.title', fallback: 'Title' },
      { key: 'role', labelKey: 'preview.field.role', fallback: 'Role' },
      { key: 'percentage', labelKey: 'preview.field.percentage', fallback: 'Percentage' },
      { key: 'location', labelKey: 'preview.field.location', fallback: 'Location' },
      { key: 'contractType', labelKey: 'preview.field.contract', fallback: 'Contract' },
      { key: 'startDate', labelKey: 'preview.field.startDate', fallback: 'Start date' },
      { key: 'description', labelKey: 'preview.field.description', fallback: 'Description', long: true },
    ],
  },
  send_message: {
    titleKey: 'preview.sendMessage',
    titleFallback: 'Send message',
    fields: [
      { key: 'recipientUserId', labelKey: 'preview.field.recipient', fallback: 'Recipient' },
      { key: 'content', labelKey: 'preview.field.message', fallback: 'Message', long: true },
    ],
  },
  contact_admin: {
    titleKey: 'preview.contactAdmin',
    titleFallback: 'File support ticket',
    fields: [
      { key: 'subject', labelKey: 'preview.field.subject', fallback: 'Subject' },
      { key: 'message', labelKey: 'preview.field.message', fallback: 'Message', long: true },
      { key: 'priority', labelKey: 'preview.field.priority', fallback: 'Priority' },
    ],
  },
  place_order: {
    titleKey: 'preview.placeOrder',
    titleFallback: 'Place order',
    fields: [
      { key: 'productId', labelKey: 'preview.field.product', fallback: 'Product' },
      { key: 'quantity', labelKey: 'preview.field.quantity', fallback: 'Quantity' },
      { key: 'notes', labelKey: 'preview.field.notes', fallback: 'Notes', long: true },
    ],
  },
  request_service: {
    titleKey: 'preview.requestService',
    titleFallback: 'Request service',
    fields: [
      { key: 'serviceId', labelKey: 'preview.field.service', fallback: 'Service' },
      { key: 'scheduledAt', labelKey: 'preview.field.scheduledAt', fallback: 'Scheduled' },
      { key: 'description', labelKey: 'preview.field.description', fallback: 'Description', long: true },
    ],
  },
  send_supplier_inquiry: {
    titleKey: 'preview.supplierInquiry',
    titleFallback: 'Send supplier inquiry',
    fields: [
      { key: 'subject', labelKey: 'preview.field.subject', fallback: 'Subject' },
      { key: 'productInterest', labelKey: 'preview.field.product', fallback: 'Product' },
      { key: 'quantity', labelKey: 'preview.field.quantity', fallback: 'Quantity' },
      { key: 'message', labelKey: 'preview.field.message', fallback: 'Message', long: true },
    ],
  },
  apply_to_job: {
    titleKey: 'preview.applyToJob',
    titleFallback: 'Apply to job',
    fields: [
      { key: 'jobListingId', labelKey: 'preview.field.job', fallback: 'Job' },
      { key: 'coverLetter', labelKey: 'preview.field.coverLetter', fallback: 'Cover letter', long: true },
    ],
  },
  shortlist_candidate: {
    titleKey: 'preview.shortlist',
    titleFallback: 'Shortlist candidate',
    fields: [{ key: 'candidateId', labelKey: 'preview.field.candidate', fallback: 'Candidate' }],
  },
  update_application_status: {
    titleKey: 'preview.updateStatus',
    titleFallback: 'Update application status',
    fields: [
      { key: 'applicationId', labelKey: 'preview.field.application', fallback: 'Application' },
      { key: 'status', labelKey: 'preview.field.status', fallback: 'New status' },
    ],
  },
  respond_to_lead: {
    titleKey: 'preview.respondToLead',
    titleFallback: 'Respond to parent lead',
    fields: [
      { key: 'status', labelKey: 'preview.field.status', fallback: 'Response' },
      { key: 'message', labelKey: 'preview.field.message', fallback: 'Message', long: true },
    ],
  },
  create_replacement_request: {
    titleKey: 'preview.replacement',
    titleFallback: 'Create replacement request',
    fields: [
      { key: 'role', labelKey: 'preview.field.role', fallback: 'Role' },
      { key: 'startDate', labelKey: 'preview.field.startDate', fallback: 'Start date' },
      { key: 'endDate', labelKey: 'preview.field.endDate', fallback: 'End date' },
      { key: 'urgency', labelKey: 'preview.field.urgency', fallback: 'Urgency' },
      { key: 'description', labelKey: 'preview.field.description', fallback: 'Description', long: true },
    ],
  },
  submit_enquiry: {
    titleKey: 'preview.submitEnquiry',
    titleFallback: 'Submit childcare enquiry',
    fields: [
      { key: 'childName', labelKey: 'preview.field.childName', fallback: 'Child' },
      { key: 'childAge', labelKey: 'preview.field.childAge', fallback: 'Age' },
      { key: 'preferredLocation', labelKey: 'preview.field.location', fallback: 'Location' },
      { key: 'message', labelKey: 'preview.field.message', fallback: 'Message', long: true },
    ],
  },
};

/** Whether a rich preview is defined for this L3 tool. */
export function hasActionPreview(toolName: string): boolean {
  return toolName in PREVIEWS;
}

function formatValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

interface ActionPreviewCardProps {
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Rich, per-action preview of an L3 tool's effect, shown above the Confirm /
 * Cancel buttons so the user sees exactly what will happen before approving.
 */
export const ActionPreviewCard: React.FC<ActionPreviewCardProps> = ({ toolName, args }) => {
  const { t } = useTranslation('assistant');
  const spec = PREVIEWS[toolName];
  if (!spec) return null;

  const rows = spec.fields
    .map((f) => ({ ...f, value: formatValue(args?.[f.key]) }))
    .filter((f) => f.value.trim().length > 0);

  return (
    <div className="mb-2 rounded-md bg-gray-50 p-2">
      <p className="mb-1 text-xs font-semibold text-swiss-charcoal">
        {t(spec.titleKey, spec.titleFallback)}
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">{t('preview.noDetails', 'Confirm to proceed.')}</p>
      ) : (
        <dl className="space-y-0.5">
          {rows.map((f) => (
            <div key={f.key} className={f.long ? '' : 'flex gap-1'}>
              <dt className="flex-shrink-0 text-xs font-medium text-gray-500">
                {t(f.labelKey, f.fallback)}:
              </dt>
              <dd className={`text-xs text-gray-700 ${f.long ? 'mt-0.5 line-clamp-3 whitespace-pre-wrap' : 'truncate'}`}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
