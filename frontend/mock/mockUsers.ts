import { User, UserRole } from '../types';

export interface MockRoleLoginOption {
  role: UserRole;
  label: string;
  description: string;
  user: User;
}

const DEFAULT_CREATED_AT = '2024-01-15T09:00:00.000Z';
const DEFAULT_MEMBER_SINCE = '2024-01-20T09:00:00.000Z';

const roleSlug = (role: UserRole) => role.toLowerCase();

const createMockUser = (role: UserRole, overrides: Partial<User>): User => {
  const slug = roleSlug(role);
  const firstName = overrides.firstName ?? `Mock`;
  const lastName = overrides.lastName ?? overrides.name?.split(' ').slice(-1)[0] ?? role.replace(/_/g, ' ');
  const nowIso = new Date().toISOString();

  const base: User = {
    id: overrides.id ?? `mock-${slug}-user`,
    clerkId: overrides.clerkId ?? `mock-${slug}-clerk`,
    email: overrides.email ?? `mock+${slug}@procreche.com`,
    firstName,
    lastName,
    role,
    isActive: true,
    createdAt: overrides.createdAt ?? DEFAULT_CREATED_AT,
    updatedAt: overrides.updatedAt ?? nowIso,
    name: overrides.name ?? `${firstName} ${lastName}`.trim(),
    status: overrides.status ?? 'Active',
    lastLogin: overrides.lastLogin ?? nowIso,
    memberSince: overrides.memberSince ?? DEFAULT_MEMBER_SINCE,
    avatarUrl:
      overrides.avatarUrl ??
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        `${firstName} ${lastName}`.trim(),
      )}`,
    orgId: overrides.orgId,
    orgName: overrides.orgName,
    region: overrides.region ?? 'Geneva',
    plan: overrides.plan,
    phoneNumber: overrides.phoneNumber,
    workExperience: overrides.workExperience,
    education: overrides.education,
    certifications: overrides.certifications,
    skills: overrides.skills,
    availability: overrides.availability,
    cvUrl: overrides.cvUrl,
    stripeCustomerId: overrides.stripeCustomerId,
    lastActiveAt: overrides.lastActiveAt ?? nowIso,
  };

  return { ...base, ...overrides };
};

export const MOCK_ROLE_LOGIN_OPTIONS: MockRoleLoginOption[] = [
  {
    role: UserRole.SUPER_ADMIN,
    label: 'Super Admin',
    description: 'Full platform control with all administrative modules.',
    user: createMockUser(UserRole.SUPER_ADMIN, {
      firstName: 'Sienna',
      lastName: 'Owner',
      email: 'mock.superadmin@procreche.com',
    }),
  },
  {
    role: UserRole.ADMIN,
    label: 'Admin',
    description: 'Manage content, policies, and platform settings.',
    user: createMockUser(UserRole.ADMIN, {
      firstName: 'Alex',
      lastName: 'Admin',
      email: 'mock.admin@procreche.com',
    }),
  },
  {
    role: UserRole.FOUNDATION,
    label: 'Foundation (Daycare)',
    description: 'Explore the daycare operator dashboard and workflows.',
    user: createMockUser(UserRole.FOUNDATION, {
      firstName: 'Fiona',
      lastName: 'Daycare',
      email: 'mock.foundation@procreche.com',
      orgId: 'org-foundation-001',
      orgName: 'Kinderwelt Daycare',
      plan: 'Essential',
      region: 'Zurich',
    }),
  },
  {
    role: UserRole.PRODUCT_SUPPLIER,
    label: 'Product Supplier',
    description: 'Preview marketplace listings and supplier tools.',
    user: createMockUser(UserRole.PRODUCT_SUPPLIER, {
      firstName: 'Samuel',
      lastName: 'Supplier',
      email: 'mock.supplier@procreche.com',
      orgId: 'org-supplier-001',
      orgName: 'EduToys AG',
      plan: 'Supplier',
      region: 'Basel',
    }),
  },
  {
    role: UserRole.SERVICE_PROVIDER,
    label: 'Service Provider',
    description: 'Review service requests and provider features.',
    user: createMockUser(UserRole.SERVICE_PROVIDER, {
      firstName: 'Sofia',
      lastName: 'Services',
      email: 'mock.service@procreche.com',
      orgId: 'org-service-001',
      orgName: 'CleanCare Facilities',
      plan: 'Service Provider',
      region: 'Geneva',
    }),
  },
  {
    role: UserRole.PARENT,
    label: 'Parent',
    description: 'View the parent enquiry experience and dashboards.',
    user: createMockUser(UserRole.PARENT, {
      firstName: 'Pauline',
      lastName: 'Parent',
      email: 'mock.parent@procreche.com',
      region: 'Vaud',
    }),
  },
  {
    role: UserRole.EDUCATOR,
    label: 'Job Seeker / Candidate',
    description: 'Experience the recruitment and application portal.',
    user: createMockUser(UserRole.EDUCATOR, {
      firstName: 'Elliot',
      lastName: 'Educator',
      email: 'mock.educator@procreche.com',
      workExperience: '5 years in early childhood education',
      education: 'Bachelor of Education',
      skills: ['Curriculum Planning', 'Parent Communication', 'First Aid'],
    }),
  },
];

export const getMockUserByRole = (role: UserRole): User | null => {
  const option = MOCK_ROLE_LOGIN_OPTIONS.find((item) => item.role === role);
  if (!option) {
    return null;
  }

  return { ...option.user };
};
