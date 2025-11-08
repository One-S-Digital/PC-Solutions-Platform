import React from 'react';
import { JobListing, Application, UserRole } from '../../types';
import Button from '../ui/Button';
import { XMarkIcon, UserCircleIcon, EyeIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMessaging } from '../../contexts/MessagingContext';

interface ViewApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobListing;
  applications: Application[];
  isLoading: boolean;
  error: string | null;
}

const ViewApplicantsModal: React.FC<ViewApplicantsModalProps> = ({
  isOpen,
  onClose,
  job,
  applications,
  isLoading,
  error,
}) => {
  const { t } = useTranslation(['dashboard', 'common', 'recruitment']);
  const navigate = useNavigate();
  const { startOrGetConversation } = useMessaging();

  if (!isOpen) return null;

  const handleViewProfile = (candidateId: string) => {
    navigate(`/candidate/${candidateId}`);
    onClose();
  };

  const handleSendMessage = (application: Application) => {
    const conversationId = startOrGetConversation(application.candidateId, application.candidateName ?? '', UserRole.EDUCATOR);
    navigate(`/messages/${conversationId}`);
    onClose();
  };

  const bodyContent = () => {
    if (isLoading) {
      return <p className="text-gray-500 text-center py-8">{t('recruitmentPage.viewApplicantsModal.loading', 'Loading applications...')}</p>;
    }

    if (error) {
      return <p className="text-red-600 text-center py-4">{error}</p>;
    }

    if (!applications.length) {
      return <p className="text-gray-500 text-center py-8">{t('recruitmentPage.viewApplicantsModal.noApplicants')}</p>;
    }

    return (
      <ul className="space-y-3">
        {applications.map((application) => (
          <li key={application.id} className="p-3 flex items-center justify-between bg-gray-50 rounded-md hover:bg-gray-100">
            <div className="flex items-center">
              <UserCircleIcon className="w-8 h-8 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-swiss-charcoal">{application.candidateName ?? t('recruitmentPage.viewApplicantsModal.unknownCandidate', 'Candidate')}</p>
                <p className="text-xs text-gray-500">
                  {t('recruitmentPage.viewApplicantsModal.appliedOn', {
                    date: new Date(application.createdAt).toLocaleDateString(),
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="secondary" size="xs" leftIcon={ChatBubbleLeftEllipsisIcon} onClick={() => handleSendMessage(application)}>
                {t('buttons.sendMessage')}
              </Button>
              <Button variant="outline" size="xs" leftIcon={EyeIcon} onClick={() => handleViewProfile(application.candidateId)}>
                {t('candidateCard.viewProfile')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-swiss-charcoal">
            {t('recruitmentPage.viewApplicantsModal.title', { jobTitle: job.title })}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600" aria-label={t('buttons.close')}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {bodyContent()}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <Button type="button" variant="light" onClick={onClose}>
            {t('buttons.close')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ViewApplicantsModal;
