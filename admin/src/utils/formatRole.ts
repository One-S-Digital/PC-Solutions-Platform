import i18n from '../i18n'

const ROLE_FALLBACKS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  FOUNDATION: 'Foundation',
  PRODUCT_SUPPLIER: 'Product Supplier',
  SERVICE_PROVIDER: 'Service Provider',
  EDUCATOR: 'Educator',
  PARENT: 'Parent',
}

export function formatRole(role: string): string {
  const fallback = ROLE_FALLBACKS[role] ?? role
  return i18n.t(`common:userRoles.${role}`, fallback)
}
