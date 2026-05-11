const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  FOUNDATION: 'Foundation',
  PRODUCT_SUPPLIER: 'Product Supplier',
  SERVICE_PROVIDER: 'Service Provider',
  EDUCATOR: 'Educator',
  PARENT: 'Parent',
}

export function formatRole(role: string): string {
  return ROLE_LABELS[role] ?? role
}
