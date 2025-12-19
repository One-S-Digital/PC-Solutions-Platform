
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BriefcaseIcon, AcademicCapIcon, ArrowUpRightIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { educatorDashboardApi, EducatorDashboardJob, EducatorDashboardProfile, EducatorDashboardStats } from '../../services/educatorDashboardService';

const EducatorDashboardPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { request } = useAuthenticatedApi();

  const [stats, setStats] = useState<EducatorDashboardStats | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<EducatorDashboardJob[]>([]);
  const [profileCompletion, setProfileCompletion] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const computeProfileCompletion = useCallback((profile: EducatorDashboardProfile | null): number => {
    const checks: Array<boolean> = [
      Boolean(profile?.firstName),
      Boolean(profile?.lastName),
      Boolean(profile?.phoneNumber),
      Boolean(profile?.shortBio),
      Array.isArray(profile?.skills) && profile.skills.length > 0,
      Array.isArray(profile?.certifications) && profile.certifications.length > 0,
      Boolean(profile?.workExperience),
      Boolean(profile?.education),
      Boolean(profile?.availability),
      Boolean(profile?.cvUrl),
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, jobsRes, profileRes] = await Promise.all([
        request<EducatorDashboardStats>(educatorDashboardApi.getStatsEndpoint()),
        request<EducatorDashboardJob[]>(educatorDashboardApi.getJobsEndpoint()),
        request<{ success: boolean; data?: EducatorDashboardProfile }>(educatorDashboardApi.getProfileEndpoint()),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else {
        setStats(null);
      }

      if (jobsRes.success && jobsRes.data) {
        setRecommendedJobs(jobsRes.data);
      } else {
        setRecommendedJobs([]);
      }

      const profileData = profileRes?.data ?? null;
      setProfileCompletion(computeProfileCompletion(profileData));
    } catch (err) {
      console.error('Failed to fetch educator dashboard data:', err);
      setError(t('common:errors.fetchFailed', 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [computeProfileCompletion, request, t]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const applicationStatus = useMemo(() => {
    // Backend educator stats currently expose:
    // - applicationsSent (all applications)
    // - interviewsScheduled (currently counted as REVIEWED in backend)
    // - jobOffers (ACCEPTED)
    // We map these into the existing UI buckets and default unknown values to 0.
    return {
      submitted: stats?.applicationsSent ?? 0,
      viewed: stats?.interviewsScheduled ?? 0,
      interviews: 0,
      offers: stats?.jobOffers ?? 0,
    };
  }, [stats]);

  const getJobStatusBadge = (status: string) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'not_applied') return { label: t('common:status.notApplied', 'Not applied'), className: 'bg-gray-100 text-gray-700' };
    if (normalized === 'pending') return { label: t('common:status.pending', 'Pending'), className: 'bg-swiss-sand/30 text-amber-700' };
    if (normalized === 'reviewed') return { label: t('common:status.reviewed', 'Reviewed'), className: 'bg-blue-100 text-blue-700' };
    if (normalized === 'accepted') return { label: t('common:status.accepted', 'Accepted'), className: 'bg-swiss-mint/10 text-swiss-mint' };
    if (normalized === 'rejected') return { label: t('common:status.rejected', 'Rejected'), className: 'bg-red-100 text-red-700' };
    return { label: status, className: 'bg-gray-100 text-gray-700' };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchDashboardData}>{t('common:retry', 'Retry')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          {t('educatorDashboard.title')}
        </h1>
        <p className="text-gray-500 mt-1">{t('educatorDashboard.welcome', { name: currentUser?.name?.split(' ')[0] })}</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-swiss-charcoal">{t('educatorDashboard.profileCompletion.title')}</h2>
            <p className="text-sm text-gray-500">{t('educatorDashboard.profileCompletion.subtitle')}</p>
          </div>
          <div className="w-full sm:w-auto mt-4 sm:mt-0 flex items-center gap-4">
            <div className="w-full sm:w-48 bg-gray-200 rounded-full h-2.5">
              <div className="bg-swiss-mint h-2.5 rounded-full" style={{ width: `${profileCompletion}%` }}></div>
            </div>
            <span className="font-semibold text-swiss-mint">{profileCompletion}%</span>
            <Button variant="outline" size="sm" onClick={() => navigate('/educator/profile')}>{t('educatorDashboard.profileCompletion.button')}</Button>
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Application Status) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">{t('educatorDashboard.applicationStatus.title')}</h2>
            <ul className="space-y-3">
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{t('educatorDashboard.applicationStatus.submitted')}</span>
                <span className="font-bold text-swiss-charcoal bg-gray-100 px-2 py-0.5 rounded-md">{applicationStatus.submitted}</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{t('educatorDashboard.applicationStatus.viewed')}</span>
                <span className="font-bold text-swiss-charcoal bg-gray-100 px-2 py-0.5 rounded-md">{applicationStatus.viewed}</span>
              </li>
               <li className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{t('educatorDashboard.applicationStatus.interviews')}</span>
                <span className="font-bold text-swiss-mint bg-swiss-mint/10 px-2 py-0.5 rounded-md">{applicationStatus.interviews}</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{t('educatorDashboard.applicationStatus.offers')}</span>
                <span className="font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-md">{applicationStatus.offers}</span>
              </li>
            </ul>
             <Button variant="secondary" size="sm" className="w-full mt-5" onClick={() => navigate('/educator/applications')}>
                {t('educatorDashboard.applicationStatus.button')}
            </Button>
          </Card>
          <Card className="p-5">
             <h2 className="text-lg font-semibold text-swiss-charcoal mb-2 flex items-center"><AcademicCapIcon className="w-5 h-5 mr-2 text-swiss-coral"/>{t('educatorDashboard.skills.title')}</h2>
             <p className="text-sm text-gray-500 mb-3">{t('educatorDashboard.skills.subtitle')}</p>
             <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/educator/profile')}>{t('educatorDashboard.skills.button')}</Button>
          </Card>
        </div>

        {/* Right Column (Job Recommendations) */}
        <div className="lg:col-span-2">
          <Card className="p-5 h-full">
            <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">{t('educatorDashboard.recommendations.title')}</h2>
            <div className="space-y-4">
              {recommendedJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('common:noData', 'No data')}
                </div>
              ) : recommendedJobs.map(job => {
                const badge = getJobStatusBadge(job.status);
                return (
                <div key={job.id} className="p-4 rounded-lg border border-gray-200 hover:border-swiss-mint hover:bg-swiss-mint/5 transition-all flex items-center">
                  <div className="mr-4 p-2 bg-swiss-teal/10 rounded-md">
                    <BriefcaseIcon className="w-6 h-6 text-swiss-teal"/>
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold text-swiss-charcoal">{job.title}</p>
                    <p className="text-sm text-gray-500">{job.organization}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center">
                        <EyeIcon className="w-3.5 h-3.5 mr-1" />
                        {job.location}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => navigate('/educator/job-board', { state: { openJobId: job.id } })}
                    >
                      {t('common:buttons.viewDetails', 'View details')} <ArrowUpRightIcon className="w-3 h-3 ml-1"/>
                    </Button>
                  </div>
                </div>
              )})}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EducatorDashboardPage;
