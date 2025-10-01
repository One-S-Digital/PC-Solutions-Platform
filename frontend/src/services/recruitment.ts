import { apiClient } from './api';
import { JobListing, JobApplication, CandidateProfile, UserRole, ApplicationStatus, JobStatus } from './types';

// Recruitment service for managing recruitment-related API calls
export class RecruitmentService {
  // Job Listing endpoints
  async getJobListings(params?: {
    page?: number;
    limit?: number;
    status?: JobStatus;
    foundationId?: string;
    search?: string;
    location?: string;
  }): Promise<{
    data: JobListing[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.foundationId) queryParams.append('foundationId', params.foundationId);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.location) queryParams.append('location', params.location);

    return apiClient.get(`/recruitment/job-listings?${queryParams.toString()}`);
  }

  async getJobListingById(jobListingId: string): Promise<JobListing> {
    return apiClient.get<JobListing>(`/recruitment/job-listings/${jobListingId}`);
  }

  async createJobListing(data: {
    title: string;
    description?: string;
    requirements?: string[];
    benefits?: string[];
    location?: string;
    salary?: string;
  }): Promise<JobListing> {
    return apiClient.post<JobListing>('/recruitment/job-listings', data);
  }

  async updateJobListing(jobListingId: string, data: Partial<JobListing>): Promise<JobListing> {
    return apiClient.patch<JobListing>(`/recruitment/job-listings/${jobListingId}`, data);
  }

  async deleteJobListing(jobListingId: string): Promise<void> {
    return apiClient.delete(`/recruitment/job-listings/${jobListingId}`);
  }

  async updateJobListingStatus(jobListingId: string, status: JobStatus): Promise<JobListing> {
    return apiClient.patch<JobListing>(`/recruitment/job-listings/${jobListingId}/status`, { status });
  }

  // Job Application endpoints
  async getJobApplications(params?: {
    page?: number;
    limit?: number;
    jobListingId?: string;
    candidateId?: string;
    status?: ApplicationStatus;
  }): Promise<{
    data: JobApplication[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.jobListingId) queryParams.append('jobListingId', params.jobListingId);
    if (params?.candidateId) queryParams.append('candidateId', params.candidateId);
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.get(`/recruitment/applications?${queryParams.toString()}`);
  }

  async getJobApplicationById(applicationId: string): Promise<JobApplication> {
    return apiClient.get<JobApplication>(`/recruitment/applications/${applicationId}`);
  }

  async createJobApplication(data: {
    jobListingId: string;
    coverLetter?: string;
  }): Promise<JobApplication> {
    return apiClient.post<JobApplication>('/recruitment/applications', data);
  }

  async updateJobApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<JobApplication> {
    return apiClient.patch<JobApplication>(`/recruitment/applications/${applicationId}/status`, { status });
  }

  async deleteJobApplication(applicationId: string): Promise<void> {
    return apiClient.delete(`/recruitment/applications/${applicationId}`);
  }

  // Candidate Profile endpoints
  async getCandidateProfiles(params?: {
    page?: number;
    limit?: number;
    search?: string;
    skills?: string[];
    availability?: string;
    location?: string;
  }): Promise<{
    data: CandidateProfile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.skills) queryParams.append('skills', params.skills.join(','));
    if (params?.availability) queryParams.append('availability', params.availability);
    if (params?.location) queryParams.append('location', params.location);

    return apiClient.get(`/recruitment/candidates?${queryParams.toString()}`);
  }

  async getCandidateProfileById(candidateId: string): Promise<CandidateProfile> {
    return apiClient.get<CandidateProfile>(`/recruitment/candidates/${candidateId}`);
  }

  async updateCandidateProfile(candidateId: string, data: Partial<CandidateProfile>): Promise<CandidateProfile> {
    return apiClient.patch<CandidateProfile>(`/recruitment/candidates/${candidateId}`, data);
  }

  async uploadCandidateCV(candidateId: string, file: File, onProgress?: (progress: number) => void): Promise<{ url: string }> {
    return apiClient.uploadFile<{ url: string }>(`/recruitment/candidates/${candidateId}/cv`, file, onProgress);
  }

  // Search functionality
  async searchJobListings(query: string, filters?: {
    location?: string;
    status?: JobStatus;
    foundationId?: string;
  }): Promise<JobListing[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('search', query);
    if (filters?.location) queryParams.append('location', filters.location);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.foundationId) queryParams.append('foundationId', filters.foundationId);

    const response = await apiClient.get<{ data: JobListing[] }>(`/recruitment/job-listings/search?${queryParams.toString()}`);
    return response.data;
  }

  async searchCandidates(query: string, filters?: {
    skills?: string[];
    availability?: string;
    location?: string;
  }): Promise<CandidateProfile[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('search', query);
    if (filters?.skills) queryParams.append('skills', filters.skills.join(','));
    if (filters?.availability) queryParams.append('availability', filters.availability);
    if (filters?.location) queryParams.append('location', filters.location);

    const response = await apiClient.get<{ data: CandidateProfile[] }>(`/recruitment/candidates/search?${queryParams.toString()}`);
    return response.data;
  }

  // Analytics endpoints
  async getRecruitmentStats(): Promise<{
    totalJobListings: number;
    totalApplications: number;
    totalCandidates: number;
    jobListingsByStatus: Record<JobStatus, number>;
    applicationsByStatus: Record<ApplicationStatus, number>;
    applicationsByMonth: Record<string, number>;
    topSkills: Array<{ skill: string; count: number }>;
    averageApplicationTime: number;
  }> {
    return apiClient.get('/recruitment/stats');
  }

  // Foundation-specific endpoints
  async getFoundationJobListings(foundationId: string, params?: {
    page?: number;
    limit?: number;
    status?: JobStatus;
  }): Promise<{
    data: JobListing[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.get(`/recruitment/foundations/${foundationId}/job-listings?${queryParams.toString()}`);
  }

  async getFoundationApplications(foundationId: string, params?: {
    page?: number;
    limit?: number;
    status?: ApplicationStatus;
  }): Promise<{
    data: JobApplication[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.get(`/recruitment/foundations/${foundationId}/applications?${queryParams.toString()}`);
  }

  // Candidate-specific endpoints
  async getCandidateApplications(candidateId: string, params?: {
    page?: number;
    limit?: number;
    status?: ApplicationStatus;
  }): Promise<{
    data: JobApplication[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    return apiClient.get(`/recruitment/candidates/${candidateId}/applications?${queryParams.toString()}`);
  }

  // Notification endpoints
  async getApplicationNotifications(): Promise<{
    newApplications: number;
    statusUpdates: number;
    newJobListings: number;
  }> {
    return apiClient.get('/recruitment/notifications');
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    return apiClient.patch(`/recruitment/notifications/${notificationId}/read`);
  }
}

// Create singleton instance
export const recruitmentService = new RecruitmentService();

export default recruitmentService;