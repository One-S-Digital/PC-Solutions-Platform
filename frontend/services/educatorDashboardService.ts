/**
 * Educator Dashboard Service
 * Provides API endpoint helpers + types for the educator dashboard
 */

import { API_ENDPOINTS } from './api-endpoints';

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
  | 'rejected';

export interface EducatorDashboardProfile {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  shortBio?: string;
  skills?: string[];
  certifications?: string[];
  workExperience?: string;
  education?: string;
  availability?: string;
  cvUrl?: string;
}

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

/**
 * Hook-compatible endpoint helpers.
 * These are intended to be used with `useAuthenticatedApi`.
 */
export const educatorDashboardApi = {
  getStatsEndpoint: () => API_ENDPOINTS.dashboard.educatorStats,
  getJobsEndpoint: () => API_ENDPOINTS.dashboard.educatorJobs,
  getProfileEndpoint: () => API_ENDPOINTS.settings.educator,
};

export default educatorDashboardApi;

