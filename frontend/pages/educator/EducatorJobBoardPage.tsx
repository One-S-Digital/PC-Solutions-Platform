
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { JobListing } from '../../types';
import { STANDARD_INPUT_FIELD, ICON_INPUT_FIELD, SWISS_CANTONS } from '../../constants';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BriefcaseIcon, MapPinIcon, CalendarDaysIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../contexts/NotificationContext';
import JobDetailModal from '../../components/recruitment/JobDetailModal';
import { useRecruitmentApi } from '../../hooks/useRecruitmentApi';

interface EducatorJobCardProps {
  job: JobListing;
  onViewDetails: (job: JobListing) => void;
}

const EducatorJobCard: React.FC<EducatorJobCardProps> = ({ job, onViewDetails }) => {
  const { t } = useTranslation(['dashboard', 'common', 'recruitment']);

  const contractTypeMeta = useMemo(() => {
    switch (job.contractType) {
      case 'FULL_TIME':
        return { className: 'bg-green-100 text-green-700', label: t('recruitment:contractTypes.fullTime', 'Full-time') };
      case 'PART_TIME':
        return { className: 'bg-teal-100 text-teal-700', label: t('recruitment:contractTypes.partTime', 'Part-time') };
      case 'CDI':
        return { className: 'bg-blue-100 text-blue-700', label: t('recruitment:contractTypes.cdi', 'CDI') };
      case 'CDD':
        return { className: 'bg-yellow-100 text-yellow-700', label: t('recruitment:contractTypes.cdd', 'CDD') };
      case 'INTERNSHIP':
      default:
        return { className: 'bg-purple-100 text-purple-700', label: t('recruitment:contractTypes.internship', 'Internship') };
    }
  }, [job.contractType, t]);

  const postedDate = job.publishedAt ?? job.createdAt;

  return (
    <Card className="flex flex-col group" hoverEffect>
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-swiss-teal group-hover:text-swiss-mint transition-colors">{job.title}</h3>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${contractTypeMeta.className}`}>
            {contractTypeMeta.label}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-500 mb-1">
          <img
            src={`https://picsum.photos/seed/${(job.foundationName ?? 'foundation').replace(/\s+/g, '')}/40/40`}
            alt={job.foundationName ?? t('dashboard:educatorJobBoardPage.unknownFoundation', 'Unknown foundation')}
            className="w-6 h-6 rounded-full mr-2 border"
          />
          {job.foundationName ?? t('dashboard:educatorJobBoardPage.unknownFoundation', 'Unknown foundation')}
        </div>
        <div className="text-sm text-gray-600 space-y-1 mb-3">
          <p><MapPinIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />{job.location ?? t('recruitment:recruitmentPage.labels.locationUnknown', 'Location TBD')}</p>
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-1.5 text-gray-400" />{t('educatorJobBoardPage.postedOn', { date: new Date(postedDate).toLocaleDateString() })}</p>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{job.description}</p>
      </div>
      <div className="bg-gray-50 px-5 py-3 border-t flex justify-end">
        <Button variant="primary" size="sm" leftIcon={EyeIcon} onClick={() => onViewDetails(job)} className="w-full">
          {t('common:buttons.viewDetails')}
        </Button>
      </div>
    </Card>
  );
};

const EducatorJobBoardPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { applyForJob } = useAppContext();
  const { addNotification } = useNotifications();
  const { listJobListings } = useRecruitmentApi();

  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCanton, setFilterCanton] = useState('All');
  const [filterContractType, setFilterContractType] = useState('All');

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  const cantons = ['All', ...SWISS_CANTONS];
  const contractTypes = ['All', 'CDI', 'CDD', 'INTERNSHIP', 'PART_TIME', 'FULL_TIME'];

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listings = await listJobListings({ publishedOnly: true });
      setJobListings(listings.filter((job) => job.status === 'PUBLISHED'));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('educatorJobBoardPage.errors.loadJobs', 'Unable to load job listings.'));
    } finally {
      setLoading(false);
    }
  }, [listJobListings, t]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = useMemo(
    () =>
      jobListings.filter(
        (job) =>
          (job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (job.foundationName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (job.description ?? '').toLowerCase().includes(searchTerm.toLowerCase())) &&
          (filterCanton === 'All' || (job.location ?? '').includes(filterCanton)) &&
          (filterContractType === 'All' || job.contractType === filterContractType),
      ),
    [searchTerm, filterCanton, filterContractType, jobListings],
  );

  const handleViewDetails = (job: JobListing) => {
    setSelectedJob(job);
    setIsDetailModalOpen(true);
  };

  const handleApply = async (jobToApply: JobListing) => {
    const result = await applyForJob(jobToApply);
    addNotification({
      title: result.success ? t('notifications.successTitle') : t('notifications.errorTitle'),
      message: result.message,
      type: result.success ? 'success' : 'error',
    });
    setIsDetailModalOpen(false);
    if (result.success) {
      fetchJobs();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">{t('educatorJobBoardPage.title')}</h1>
        <div className="relative w-full md:w-1/3">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('educatorJobBoardPage.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${ICON_INPUT_FIELD} w-full`}
          />
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="filterCanton" className="block text-xs font-medium text-gray-500 mb-1">
              {t('labels.region')}
            </label>
            <select id="filterCanton" value={filterCanton} onChange={(e) => setFilterCanton(e.target.value)} className={STANDARD_INPUT_FIELD}>
              {cantons.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? t('dashboard:filters.all') : c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filterContractType" className="block text-xs font-medium text-gray-500 mb-1">
              {t('labels.allContractTypes')}
            </label>
              <select id="filterContractType" value={filterContractType} onChange={(e) => setFilterContractType(e.target.value)} className={STANDARD_INPUT_FIELD}>
                {contractTypes.map((ct) => {
                  const label = (() => {
                    switch (ct) {
                      case 'CDI':
                        return t('recruitment:contractTypes.cdi', 'CDI');
                      case 'CDD':
                        return t('recruitment:contractTypes.cdd', 'CDD');
                      case 'INTERNSHIP':
                        return t('recruitment:contractTypes.internship', 'Internship');
                      case 'PART_TIME':
                        return t('recruitment:contractTypes.partTime', 'Part-time');
                      case 'FULL_TIME':
                        return t('recruitment:contractTypes.fullTime', 'Full-time');
                      default:
                        return t('labels.allContractTypes');
                    }
                  })();
                  return (
                    <option key={ct} value={ct}>
                      {label}
                    </option>
                  );
                })}
              </select>
          </div>
        </div>
      </Card>

      {error && <p className="text-center text-red-600 py-4">{error}</p>}
      {loading && <p className="text-center text-gray-500 py-8">{t('common:loading', 'Loading...')}</p>}
      {!loading && !error && filteredJobs.length === 0 && (
        <p className="text-center text-gray-500 py-8">{t('educatorJobBoardPage.noJobsFound')}</p>
      )}

      {!loading && !error && filteredJobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <EducatorJobCard key={job.id} job={job} onViewDetails={handleViewDetails} />
          ))}
        </div>
      )}

      {selectedJob && (
        <JobDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          job={selectedJob}
          onApply={handleApply}
        />
      )}
    </div>
  );
};

export default EducatorJobBoardPage;
