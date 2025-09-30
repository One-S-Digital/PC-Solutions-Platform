// Organization data adapter for transforming API responses to UI models
export interface ApiOrganization {
  id: string
  name: string
  type: 'foundation' | 'supplier' | 'service_provider'
  region: string
  logoUrl?: string
  coverImageUrl?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  description?: string
  tags?: string[]
  capacity?: number
  pedagogy?: string[]
  languagesSpoken?: string[]
  rating?: number
  badges?: string[]
  directOrderLink?: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt: string
}

export interface UIOrganization {
  id: string
  name: string
  type: 'foundation' | 'supplier' | 'service_provider'
  region: string
  logoUrl?: string
  coverImageUrl?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  description?: string
  tags?: string[]
  capacity?: number
  pedagogy?: string[]
  languagesSpoken?: string[]
  rating?: number
  badges?: string[]
  directOrderLink?: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt: string
  displayName: string
  typeLabel: string
  statusLabel: string
  formattedCreatedAt: string
}

export const organizationAdapter = {
  toUI: (apiOrg: ApiOrganization): UIOrganization => ({
    ...apiOrg,
    displayName: apiOrg.name,
    typeLabel: apiOrg.type === 'foundation' ? 'Daycare' : 
                apiOrg.type === 'supplier' ? 'Product Supplier' : 
                'Service Provider',
    statusLabel: apiOrg.status === 'active' ? 'Active' : 
                 apiOrg.status === 'inactive' ? 'Inactive' : 
                 'Pending',
    formattedCreatedAt: new Date(apiOrg.createdAt).toLocaleDateString(),
  }),
  
  toAPI: (uiOrg: Partial<UIOrganization>): Partial<ApiOrganization> => ({
    name: uiOrg.name,
    type: uiOrg.type,
    region: uiOrg.region,
    email: uiOrg.email,
    phone: uiOrg.phone,
    website: uiOrg.website,
    address: uiOrg.address,
    description: uiOrg.description,
    tags: uiOrg.tags,
    capacity: uiOrg.capacity,
    pedagogy: uiOrg.pedagogy,
    languagesSpoken: uiOrg.languagesSpoken,
    directOrderLink: uiOrg.directOrderLink,
    status: uiOrg.status,
  }),
}