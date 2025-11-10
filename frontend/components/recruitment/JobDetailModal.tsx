
import React, { useState } from 'react';
import { JobListing } from '../../types';
import Button from '../ui/Button';
import { XMarkIcon, BriefcaseIcon, MapPinIcon, CalendarDaysIcon, ListBulletIcon, CheckBadgeIcon, SparklesIcon, BanknotesIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { MOCK_ORGANIZATIONS } from '../../constants';
import Card from '../ui/Card';
import JobApplicationModal from './JobApplicationModal';

interface JobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobListing;
  onApply: (data: {
    job: JobListing;
    cvAssetId: string;
    cvUrl: string;
    coverLetter: string;
  }) => void;
}

const DetailSection: React.FC<{ titleKey: string; icon: React.ElementType; children: React.ReactNode }> = ({ titleKey, icon: Icon, children }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-swiss-charcoal mb-3 flex items-center">
        <Icon className="w-6 h-6 mr-3 text-swiss-teal" />
        {t(titleKey)}
      </h3>
      {children}
    </div>
  );
};

const JobDetailModal: React.FC<JobDetailModalProps> = ({ isOpen, onClose, job, onApply }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const foundation = MOCK_ORGANIZATIONS.find(org => org.id === job.foundationId);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleApplyClick = () => {
    setIsApplicationModalOpen(true);
  };

  const handleApplicationSubmit = (data: any) => {
    onApply(data);
    setIsApplicationModalOpen(false);
    onClose(); // Close job detail modal after successful application
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl bg-page-bg shadow-xl rounded-lg overflow-hidden transform transition-all flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-start px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center">
            <img src={foundation?.logoUrl || `https://ui-avatars.com/api/?name=${job.foundationName.replace(' ', '+')}`} alt={`${job.foundationName} logo`} className="w-16 h-16 rounded-lg mr-4 border bg-white" />
            <div>
              <h2 className="text-2xl font-bold text-swiss-charcoal">{job.title}</h2>
              <p className="text-md text-gray-600">{job.foundationName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600" aria-label={t('buttons.close')}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Main Content */}
        <div className="flex-grow p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Main Column */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <DetailSection titleKey="recruitmentPage.jobDetailModal.jobDescription" icon={ListBulletIcon}>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{job.description}</p>
                </DetailSection>

                {job.responsibilities && job.responsibilities.length > 0 && (
                  <DetailSection titleKey="recruitmentPage.jobDetailModal.responsibilities" icon={CheckBadgeIcon}>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {job.responsibilities.map((item, index) => <li key={index} className="flex items-start"><CheckIcon className="w-4 h-4 mr-2 mt-0.5 text-swiss-mint flex-shrink-0" />{item}</li>)}
                    </ul>
                  </DetailSection>
                )}

                {job.requirements && job.requirements.length > 0 && (
                  <DetailSection titleKey="recruitmentPage.jobDetailModal.requirements" icon={ListBulletIcon}>
                      <ul className="space-y-2 text-sm text-gray-700">
                          {job.requirements.map((item, index) => <li key={index} className="flex items-start"><CheckIcon className="w-4 h-4 mr-2 mt-0.5 text-swiss-mint flex-shrink-0" />{item}</li>)}
                      </ul>
                  </DetailSection>
                )}

                {job.qualifications && job.qualifications.length > 0 && (
                  <DetailSection titleKey="recruitmentPage.jobDetailModal.qualifications" icon={CheckBadgeIcon}>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {job.qualifications.map((item, index) => <li key={index} className="flex items-start"><CheckIcon className="w-4 h-4 mr-2 mt-0.5 text-swiss-mint flex-shrink-0" />{item}</li>)}
                    </ul>
                  </DetailSection>
                )}

                {job.benefits && job.benefits.length > 0 && (
                  <DetailSection titleKey="recruitmentPage.jobDetailModal.benefits" icon={SparklesIcon}>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {job.benefits.map((item, index) => <li key={index} className="flex items-start"><CheckIcon className="w-4 h-4 mr-2 mt-0.5 text-swiss-mint flex-shrink-0" />{item}</li>)}
                    </ul>
                  </DetailSection>
                )}
              </Card>
            </div>
            {/* Right Sidebar Column */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 sticky top-0">
                <h3 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('recruitmentPage.jobDetailModal.overviewTitle')}</h3>
                <div className="space-y-4 text-sm">
                    <div className="flex items-start">
                        <MapPinIcon className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-gray-500">{t('recruitmentPage.jobDetailModal.location')}</p>
                            <p className="text-gray-800 font-semibold">{job.location}</p>
                        </div>
                    </div>
                     <div className="flex items-start">
                        <BriefcaseIcon className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-gray-500">{t('recruitmentPage.jobDetailModal.contractType')}</p>
                            <p className="text-gray-800 font-semibold">{job.contractType}</p>
                        </div>
                    </div>
                     <div className="flex items-start">
                        <CalendarDaysIcon className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-gray-500">{t('recruitmentPage.jobDetailModal.startDate')}</p>
                            <p className="text-gray-800 font-semibold">{new Date(job.startDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                     {job.salaryRange && (
                        <div className="flex items-start">
                            <BanknotesIcon className="w-5 h-5 mr-3 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-500">{t('recruitmentPage.jobDetailModal.salary')}</p>
                                <p className="text-gray-800 font-semibold">{job.salaryRange}</p>
                            </div>
                        </div>
                    )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t flex justify-end space-x-3 flex-shrink-0">
          <Button type="button" variant="light" size="lg" onClick={onClose}>{t('buttons.cancel')}</Button>
          <Button type="button" variant="primary" size="lg" onClick={handleApplyClick}>{t('recruitmentPage.jobDetailModal.applyNow')}</Button>
        </div>
      </div>

      {/* Application Modal */}
      <JobApplicationModal
        isOpen={isApplicationModalOpen}
        onClose={() => setIsApplicationModalOpen(false)}
        job={job}
        onSubmit={handleApplicationSubmit}
      />
    </div>
  );
};

export default JobDetailModal;