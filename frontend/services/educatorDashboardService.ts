/**
 * Educator Dashboard Service
 * Provides API endpoint helpers + types for the educator dashboard
 */

export interface EducatorDashboardStats {
  applicationsSent: number;
  interviewsScheduled: number;
  jobOffers: number;
  profileViews: number;
  skillsCompleted: number;
  certificationsExpiring: number;
}

export type EducatorJobApplicationStatus =
  | 'not_applied'
  | 'pending'
  | 'reviewed'
  | 'accepted'
  | 'rejected'
  | string;

export interface EducatorDashboardJob {
  id: string;
  title: string;
  organization: string;
  location: string;
  salary: string;
  type: string;
  postedDate: string;
  status: EducatorJobApplicationStatus;
}

export const EDUCATOR_DASHBOARD_ENDPOINTS = {
  stats: '/dashboard/educator/stats',
  jobs: '/dashboard/educator/jobs',
};

/**
 * Hook-compatible endpoint helpers.
 * These are intended to be used with `useAuthenticatedApi`.
 */
export const educatorDashboardApi = {
  getStatsEndpoint: () => EDUCATOR_DASHBOARD_ENDPOINTS.stats,
  getJobsEndpoint: () => EDUCATOR_DASHBOARD_ENDPOINTS.jobs,
};

export default educatorDashboardApi;

