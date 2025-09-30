// Parent lead data adapter for transforming API responses to UI models
export interface ApiParentLead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  childName: string
  childAge: number
  preferredStartDate?: string
  location: string
  specialRequirements?: string
  status: 'pending' | 'contacted' | 'enrolled' | 'declined'
  createdAt: string
  updatedAt: string
}

export interface UIParentLead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  childName: string
  childAge: number
  preferredStartDate?: string
  location: string
  specialRequirements?: string
  status: 'pending' | 'contacted' | 'enrolled' | 'declined'
  createdAt: string
  updatedAt: string
  displayName: string
  statusLabel: string
  statusColor: string
  formattedCreatedAt: string
  formattedPreferredStartDate?: string
}

export interface CreateParentLeadRequest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  childName: string
  childAge: number
  preferredStartDate?: string
  location: string
  specialRequirements?: string
}

export const parentLeadAdapter = {
  toUI: (apiLead: ApiParentLead): UIParentLead => ({
    ...apiLead,
    displayName: `${apiLead.firstName} ${apiLead.lastName}`,
    statusLabel: apiLead.status === 'pending' ? 'Pending' :
                 apiLead.status === 'contacted' ? 'Contacted' :
                 apiLead.status === 'enrolled' ? 'Enrolled' : 'Declined',
    statusColor: apiLead.status === 'pending' ? 'yellow' :
                 apiLead.status === 'contacted' ? 'blue' :
                 apiLead.status === 'enrolled' ? 'green' : 'red',
    formattedCreatedAt: new Date(apiLead.createdAt).toLocaleDateString(),
    formattedPreferredStartDate: apiLead.preferredStartDate ? 
      new Date(apiLead.preferredStartDate).toLocaleDateString() : undefined,
  }),
  
  toAPI: (uiLead: CreateParentLeadRequest): CreateParentLeadRequest => ({
    firstName: uiLead.firstName,
    lastName: uiLead.lastName,
    email: uiLead.email,
    phone: uiLead.phone,
    childName: uiLead.childName,
    childAge: uiLead.childAge,
    preferredStartDate: uiLead.preferredStartDate,
    location: uiLead.location,
    specialRequirements: uiLead.specialRequirements,
  }),
}