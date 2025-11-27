import { useMemo } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { Application, ApplicationStatus, JobContractType, JobListing, JobStatus, CandidateProfile } from '../types';

interface ListJobListingsParams {
  foundationId?: string;
  status?: JobStatus;
  location?: string;
  search?: string;
  contractType?: JobContractType;
  publishedOnly?: boolean;
}

export interface JobListingInput {
  title: string;
  description?: string;
  requirements: string[];
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  location?: string;
  salary?: string;
  salaryRange?: string;
  contractType: JobContractType;
  startDate?: string; // YYYY-MM-DD
  status?: JobStatus;
}

export interface JobApplicationInput {
  jobListingId: string;
  coverLetter?: string;
  cvUrl?: string;
  cvAssetId?: string;
}

const transformJobListing = (data: any): JobListing => ({
  id: data.id,
  title: data.title,
  foundationId: data.foundationId,
  foundationName: data.foundation?.name ?? data.foundationName,
  location: data.location ?? undefined,
  contractType: data.contractType as JobContractType,
  startDate: data.startDate ?? undefined,
  status: data.status as JobStatus,
  description: data.description ?? undefined,
  requirements: data.requirements ?? [],
  responsibilities: data.responsibilities ?? [],
  qualifications: data.qualifications ?? [],
  benefits: data.benefits ?? [],
  salary: data.salary ?? undefined,
  salaryRange: data.salaryRange ?? undefined,
  publishedAt: data.publishedAt ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  applicationsCount: data.applications?.length ?? data.applicationsCount ?? 0,
});

const transformApplication = (data: any): Application => ({
  id: data.id,
  jobListingId: data.jobListingId,
  jobTitle: data.jobListing?.title ?? data.jobTitle ?? '',
  foundationName: data.jobListing?.foundation?.name ?? data.foundationName,
  candidateId: data.candidateId,
  candidateName:
    data.candidate ? `${data.candidate.firstName ?? ''} ${data.candidate.lastName ?? ''}`.trim() : data.candidateName,
  status: data.status as ApplicationStatus,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  coverLetter: data.coverLetter ?? undefined,
});

const safeParseJSON = <T>(value?: string | null): T | undefined => {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

const transformCandidate = (data: any): CandidateProfile => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid candidate data received');
  }
  
  return {
    id: data.id,
    name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.email || 'Unknown',
    email: data.email ?? '',
    phone: data.phoneNumber ?? undefined,
    avatarUrl: data.avatarAsset?.publicUrl ?? data.avatarUrl ?? undefined,
    currentRoleOrTitle: safeParseJSON<any[]>(data.workExperience)?.[0]?.jobTitle ?? data.role,
    location: data.region ?? undefined,
    availabilityStatus: data.availability ?? undefined,
    shortBio: data.bio ?? data.shortBio ?? undefined,
    skills: data.skills ?? [],
    workExperience: safeParseJSON(data.workExperience),
    education: safeParseJSON(data.education),
    certifications: data.certifications ?? [],
    availabilityPreferences: data.availabilityPreferences ?? undefined,
    documents: data.documents ?? [],
    role: data.role,
    availability: data.availability ?? undefined,
    preferredRegion: data.region ?? undefined,
    experience: data.experience ?? undefined,
    languages: data.languages ?? [],
  };
};

export const useRecruitmentApi = () => {
  const { request } = useAuthenticatedApi();

  return useMemo(() => ({
    async listJobListings(params: ListJobListingsParams = {}): Promise<JobListing[]> {
      const searchParams = new URLSearchParams();
      if (params.foundationId) searchParams.set('foundationId', params.foundationId);
      if (params.status) searchParams.set('status', params.status);
      if (params.location) searchParams.set('location', params.location);
      if (params.search) searchParams.set('search', params.search);
      if (params.contractType) searchParams.set('contractType', params.contractType);
      if (params.publishedOnly) searchParams.set('publishedOnly', 'true');

      const endpoint = `/recruitment/job-listings${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await request<any>(endpoint);
      const listings = Array.isArray(response?.data) ? response.data : response?.jobListings ?? [];
      return listings.map(transformJobListing);
    },

    async getJobListing(id: string): Promise<JobListing> {
      const response = await request<any>(`/recruitment/job-listings/${id}`);
      return transformJobListing(response?.data ?? response);
    },

    async createJobListing(payload: JobListingInput): Promise<JobListing> {
      const response = await request<any>('/recruitment/job-listings', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          startDate: payload.startDate ? new Date(payload.startDate).toISOString() : undefined,
        }),
      });
      return transformJobListing(response?.data ?? response);
    },

    async updateJobListing(id: string, payload: Partial<JobListingInput>): Promise<JobListing> {
      const response = await request<any>(`/recruitment/job-listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...payload,
          startDate: payload.startDate ? new Date(payload.startDate).toISOString() : undefined,
        }),
      });
      return transformJobListing(response?.data ?? response);
    },

    async deleteJobListing(id: string): Promise<void> {
      await request(`/recruitment/job-listings/${id}`, { method: 'DELETE' });
    },

    async listCandidates(params: { skills?: string[]; search?: string } = {}): Promise<CandidateProfile[]> {
      const searchParams = new URLSearchParams();
      if (params.skills?.length) searchParams.set('skills', params.skills.join(','));
      if (params.search) searchParams.set('search', params.search);

      const endpoint = `/recruitment/candidates${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await request<any>(endpoint);
      const candidates = Array.isArray(response?.data) ? response.data : response?.candidates ?? [];
      return candidates.map(transformCandidate);
    },

    async listJobApplications(params: { candidateId?: string; jobListingId?: string; status?: ApplicationStatus } = {}): Promise<Application[]> {
      const searchParams = new URLSearchParams();
      if (params.candidateId) searchParams.set('candidateId', params.candidateId);
      if (params.jobListingId) searchParams.set('jobListingId', params.jobListingId);
      if (params.status) searchParams.set('status', params.status);

      const endpoint = `/recruitment/applications${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await request<any>(endpoint);
      const applications = Array.isArray(response?.data) ? response.data : response?.applications ?? [];
      return applications.map(transformApplication);
    },

    async listMyApplications(): Promise<Application[]> {
      const response = await request<any>('/recruitment/applications/my');
      const applications = Array.isArray(response?.data) ? response.data : response?.applications ?? [];
      return applications.map(transformApplication);
    },

    async listApplicationsForJob(jobListingId: string): Promise<Application[]> {
      const response = await request<any>(`/recruitment/applications/job/${jobListingId}`);
      const applications = Array.isArray(response?.data) ? response.data : response?.applications ?? [];
      return applications.map(transformApplication);
    },

    async getCandidateById(candidateId: string): Promise<CandidateProfile> {
      const response = await request<any>(`/recruitment/candidates/${candidateId}`);
      return transformCandidate(response?.data ?? response);
    },

    async createApplication(payload: JobApplicationInput): Promise<Application> {
      const response = await request<any>('/recruitment/applications', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return transformApplication(response?.data ?? response);
    },

    async updateApplication(id: string, payload: Partial<JobApplicationInput> & { status?: ApplicationStatus }): Promise<Application> {
      const response = await request<any>(`/recruitment/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return transformApplication(response?.data ?? response);
    },

    async deleteApplication(id: string): Promise<void> {
      await request(`/recruitment/applications/${id}`, { method: 'DELETE' });
    },
  }), [request]);
};
