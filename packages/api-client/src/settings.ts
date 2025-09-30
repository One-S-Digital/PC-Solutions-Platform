import { apiClient } from './client'

export interface UserSettings {
  companyName?: string
  logoUrl?: string
  coverImageUrl?: string
  aboutText?: string
  vatNumber?: string
  regionsServed?: string[]
  languagesSpoken?: string[]
  preferredContactMethod?: 'Email' | 'Phone' | 'Platform Form'
  avgResponseType?: '< 24 h' | '2–3 d' | 'Other'
  externalBookingLink?: string
  directOrderLink?: string
  newRequestEmailToggle?: boolean
  digestRadio?: 'Daily' | 'Weekly' | 'None'
  promoRedemptionAlertsToggle?: boolean
  autoRespondToggle?: boolean
  currentTier?: 'Basic' | 'Essential' | 'Professional' | 'Suppliers' | 'Service Providers'
  nextInvoiceDate?: string
  stripePortalLink?: string
  timeZone?: string
  currency?: 'CHF' | 'EUR'
  anonymisedBenchmarkDataOptIn?: boolean
  hidePubliclyToggle?: boolean
  gdprDataDeletionRequestMade?: boolean
  // Supplier-specific
  defaultMOQ?: number
  packSize?: number
  autoAcceptOrderQtyLimit?: number
  // Provider-specific
  calComLink?: string
  deliveryTypeToggleRemote?: boolean
  defaultConsultationLength?: '30 min' | '60 min'
  // Foundation-specific
  plan?: 'Basic' | 'Essential' | 'Professional'
}

export interface OrganizationSettings {
  name: string
  type: 'foundation' | 'supplier' | 'service_provider'
  region: string
  email?: string
  phone?: string
  website?: string
  address?: string
  description?: string
  tags?: string[]
  capacity?: number
  pedagogy?: string[]
  languagesSpoken?: string[]
  directOrderLink?: string
}

export interface TeamMember {
  id: string
  email: string
  role: 'Viewer' | 'Editor'
  status: 'Active' | 'Pending'
}

export interface PromoCode {
  id: string
  code: string
  discountType: 'Percentage' | 'FixedAmount' | 'FreeMinutes'
  value: number
  expiryDate: string
  status: 'Active' | 'Expired' | 'Disabled'
  description?: string
}

export interface CreatePromoCodeRequest {
  code: string
  discountType: 'Percentage' | 'FixedAmount' | 'FreeMinutes'
  value: number
  expiryDate: string
  description?: string
}

export const settingsApi = {
  // User Settings
  getUserSettings: (): Promise<{ data: UserSettings }> => {
    return apiClient.get<{ data: UserSettings }>('/settings')
  },

  updateUserSettings: (data: Partial<UserSettings>): Promise<{ data: UserSettings }> => {
    return apiClient.put<{ data: UserSettings }>('/settings', data)
  },

  // Organization Settings
  getOrganizationSettings: (organizationId: string): Promise<{ data: OrganizationSettings }> => {
    return apiClient.get<{ data: OrganizationSettings }>(`/organizations/${organizationId}/settings`)
  },

  updateOrganizationSettings: (organizationId: string, data: Partial<OrganizationSettings>): Promise<{ data: OrganizationSettings }> => {
    return apiClient.put<{ data: OrganizationSettings }>(`/organizations/${organizationId}/settings`, data)
  },

  // Team Members
  getTeamMembers: (organizationId: string): Promise<{ data: TeamMember[] }> => {
    return apiClient.get<{ data: TeamMember[] }>(`/organizations/${organizationId}/team-members`)
  },

  addTeamMember: (organizationId: string, data: { email: string; role: 'Viewer' | 'Editor' }): Promise<{ data: TeamMember }> => {
    return apiClient.post<{ data: TeamMember }>(`/organizations/${organizationId}/team-members`, data)
  },

  updateTeamMember: (organizationId: string, teamMemberId: string, data: { role: 'Viewer' | 'Editor' }): Promise<{ data: TeamMember }> => {
    return apiClient.put<{ data: TeamMember }>(`/organizations/${organizationId}/team-members/${teamMemberId}`, data)
  },

  removeTeamMember: (organizationId: string, teamMemberId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/organizations/${organizationId}/team-members/${teamMemberId}`)
  },

  // Promo Codes
  getPromoCodes: (): Promise<{ data: PromoCode[] }> => {
    return apiClient.get<{ data: PromoCode[] }>('/promo-codes')
  },

  createPromoCode: (data: CreatePromoCodeRequest): Promise<{ data: PromoCode }> => {
    return apiClient.post<{ data: PromoCode }>('/promo-codes', data)
  },

  updatePromoCode: (promoCodeId: string, data: Partial<CreatePromoCodeRequest>): Promise<{ data: PromoCode }> => {
    return apiClient.put<{ data: PromoCode }>(`/promo-codes/${promoCodeId}`, data)
  },

  deletePromoCode: (promoCodeId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/promo-codes/${promoCodeId}`)
  },
}