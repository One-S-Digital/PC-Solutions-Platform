import { apiClient } from './client'
import { PaginatedResponse } from '@pc-solutions/api-types'

export interface JobListing {
  id: string
  title: string
  foundationId?: string
  foundationName: string
  location: string
  contractType: 'Full-time' | 'Part-time' | 'CDI' | 'CDD' | 'Internship'
  startDate: string
  applicationsReceived: number
  status: 'Open' | 'Closed'
  description: string
  requirements: string[]
  responsibilities?: string[]
  qualifications?: string[]
  benefits?: string[]
  salaryRange?: string
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CandidateProfile {
  id: string
  name: string
  email: string
  phone: string
  avatarUrl?: string
  currentRoleOrTitle: string
  location: string
  availabilityStatus: 'Available Immediately' | 'Seeking Opportunities' | 'Not Available'
  shortBio: string
  skills: string[]
  workExperience: WorkExperienceItem[]
  education: EducationItem[]
  certifications?: CertificationItem[]
  availabilityPreferences: {
    days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[]
    times: 'Morning' | 'Afternoon' | 'Full-Day' | 'Flexible'
    contractType: 'Full-time' | 'Part-time' | 'Internship' | 'Temporary'
    preferredAgeGroups: ('Infants' | 'Toddlers' | 'Preschool')[]
  }
  documents: DocumentItem[]
  role: string
  availability: string
  preferredRegion: string
  experience: string
  languages: string[]
  createdAt: string
  updatedAt: string
}

export interface WorkExperienceItem {
  id: string
  jobTitle: string
  institutionName: string
  startDate: string
  endDate: string
  descriptionPoints: string[]
}

export interface EducationItem {
  id: string
  degree: string
  institutionName: string
  graduationYear: string
  description?: string
}

export interface CertificationItem {
  id: string
  name: string
  issuingOrganization: string
  issueDate: string
  expiryDate?: string
  credentialUrl?: string
}

export interface DocumentItem {
  id: string
  name: string
  url: string
  type: 'CV' | 'Diploma' | 'Certificate' | 'Reference' | 'Other'
  uploadDate: string
  size: number
}

export interface Application {
  id: string
  jobId: string
  jobTitle: string
  foundationName: string
  educatorId: string
  educatorName: string
  status: 'New' | 'Viewed' | 'Interview' | 'Offer' | 'Declined'
  applicationDate: string
  createdAt: string
  updatedAt: string
}

export interface CreateJobListingRequest {
  title: string
  location: string
  contractType: 'Full-time' | 'Part-time' | 'CDI' | 'CDD' | 'Internship'
  startDate: string
  description: string
  requirements: string[]
  responsibilities?: string[]
  qualifications?: string[]
  benefits?: string[]
  salaryRange?: string
  imageUrl?: string
}

export interface CreateApplicationRequest {
  jobId: string
  coverLetter?: string
  documents?: string[]
}

export interface JobListingsQuery {
  page?: number
  limit?: number
  foundationId?: string
  location?: string
  contractType?: string
  status?: string
  search?: string
}

export interface CandidatesQuery {
  page?: number
  limit?: number
  location?: string
  availabilityStatus?: string
  skills?: string[]
  search?: string
}

export const recruitmentApi = {
  // Job Listings
  getJobListings: (query?: JobListingsQuery): Promise<PaginatedResponse<JobListing>> => {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.foundationId) params.append('foundationId', query.foundationId)
    if (query?.location) params.append('location', query.location)
    if (query?.contractType) params.append('contractType', query.contractType)
    if (query?.status) params.append('status', query.status)
    if (query?.search) params.append('search', query.search)
    
    return apiClient.get<PaginatedResponse<JobListing>>(`/jobs?${params.toString()}`)
  },

  getJobListing: (jobId: string): Promise<{ data: JobListing }> => {
    return apiClient.get<{ data: JobListing }>(`/jobs/${jobId}`)
  },

  createJobListing: (data: CreateJobListingRequest): Promise<{ data: JobListing }> => {
    return apiClient.post<{ data: JobListing }>('/jobs', data)
  },

  updateJobListing: (jobId: string, data: Partial<CreateJobListingRequest>): Promise<{ data: JobListing }> => {
    return apiClient.put<{ data: JobListing }>(`/jobs/${jobId}`, data)
  },

  deleteJobListing: (jobId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/jobs/${jobId}`)
  },

  // Candidates
  getCandidates: (query?: CandidatesQuery): Promise<PaginatedResponse<CandidateProfile>> => {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.location) params.append('location', query.location)
    if (query?.availabilityStatus) params.append('availabilityStatus', query.availabilityStatus)
    if (query?.skills) params.append('skills', query.skills.join(','))
    if (query?.search) params.append('search', query.search)
    
    return apiClient.get<PaginatedResponse<CandidateProfile>>(`/candidates?${params.toString()}`)
  },

  getCandidate: (candidateId: string): Promise<{ data: CandidateProfile }> => {
    return apiClient.get<{ data: CandidateProfile }>(`/candidates/${candidateId}`)
  },

  // Applications
  getApplications: (jobId?: string): Promise<PaginatedResponse<Application>> => {
    const params = new URLSearchParams()
    if (jobId) params.append('jobId', jobId)
    
    return apiClient.get<PaginatedResponse<Application>>(`/applications?${params.toString()}`)
  },

  createApplication: (data: CreateApplicationRequest): Promise<{ data: Application }> => {
    return apiClient.post<{ data: Application }>('/applications', data)
  },

  updateApplication: (applicationId: string, data: { status: string }): Promise<{ data: Application }> => {
    return apiClient.put<{ data: Application }>(`/applications/${applicationId}`, data)
  },
}