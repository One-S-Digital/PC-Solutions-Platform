import { apiService } from './api';

export type ReplacementRequestStatus = 'OPEN' | 'MATCHED' | 'FILLED' | 'CANCELLED';
export type ReplacementMatchStatus = 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'CONFIRMED';

export interface ReplacementRequest {
  id: string;
  foundationId: string;
  requestedById: string;
  startDate: string;
  endDate: string;
  shiftStart?: string;
  shiftEnd?: string;
  role: string;
  description?: string;
  location?: string;
  urgency: 'NORMAL' | 'URGENT';
  status: ReplacementRequestStatus;
  createdAt: string;
  updatedAt: string;
  foundation?: { id: string; name: string };
  matches?: ReplacementMatch[];
}

export interface ReplacementMatch {
  id: string;
  requestId: string;
  educatorId: string;
  status: ReplacementMatchStatus;
  proposedAt: string;
  respondedAt?: string;
  note?: string;
  educator?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    jobRole?: string;
    region?: string;
    skills?: string[];
  };
  request?: ReplacementRequest;
}

export interface StaffingSignals {
  openRequests: number;
  matchedRequests: number;
  filledRequests: number;
  replacementPoolSize: number;
}

export interface CreateReplacementRequestData {
  startDate: string;
  endDate: string;
  shiftStart?: string;
  shiftEnd?: string;
  role: string;
  description?: string;
  location?: string;
  urgency?: 'NORMAL' | 'URGENT';
}

class ReplacementsService {
  async createRequest(data: CreateReplacementRequestData): Promise<ReplacementRequest> {
    const res = await apiService.post<ReplacementRequest>('/replacements/requests', data);
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to create replacement request');
    return res.data;
  }

  async getRequests(filters?: { status?: string; foundationId?: string }): Promise<ReplacementRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.foundationId) params.set('foundationId', filters.foundationId);
    const res = await apiService.get<ReplacementRequest[]>(`/replacements/requests?${params.toString()}`);
    if (!res.success || !res.data) return [];
    return Array.isArray(res.data) ? res.data : [];
  }

  async getRequestById(id: string): Promise<ReplacementRequest> {
    const res = await apiService.get<ReplacementRequest>(`/replacements/requests/${id}`);
    if (!res.success || !res.data) throw new Error(res.message || 'Not found');
    return res.data;
  }

  async cancelRequest(id: string): Promise<void> {
    await apiService.delete(`/replacements/requests/${id}`);
  }

  async proposeMatch(requestId: string, educatorId: string): Promise<ReplacementMatch> {
    const res = await apiService.post<ReplacementMatch>(`/replacements/requests/${requestId}/matches`, { educatorId });
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to propose match');
    return res.data;
  }

  async respondToMatch(matchId: string, status: ReplacementMatchStatus, note?: string): Promise<ReplacementMatch> {
    const res = await apiService.patch<ReplacementMatch>(`/replacements/matches/${matchId}/respond`, { status, note });
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to respond to match');
    return res.data;
  }

  async getMyMatches(): Promise<ReplacementMatch[]> {
    const res = await apiService.get<ReplacementMatch[]>('/replacements/matches/my');
    if (!res.success || !res.data) return [];
    return Array.isArray(res.data) ? res.data : [];
  }

  async getStaffingSignals(foundationId?: string): Promise<StaffingSignals> {
    const params = foundationId ? `?foundationId=${foundationId}` : '';
    const res = await apiService.get<StaffingSignals>(`/replacements/signals${params}`);
    if (!res.success || !res.data) return { openRequests: 0, matchedRequests: 0, filledRequests: 0, replacementPoolSize: 0 };
    return res.data;
  }

  async toggleAvailability(available: boolean): Promise<{ id: string; availableForReplacement: boolean }> {
    const res = await apiService.patch<{ id: string; availableForReplacement: boolean }>('/replacements/availability', { available });
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to update availability');
    return res.data;
  }

  async getKpiMetrics(foundationId?: string): Promise<StaffingSignals & { avgFulfillmentDays: number | null; filledCount: number }> {
    const params = foundationId ? `?foundationId=${foundationId}` : '';
    const res = await apiService.get<StaffingSignals & { avgFulfillmentDays: number | null; filledCount: number }>(`/replacements/kpi${params}`);
    if (!res.success || !res.data) return { openRequests: 0, matchedRequests: 0, filledRequests: 0, replacementPoolSize: 0, avgFulfillmentDays: null, filledCount: 0 };
    return res.data;
  }

  async getAvailableEducators(filters?: { role?: string; region?: string }): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (filters?.role) params.set('role', filters.role);
    if (filters?.region) params.set('region', filters.region);
    const res = await apiService.get<unknown[]>(`/replacements/available-educators?${params.toString()}`);
    if (!res.success || !res.data) return [];
    return Array.isArray(res.data) ? res.data : [];
  }
}

export const replacementsService = new ReplacementsService();
