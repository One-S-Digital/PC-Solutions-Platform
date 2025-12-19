

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { JobListing, CandidateProfile, UserRole, JobStatus, JobContractType, Application } from '../types';
import { STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import { BriefcaseIcon, UserGroupIcon, MapPinIcon, CalendarDaysIcon, EyeIcon, PencilIcon, TrashIcon, PlusCircleIcon, MagnifyingGlassIcon, FunnelIcon, StarIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import JobPostModal from '../components/recruitment/JobPostModal';
import ViewApplicantsModal from '../components/recruitment/ViewApplicantsModal';
import { useRecruitmentApi, JobListingInput } from '../hooks/useRecruitmentApi';

interface FoundationJobListingCardProps {
  job: JobListing;
  onEdit: (job: JobListing) => void;
  onViewApplicants: (job: JobListing) => void;
}

const FoundationJobListingCard: React.FC<FoundationJobListingCardProps> = ({ job, onEdit, onViewApplicants }) => {
  const { t, i18n } = useTranslation(['recruitment', 'common']);

  const statusMeta = useMemo(() => {
    switch (job.status) {
      case 'PUBLISHED':
        return { className: 'bg-green-100 text-green-700', label: t('recruitment:jobStatus.published', 'Published') };
      case 'DRAFT':
        return { className: 'bg-yellow-100 text-yellow-700', label: t('recruitment:jobStatus.draft', 'Draft') };
      case 'FILLED':
        return { className: 'bg-blue-100 text-blue-700', label: t('recruitment:jobStatus.filled', 'Filled') };
      case 'CLOSED':
      default:
        return { className: 'bg-red-100 text-red-700', label: t('recruitment:jobStatus.closed', 'Closed') };
    }
  }, [job.status, t]);

  const contractLabel = useMemo(() => {
    switch (job.contractType) {
      case 'FULL_TIME':
        return t('recruitment:contractTypes.fullTime', 'Full-time');
      case 'PART_TIME':
        return t('recruitment:contractTypes.partTime', 'Part-time');
      case 'CDI':
        return t('recruitment:contractTypes.cdi', 'CDI');
      case 'CDD':
        return t('recruitment:contractTypes.cdd', 'CDD');
      case 'INTERNSHIP':
      default:
        return t('recruitment:contractTypes.internship', 'Internship');
    }
  }, [job.contractType, t]);

  const formattedStartDate = job.startDate ? new Date(job.startDate).toLocaleDateString(i18n.language) : t('recruitment:labels.startDateTbd', 'To be determined');

  return (
    <Card className="mb-4" hoverEffect>
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-swiss-teal">{job.title}</h3>
            <p className="text-sm text-gray-500 mb-1">{job.foundationName}</p>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
        </div>
        <div className="mt-3 space-y-1 text-sm text-gray-600">
          <p><MapPinIcon className="w-4 h-4 inline mr-2 text-gray-400" />{job.location ?? t('recruitment:labels.locationUnknown', 'Location TBD')}</p>
          <p><BriefcaseIcon className="w-4 h-4 inline mr-2 text-gray-400" />{contractLabel}</p>
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-2 text-gray-400" />{t('recruitment:labels.startDate')}: {formattedStartDate}</p>
          <p><UserGroupIcon className="w-4 h-4 inline mr-2 text-gray-400" />{t('recruitment:labels.applications')}: {job.applicationsCount}</p>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3 flex justify-end space-x-2">
        <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={() => onViewApplicants(job)}>{t('recruitment:buttons.viewApplicants')}</Button>
        <Button variant="ghost" size="sm" leftIcon={PencilIcon} className="text-blue-600 hover:text-blue-700" onClick={() => onEdit(job)}>{t('common:buttons.edit')}</Button>
      </div>
    </Card>
  );
};

interface CandidateCardProps {
  candidate: CandidateProfile;
  onViewProfile: (candidateId: string) => void;
  onToggleFavorite: (candidateId: string) => void;
  isFavorite: boolean;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, onViewProfile, onToggleFavorite, isFavorite }) => {
  const { t } = useTranslation(['recruitment', 'common']);
  return (
    <Card className="mb-4 flex flex-col" hoverEffect>
      <div className="p-5 flex-grow">
        <div className="flex items-center mb-3">
          <img src={candidate.avatarUrl || 'https://picsum.photos/100/100'} alt={candidate.name} className="w-16 h-16 rounded-full mr-4" />
          <div>
            <h3 className="text-xl font-semibold text-swiss-mint">{candidate.name}</h3>
            <p className="text-sm text-gray-500">{candidate.currentRoleOrTitle ?? candidate.role ?? t('recruitment:candidateCard.roleUnknown', 'Role not specified')}</p>
          </div>
          <StarIcon
            className={`w-5 h-5 ml-auto cursor-pointer ${isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
            onClick={() => onToggleFavorite(candidate.id)}
          />
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-2 text-gray-400" />{candidate.availabilityStatus || candidate.availability || t('recruitment:candidateCard.availabilityUnknown', 'Availability not provided')}</p>
          <p><MapPinIcon className="w-4 h-4 inline mr-2 text-gray-400" />{candidate.location || candidate.preferredRegion || t('recruitment:candidateCard.regionUnknown', 'Region not specified')}</p>
          {candidate.shortBio && <p className="mt-2 text-xs italic line-clamp-2">{candidate.shortBio}</p>}
          {!candidate.shortBio && candidate.experience && <p className="mt-2 text-xs italic line-clamp-2">{candidate.experience}</p>}
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3 flex justify-end items-center gap-2">
        <Button variant="outline" size="xs" leftIcon={EyeIcon} onClick={() => onViewProfile(candidate.id)}>
          {t('recruitment:candidateCard.viewProfile')}
        </Button>
      </div>
    </Card>
  );
};


const RecruitmentPage: React.FC = () => {
  const { t } = useTranslation(['recruitment', 'dashboard', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentUser,
    toggleFavoriteCandidate,
    isCandidateFavorite,
  } = useAppContext();
  const {
    listJobListings,
    createJobListing,
    updateJobListing,
    deleteJobListing,
    listCandidates,
    listApplicationsForJob,
  } = useRecruitmentApi();

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [searchTermJobs, setSearchTermJobs] = useState('');
  const [searchTermCandidates, setSearchTermCandidates] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [candidateProfiles, setCandidateProfiles] = useState<CandidateProfile[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobListing | null>(null);

  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState<JobListing | null>(null);
  const [selectedJobApplications, setSelectedJobApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  const isFoundationUser = currentUser?.role === UserRole.FOUNDATION;
  const isAdminOrSuperAdmin =
    currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
  const canPostJob = isFoundationUser || isAdminOrSuperAdmin;
  const canViewCandidatePool = isFoundationUser || isAdminOrSuperAdmin;
  const foundationId = currentUser?.orgId;

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const listings = await listJobListings({
        foundationId: isFoundationUser ? foundationId : undefined,
        publishedOnly: !isFoundationUser && !isAdminOrSuperAdmin,
      });
      setJobListings(listings);
    } catch (error) {
      console.error(error);
      setJobsError(
        error instanceof Error ? error.message : t('recruitment:errors.loadJobsFailed', 'Unable to load job listings'),
      );
    } finally {
      setJobsLoading(false);
    }
  }, [listJobListings, isFoundationUser, isAdminOrSuperAdmin, foundationId, t]);

  const fetchCandidates = useCallback(async () => {
    if (!canViewCandidatePool) {
      setCandidateProfiles([]);
      return;
    }

    setCandidatesLoading(true);
    setCandidatesError(null);
    try {
      const candidates = await listCandidates();
      setCandidateProfiles(candidates);
    } catch (error) {
      console.error(error);
      setCandidatesError(
        error instanceof Error ? error.message : t('recruitment:errors.loadCandidatesFailed', 'Unable to load candidates'),
      );
    } finally {
      setCandidatesLoading(false);
    }
  }, [listCandidates, canViewCandidatePool, t]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/candidate-pool')) {
      setActiveTabIndex(1);
    } else {
      setActiveTabIndex(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleTabChange = (index: number) => {
    setActiveTabIndex(index);
    if (index === 0) {
      navigate('/recruitment/job-listings');
    } else if (index === 1) {
      navigate('/recruitment/candidate-pool');
    }
  };

  const filteredJobs = useMemo(
    () =>
      jobListings.filter(
        (job) =>
          job.title.toLowerCase().includes(searchTermJobs.toLowerCase()) ||
          (job.foundationName ?? '').toLowerCase().includes(searchTermJobs.toLowerCase()),
      ),
    [searchTermJobs, jobListings],
  );

  const filteredCandidates = useMemo(
    () =>
      candidateProfiles.filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(searchTermCandidates.toLowerCase()) ||
          (candidate.currentRoleOrTitle ?? candidate.role ?? '')
            .toLowerCase()
            .includes(searchTermCandidates.toLowerCase()),
      ),
    [searchTermCandidates, candidateProfiles],
  );

  const handleOpenJobModal = (job: JobListing | null) => {
    setEditingJob(job);
    setIsJobModalOpen(true);
  };

  const handleJobSubmit = async (jobData: JobListingInput, jobId?: string) => {
    try {
      let updatedJob: JobListing;
      if (jobId) {
        updatedJob = await updateJobListing(jobId, jobData);
        setJobListings((prev) => prev.map((job) => (job.id === jobId ? updatedJob : job)));
      } else {
        updatedJob = await createJobListing(jobData);
        setJobListings((prev) => [updatedJob, ...prev]);
      }
      setIsJobModalOpen(false);
      setEditingJob(null);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : t('recruitment:errors.saveJobFailed', 'Unable to save job listing'),
      );
    }
  };

  const handleDeleteJob = async (job: JobListing) => {
    if (!window.confirm(t('recruitment:confirmations.deleteJob', 'Are you sure you want to delete this job listing?'))) {
      return;
    }
    try {
      await deleteJobListing(job.id);
      setJobListings((prev) => prev.filter((listing) => listing.id !== job.id));
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : t('recruitment:errors.deleteJobFailed', 'Unable to delete job listing'),
      );
    }
  };

  const handleViewApplicants = useCallback(
    async (job: JobListing) => {
      setSelectedJobForApplicants(job);
      setIsApplicantsModalOpen(true);
      setApplicationsLoading(true);
      setApplicationsError(null);
      try {
        const applications = await listApplicationsForJob(job.id);
        setSelectedJobApplications(applications);
      } catch (error) {
        console.error(error);
        setApplicationsError(
          error instanceof Error ? error.message : t('recruitment:errors.loadApplicationsFailed', 'Unable to load applications'),
        );
        setSelectedJobApplications([]);
      } finally {
        setApplicationsLoading(false);
      }
    },
    [listApplicationsForJob, t],
  );

  const JobOffersTab: React.ReactNode = (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 p-4 bg-white rounded-lg shadow">
        <div className="relative flex-grow mb-2 sm:mb-0 sm:mr-4">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="searchJobs" className="sr-only">
            {t('recruitment:jobOffers.searchPlaceholder')}
          </label>
          <input
            id="searchJobs"
            type="text"
            placeholder={t('recruitment:jobOffers.searchPlaceholder')}
            value={searchTermJobs}
            onChange={(e) => setSearchTermJobs(e.target.value)}
            className={ICON_INPUT_FIELD}
          />
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" leftIcon={FunnelIcon} onClick={() => setShowFilters((prev) => !prev)}>
            {t('recruitment:buttons.filters')}
          </Button>
          {canPostJob && (
            <Button
              variant="primary"
              leftIcon={PlusCircleIcon}
              className="bg-swiss-mint hover:bg-opacity-90"
              onClick={() => handleOpenJobModal(null)}
            >
              {t('recruitment:buttons.postNewJob')}
            </Button>
          )}
        </div>
      </div>
      {showFilters && (
        <Card className="p-4 mb-4">
          <h3 className="text-lg font-semibold mb-2">{t('recruitment:jobOffers.filterTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder={t('recruitment:labels.location')} className={STANDARD_INPUT_FIELD} aria-label={t('recruitment:labels.location')} />
            <select className={STANDARD_INPUT_FIELD} aria-label={t('recruitment:labels.allContractTypes')}>
              <option>{t('recruitment:labels.allContractTypes')}</option>
            </select>
            <select className={STANDARD_INPUT_FIELD} aria-label={t('recruitment:labels.allStatuses')}>
              <option>{t('recruitment:labels.allStatuses')}</option>
            </select>
          </div>
          <Button variant="secondary" size="sm" className="mt-2" disabled>
            {t('recruitment:buttons.applyFilters')}
          </Button>
        </Card>
      )}
      {jobsError && <p className="text-sm text-red-600">{jobsError}</p>}
      {jobsLoading ? (
        <p className="text-center text-gray-500 py-8">{t('common:loading', 'Loading...')}</p>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          {filteredJobs.map((job) => (
            <div key={job.id} className="relative">
              <FoundationJobListingCard job={job} onEdit={handleOpenJobModal} onViewApplicants={handleViewApplicants} />
              {canPostJob && (
                <Button
                  variant="ghost"
                  size="xs"
                  leftIcon={TrashIcon}
                  className="absolute top-4 right-4 text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteJob(job)}
                >
                  {t('common:buttons.delete')}
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">{t('recruitment:jobOffers.emptyState')}</p>
      )}
    </div>
  );

  const CandidateAvailabilityTab: React.ReactNode = (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 p-4 bg-white rounded-lg shadow">
        <div className="relative flex-grow mb-2 sm:mb-0 sm:mr-4">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="searchCandidates" className="sr-only">
            {t('recruitment:candidatePool.searchPlaceholder')}
          </label>
          <input
            id="searchCandidates"
            type="text"
            placeholder={t('recruitment:candidatePool.searchPlaceholder')}
            value={searchTermCandidates}
            onChange={(e) => setSearchTermCandidates(e.target.value)}
            className={ICON_INPUT_FIELD}
          />
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" leftIcon={FunnelIcon} onClick={() => setShowFilters((prev) => !prev)}>
            {t('recruitment:buttons.filters')}
          </Button>
        </div>
      </div>
      {showFilters && (
        <Card className="p-4 mb-4">
          <h3 className="text-lg font-semibold mb-2">{t('recruitment:candidatePool.filterTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <select className={STANDARD_INPUT_FIELD} aria-label={t('recruitment:labels.allRoles')}>
              <option>{t('recruitment:labels.allRoles')}</option>
            </select>
            <input type="text" placeholder={t('recruitment:labels.region')} className={STANDARD_INPUT_FIELD} aria-label={t('recruitment:labels.region')} />
            <input type="date" placeholder={t('recruitment:labels.availabilityDate')} className={STANDARD_INPUT_FIELD} aria-label={t('recruitment:labels.availabilityDate')} />
            <select className={STANDARD_INPUT_FIELD} aria-label={t('recruitment:labels.allContractTypes')}>
              <option>{t('recruitment:labels.allContractTypes')}</option>
            </select>
          </div>
          <Button variant="secondary" size="sm" className="mt-2" disabled>
            {t('recruitment:buttons.applyFilters')}
          </Button>
        </Card>
      )}
      {candidatesError && <p className="text-sm text-red-600">{candidatesError}</p>}
      {candidatesLoading ? (
        <p className="text-center text-gray-500 py-8">{t('common:loading', 'Loading...')}</p>
      ) : filteredCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onViewProfile={(candidateId) => navigate(`/candidate/${candidateId}`)}
              onToggleFavorite={toggleFavoriteCandidate}
              isFavorite={isCandidateFavorite(candidate.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">{t('recruitment:candidatePool.emptyState')}</p>
      )}
    </div>
  );

  const tabsConfig = [
    { label: t('recruitment:tabs.jobOffers'), icon: BriefcaseIcon, content: JobOffersTab },
    { label: t('recruitment:tabs.candidatePool'), icon: UserGroupIcon, content: CandidateAvailabilityTab },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('dashboard:recruitmentPage.title')}</h1>
        <p className="text-gray-500 mt-1">{t('dashboard:recruitmentPage.subtitle')}</p>
      </div>
      <Tabs tabs={tabsConfig} variant="pills" activeTab={activeTabIndex} onTabChange={handleTabChange} />
      <JobPostModal
        isOpen={isJobModalOpen}
        onClose={() => {
          setIsJobModalOpen(false);
          setEditingJob(null);
        }}
        onSubmit={(data) => handleJobSubmit(data, editingJob?.id)}
        existingJob={editingJob}
      />
      {selectedJobForApplicants && (
        <ViewApplicantsModal
          isOpen={isApplicantsModalOpen}
          onClose={() => {
            setIsApplicantsModalOpen(false);
            setSelectedJobForApplicants(null);
            setSelectedJobApplications([]);
            setApplicationsError(null);
          }}
          job={selectedJobForApplicants}
          applications={selectedJobApplications}
          isLoading={applicationsLoading}
          error={applicationsError}
        />
      )}
    </div>
  );
};

export default RecruitmentPage;