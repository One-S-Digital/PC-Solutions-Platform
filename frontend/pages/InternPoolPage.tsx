import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobListing, CandidateProfile, Application, UserRole, JobStatus } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import Pagination from '../components/ui/Pagination';
import {
  AcademicCapIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ChatBubbleLeftEllipsisIcon,
  EyeIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilIcon,
  PlusCircleIcon,
  StarIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import JobPostModal from '../components/recruitment/JobPostModal';
import ApplicationReviewModal from '../components/recruitment/ApplicationReviewModal';
import { useRecruitmentApi, JobListingInput } from '../hooks/useRecruitmentApi';
import { STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants';

// ─── Internship job card ────────────────────────────────────────────────────

interface InternshipCardProps {
  job: JobListing;
  onEdit: (job: JobListing) => void;
  onViewApplicants: (job: JobListing) => void;
  onChangeStatus: (job: JobListing, status: JobStatus) => void;
  onDelete: (job: JobListing) => void;
  canManage: boolean;
}

const InternshipCard: React.FC<InternshipCardProps> = ({
  job,
  onEdit,
  onViewApplicants,
  onChangeStatus,
  onDelete,
  canManage,
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
      default:
        return { className: 'bg-red-100 text-red-700', label: t('recruitment:jobStatus.closed', 'Closed') };
    }
  }, [job.status, t]);

  const startDateLabel = job.startDate
    ? new Date(job.startDate).toLocaleDateString(i18n.language)
    : t('recruitment:labels.startDateTbd', 'To be determined');

  return (
    <Card className="mb-4 flex flex-col" hoverEffect>
      <div className="p-4 flex-grow">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AcademicCapIcon className="w-4 h-4 text-swiss-teal shrink-0" />
              <h3 className="text-lg font-semibold text-swiss-teal truncate">{job.title}</h3>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">{job.foundationName}</p>
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
            <CalendarDaysIcon className="w-4 h-4 inline mr-2 text-gray-400" />
            {t('recruitment:labels.startDate', 'Start')}: {startDateLabel}
          </p>
          <p className="truncate">
            <UserGroupIcon className="w-4 h-4 inline mr-2 text-gray-400" />
            {t('recruitment:labels.applications', 'Applications')}: {job.applicationsCount}
          </p>
        </div>

        {job.description && (
          <p className="mt-3 text-sm text-gray-600 line-clamp-2">{job.description}</p>
        )}
      </div>

      <div className="bg-gray-50 px-4 py-3 flex flex-wrap justify-end items-center gap-2">
        {canManage && (
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
        {job.status !== 'PUBLISHED' && canManage && (
          <Button variant="ghost" size="xs" leftIcon={LockOpenIcon} className="text-green-700" onClick={() => onChangeStatus(job, 'PUBLISHED')}>
            {t('recruitment:buttons.markOpen', 'Publish')}
          </Button>
        )}
        {job.status === 'PUBLISHED' && canManage && (
          <Button variant="ghost" size="xs" leftIcon={LockClosedIcon} className="text-red-600" onClick={() => onChangeStatus(job, 'CLOSED')}>
            {t('recruitment:buttons.markClosed', 'Close')}
          </Button>
        )}
        <Button variant="outline" size="xs" leftIcon={EyeIcon} onClick={() => onViewApplicants(job)}>
          {t('recruitment:buttons.viewApplicants', 'View Applicants')}
        </Button>
        {canManage && (
          <Button variant="outline" size="xs" leftIcon={PencilIcon} className="text-blue-600" onClick={() => onEdit(job)}>
            {t('common:buttons.edit')}
          </Button>
        )}
      </div>
    </Card>
  );
};

// ─── Intern candidate card ──────────────────────────────────────────────────

interface InternCandidateCardProps {
  candidate: CandidateProfile;
  isFavorite: boolean;
  onViewProfile: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const InternCandidateCard: React.FC<InternCandidateCardProps> = ({
  candidate,
  isFavorite,
  onViewProfile,
  onToggleFavorite,
}) => {
  const { t } = useTranslation(['recruitment', 'common']);
  const roleDisplay = candidate.jobRole ?? candidate.currentRoleOrTitle ?? t('recruitment:candidateCard.roleUnknown', 'Role not specified');
  const locationDisplay =
    candidate.location ??
    (candidate.cities?.length ? candidate.cities.join(', ') : undefined) ??
    candidate.preferredRegion ??
    t('recruitment:candidateCard.regionUnknown', 'Region not specified');

  return (
    <Card className="flex flex-col" hoverEffect>
      <div className="p-5 flex-grow">
        <div className="flex items-center mb-3">
          {candidate.avatarUrl ? (
            <img src={candidate.avatarUrl} alt={candidate.name} className="w-14 h-14 rounded-full mr-4 object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full mr-4 bg-swiss-teal/10 flex items-center justify-center text-swiss-teal font-semibold text-lg shrink-0">
              {(candidate.name ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-swiss-mint truncate">{candidate.name}</h3>
            <p className="text-sm text-gray-500 truncate">{roleDisplay}</p>
          </div>
          <StarIcon
            className={`w-5 h-5 ml-auto shrink-0 cursor-pointer ${isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
            onClick={() => onToggleFavorite(candidate.id)}
          />
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <p><MapPinIcon className="w-4 h-4 inline mr-2 text-gray-400" />{locationDisplay}</p>
          <p><CalendarDaysIcon className="w-4 h-4 inline mr-2 text-gray-400" />
            {candidate.availabilityStatus ?? candidate.availability ?? t('recruitment:candidateCard.availabilityUnknown', 'Availability not provided')}
          </p>
          {(candidate.shortBio ?? candidate.experience) && (
            <p className="mt-2 text-xs italic line-clamp-2">{candidate.shortBio ?? candidate.experience}</p>
          )}
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3 flex justify-end">
        <Button variant="outline" size="xs" leftIcon={EyeIcon} onClick={() => onViewProfile(candidate.id)}>
          {t('recruitment:candidateCard.viewProfile', 'View Profile')}
        </Button>
      </div>
    </Card>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────

const InternPoolPage: React.FC = () => {
  const { t } = useTranslation(['recruitment', 'dashboard', 'common']);
  const navigate = useNavigate();
  const { currentUser, toggleFavoriteCandidate, isCandidateFavorite } = useAppContext();
  const { listJobListings, createJobListing, updateJobListing, deleteJobListing, listCandidates, listApplicationsForJob } = useRecruitmentApi();

  const isFoundation = currentUser?.role === UserRole.FOUNDATION;
  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;
  const canManage = isFoundation || isAdmin;

  // ── Listings state ──
  const [listings, setListings] = useState<JobListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [searchListings, setSearchListings] = useState('');
  const [listingsPage, setListingsPage] = useState(1);

  // ── Candidates state ──
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [searchCandidates, setSearchCandidates] = useState('');
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // ── Job post modal state ──
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobListing | null>(null);

  // ── Applicant review modal state ──
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  const PER_PAGE = 12;

  const fetchListings = useCallback(async () => {
    setListingsLoading(true);
    setListingsError(null);
    try {
      const data = await listJobListings({
        contractType: 'INTERNSHIP',
        foundationId: isFoundation ? (currentUser?.orgId ?? undefined) : undefined,
        publishedOnly: !canManage,
      });
      setListings(data);
    } catch (err) {
      setListingsError(err instanceof Error ? err.message : t('recruitment:errors.loadJobsFailed'));
    } finally {
      setListingsLoading(false);
    }
  }, [listJobListings, isFoundation, canManage, currentUser, t]);

  const fetchCandidates = useCallback(async () => {
    if (!canManage) return;
    setCandidatesLoading(true);
    setCandidatesError(null);
    try {
      setCandidates(await listCandidates());
    } catch (err) {
      setCandidatesError(err instanceof Error ? err.message : t('recruitment:errors.loadCandidatesFailed'));
    } finally {
      setCandidatesLoading(false);
    }
  }, [listCandidates, canManage, t]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  // ── Filtered / paginated listings ──
  const filteredListings = useMemo(
    () => listings.filter((j) => j.title.toLowerCase().includes(searchListings.toLowerCase())),
    [listings, searchListings],
  );
  const paginatedListings = useMemo(() => {
    const start = (listingsPage - 1) * PER_PAGE;
    return filteredListings.slice(start, start + PER_PAGE);
  }, [filteredListings, listingsPage]);

  // ── Filtered / paginated candidates ──
  const filteredCandidates = useMemo(
    () =>
      candidates.filter((c) => {
        const text = `${c.name} ${c.jobRole ?? ''} ${c.currentRoleOrTitle ?? ''}`.toLowerCase();
        const matchesSearch = text.includes(searchCandidates.toLowerCase());
        const matchesFav = !favoritesOnly || isCandidateFavorite(c.id);
        return matchesSearch && matchesFav;
      }),
    [candidates, searchCandidates, favoritesOnly, isCandidateFavorite],
  );
  const paginatedCandidates = useMemo(() => {
    const start = (candidatesPage - 1) * PER_PAGE;
    return filteredCandidates.slice(start, start + PER_PAGE);
  }, [filteredCandidates, candidatesPage]);

  // ── Handlers ──
  const handleJobSubmit = async (data: JobListingInput) => {
    if (editingJob?.id) {
      const updated = await updateJobListing(editingJob.id, data);
      setListings((prev) => prev.map((j) => (j.id === editingJob.id ? updated : j)));
    } else {
      const created = await createJobListing(data);
      if (created.contractType === 'INTERNSHIP') setListings((prev) => [created, ...prev]);
    }
    setIsJobModalOpen(false);
    setEditingJob(null);
  };

  const handleChangeStatus = useCallback(async (job: JobListing, status: JobStatus) => {
    try {
      const updated = await updateJobListing(job.id, { status });
      setListings((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('recruitment:errors.saveJobFailed'));
    }
  }, [updateJobListing, t]);

  const handleDelete = async (job: JobListing) => {
    if (!window.confirm(t('recruitment:confirmations.deleteJob', 'Delete this internship listing?'))) return;
    try {
      await deleteJobListing(job.id);
      setListings((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('recruitment:errors.deleteJobFailed'));
    }
  };

  const handleViewApplicants = useCallback(async (job: JobListing) => {
    setSelectedJob(job);
    setIsApplicantsModalOpen(true);
    setApplicationsLoading(true);
    setApplicationsError(null);
    try {
      setSelectedApplications(await listApplicationsForJob(job.id));
    } catch (err) {
      setApplicationsError(err instanceof Error ? err.message : t('recruitment:errors.loadApplicationsFailed'));
      setSelectedApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  }, [listApplicationsForJob, t]);

  // ── Tabs ──
  const ListingsTab = (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg shadow">
        <div className="relative flex-grow">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('recruitment:jobOffers.searchPlaceholder', 'Search positions…')}
            value={searchListings}
            onChange={(e) => { setSearchListings(e.target.value); setListingsPage(1); }}
            className={ICON_INPUT_FIELD}
          />
        </div>
        {canManage && (
          <Button variant="primary" leftIcon={PlusCircleIcon} className="bg-swiss-mint hover:bg-opacity-90 shrink-0" onClick={() => { setEditingJob(null); setIsJobModalOpen(true); }}>
            {t('dashboard:sidebar.postJob', 'Post internship')}
          </Button>
        )}
      </div>

      {listingsError && <p className="text-sm text-red-600">{listingsError}</p>}

      {listingsLoading ? (
        <p className="text-center text-gray-500 py-8">{t('common:loading', 'Loading…')}</p>
      ) : paginatedListings.length > 0 ? (
        <>
          {paginatedListings.map((job) => (
            <InternshipCard
              key={job.id}
              job={job}
              canManage={canManage}
              onEdit={(j) => { setEditingJob(j); setIsJobModalOpen(true); }}
              onViewApplicants={handleViewApplicants}
              onChangeStatus={handleChangeStatus}
              onDelete={handleDelete}
            />
          ))}
          <Pagination
            page={listingsPage}
            totalItems={filteredListings.length}
            pageSize={PER_PAGE}
            onPageChange={setListingsPage}
            onPageSizeChange={() => {}}
          />
        </>
      ) : (
        <div className="text-center py-16">
          <AcademicCapIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('dashboard:internPool.noListings', 'No internship positions posted yet.')}</p>
          {canManage && (
            <Button variant="primary" className="mt-4 bg-swiss-mint" onClick={() => { setEditingJob(null); setIsJobModalOpen(true); }}>
              {t('dashboard:internPool.postFirst', 'Post your first internship')}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const CandidatesTab = (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg shadow">
        <div className="relative flex-grow">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('recruitment:candidatePool.searchPlaceholder', 'Search candidates…')}
            value={searchCandidates}
            onChange={(e) => { setSearchCandidates(e.target.value); setCandidatesPage(1); }}
            className={ICON_INPUT_FIELD}
          />
        </div>
        <Button
          variant={favoritesOnly ? 'secondary' : 'outline'}
          leftIcon={StarIcon}
          aria-pressed={favoritesOnly}
          onClick={() => { setFavoritesOnly((p) => !p); setCandidatesPage(1); }}
        >
          {t('recruitment:candidatePool.favorites', 'Favourites')}
        </Button>
      </div>

      {candidatesError && <p className="text-sm text-red-600">{candidatesError}</p>}

      {candidatesLoading ? (
        <p className="text-center text-gray-500 py-8">{t('common:loading', 'Loading…')}</p>
      ) : paginatedCandidates.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCandidates.map((c) => (
              <InternCandidateCard
                key={c.id}
                candidate={c}
                isFavorite={isCandidateFavorite(c.id)}
                onViewProfile={(id) => navigate(`/candidate/${id}`)}
                onToggleFavorite={toggleFavoriteCandidate}
              />
            ))}
          </div>
          <Pagination
            page={candidatesPage}
            totalItems={filteredCandidates.length}
            pageSize={PER_PAGE}
            onPageChange={setCandidatesPage}
            onPageSizeChange={() => {}}
          />
        </>
      ) : (
        <div className="text-center py-16">
          <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('recruitment:candidatePool.emptyState', 'No candidates found.')}</p>
        </div>
      )}
    </div>
  );

  const tabs = [
    { label: t('dashboard:internPool.listingsTab', 'Internship Positions'), icon: BriefcaseIcon, content: ListingsTab },
    { label: t('dashboard:internPool.candidatesTab', 'Intern Candidates'), icon: UserGroupIcon, content: CandidatesTab },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center gap-3">
          <AcademicCapIcon className="w-8 h-8 text-swiss-teal" />
          {t('dashboard:internPool.title', 'Intern Pool')}
        </h1>
        <p className="text-gray-500 mt-1">{t('dashboard:internPool.subtitle', 'Manage internship positions and discover candidates available for internships.')}</p>
      </div>

      <Tabs tabs={tabs} variant="pills" />

      <JobPostModal
        isOpen={isJobModalOpen}
        onClose={() => { setIsJobModalOpen(false); setEditingJob(null); }}
        onSubmit={handleJobSubmit}
        existingJob={editingJob}
        initialContractType="INTERNSHIP"
      />

      {selectedJob && (
        <ApplicationReviewModal
          isOpen={isApplicantsModalOpen}
          onClose={() => { setIsApplicantsModalOpen(false); setSelectedJob(null); setSelectedApplications([]); setApplicationsError(null); }}
          job={selectedJob}
          applications={selectedApplications}
          isLoading={applicationsLoading}
          error={applicationsError}
          onApplicationsChange={setSelectedApplications}
        />
      )}
    </div>
  );
};

export default InternPoolPage;
