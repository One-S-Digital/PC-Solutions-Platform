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

export function AdminDashboard() {
  const { user } = useUser();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen admin-app">
      {/* Header */}
      <header className="admin-header sticky top-0 z-40 backdrop-blur bg-admin-surface/80 border-b border-admin-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-admin-accent"></div>
          <h1 className="text-admin-text font-semibold tracking-tight">PC Solutions Admin</h1>
          <div className="ml-auto flex items-center gap-2">
            <AdminBadge variant="high">Admin</AdminBadge>
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
          <h1 className="text-3xl font-bold text-admin-text">Welcome back, {user?.firstName}!</h1>
          <p className="text-admin-muted mt-2">Here's what's happening on your platform today.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminMetric
            label="Total Users"
            value="1,234"
            change={{ value: 12, type: 'increase' }}
            icon="👥"
          />
          <AdminMetric
            label="Active Sessions"
            value="89"
            change={{ value: 5, type: 'decrease' }}
            icon="🔗"
          />
          <AdminMetric
            label="System Load"
            value="67%"
            change={{ value: 8, type: 'increase' }}
            icon="⚡"
          />
          <AdminMetric
            label="Error Rate"
            value="0.2%"
            change={{ value: 15, type: 'decrease' }}
            icon="📊"
          />
        </div>

        {/* Alerts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AdminCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-admin-text mb-4">System Alerts</h2>
            <div className="space-y-3">
              <AdminStatus variant="critical">
                <span>🚨</span>
                <span>High CPU usage detected on server-01</span>
              </AdminStatus>
              <AdminStatus variant="medium">
                <span>⚠️</span>
                <span>Database backup scheduled for tonight</span>
              </AdminStatus>
              <AdminStatus variant="low">
                <span>ℹ️</span>
                <span>New user registration: 15 today</span>
              </AdminStatus>
            </div>
          </AdminCard>

          <AdminCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-admin-text mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-admin-border">
                <span className="text-admin-text">User john.doe@example.com signed up</span>
                <AdminBadge variant="low">New</AdminBadge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-admin-border">
                <span className="text-admin-text">Foundation "ABC Daycare" updated profile</span>
                <AdminBadge variant="medium">Updated</AdminBadge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-admin-text">System maintenance completed</span>
                <AdminBadge variant="low">System</AdminBadge>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">Analytics</h3>
            <p className="text-admin-muted mb-4">View platform analytics and insights</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/analytics')}
            >
              View Analytics
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">User Management</h3>
            <p className="text-admin-muted mb-4">Manage platform users and permissions</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/users')}
            >
              Manage Users
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">Content Moderation</h3>
            <p className="text-admin-muted mb-4">Review and moderate platform content</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/moderation')}
            >
              Moderate Content
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">Platform Settings</h3>
            <p className="text-admin-muted mb-4">Configure platform settings</p>
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
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">Subscription Management</h3>
            <p className="text-admin-muted mb-4">Manage subscription plans and billing</p>
            <AdminButton 
              variant="secondary" 
              className="w-full"
              onClick={() => navigate('/admin/subscriptions')}
            >
              Manage Subscriptions
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">System Monitoring</h3>
            <p className="text-admin-muted mb-4">Monitor system health and performance</p>
            <AdminButton 
              variant="secondary" 
              className="w-full"
              onClick={() => navigate('/admin/monitoring')}
            >
              System Health
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">🔧</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">System Configuration</h3>
            <p className="text-admin-muted mb-4">Manage platform settings and integrations</p>
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
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">Email Notifications</h3>
            <p className="text-admin-muted mb-4">Manage email templates and notifications</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/email-notifications')}
            >
              Manage Emails
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">Notification Preferences</h3>
            <p className="text-admin-muted mb-4">Configure your notification settings</p>
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
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">Subscription Management</h3>
            <p className="text-admin-muted mb-4">Manage plans, billing, and feature flags</p>
            <AdminButton 
              variant="primary" 
              className="w-full"
              onClick={() => navigate('/admin/subscription-management')}
            >
              Manage Subscriptions
            </AdminButton>
          </AdminCard>
          
          <AdminCard className="p-6 text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-lg font-semibold text-admin-text mb-2">Feature Flags</h3>
            <p className="text-admin-muted mb-4">Control feature rollouts and access</p>
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
            <h2 className="text-xl font-semibold text-admin-text">Recent Users</h2>
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