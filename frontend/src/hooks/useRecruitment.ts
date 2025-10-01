import { useState, useEffect, useCallback } from 'react';
import { recruitmentService } from '../services/recruitment';
import { JobListing, JobApplication, CandidateProfile, JobStatus, ApplicationStatus } from '../services/types';

// Hook for job listings
export const useJobListings = (params?: {
  page?: number;
  limit?: number;
  status?: JobStatus;
  foundationId?: string;
  search?: string;
  location?: string;
}) => {
  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchJobListings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await recruitmentService.getJobListings(params);
      setJobListings(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch job listings');
      console.error('Error fetching job listings:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchJobListings();
  }, [fetchJobListings]);

  const createJobListing = useCallback(async (data: {
    title: string;
    description?: string;
    requirements?: string[];
    benefits?: string[];
    location?: string;
    salary?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newJobListing = await recruitmentService.createJobListing(data);
      setJobListings(prev => [newJobListing, ...prev]);
      return newJobListing;
    } catch (err: any) {
      setError(err.message || 'Failed to create job listing');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateJobListing = useCallback(async (jobListingId: string, data: Partial<JobListing>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedJobListing = await recruitmentService.updateJobListing(jobListingId, data);
      setJobListings(prev => prev.map(listing => listing.id === jobListingId ? updatedJobListing : listing));
      return updatedJobListing;
    } catch (err: any) {
      setError(err.message || 'Failed to update job listing');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteJobListing = useCallback(async (jobListingId: string) => {
    setLoading(true);
    setError(null);

    try {
      await recruitmentService.deleteJobListing(jobListingId);
      setJobListings(prev => prev.filter(listing => listing.id !== jobListingId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete job listing');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateJobListingStatus = useCallback(async (jobListingId: string, status: JobStatus) => {
    setLoading(true);
    setError(null);

    try {
      const updatedJobListing = await recruitmentService.updateJobListingStatus(jobListingId, status);
      setJobListings(prev => prev.map(listing => listing.id === jobListingId ? updatedJobListing : listing));
      return updatedJobListing;
    } catch (err: any) {
      setError(err.message || 'Failed to update job listing status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    jobListings,
    loading,
    error,
    pagination,
    fetchJobListings,
    createJobListing,
    updateJobListing,
    deleteJobListing,
    updateJobListingStatus,
  };
};

// Hook for job applications
export const useJobApplications = (params?: {
  page?: number;
  limit?: number;
  jobListingId?: string;
  candidateId?: string;
  status?: ApplicationStatus;
}) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await recruitmentService.getJobApplications(params);
      setApplications(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch job applications');
      console.error('Error fetching job applications:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const createApplication = useCallback(async (data: {
    jobListingId: string;
    coverLetter?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newApplication = await recruitmentService.createJobApplication(data);
      setApplications(prev => [newApplication, ...prev]);
      return newApplication;
    } catch (err: any) {
      setError(err.message || 'Failed to create job application');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateApplicationStatus = useCallback(async (applicationId: string, status: ApplicationStatus) => {
    setLoading(true);
    setError(null);

    try {
      const updatedApplication = await recruitmentService.updateJobApplicationStatus(applicationId, status);
      setApplications(prev => prev.map(app => app.id === applicationId ? updatedApplication : app));
      return updatedApplication;
    } catch (err: any) {
      setError(err.message || 'Failed to update application status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteApplication = useCallback(async (applicationId: string) => {
    setLoading(true);
    setError(null);

    try {
      await recruitmentService.deleteJobApplication(applicationId);
      setApplications(prev => prev.filter(app => app.id !== applicationId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete job application');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    applications,
    loading,
    error,
    pagination,
    fetchApplications,
    createApplication,
    updateApplicationStatus,
    deleteApplication,
  };
};

// Hook for candidate profiles
export const useCandidateProfiles = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  skills?: string[];
  availability?: string;
  location?: string;
}) => {
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await recruitmentService.getCandidateProfiles(params);
      setCandidates(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch candidate profiles');
      console.error('Error fetching candidate profiles:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const updateCandidateProfile = useCallback(async (candidateId: string, data: Partial<CandidateProfile>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedCandidate = await recruitmentService.updateCandidateProfile(candidateId, data);
      setCandidates(prev => prev.map(candidate => candidate.id === candidateId ? updatedCandidate : candidate));
      return updatedCandidate;
    } catch (err: any) {
      setError(err.message || 'Failed to update candidate profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadCandidateCV = useCallback(async (candidateId: string, file: File, onProgress?: (progress: number) => void) => {
    setLoading(true);
    setError(null);

    try {
      const result = await recruitmentService.uploadCandidateCV(candidateId, file, onProgress);
      // Refresh candidate data to get updated CV URL
      const updatedCandidate = await recruitmentService.getCandidateProfileById(candidateId);
      setCandidates(prev => prev.map(candidate => candidate.id === candidateId ? updatedCandidate : candidate));
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to upload CV');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    candidates,
    loading,
    error,
    pagination,
    fetchCandidates,
    updateCandidateProfile,
    uploadCandidateCV,
  };
};

// Hook for recruitment statistics
export const useRecruitmentStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await recruitmentService.getRecruitmentStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recruitment statistics');
      console.error('Error fetching recruitment stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats,
  };
};

// Hook for search functionality
export const useRecruitmentSearch = () => {
  const [searchResults, setSearchResults] = useState<{
    jobListings: JobListing[];
    candidates: CandidateProfile[];
  }>({ jobListings: [], candidates: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, filters?: {
    location?: string;
    skills?: string[];
    availability?: string;
  }) => {
    if (!query.trim()) {
      setSearchResults({ jobListings: [], candidates: [] });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [jobListings, candidates] = await Promise.all([
        recruitmentService.searchJobListings(query, {
          location: filters?.location,
        }),
        recruitmentService.searchCandidates(query, {
          skills: filters?.skills,
          availability: filters?.availability,
        }),
      ]);

      setSearchResults({ jobListings, candidates });
    } catch (err: any) {
      setError(err.message || 'Search failed');
      console.error('Error searching recruitment:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults({ jobListings: [], candidates: [] });
    setError(null);
  }, []);

  return {
    searchResults,
    loading,
    error,
    search,
    clearSearch,
  };
};

// Hook for foundation-specific data
export const useFoundationRecruitment = (foundationId: string) => {
  const [foundationJobListings, setFoundationJobListings] = useState<JobListing[]>([]);
  const [foundationApplications, setFoundationApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFoundationData = useCallback(async () => {
    if (!foundationId) return;

    setLoading(true);
    setError(null);

    try {
      const [jobListingsResponse, applicationsResponse] = await Promise.all([
        recruitmentService.getFoundationJobListings(foundationId),
        recruitmentService.getFoundationApplications(foundationId),
      ]);

      setFoundationJobListings(jobListingsResponse.data);
      setFoundationApplications(applicationsResponse.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch foundation recruitment data');
      console.error('Error fetching foundation recruitment data:', err);
    } finally {
      setLoading(false);
    }
  }, [foundationId]);

  useEffect(() => {
    fetchFoundationData();
  }, [fetchFoundationData]);

  return {
    foundationJobListings,
    foundationApplications,
    loading,
    error,
    refreshFoundationData: fetchFoundationData,
  };
};

// Hook for candidate-specific data
export const useCandidateRecruitment = (candidateId: string) => {
  const [candidateApplications, setCandidateApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidateData = useCallback(async () => {
    if (!candidateId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await recruitmentService.getCandidateApplications(candidateId);
      setCandidateApplications(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch candidate applications');
      console.error('Error fetching candidate applications:', err);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    fetchCandidateData();
  }, [fetchCandidateData]);

  return {
    candidateApplications,
    loading,
    error,
    refreshCandidateData: fetchCandidateData,
  };
};

export default useJobListings;