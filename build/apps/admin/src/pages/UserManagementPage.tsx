import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { 
  AdminCard, 
  AdminButton, 
  AdminMetric, 
  AdminBadge,
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
} from '@repo/ui';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: string;
  lastActiveAt?: string;
  profile?: any;
  organization?: any;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  usersByRole: Array<{ role: string; count: number }>;
  recentRegistrations: number;
}

interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  lastActiveFrom?: string;
  lastActiveTo?: string;
}

export default function UserManagementPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filters, setFilters] = useState<UserFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await fetch(`/api/admin/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/users/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }

      const data = await response.json();
      setUserStats(data);
    } catch (err: any) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, [page, filters]);

  const handleBulkOperation = async (operation: string) => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          operation,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform bulk operation');
      }

      alert(`Bulk ${operation} completed successfully`);
      setSelectedUsers([]);
      fetchUsers();
    } catch (err: any) {
      alert(`Failed to perform bulk operation: ${err.message}`);
    }
  };

  const handleExportUsers = async () => {
    try {
      const token = await getToken();
      const queryParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      );

      const response = await fetch(`/api/admin/users/export/csv?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export users');
      }

      const data = await response.json();
      
      // Create and download CSV file
      const blob = new Blob([data.csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Failed to export users: ${err.message}`);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(user => user.id));
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent mx-auto mb-4"></div>
          <p className="text-admin-muted">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-app">
      {/* Header */}
      <div className="admin-header sticky top-0 z-40 backdrop-blur bg-admin-surface/80 border-b border-admin-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1.5 rounded-full bg-admin-accent"></div>
            <h1 className="text-admin-text font-semibold tracking-tight">User Management</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <AdminButton 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </AdminButton>
            <AdminButton 
              variant="secondary" 
              size="sm"
              onClick={handleExportUsers}
            >
              Export CSV
            </AdminButton>
            <AdminButton 
              variant="primary" 
              size="sm"
              onClick={fetchUsers}
            >
              Refresh
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* User Stats */}
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <AdminMetric
              label="Total Users"
              value={userStats.totalUsers.toLocaleString()}
              change={{ value: userStats.recentRegistrations, type: 'increase' }}
              icon="👥"
            />
            <AdminMetric
              label="Active Users"
              value={userStats.activeUsers.toLocaleString()}
              change={{ value: 5, type: 'increase' }}
              icon="✅"
            />
            <AdminMetric
              label="Inactive Users"
              value={userStats.inactiveUsers.toLocaleString()}
              change={{ value: 2, type: 'decrease' }}
              icon="⏸️"
            />
            <AdminMetric
              label="Suspended Users"
              value={userStats.suspendedUsers.toLocaleString()}
              change={{ value: 1, type: 'increase' }}
              icon="🚫"
            />
            <AdminMetric
              label="New This Week"
              value={userStats.recentRegistrations.toLocaleString()}
              change={{ value: 8, type: 'increase' }}
              icon="🆕"
            />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <AdminCard className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-admin-text mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">Role</label>
                <select 
                  className="admin-input w-full px-3 py-2"
                  value={filters.role || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value || undefined }))}
                >
                  <option value="">All Roles</option>
                  <option value="FOUNDATION">Foundation</option>
                  <option value="EDUCATOR">Educator</option>
                  <option value="PRODUCT_SUPPLIER">Product Supplier</option>
                  <option value="SERVICE_PROVIDER">Service Provider</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">Status</label>
                <select 
                  className="admin-input w-full px-3 py-2"
                  value={filters.status || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">Search</label>
                <input 
                  type="text"
                  className="admin-input w-full px-3 py-2"
                  placeholder="Search by name or email..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
                />
              </div>
              
              <div className="flex items-end">
                <AdminButton 
                  variant="outline" 
                  onClick={() => setFilters({})}
                  className="w-full"
                >
                  Clear Filters
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        )}

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <AdminCard className="p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-admin-text font-medium">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </span>
                <AdminButton variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </AdminButton>
              </div>
              
              <div className="flex items-center gap-2">
                <AdminButton 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleBulkOperation('activate')}
                >
                  Activate
                </AdminButton>
                <AdminButton 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleBulkOperation('deactivate')}
                >
                  Deactivate
                </AdminButton>
                <AdminButton 
                  variant="danger" 
                  size="sm"
                  onClick={() => handleBulkOperation('suspend')}
                >
                  Suspend
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        )}

        {/* Users Table */}
        <AdminCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-admin-text">Users</h2>
            <div className="flex items-center gap-2">
              <AdminButton 
                variant="outline" 
                size="sm"
                onClick={selectAllUsers}
              >
                Select All
              </AdminButton>
              <AdminButton 
                variant="outline" 
                size="sm"
                onClick={clearSelection}
              >
                Clear Selection
              </AdminButton>
            </div>
          </div>
          
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableHeaderCell>
                  <input 
                    type="checkbox" 
                    className="admin-checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={selectAllUsers}
                  />
                </AdminTableHeaderCell>
                <AdminTableHeaderCell>Name</AdminTableHeaderCell>
                <AdminTableHeaderCell>Email</AdminTableHeaderCell>
                <AdminTableHeaderCell>Role</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>Organization</AdminTableHeaderCell>
                <AdminTableHeaderCell>Last Active</AdminTableHeaderCell>
                <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
              </AdminTableRow>
            </AdminTableHeader>
            <AdminTableBody>
              {users.map((user) => (
                <AdminTableRow key={user.id}>
                  <AdminTableCell>
                    <input 
                      type="checkbox" 
                      className="admin-checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                    />
                  </AdminTableCell>
                  <AdminTableCell>
                    {user.firstName} {user.lastName}
                  </AdminTableCell>
                  <AdminTableCell>{user.email}</AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge variant="low">{user.role}</AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge 
                      variant={
                        user.status === 'ACTIVE' ? 'low' : 
                        user.status === 'INACTIVE' ? 'medium' : 'critical'
                      }
                    >
                      {user.status}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    {user.organization?.name || '-'}
                  </AdminTableCell>
                  <AdminTableCell>
                    {user.lastActiveAt 
                      ? new Date(user.lastActiveAt).toLocaleDateString()
                      : 'Never'
                    }
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="flex gap-2">
                      <AdminButton variant="outline" size="sm">
                        Edit
                      </AdminButton>
                      <AdminButton variant="danger" size="sm">
                        Suspend
                      </AdminButton>
                    </div>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-admin-muted">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <AdminButton 
                variant="outline" 
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </AdminButton>
              <AdminButton 
                variant="outline" 
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </AdminButton>
            </div>
          </div>
        </AdminCard>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
      </main>
    </div>
  );
}