import { apiService } from './api';

export type InternPoolRequestStatus = 'OPEN' | 'REVIEWING' | 'FILLED' | 'CANCELLED';
export type InternPoolApplicationStatus = 'APPLIED' | 'REVIEWING' | 'ACCEPTED' | 'DECLINED' | 'CONFIRMED';
export type CompensationType = 'PAID' | 'UNPAID' | 'STIPEND';

export interface InternPoolRequest {
  id: string;
  foundationId: string;
  postedById: string;
  title: string;
  startDate: string;
  endDate: string;
  role: string;
  description?: string;
  location?: string;
  supervisorName?: string;
  compensationType: CompensationType;
  weeklyHours?: number;
  status: InternPoolRequestStatus;
  createdAt: string;
  updatedAt: string;
  foundation?: { id: string; name: string };
  applications?: InternPoolApplication[];
}

export interface InternPoolApplication {
  id: string;
  requestId: string;
  applicantId: string;
  status: InternPoolApplicationStatus;
  motivationLetter?: string;
  appliedAt: string;
  respondedAt?: string;
  note?: string;
  applicant?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    jobRole?: string;
    region?: string;
    skills?: string[];
    shortBio?: string;
    cvUrl?: string;
  };
  request?: InternPoolRequest;
}

export interface InternPoolSignals {
  openRequests: number;
  reviewingRequests: number;
  filledRequests: number;
  internPoolSize: number;
}

export interface CreateInternPoolRequestData {
  title: string;
  startDate: string;
  endDate: string;
  role: string;
  description?: string;
  location?: string;
  supervisorName?: string;
  compensationType?: CompensationType;
  weeklyHours?: number;
}

class InternPoolService {
  async createRequest(data: CreateInternPoolRequestData): Promise<InternPoolRequest> {
    const res = await apiService.post<InternPoolRequest>('/intern-pool/requests', data);
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to create intern pool request');
    return res.data;
  }

  async getRequests(filters?: { status?: string; foundationId?: string }): Promise<InternPoolRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.foundationId) params.set('foundationId', filters.foundationId);
    const res = await apiService.get<InternPoolRequest[]>(`/intern-pool/requests?${params.toString()}`);
    if (!res.success || !res.data) return [];
    return Array.isArray(res.data) ? res.data : [];
  }

  async getRequestById(id: string): Promise<InternPoolRequest> {
    const res = await apiService.get<InternPoolRequest>(`/intern-pool/requests/${id}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Not found');
    return res.data;
  }

  async cancelRequest(id: string): Promise<void> {
    await apiService.delete(`/intern-pool/requests/${id}`);
  }

  async applyToRequest(requestId: string, motivationLetter?: string): Promise<InternPoolApplication> {
    const res = await apiService.post<InternPoolApplication>(`/intern-pool/requests/${requestId}/apply`, { motivationLetter });
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to apply');
    return res.data;
  }

  async proposeToIntern(requestId: string, applicantId: string, note?: string): Promise<InternPoolApplication> {
    const res = await apiService.post<InternPoolApplication>(`/intern-pool/requests/${requestId}/propose`, { applicantId, note });
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to propose');
    return res.data;
  }

  async respondToApplication(
    applicationId: string,
    status: InternPoolApplicationStatus,
    note?: string,
  ): Promise<InternPoolApplication> {
    const res = await apiService.patch<InternPoolApplication>(`/intern-pool/applications/${applicationId}/respond`, { status, note });
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to respond');
    return res.data;
  }

  async getMyApplications(): Promise<InternPoolApplication[]> {
    const res = await apiService.get<InternPoolApplication[]>('/intern-pool/applications/my');
    if (!res.success || !res.data) return [];
    return Array.isArray(res.data) ? res.data : [];
  }

  async getAvailableInterns(filters?: { role?: string; region?: string }): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (filters?.role) params.set('role', filters.role);
    if (filters?.region) params.set('region', filters.region);
    const res = await apiService.get<unknown[]>(`/intern-pool/available-interns?${params.toString()}`);
    if (!res.success || !res.data) return [];
    return Array.isArray(res.data) ? res.data : [];
  }

  async getSignals(foundationId?: string): Promise<InternPoolSignals> {
    const params = foundationId ? `?foundationId=${foundationId}` : '';
    const res = await apiService.get<InternPoolSignals>(`/intern-pool/signals${params}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to load intern pool signals');
    return res.data;
  }

  async toggleAvailability(available: boolean): Promise<{ id: string; availableForInternship: boolean }> {
    const res = await apiService.patch<{ id: string; availableForInternship: boolean }>('/intern-pool/availability', { available });
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to update availability');
    return res.data;
  }
}

export const internPoolService = new InternPoolService();
