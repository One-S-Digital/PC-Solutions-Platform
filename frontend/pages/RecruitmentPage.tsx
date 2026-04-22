

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { JobListing, CandidateProfile, UserRole, JobStatus, JobContractType, JobContractTypeValue, Application } from '../types';
import { STANDARD_INPUT_FIELD, ICON_INPUT_FIELD, EDUCATOR_JOB_ROLES } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import Pagination from '../components/ui/Pagination';
import { isDateTimeAvailable } from '../types/availability';
import { BriefcaseIcon, UserGroupIcon, MapPinIcon, CalendarDaysIcon, EyeIcon, PencilIcon, TrashIcon, PlusCircleIcon, MagnifyingGlassIcon, FunnelIcon, StarIcon, LockClosedIcon, LockOpenIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import JobPostModal from '../components/recruitment/JobPostModal';
import ViewApplicantsModal from '../components/recruitment/ViewApplicantsModal';
import { useRecruitmentApi, JobListingInput } from '../hooks/useRecruitmentApi';

interface FoundationJobListingCardProps {
  job: JobListing;
  onEdit: (job: JobListing) => void;
  onViewApplicants: (job: JobListing) => void;
  onChangeStatus: (job: JobListing, status: JobStatus) => void;
  onDelete?: (job: JobListing) => void;
  canDelete?: boolean;
}

const FoundationJobListingCard: React.FC<FoundationJobListingCardProps> = ({
  job,
  onEdit,
  onViewApplicants,
  onChangeStatus,
  onDelete,
  canDelete,
}) => {
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
    <Card className="mb-4 flex flex-col" hoverEffect>
      <div className="p-4 flex-grow">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-swiss-teal truncate">{job.title}</h3>
            <p className="text-xs text-gray-500 truncate">{job.foundationName}</p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
          <p className="truncate">
            <MapPinIcon className="w-4 h-4 inline mr-2 text-gray-400" />
            {job.location ?? t('recruitment:labels.locationUnknown', 'Location TBD')}
          </p>
          <p className="truncate">
            <BriefcaseIcon className="w-4 h-4 inline mr-2 text-gray-400" />
            {contractLabel}
          </p>
          <p className="truncate">
            <CalendarDaysIcon className="w-4 h-4 inline mr-2 text-gray-400" />
            {t('recruitment:labels.startDate')}: {formattedStartDate}
          </p>
          <p className="truncate">
            <UserGroupIcon className="w-4 h-4 inline mr-2 text-gray-400" />
            {t('recruitment:labels.applications')}: {job.applicationsCount}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 px-4 py-3 flex flex-wrap justify-end items-center gap-2">
        {canDelete && onDelete && (
          <Button
            variant="ghost"
            size="xs"
            leftIcon={TrashIcon}
            className="text-red-600 hover:text-red-700 mr-auto"
            onClick={() => onDelete(job)}
          >
            {t('common:buttons.delete')}
          </Button>
        )}
        {job.status !== 'PUBLISHED' && (
          <Button
            variant="ghost"
            size="xs"
            leftIcon={LockOpenIcon}
            className="text-green-700 hover:text-green-800"
            onClick={() => onChangeStatus(job, 'PUBLISHED')}
          >
            {t('recruitment:buttons.markOpen', 'Mark Open')}
          </Button>
        )}
        {job.status === 'PUBLISHED' && (
          <Button
            variant="ghost"
            size="xs"
            leftIcon={LockClosedIcon}
            className="text-red-600 hover:text-red-700"
            onClick={() => onChangeStatus(job, 'CLOSED')}
          >
            {t('recruitment:buttons.markClosed', 'Mark Closed')}
          </Button>
        )}
        {job.status !== 'DRAFT' && (
          <Button
            variant="ghost"
            size="xs"
            leftIcon={DocumentTextIcon}
            onClick={() => onChangeStatus(job, 'DRAFT')}
          >
            {t('recruitment:buttons.saveAsDraft', 'Save as Draft')}
          </Button>
        )}
        <Button variant="outline" size="xs" leftIcon={EyeIcon} onClick={() => onViewApplicants(job)}>
          {t('recruitment:buttons.viewApplicants')}
        </Button>
        <Button
          variant="outline"
          size="xs"
          leftIcon={PencilIcon}
          className="text-blue-600 hover:text-blue-700"
          onClick={() => onEdit(job)}
        >
          {t('common:buttons.edit')}
        </Button>
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
  const roleDisplay = candidate.jobRole
    ? candidate.jobRole
    : (candidate.currentRoleOrTitle ?? candidate.role ?? t('recruitment:candidateCard.roleUnknown', 'Role not specified'));
  const locationDisplay = candidate.location
    ?? (candidate.cities && candidate.cities.length > 0 ? candidate.cities.join(', ') : undefined)
    ?? candidate.preferredRegion
    ?? t('recruitment:candidateCard.regionUnknown', 'Region not specified');
  return (
    <Card className="mb-4 flex flex-col" hoverEffect>
      <div className="p-5 flex-grow">
        <div className="flex items-center mb-3">
          <img src={candidate.avatarUrl || 'https://picsum.photos/100/100'} alt={candidate.name} className="w-16 h-16 rounded-full mr-4" />
          <div>
            <h3 className="text-xl font-semibold text-swiss-mint">{candidate.name}</h3>
            <p className="text-sm text-gray-500">{roleDisplay}</p>
          </div>
          <StarIcon
            className={`w-5 h-5 ml-auto cursor-pointer ${isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
            onClick={() => onToggleFavorite(candidate.id)}
          />
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-2 text-gray-400" />{candidate.availabilityStatus || candidate.availability || t('recruitment:candidateCard.availabilityUnknown', 'Availability not provided')}</p>
          <p><MapPinIcon className="w-4 h-4 inline mr-2 text-gray-400" />{locationDisplay}</p>
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
    favoriteCandidateIds,
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

  // Job listing filters
  const [jobLocationFilter, setJobLocationFilter] = useState('');
  const [jobContractTypeFilter, setJobContractTypeFilter] = useState<JobContractType | ''>('');
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatus | ''>('');

  // Candidate pool filters
  const [candidateRoleFilter, setCandidateRoleFilter] = useState('');
  const [candidateRegionFilter, setCandidateRegionFilter] = useState('');
  const [candidateContractTypeFilter, setCandidateContractTypeFilter] = useState<JobContractType | ''>('');
  const [candidateAvailabilityDateFilter, setCandidateAvailabilityDateFilter] = useState('');
  const [showFavoriteCandidatesOnly, setShowFavoriteCandidatesOnly] = useState(false);

  // Pagination
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPerPage, setJobsPerPage] = useState(25);
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(25);

  const contractTypeOptions = useMemo(
    () => Object.values(JobContractTypeValue) as JobContractType[],
    [],
  );

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
        (job) => {
          const matchesSearch =
            job.title.toLowerCase().includes(searchTermJobs.toLowerCase()) ||
            (job.foundationName ?? '').toLowerCase().includes(searchTermJobs.toLowerCase());

          const matchesLocation = jobLocationFilter
            ? (job.location ?? '').toLowerCase().includes(jobLocationFilter.toLowerCase())
            : true;

          const matchesContract = jobContractTypeFilter ? job.contractType === jobContractTypeFilter : true;
          const matchesStatus = jobStatusFilter ? job.status === jobStatusFilter : true;

          return matchesSearch && matchesLocation && matchesContract && matchesStatus;
        },
      ),
    [searchTermJobs, jobListings, jobLocationFilter, jobContractTypeFilter, jobStatusFilter],
  );

  const filteredCandidates = useMemo(
    () =>
      candidateProfiles.filter(
        (candidate) => {
          const roleText = [
            candidate.currentRoleOrTitle,
            candidate.jobRole,
            candidate.role,
          ].filter(Boolean).join(' ').toLowerCase();
          const locationText = [
            candidate.location,
            ...(candidate.cities ?? []),
            candidate.preferredRegion,
          ].filter(Boolean).join(' ').toLowerCase();

          const matchesSearch =
            candidate.name.toLowerCase().includes(searchTermCandidates.toLowerCase()) ||
            roleText.includes(searchTermCandidates.toLowerCase());

          const matchesRole = candidateRoleFilter
            ? (candidate.jobRole
                ? [candidate.jobRole]
                : [candidate.currentRoleOrTitle ?? ''])
                .filter(Boolean)
                .some(role => role.toLowerCase() === candidateRoleFilter.toLowerCase())
            : true;
          const matchesRegion = candidateRegionFilter
            ? locationText.includes(candidateRegionFilter.toLowerCase())
            : true;

          // Candidate contract type is not fully modeled yet across all profiles; keep filter permissive.
          const matchesContract = candidateContractTypeFilter
            ? (candidate.availabilityPreferences?.contractType ?? '').toUpperCase().includes(candidateContractTypeFilter)
            : true;

          const matchesAvailabilityDate = candidateAvailabilityDateFilter
            ? (() => {
                const date = new Date(candidateAvailabilityDateFilter);
                if (Number.isNaN(date.getTime())) return true;

                // If the educator configured structured availability, use it.
                if (candidate.availabilitySettings) {
                  return isDateTimeAvailable(candidate.availabilitySettings, date);
                }

                // Fallback: for legacy profiles without structured settings, we can't reliably filter.
                return true;
              })()
            : true;

          const matchesFavorites = !showFavoriteCandidatesOnly || favoriteCandidateIds.includes(candidate.id);

          return matchesSearch && matchesRole && matchesRegion && matchesContract && matchesAvailabilityDate && matchesFavorites;
        },
      ),
    [
      searchTermCandidates,
      candidateProfiles,
      candidateRoleFilter,
      candidateRegionFilter,
      candidateContractTypeFilter,
      candidateAvailabilityDateFilter,
      showFavoriteCandidatesOnly,
      favoriteCandidateIds,
    ],
  );

  const candidateRoleOptions = [...EDUCATOR_JOB_ROLES];

  const jobsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredJobs.length / Math.max(1, jobsPerPage))),
    [filteredJobs.length, jobsPerPage],
  );
  const candidatesTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredCandidates.length / Math.max(1, candidatesPerPage))),
    [filteredCandidates.length, candidatesPerPage],
  );

  useEffect(() => {
    setJobsPage((prev) => Math.min(prev, jobsTotalPages));
  }, [jobsTotalPages]);
  useEffect(() => {
    setCandidatesPage((prev) => Math.min(prev, candidatesTotalPages));
  }, [candidatesTotalPages]);

  const paginatedJobs = useMemo(() => {
    const start = (jobsPage - 1) * jobsPerPage;
    return filteredJobs.slice(start, start + jobsPerPage);
  }, [filteredJobs, jobsPage, jobsPerPage]);

  const paginatedCandidates = useMemo(() => {
    const start = (candidatesPage - 1) * candidatesPerPage;
    return filteredCandidates.slice(start, start + candidatesPerPage);
  }, [filteredCandidates, candidatesPage, candidatesPerPage]);

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
      throw (error instanceof Error
        ? error
        : new Error(t('recruitment:errors.saveJobFailed', 'Unable to save job listing')));
    }
  };

  const handleChangeJobStatus = useCallback(
    async (job: JobListing, status: JobStatus) => {
      try {
        const updated = await updateJobListing(job.id, { status });
        setJobListings((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
      } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : t('recruitment:errors.saveJobFailed', 'Unable to save job listing'));
      }
    },
    [updateJobListing, t],
  );

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
            onChange={(e) => {
              setSearchTermJobs(e.target.value);
              setJobsPage(1);
            }}
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
            <input
              type="text"
              placeholder={t('recruitment:labels.location')}
              className={STANDARD_INPUT_FIELD}
              aria-label={t('recruitment:labels.location')}
              value={jobLocationFilter}
              onChange={(e) => {
                setJobLocationFilter(e.target.value);
                setJobsPage(1);
              }}
            />
            <select
              className={STANDARD_INPUT_FIELD}
              aria-label={t('recruitment:labels.allContractTypes')}
              value={jobContractTypeFilter}
              onChange={(e) => {
                setJobContractTypeFilter(e.target.value as JobContractType | '');
                setJobsPage(1);
              }}
            >
              <option value="">{t('recruitment:labels.allContractTypes')}</option>
              {contractTypeOptions.map((ct) => {
                const label = (() => {
                  switch (ct) {
                    case 'FULL_TIME':
                      return t('recruitment:contractTypes.fullTime', 'Full-time');
                    case 'PART_TIME':
                      return t('recruitment:contractTypes.partTime', 'Part-time');
                    case 'CDI':
                      return t('recruitment:contractTypes.cdi', 'CDI');
                    case 'CDD':
                      return t('recruitment:contractTypes.cdd', 'CDD');
                    case 'INTERNSHIP':
                      return t('recruitment:contractTypes.internship', 'Internship');
                    case 'FREELANCE':
                      return t('recruitment:contractTypes.freelance', 'Freelance');
                    case 'REPLACEMENT':
                      return t('recruitment:contractTypes.replacement', 'Replacement');
                    case 'TEMPORARY':
                      return t('recruitment:contractTypes.temporary', 'Temporary');
                    default:
                      return ct;
                  }
                })();
                return (
                  <option key={ct} value={ct}>
                    {label}
                  </option>
                );
              })}
            </select>
            <select
              className={STANDARD_INPUT_FIELD}
              aria-label={t('recruitment:labels.allStatuses')}
              value={jobStatusFilter}
              onChange={(e) => {
                setJobStatusFilter(e.target.value as JobStatus | '');
                setJobsPage(1);
              }}
            >
              <option value="">{t('recruitment:labels.allStatuses')}</option>
              {(['DRAFT', 'PUBLISHED', 'CLOSED', 'FILLED'] as JobStatus[]).map((st) => {
                const label = (() => {
                  switch (st) {
                    case 'PUBLISHED':
                      return t('recruitment:jobStatus.published', 'Published');
                    case 'DRAFT':
                      return t('recruitment:jobStatus.draft', 'Draft');
                    case 'FILLED':
                      return t('recruitment:jobStatus.filled', 'Filled');
                    case 'CLOSED':
                    default:
                      return t('recruitment:jobStatus.closed', 'Closed');
                  }
                })();
                return (
                  <option key={st} value={st}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="light"
              size="sm"
              onClick={() => {
                setJobLocationFilter('');
                setJobContractTypeFilter('');
                setJobStatusFilter('');
                setJobsPage(1);
              }}
            >
              {t('common:buttons.resetFilters')}
            </Button>
          </div>
        </Card>
      )}
      {jobsError && <p className="text-sm text-red-600">{jobsError}</p>}
      {jobsLoading ? (
        <p className="text-center text-gray-500 py-8">{t('common:loading', 'Loading...')}</p>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          {paginatedJobs.map((job) => (
            <FoundationJobListingCard
              key={job.id}
              job={job}
              onEdit={handleOpenJobModal}
              onViewApplicants={handleViewApplicants}
              onChangeStatus={handleChangeJobStatus}
              canDelete={canPostJob}
              onDelete={handleDeleteJob}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">{t('recruitment:jobOffers.emptyState')}</p>
      )}

      {!jobsLoading && filteredJobs.length > 0 && (
        <Pagination
          page={jobsPage}
          totalItems={filteredJobs.length}
          pageSize={jobsPerPage}
          onPageChange={setJobsPage}
          onPageSizeChange={(n) => {
            setJobsPerPage(n);
            setJobsPage(1);
          }}
        />
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
            onChange={(e) => {
              setSearchTermCandidates(e.target.value);
              setCandidatesPage(1);
            }}
            className={ICON_INPUT_FIELD}
          />
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" leftIcon={FunnelIcon} onClick={() => setShowFilters((prev) => !prev)}>
            {t('recruitment:buttons.filters')}
          </Button>
          <Button
            variant={showFavoriteCandidatesOnly ? 'secondary' : 'outline'}
            leftIcon={StarIcon}
            aria-pressed={showFavoriteCandidatesOnly}
            onClick={() => {
              setShowFavoriteCandidatesOnly((prev) => !prev);
              setCandidatesPage(1);
            }}
          >
            {t('recruitment:candidatePool.favorites', 'Favorites')}
          </Button>
        </div>
      </div>
      {showFilters && (
        <Card className="p-4 mb-4">
          <h3 className="text-lg font-semibold mb-2">{t('recruitment:candidatePool.filterTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <select
              className={STANDARD_INPUT_FIELD}
              aria-label={t('recruitment:labels.allRoles')}
              value={candidateRoleFilter}
              onChange={(e) => {
                setCandidateRoleFilter(e.target.value);
                setCandidatesPage(1);
              }}
            >
              <option value="">{t('recruitment:labels.allRoles')}</option>
              {candidateRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder={t('recruitment:labels.region')}
              className={STANDARD_INPUT_FIELD}
              aria-label={t('recruitment:labels.region')}
              value={candidateRegionFilter}
              onChange={(e) => {
                setCandidateRegionFilter(e.target.value);
                setCandidatesPage(1);
              }}
            />
            <input
              type="date"
              placeholder={t('recruitment:labels.availabilityDate')}
              className={STANDARD_INPUT_FIELD}
              aria-label={t('recruitment:labels.availabilityDate')}
              value={candidateAvailabilityDateFilter}
              onChange={(e) => {
                setCandidateAvailabilityDateFilter(e.target.value);
                setCandidatesPage(1);
              }}
            />
            <select
              className={STANDARD_INPUT_FIELD}
              aria-label={t('recruitment:labels.allContractTypes')}
              value={candidateContractTypeFilter}
              onChange={(e) => {
                setCandidateContractTypeFilter(e.target.value as JobContractType | '');
                setCandidatesPage(1);
              }}
            >
              <option value="">{t('recruitment:labels.allContractTypes')}</option>
              {contractTypeOptions.map((ct) => {
                const label = (() => {
                  switch (ct) {
                    case 'FULL_TIME':
                      return t('recruitment:contractTypes.fullTime', 'Full-time');
                    case 'PART_TIME':
                      return t('recruitment:contractTypes.partTime', 'Part-time');
                    case 'CDI':
                      return t('recruitment:contractTypes.cdi', 'CDI');
                    case 'CDD':
                      return t('recruitment:contractTypes.cdd', 'CDD');
                    case 'INTERNSHIP':
                      return t('recruitment:contractTypes.internship', 'Internship');
                    case 'FREELANCE':
                      return t('recruitment:contractTypes.freelance', 'Freelance');
                    case 'REPLACEMENT':
                      return t('recruitment:contractTypes.replacement', 'Replacement');
                    case 'TEMPORARY':
                      return t('recruitment:contractTypes.temporary', 'Temporary');
                    default:
                      return ct;
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
          <div className="mt-3 flex justify-end">
            <Button
              variant="light"
              size="sm"
              onClick={() => {
                setCandidateRoleFilter('');
                setCandidateRegionFilter('');
                setCandidateAvailabilityDateFilter('');
                setCandidateContractTypeFilter('');
                setShowFavoriteCandidatesOnly(false);
                setCandidatesPage(1);
              }}
            >
              {t('common:buttons.resetFilters')}
            </Button>
          </div>
        </Card>
      )}
      {candidatesError && <p className="text-sm text-red-600">{candidatesError}</p>}
      {candidatesLoading ? (
        <p className="text-center text-gray-500 py-8">{t('common:loading', 'Loading...')}</p>
      ) : filteredCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCandidates.map((candidate) => (
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

      {!candidatesLoading && filteredCandidates.length > 0 && (
        <Pagination
          page={candidatesPage}
          totalItems={filteredCandidates.length}
          pageSize={candidatesPerPage}
          onPageChange={setCandidatesPage}
          onPageSizeChange={(n) => {
            setCandidatesPerPage(n);
            setCandidatesPage(1);
          }}
        />
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
