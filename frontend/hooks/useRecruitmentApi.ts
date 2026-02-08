import { useMemo } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import {
  Application,
  ApplicationStatus,
  JobContractType,
  JobListing,
  JobStatus,
  CandidateProfile,
  JobEmploymentType,
  JobWorkSchedule,
  CertificationItem,
  DocumentItem,
  EducationItem,
  WorkExperienceItem,
} from '../types';
import type { EducatorAvailabilitySettings } from '../types/availability';

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
  employmentType?: JobEmploymentType;
  workSchedule?: JobWorkSchedule;
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
  employmentType: data.employmentType ?? undefined,
  workSchedule: data.workSchedule ?? undefined,
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

const parseJsonArray = <T>(value: unknown): T[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    return safeParseJSON<T[]>(value);
  }
  return undefined;
};

const getFilenameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url, 'http://localhost');
    const name = parsed.pathname.split('/').pop();
    return name && name.trim().length > 0 ? name : 'Document';
  } catch {
    const parts = url.split('/');
    const name = parts[parts.length - 1];
    return name && name.trim().length > 0 ? name : 'Document';
  }
};

const normalizeCertifications = (value: unknown): CertificationItem[] => {
  if (!Array.isArray(value)) return [];
  if (value.length === 0) return [];

  if (typeof value[0] === 'string') {
    return (value as string[])
      .filter(name => typeof name === 'string' && name.trim().length > 0)
      .map((name, index) => ({
        id: `cert-${index}`,
        name,
        issuingOrganization: '',
        issueDate: '',
      }));
  }

  return (value as CertificationItem[])
    .map((cert, index) => ({
      id: cert.id || `cert-${index}`,
      name: cert.name || '',
      issuingOrganization: cert.issuingOrganization || '',
      issueDate: cert.issueDate || '',
      expiryDate: cert.expiryDate || undefined,
      credentialUrl: cert.credentialUrl || undefined,
    }))
    .filter(cert => cert.name.trim().length > 0);
};

const normalizeDocuments = (value: unknown, cvUrl?: string): DocumentItem[] => {
  const documents: DocumentItem[] = [];

  if (Array.isArray(value)) {
    value.forEach((doc, index) => {
      if (!doc || typeof doc !== 'object') return;
      const url = (doc as any).url || (doc as any).publicUrl;
      if (!url) return;
      documents.push({
        id: (doc as any).id || `doc-${index}`,
        name: (doc as any).name || getFilenameFromUrl(url),
        url,
        type: (doc as any).type || 'Other',
        uploadDate: (doc as any).uploadDate || '',
        size: (doc as any).size || 0,
      });
    });
  }

  if (cvUrl && cvUrl.trim().length > 0) {
    const hasCv = documents.some(doc => doc.url === cvUrl);
    if (!hasCv) {
      documents.push({
        id: 'cv',
        name: getFilenameFromUrl(cvUrl),
        url: cvUrl,
        type: 'CV',
      uploadDate: '',
        size: 0,
      });
    }
  }

  return documents;
};

const transformCandidate = (data: any): CandidateProfile => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid candidate data received');
  }

  const jobRoles = Array.isArray(data.jobRoles)
    ? data.jobRoles
    : (data.jobRole ? [data.jobRole] : []);
  const cities = Array.isArray(data.cities) ? data.cities : [];
  const locationParts = [
    ...(cities.length ? [cities.join(', ')] : []),
    ...(data.region ? [data.region] : []),
  ];

  const workExperienceItems = Array.isArray(data.workExperienceItems)
    ? (data.workExperienceItems as WorkExperienceItem[])
    : parseJsonArray<WorkExperienceItem>(data.workExperience);
  const educationItems = Array.isArray(data.educationItems)
    ? (data.educationItems as EducationItem[])
    : parseJsonArray<EducationItem>(data.education);
  const rawWorkExperience = typeof data.workExperience === 'string' ? data.workExperience : undefined;
  const rawEducation = typeof data.education === 'string' ? data.education : undefined;

  const certifications = normalizeCertifications(data.certificationItems ?? data.certifications);
  const documents = normalizeDocuments(data.documents, data.cvUrl);

  return {
    id: data.id,
    name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || data.email || 'Unknown',
    email: data.email ?? '',
    phone: data.phoneNumber ?? undefined,
    avatarUrl: data.avatarAsset?.publicUrl ?? data.avatarUrl ?? undefined,
    currentRoleOrTitle: workExperienceItems?.[0]?.jobTitle ?? jobRoles[0] ?? data.role,
    location: locationParts.length ? locationParts.join(' • ') : data.location ?? undefined,
    jobRoles,
    cities,
    availabilityStatus: data.availability ?? undefined,
    shortBio: data.bio ?? data.shortBio ?? undefined,
    skills: data.skills ?? [],
    workExperience: workExperienceItems ?? [],
    education: educationItems ?? [],
    educationText: !educationItems && rawEducation ? rawEducation : undefined,
    certifications,
    availabilityPreferences: data.availabilityPreferences ?? undefined,
    availabilitySettings: (data.availabilitySettings as EducatorAvailabilitySettings | undefined) ?? undefined,
    documents,
    role: data.role,
    jobRole: data.jobRole ?? undefined,
    availability: data.availability ?? undefined,
    preferredRegion: data.region ?? undefined,
    experience: data.experience ?? (!workExperienceItems && rawWorkExperience ? rawWorkExperience : undefined),
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
      const raw = (response as any)?.data ?? response;
      const listings = Array.isArray(raw) ? raw : (raw?.jobListings ?? []);
      return listings.map(transformJobListing);
    },

    async getJobListing(id: string): Promise<JobListing> {
      const response = await request<any>(`/recruitment/job-listings/${id}`);
      return transformJobListing((response as any)?.data ?? response);
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
      const raw = (response as any)?.data ?? response;
      const candidates = Array.isArray(raw) ? raw : (raw?.candidates ?? []);
      return candidates.map(transformCandidate);
    },

    async listJobApplications(params: { candidateId?: string; jobListingId?: string; status?: ApplicationStatus } = {}): Promise<Application[]> {
      const searchParams = new URLSearchParams();
      if (params.candidateId) searchParams.set('candidateId', params.candidateId);
      if (params.jobListingId) searchParams.set('jobListingId', params.jobListingId);
      if (params.status) searchParams.set('status', params.status);

      const endpoint = `/recruitment/applications${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const response = await request<any>(endpoint);
      const raw = (response as any)?.data ?? response;
      const applications = Array.isArray(raw) ? raw : (raw?.applications ?? []);
      return applications.map(transformApplication);
    },

    async listMyApplications(): Promise<Application[]> {
      const response = await request<any>('/recruitment/applications/my');
      const raw = (response as any)?.data ?? response;
      const applications = Array.isArray(raw) ? raw : (raw?.applications ?? []);
      return applications.map(transformApplication);
    },

    async listApplicationsForJob(jobListingId: string): Promise<Application[]> {
      const response = await request<any>(`/recruitment/applications/job/${jobListingId}`);
      const raw = (response as any)?.data ?? response;
      const applications = Array.isArray(raw) ? raw : (raw?.applications ?? []);
      return applications.map(transformApplication);
    },

    async getCandidateById(candidateId: string): Promise<CandidateProfile> {
      const response = await request<any>(`/recruitment/candidates/${candidateId}`);
      return transformCandidate((response as any)?.data ?? response);
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
