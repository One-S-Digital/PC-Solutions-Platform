import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { UserButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { 
  AdminCard, 
  AdminButton, 
  AdminMetric, 
  AdminStatus, 
  AdminBadge,
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
  ThemeToggle,
  LanguageSwitcher
} from '@repo/ui';
import { 
  UsersIcon, 
  ChartBarIcon, 
  CpuChipIcon, 
  ExclamationTriangleIcon,
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  CreditCardIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  EnvelopeIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';

export function AdminDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen admin-app">
      {/* Header */}
      <header className="admin-header sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-admin-mint"></div>
          <h1 className="text-admin-charcoal font-semibold tracking-tight">PC Solutions Admin</h1>
          <div className="ml-auto flex items-center gap-2">
            <AdminBadge variant="mint">Admin</AdminBadge>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
            <LanguageSwitcher />
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-admin-charcoal">Welcome back, {user?.firstName}!</h1>
          <p className="text-admin-gray mt-2">Here's what's happening on your platform today.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminCard variant="metric" className="p-0 overflow-hidden" hoverEffect>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="p-2.5 inline-flex rounded-lg bg-admin-teal-light">
                  <UsersIcon className="h-6 w-6 text-admin-teal" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  +12%
                </span>
              </div>
              <h3 className="text-3xl font-semibold text-admin-charcoal mt-3">1,234</h3>
              <p className="text-sm text-admin-gray">Total Users</p>
            </div>
            <div className="px-5 py-2.5 text-xs text-center bg-admin-teal-light">
              <button className="font-medium text-admin-teal hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-admin-teal rounded">
                View Details &rarr;
              </button>
            </div>
          </AdminCard>

          <AdminCard variant="metric" className="p-0 overflow-hidden" hoverEffect>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="p-2.5 inline-flex rounded-lg bg-admin-mint-light">
                  <ChartBarIcon className="h-6 w-6 text-admin-mint" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  -5%
                </span>
              </div>
              <h3 className="text-3xl font-semibold text-admin-charcoal mt-3">89</h3>
              <p className="text-sm text-admin-gray">Active Sessions</p>
            </div>
            <div className="px-5 py-2.5 text-xs text-center bg-admin-mint-light">
              <button className="font-medium text-admin-mint hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-admin-mint rounded">
                View Details &rarr;
              </button>
            </div>
          </AdminCard>

          <AdminCard variant="metric" className="p-0 overflow-hidden" hoverEffect>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="p-2.5 inline-flex rounded-lg bg-admin-coral-light">
                  <CpuChipIcon className="h-6 w-6 text-admin-coral" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                  +8%
                </span>
              </div>
              <h3 className="text-3xl font-semibold text-admin-charcoal mt-3">67%</h3>
              <p className="text-sm text-admin-gray">System Load</p>
            </div>
            <div className="px-5 py-2.5 text-xs text-center bg-admin-coral-light">
              <button className="font-medium text-admin-coral hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-admin-coral rounded">
                View Details &rarr;
              </button>
            </div>
          </AdminCard>

          <AdminCard variant="metric" className="p-0 overflow-hidden" hoverEffect>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="p-2.5 inline-flex rounded-lg bg-admin-sand-light">
                  <ExclamationTriangleIcon className="h-6 w-6 text-admin-sand" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  -15%
                </span>
              </div>
              <h3 className="text-3xl font-semibold text-admin-charcoal mt-3">0.2%</h3>
              <p className="text-sm text-admin-gray">Error Rate</p>
            </div>
            <div className="px-5 py-2.5 text-xs text-center bg-admin-sand-light">
              <button className="font-medium text-admin-sand hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-admin-sand rounded">
                View Details &rarr;
              </button>
            </div>
          </AdminCard>
        </div>

        {/* Alerts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AdminCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-admin-charcoal mb-4">System Alerts</h2>
            <div className="space-y-3">
              <AdminStatus variant="critical">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span>High CPU usage detected on server-01</span>
              </AdminStatus>
              <AdminStatus variant="medium">
                <CogIcon className="h-5 w-5" />
                <span>Database backup scheduled for tonight</span>
              </AdminStatus>
              <AdminStatus variant="low">
                <UsersIcon className="h-5 w-5" />
                <span>New user registration: 15 today</span>
              </AdminStatus>
            </div>
          </AdminCard>

          <AdminCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-admin-charcoal mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-admin-charcoal">User john.doe@example.com signed up</span>
                <AdminBadge variant="low">New</AdminBadge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-admin-charcoal">Foundation "ABC Daycare" updated profile</span>
                <AdminBadge variant="medium">Updated</AdminBadge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-admin-charcoal">System maintenance completed</span>
                <AdminBadge variant="low">System</AdminBadge>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-teal-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="h-6 w-6 text-admin-teal" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">Analytics</h3>
            <p className="text-admin-gray mb-4">View platform analytics and insights</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/analytics')}
            >
              View Analytics
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-mint-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="h-6 w-6 text-admin-mint" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">User Management</h3>
            <p className="text-admin-gray mb-4">Manage platform users and permissions</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/users')}
            >
              Manage Users
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-coral-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="h-6 w-6 text-admin-coral" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">Content Moderation</h3>
            <p className="text-admin-gray mb-4">Review and moderate platform content</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/moderation')}
            >
              Moderate Content
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-sand-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <CogIcon className="h-6 w-6 text-admin-sand" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">Platform Settings</h3>
            <p className="text-admin-gray mb-4">Configure platform settings</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/settings')}
            >
              Open Settings
            </AdminButton>
          </AdminCard>
        </div>

        {/* Phase 3 Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-teal-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <CreditCardIcon className="h-6 w-6 text-admin-teal" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">Subscription Management</h3>
            <p className="text-admin-gray mb-4">Manage subscription plans and billing</p>
            <AdminButton 
              variant="secondary" 
              className="w-full"
              onClick={() => navigate('/admin/subscriptions')}
            >
              Manage Subscriptions
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-mint-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <ServerIcon className="h-6 w-6 text-admin-mint" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">System Monitoring</h3>
            <p className="text-admin-gray mb-4">Monitor system health and performance</p>
            <AdminButton 
              variant="secondary" 
              className="w-full"
              onClick={() => navigate('/admin/monitoring')}
            >
              System Health
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-coral-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <WrenchScrewdriverIcon className="h-6 w-6 text-admin-coral" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">System Configuration</h3>
            <p className="text-admin-gray mb-4">Manage platform settings and integrations</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/system-configuration')}
            >
              System Config
            </AdminButton>
          </AdminCard>
        </div>

        {/* Email Notification System */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-sand-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <EnvelopeIcon className="h-6 w-6 text-admin-sand" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">Email Notifications</h3>
            <p className="text-admin-gray mb-4">Manage email templates and notifications</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/email-notifications')}
            >
              Manage Emails
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-teal-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <BellIcon className="h-6 w-6 text-admin-teal" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">Notification Preferences</h3>
            <p className="text-admin-gray mb-4">Configure your notification settings</p>
            <AdminButton 
              variant="secondary" 
              className="w-full"
              onClick={() => navigate('/admin/notification-preferences')}
            >
              My Preferences
            </AdminButton>
          </AdminCard>
        </div>

        {/* Subscription Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-mint-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <CreditCardIcon className="h-6 w-6 text-admin-mint" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">Subscription Management</h3>
            <p className="text-admin-gray mb-4">Manage plans, billing, and feature flags</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/subscription-management')}
            >
              Manage Subscriptions
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center" hoverEffect>
            <div className="w-12 h-12 bg-admin-coral-light rounded-lg flex items-center justify-center mx-auto mb-4">
              <RocketLaunchIcon className="h-6 w-6 text-admin-coral" />
            </div>
            <h3 className="text-lg font-semibold text-admin-charcoal mb-2">Feature Flags</h3>
            <p className="text-admin-gray mb-4">Control feature rollouts and access</p>
            <AdminButton 
              variant="secondary" 
              className="w-full"
              onClick={() => navigate('/admin/subscription-management?tab=feature-flags')}
            >
              Manage Features
            </AdminButton>
          </AdminCard>
        </div>

        {/* Users Table */}
        <AdminCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-admin-charcoal">Recent Users</h2>
            <AdminButton variant="primary">Export Data</AdminButton>
          </div>
          
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableHeaderCell>Name</AdminTableHeaderCell>
                <AdminTableHeaderCell>Email</AdminTableHeaderCell>
                <AdminTableHeaderCell>Role</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>Last Active</AdminTableHeaderCell>
                <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
              </AdminTableRow>
            </AdminTableHeader>
            <AdminTableBody>
              <AdminTableRow>
                <AdminTableCell>John Doe</AdminTableCell>
                <AdminTableCell>john.doe@example.com</AdminTableCell>
                <AdminTableCell>Foundation</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge variant="low">Active</AdminBadge>
                </AdminTableCell>
                <AdminTableCell>2 hours ago</AdminTableCell>
                <AdminTableCell>
                  <div className="flex gap-2">
                    <AdminButton variant="outline" size="sm">Edit</AdminButton>
                    <AdminButton variant="danger" size="sm">Suspend</AdminButton>
                  </div>
                </AdminTableCell>
              </AdminTableRow>
              <AdminTableRow>
                <AdminTableCell>Jane Smith</AdminTableCell>
                <AdminTableCell>jane.smith@example.com</AdminTableCell>
                <AdminTableCell>Educator</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge variant="medium">Pending</AdminBadge>
                </AdminTableCell>
                <AdminTableCell>1 day ago</AdminTableCell>
                <AdminTableCell>
                  <div className="flex gap-2">
                    <AdminButton variant="outline" size="sm">Edit</AdminButton>
                    <AdminButton variant="primary" size="sm">Approve</AdminButton>
                  </div>
                </AdminTableCell>
              </AdminTableRow>
              <AdminTableRow>
                <AdminTableCell>Bob Johnson</AdminTableCell>
                <AdminTableCell>bob.johnson@example.com</AdminTableCell>
                <AdminTableCell>Product Supplier</AdminTableCell>
                <AdminTableCell>
                  <AdminBadge variant="critical">Suspended</AdminBadge>
                </AdminTableCell>
                <AdminTableCell>1 week ago</AdminTableCell>
                <AdminTableCell>
                  <div className="flex gap-2">
                    <AdminButton variant="outline" size="sm">Edit</AdminButton>
                    <AdminButton variant="primary" size="sm">Reactivate</AdminButton>
                  </div>
                </AdminTableCell>
              </AdminTableRow>
            </AdminTableBody>
          </AdminTable>
        </AdminCard>
      </main>
    </div>
  );
}