// API Endpoints mapping to backend controllers
// Based on the backend NestJS controllers

export const API_ENDPOINTS = {
  // Health & System
  health: '/health',
  healthz: '/healthz',

  // Authentication (handled by Clerk, but for user sync)
  auth: {
    sync: '/auth/sync-user',
  },

  // Users & Profiles
  users: {
    me: '/users/me',
    update: '/users/me',
    organization: '/users/organization',
    sync: '/users/me/sync',
  },

  profiles: {
    get: '/profiles/me',
    update: '/profiles/me',
    organization: '/profiles/organization',
  },

  // Dashboard data
  dashboard: {
    overview: '/dashboard/overview',
    metrics: '/dashboard/metrics',
    recentActivity: '/dashboard/recent-activity',
    notifications: '/dashboard/notifications',
    announcements: '/dashboard/announcements',
    
    // Role-specific dashboards
    foundation: '/dashboard/foundation',
    supplier: '/dashboard/supplier',
    serviceProvider: '/dashboard/service-provider',
    educator: '/dashboard/educator',
    parent: '/dashboard/parent',
    admin: '/dashboard/admin',
  },

  // Marketplace
  marketplace: {
    products: {
      list: '/marketplace/products',
      get: (id: string) => `/marketplace/products/${id}`,
      create: '/marketplace/products',
      update: (id: string) => `/marketplace/products/${id}`,
      delete: (id: string) => `/marketplace/products/${id}`,
    },
    services: {
      list: '/marketplace/services',
      get: (id: string) => `/marketplace/services/${id}`,
      create: '/marketplace/services',
      update: (id: string) => `/marketplace/services/${id}`,
      delete: (id: string) => `/marketplace/services/${id}`,
    },
    orders: {
      list: '/marketplace/orders',
      get: (id: string) => `/marketplace/orders/${id}`,
      create: '/marketplace/orders',
      update: (id: string) => `/marketplace/orders/${id}`,
    },
    catalogs: {
      list: '/marketplace/catalogs',
      get: (id: string) => `/marketplace/catalogs/${id}`,
      create: '/marketplace/catalogs',
      update: (id: string) => `/marketplace/catalogs/${id}`,
      delete: (id: string) => `/marketplace/catalogs/${id}`,
    },
  },

  // Recruitment
  recruitment: {
    jobListings: {
      list: '/recruitment/job-listings',
      get: (id: string) => `/recruitment/job-listings/${id}`,
      create: '/recruitment/job-listings',
      update: (id: string) => `/recruitment/job-listings/${id}`,
      delete: (id: string) => `/recruitment/job-listings/${id}`,
    },
    applications: {
      list: '/recruitment/applications',
      get: (id: string) => `/recruitment/applications/${id}`,
      create: '/recruitment/applications',
      update: (id: string) => `/recruitment/applications/${id}`,
      delete: (id: string) => `/recruitment/applications/${id}`,
      myApplications: '/recruitment/applications/my',
      jobApplications: (jobId: string) => `/recruitment/applications/job/${jobId}`,
    },
  },

  // E-Learning
  elearning: {
    courses: {
      list: '/elearning/courses',
      get: (id: string) => `/elearning/courses/${id}`,
      create: '/elearning/courses',
      update: (id: string) => `/elearning/courses/${id}`,
      delete: (id: string) => `/elearning/courses/${id}`,
      enroll: (id: string) => `/elearning/courses/${id}/enroll`,
      progress: (id: string) => `/elearning/courses/${id}/progress`,
      modules: (courseId: string) => `/elearning/courses/${courseId}/modules`,
      lessons: (courseId: string, moduleId: string) => `/elearning/courses/${courseId}/modules/${moduleId}/lessons`,
    },
    quizzes: {
      create: '/elearning/quizzes',
      update: (id: string) => `/elearning/quizzes/${id}`,
      attempt: (id: string) => `/elearning/quizzes/${id}/attempt`,
    },
    certificates: {
      getUserCertificates: '/elearning/certificates',
      generate: (courseId: string) => `/elearning/certificates/${courseId}/generate`,
      verify: (id: string) => `/elearning/certificates/${id}/verify`,
    },
  },

  // Messaging
  messaging: {
    conversations: {
      list: '/messaging/conversations',
      get: (id: string) => `/messaging/conversations/${id}`,
      create: '/messaging/conversations',
      messages: (id: string) => `/messaging/conversations/${id}/messages`,
    },
    messages: {
      list: '/messaging/messages',
      create: '/messaging/messages',
    },
  },

  // File Upload
  uploads: {
    file: '/upload/file',
    scan: '/upload/scan',
    delete: (id: string) => `/upload/files/${id}`,
  },

  // Analytics (Admin)
  analytics: {
    overview: '/admin/analytics/overview',
    users: '/admin/analytics/users',
    organizations: '/admin/analytics/organizations',
    products: '/admin/analytics/products',
    jobs: '/admin/analytics/jobs',
    revenue: '/admin/analytics/revenue',
    system: '/admin/analytics/system',
  },

  // Leads
  leads: {
    list: '/leads',
    get: (id: string) => `/leads/${id}`,
    create: '/leads',
    update: (id: string) => `/leads/${id}`,
    delete: (id: string) => `/leads/${id}`,
    parentLeads: '/leads/parent-leads',
  },

  // Settings
  settings: {
    platform: '/admin/platform-settings',
    frontend: '/admin/frontend-settings',
    userSettings: '/settings/user',
    organizationSettings: '/settings/organization',
  },

  // Billing & Subscriptions
  billing: {
    subscriptions: '/billing/subscriptions',
    createSubscription: '/billing/subscriptions/create',
    cancelSubscription: (id: string) => `/billing/subscriptions/${id}/cancel`,
    updateBilling: '/billing/update',
    invoices: '/billing/invoices',
  },

  // Content Management (Admin)
  content: {
    list: '/content-management/content',
    get: (id: string) => `/content-management/content/${id}`,
    create: '/content-management/content',
    update: (id: string) => `/content-management/content/${id}`,
    delete: (id: string) => `/content-management/content/${id}`,
    categories: '/content-management/categories',
    moderation: '/content-management/moderation',
  },

  // System Monitoring (Admin)
  monitoring: {
    healthChecks: '/admin/monitoring/health-checks',
    metrics: '/admin/monitoring/metrics',
    alerts: '/admin/monitoring/alerts',
    systemStatus: '/admin/monitoring/system-status',
  },

  // Policy Alerts
  policyAlerts: {
    list: '/policy-alerts',
    get: (id: string) => `/policy-alerts/${id}`,
    create: '/policy-alerts',
    update: (id: string) => `/policy-alerts/${id}`,
    delete: (id: string) => `/policy-alerts/${id}`,
  },

  // User Management (Admin)
  userManagement: {
    users: '/admin/users',
    organizations: '/admin/organizations',
    roles: '/admin/users/roles',
    permissions: '/admin/users/permissions',
  },
} as const;
