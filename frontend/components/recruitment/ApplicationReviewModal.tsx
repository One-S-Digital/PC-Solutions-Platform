import React, { useState } from 'react';
import { JobListing, Application, UserRole, ApplicationStatus } from '../../types';
import { XMarkIcon, UserCircleIcon, ChatBubbleLeftEllipsisIcon, EyeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMessaging } from '../../contexts/MessagingContext';
import { useRecruitmentApi } from '../../hooks/useRecruitmentApi';
import Button from '../ui/Button';

const PIPELINE_STAGES: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: ApplicationStatus.PENDING, label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { value: ApplicationStatus.REVIEWED, label: 'Reviewed', color: 'bg-blue-100 text-blue-700' },
  { value: ApplicationStatus.SHORTLISTED, label: 'Shortlisted', color: 'bg-yellow-100 text-yellow-700' },
  { value: ApplicationStatus.INTERVIEW, label: 'Interview', color: 'bg-purple-100 text-purple-700' },
  { value: ApplicationStatus.OFFER, label: 'Offer', color: 'bg-orange-100 text-orange-700' },
  { value: ApplicationStatus.HIRED, label: 'Hired', color: 'bg-green-100 text-green-700' },
  { value: ApplicationStatus.ACCEPTED, label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
  { value: ApplicationStatus.REJECTED, label: 'Rejected', color: 'bg-red-100 text-red-700' },
];

function stageMeta(status: ApplicationStatus) {
  return PIPELINE_STAGES.find((s) => s.value === status) ?? PIPELINE_STAGES[0];
}

interface ApplicationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobListing;
  applications: Application[];
  isLoading: boolean;
  error: string | null;
  onApplicationsChange?: (updated: Application[]) => void;
}

const ApplicationReviewModal: React.FC<ApplicationReviewModalProps> = ({
  isOpen,
  onClose,
  job,
  applications,
  isLoading,
  error,
  onApplicationsChange,
}) => {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'recruitment']);
  const navigate = useNavigate();
  const { startOrGetConversation } = useMessaging();
  const { updateApplication } = useRecruitmentApi();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localApps, setLocalApps] = useState<Application[]>(applications);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Sync local copy when parent refreshes
  React.useEffect(() => {
    setLocalApps(applications);
    if (applications.length > 0 && !selectedId) {
      setSelectedId(applications[0].id);
    }
  }, [applications]);

  if (!isOpen) return null;

  const selected = localApps.find((a) => a.id === selectedId) ?? null;

  const handleStatusChange = async (app: Application, newStatus: ApplicationStatus) => {
    setUpdatingId(app.id);
    try {
      const updated = await updateApplication(app.id, { status: newStatus });
      const next = localApps.map((a) => (a.id === app.id ? { ...a, status: updated.status } : a));
      setLocalApps(next);
      onApplicationsChange?.(next);
    } catch (err) {
      console.error('Failed to update application status', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewProfile = (candidateId: string) => {
    navigate(`/candidate/${candidateId}`);
    onClose();
  };

  const handleSendMessage = async (app: Application) => {
    try {
      const conversationId = await startOrGetConversation(
        app.candidateId,
        app.candidateName ?? '',
        UserRole.EDUCATOR,
      );
      navigate(`/messages/${conversationId}`);
      onClose();
    } catch {
      alert(t('common:errors.messagingFailed', 'Failed to start conversation. Please try again.'));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-semibold text-swiss-charcoal truncate pr-4">
            {t('recruitmentPage.viewApplicantsModal.title', { jobTitle: job.title })}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 shrink-0"
            aria-label={t('common:buttons.close')}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body — two panes */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: applicant list */}
          <div className="w-56 shrink-0 border-r border-gray-200 overflow-y-auto bg-gray-50">
            {isLoading && (
              <p className="text-sm text-gray-500 text-center py-8">
                {t('recruitmentPage.viewApplicantsModal.loading', 'Loading…')}
              </p>
            )}
            {error && <p className="text-sm text-red-600 px-4 py-4">{error}</p>}
            {!isLoading && !error && localApps.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                {t('recruitmentPage.viewApplicantsModal.noApplicants', 'No applicants yet.')}
              </p>
            )}
            {localApps.map((app) => {
              const meta = stageMeta(app.status as ApplicationStatus);
              const isActive = app.id === selectedId;
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedId(app.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${isActive ? 'bg-white border-l-2 border-l-swiss-teal' : 'hover:bg-white'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <UserCircleIcon className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {app.candidateName ?? t('recruitmentPage.viewApplicantsModal.unknownCandidate', 'Candidate')}
                    </span>
                  </div>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: detail pane */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selected && !isLoading && (
              <p className="text-gray-400 text-sm text-center mt-12">
                {localApps.length > 0
                  ? t('recruitment:applicationReview.selectApplicant', 'Select an applicant to review.')
                  : t('recruitmentPage.viewApplicantsModal.noApplicants', 'No applicants yet.')}
              </p>
            )}
            {selected && (
              <div className="space-y-5">
                {/* Candidate header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-swiss-charcoal">
                      {selected.candidateName ?? t('recruitmentPage.viewApplicantsModal.unknownCandidate', 'Candidate')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('recruitmentPage.viewApplicantsModal.appliedOn', {
                        date: new Date(selected.createdAt).toLocaleDateString(i18n.language),
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="xs"
                      leftIcon={ChatBubbleLeftEllipsisIcon}
                      onClick={() => handleSendMessage(selected)}
                    >
                      {t('common:buttons.sendMessage')}
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      leftIcon={EyeIcon}
                      onClick={() => handleViewProfile(selected.candidateId)}
                    >
                      {t('candidateCard.viewProfile', 'View Profile')}
                    </Button>
                  </div>
                </div>

                {/* Pipeline stage */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {t('recruitment:applicationReview.stage', 'Pipeline Stage')}
                  </label>
                  <select
                    value={selected.status}
                    disabled={updatingId === selected.id}
                    onChange={(e) => handleStatusChange(selected, e.target.value as ApplicationStatus)}
                    className="w-full sm:w-56 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-swiss-teal focus:border-transparent disabled:opacity-50"
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {updatingId === selected.id && (
                    <p className="text-xs text-gray-400 mt-1">
                      {t('common:saving', 'Saving…')}
                    </p>
                  )}
                </div>

                {/* CV link */}
                {(selected as any).cvUrl && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {t('recruitment:applicationReview.cv', 'CV / Resume')}
                    </label>
                    <a
                      href={(selected as any).cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-swiss-teal hover:underline"
                    >
                      <DocumentTextIcon className="w-4 h-4" />
                      {t('recruitment:applicationReview.downloadCv', 'Download CV')}
                    </a>
                  </div>
                )}

                {/* Cover letter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {t('recruitment:applicationReview.coverLetter', 'Cover Letter')}
                  </label>
                  {selected.coverLetter ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-md p-4 leading-relaxed">
                      {selected.coverLetter}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      {t('recruitment:applicationReview.noCoverLetter', 'No cover letter provided.')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t flex justify-end shrink-0">
          <Button type="button" variant="light" onClick={onClose}>
            {t('common:buttons.close')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationReviewModal;
