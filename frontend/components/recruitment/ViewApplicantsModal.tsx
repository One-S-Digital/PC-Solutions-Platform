import React from 'react';
import { JobListing, Application, UserRole } from '../../types';
import { STANDARD_INPUT_FIELD } from '../../constants';
import Button from '../ui/Button';
import { XMarkIcon, UserCircleIcon, EyeIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { useMessaging } from '../../contexts/MessagingContext';

interface ViewApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobListing;
}

const ViewApplicantsModal: React.FC<ViewApplicantsModalProps> = ({ isOpen, onClose, job }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { applications } = useAppContext();
  const navigate = useNavigate();
  const { startOrGetConversation } = useMessaging();

  const applicantsForJob = applications.filter(app => app.jobId === job.id);

  const handleViewProfile = (educatorId: string) => {
    navigate(`/candidate/${educatorId}`);
    onClose();
  };

  const handleSendMessage = (applicant: Application) => {
    const conversationId = startOrGetConversation(applicant.educatorId, applicant.educatorName, UserRole.EDUCATOR);
    navigate(`/messages/${conversationId}`);
    onClose();
  };

  if (!isOpen) return null;

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
            {applicantsForJob.length === 0 ? (
                <p className="text-gray-500 text-center py-8">{t('recruitmentPage.viewApplicantsModal.noApplicants')}</p>
            ) : (
                <ul className="space-y-3">
                    {applicantsForJob.map(applicant => (
                        <li key={applicant.id} className="p-3 flex items-center justify-between bg-gray-50 rounded-md hover:bg-gray-100">
                            <div className="flex items-center">
                                <UserCircleIcon className="w-8 h-8 text-gray-400 mr-3"/>
                                <div>
                                    <p className="font-medium text-swiss-charcoal">{applicant.educatorName}</p>
                                    <p className="text-xs text-gray-500">{t('recruitmentPage.viewApplicantsModal.appliedOn', { date: new Date(applicant.applicationDate).toLocaleDateString() })}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="secondary" size="xs" leftIcon={ChatBubbleLeftEllipsisIcon} onClick={() => handleSendMessage(applicant)}>
                                    {t('buttons.sendMessage')}
                                </Button>
                                <Button variant="outline" size="xs" leftIcon={EyeIcon} onClick={() => handleViewProfile(applicant.educatorId)}>
                                    {t('candidateCard.viewProfile')}
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <Button type="button" variant="light" onClick={onClose}>{t('buttons.close')}</Button>
        </div>
      </div>
    </div>
  );
};

export default ViewApplicantsModal;