// User data adapter for transforming API responses to UI models
export interface ApiUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  organizationId?: string
  organizationName?: string
  avatarUrl?: string
  status: 'active' | 'inactive' | 'pending'
  lastLogin?: string
  region?: string
  plan?: string
  memberSince?: string
}

export interface UIUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  organizationId?: string
  organizationName?: string
  avatarUrl?: string
  status: 'active' | 'inactive' | 'pending'
  lastLogin?: string
  region?: string
  plan?: string
  memberSince?: string
  displayName: string
  initials: string
}

export const userAdapter = {
  toUI: (apiUser: ApiUser): UIUser => ({
    id: apiUser.id,
    email: apiUser.email,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    role: apiUser.role,
    organizationId: apiUser.organizationId,
    organizationName: apiUser.organizationName,
    avatarUrl: apiUser.avatarUrl,
    status: apiUser.status,
    lastLogin: apiUser.lastLogin,
    region: apiUser.region,
    plan: apiUser.plan,
    memberSince: apiUser.memberSince,
    displayName: `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim() || apiUser.email,
    initials: `${apiUser.firstName?.[0] || ''}${apiUser.lastName?.[0] || ''}`.toUpperCase() || apiUser.email[0].toUpperCase(),
  }),
  
  toAPI: (uiUser: Partial<UIUser>): Partial<ApiUser> => ({
    firstName: uiUser.firstName,
    lastName: uiUser.lastName,
    email: uiUser.email,
    role: uiUser.role,
    organizationId: uiUser.organizationId,
    avatarUrl: uiUser.avatarUrl,
    status: uiUser.status,
    region: uiUser.region,
    plan: uiUser.plan,
  }),
}