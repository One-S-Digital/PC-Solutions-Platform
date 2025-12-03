import { apiService, ApiResponse } from './api';
import { JobListing, Application, JobStatus, ApplicationStatus } from '../types';
import i18n from '../i18n';

export interface JobListingCreateData {
  title: string;
  description?: string;
  requirements: string[];
  benefits: string[];
  location?: string;
  salary?: string;
}

export interface JobListingUpdateData extends Partial<JobListingCreateData> {
  status?: JobStatus;
}

export interface ApplicationCreateData {
  jobListingId: string;
  coverLetter?: string;
  cvAssetId?: string;
  cvUrl?: string;
}

export interface ApplicationUpdateData {
  status?: ApplicationStatus;
}

class RecruitmentService {
  // Job Listings
  async getJobListings(page = 1, limit = 20, status?: JobStatus, search?: string): Promise<{ jobListings: JobListing[]; pagination: any }> {
    const currentLang = i18n.language || 'en';
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(search && { search }),
      lang: currentLang,
    });
    
    const response = await apiService.get<{ jobListings: JobListing[]; pagination: any }>(
      `/recruitment/job-listings?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch job listings');
    }
    const jobListingsData = Array.isArray(response.data) 
      ? response.data 
      : (response.data.jobListings || []);
    return {
      jobListings: jobListingsData.map((job: any) => this.transformJobListing(job)),
      pagination: Array.isArray(response.data) ? null : response.data.pagination,
    };
  }

  async getJobListingById(id: string): Promise<JobListing> {
    const currentLang = i18n.language || 'en';
    const response = await apiService.get<JobListing>(`/recruitment/job-listings/${id}?lang=${currentLang}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch job listing');
    }
    return this.transformJobListing(response.data);
  }

  async createJobListing(data: JobListingCreateData): Promise<JobListing> {
    const response = await apiService.post<JobListing>('/recruitment/job-listings', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create job listing');
    }
    return this.transformJobListing(response.data);
  }

  async updateJobListing(id: string, data: JobListingUpdateData): Promise<JobListing> {
    const response = await apiService.put<JobListing>(`/recruitment/job-listings/${id}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update job listing');
    }
    return this.transformJobListing(response.data);
  }

  async deleteJobListing(id: string): Promise<void> {
    const response = await apiService.delete(`/recruitment/job-listings/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete job listing');
    }
  }

  // Applications
  async getApplications(page = 1, limit = 20, jobListingId?: string): Promise<{ applications: Application[]; pagination: any }> {
    const currentLang = i18n.language || 'en';
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(jobListingId && { jobListingId }),
      lang: currentLang,
    });
    
    const response = await apiService.get<{ applications: Application[]; pagination: any }>(
      `/recruitment/applications?${params.toString()}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch applications');
    }
    const applicationsData = Array.isArray(response.data)
      ? response.data
      : (response.data.applications || []);
    return {
      applications: applicationsData.map((app: any) => this.transformApplication(app)),
      pagination: Array.isArray(response.data) ? null : response.data.pagination,
    };
  }

  async getApplicationById(id: string): Promise<Application> {
    const currentLang = i18n.language || 'en';
    const response = await apiService.get<Application>(`/recruitment/applications/${id}?lang=${currentLang}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch application');
    }
    return this.transformApplication(response.data);
  }

  async createApplication(data: ApplicationCreateData): Promise<Application> {
    const response = await apiService.post<Application>('/recruitment/applications', data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create application');
    }
    return this.transformApplication(response.data);
  }

  async updateApplication(id: string, data: ApplicationUpdateData): Promise<Application> {
    const response = await apiService.put<Application>(`/recruitment/applications/${id}`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update application');
    }
    return this.transformApplication(response.data);
  }

  async deleteApplication(id: string): Promise<void> {
    const response = await apiService.delete(`/recruitment/applications/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete application');
    }
  }

  // Get applications for a specific job listing
  async getJobApplications(jobListingId: string): Promise<Application[]> {
    const currentLang = i18n.language || 'en';
    const response = await apiService.get<Application[]>(`/recruitment/job-listings/${jobListingId}/applications?lang=${currentLang}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch job applications');
    }
    return (response.data || []).map((app: any) => this.transformApplication(app));
  }

  // Transform job listing data to include legacy fields for UI compatibility
  private transformJobListing(job: any): JobListing {
    return {
      ...job,
      // Legacy fields for UI compatibility
      foundationName: job.foundation?.name,
      contractType: 'Full-time', // Default contract type
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default start date (30 days from now)
      applicationsReceived: job.applications?.length || 0,
      responsibilities: job.requirements || [],
      qualifications: job.requirements || [],
      salaryRange: job.salary,
      imageUrl: undefined, // Job listings don't have images by default
    };
  }

  // Transform application data to include legacy fields for UI compatibility
  private transformApplication(app: any): Application {
    return {
      ...app,
      // Legacy fields for UI compatibility
      jobId: app.jobListingId,
      jobTitle: app.jobListing?.title,
      foundationName: app.jobListing?.foundation?.name,
      educatorId: app.candidateId,
      educatorName: `${app.candidate?.firstName} ${app.candidate?.lastName}`,
      applicationDate: app.createdAt,
    };
  }
}

export const recruitmentService = new RecruitmentService();
