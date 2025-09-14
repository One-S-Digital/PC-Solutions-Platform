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

interface ModerationItem {
  id: string;
  contentId: string;
  contentType: string;
  status: string;
  priority: string;
  reason?: string;
  notes?: string;
  createdAt: string;
  flaggedAt?: string;
  moderatedAt?: string;
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  moderator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ModerationStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalFlagged: number;
  pendingByType: Array<{ contentType: string; count: number }>;
  pendingByPriority: Array<{ priority: string; count: number }>;
}

interface ContentDetails {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export default function ContentModerationPage() {
  const { getToken } = useAuth();
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [moderationStats, setModerationStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [contentDetails, setContentDetails] = useState<ContentDetails | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    contentType: '',
    status: '',
    priority: '',
  });

  const fetchModerationQueue = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      });

      const response = await fetch(`/api/admin/content-moderation/queue?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch moderation queue');
      }

      const data = await response.json();
      setModerationItems(data.items);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchModerationStats = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/content-moderation/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch moderation stats');
      }

      const data = await response.json();
      setModerationStats(data);
    } catch (err: any) {
      console.error('Failed to fetch moderation stats:', err);
    }
  };

  const fetchContentDetails = async (contentId: string, contentType: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/admin/content-moderation/content/${contentId}/${contentType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch content details');
      }

      const data = await response.json();
      setContentDetails(data);
    } catch (err: any) {
      console.error('Failed to fetch content details:', err);
    }
  };

  useEffect(() => {
    fetchModerationQueue();
    fetchModerationStats();
  }, [page, filters]);

  const handleModerationAction = async (action: string, reason?: string, notes?: string) => {
    if (!selectedItem) return;

    try {
      const token = await getToken();
      const response = await fetch('/api/admin/content-moderation/moderate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId: selectedItem.contentId,
          contentType: selectedItem.contentType,
          action,
          reason,
          notes,
          moderatorId: 'current-user-id', // This would be the actual current user ID
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform moderation action');
      }

      alert(`Content ${action.toLowerCase()}d successfully`);
      setSelectedItem(null);
      setContentDetails(null);
      fetchModerationQueue();
      fetchModerationStats();
    } catch (err: any) {
      alert(`Failed to perform moderation action: ${err.message}`);
    }
  };

  const openContentDetails = async (item: ModerationItem) => {
    setSelectedItem(item);
    await fetchContentDetails(item.contentId, item.contentType);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'critical';
      case 'HIGH': return 'high';
      case 'MEDIUM': return 'medium';
      case 'LOW': return 'low';
      default: return 'low';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'low';
      case 'REJECTED': return 'critical';
      case 'FLAGGED': return 'high';
      case 'PENDING': return 'medium';
      default: return 'low';
    }
  };

  if (loading && moderationItems.length === 0) {
    return (
      <div className="min-h-screen admin-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent mx-auto mb-4"></div>
          <p className="text-admin-muted">Loading moderation queue...</p>
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
            <h1 className="text-admin-text font-semibold tracking-tight">Content Moderation</h1>
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
              variant="primary" 
              size="sm"
              onClick={fetchModerationQueue}
            >
              Refresh
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Moderation Stats */}
        {moderationStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <AdminMetric
              label="Pending Review"
              value={moderationStats.totalPending.toLocaleString()}
              change={{ value: 5, type: 'increase' }}
              icon="⏳"
            />
            <AdminMetric
              label="Approved"
              value={moderationStats.totalApproved.toLocaleString()}
              change={{ value: 12, type: 'increase' }}
              icon="✅"
            />
            <AdminMetric
              label="Rejected"
              value={moderationStats.totalRejected.toLocaleString()}
              change={{ value: 3, type: 'increase' }}
              icon="❌"
            />
            <AdminMetric
              label="Flagged"
              value={moderationStats.totalFlagged.toLocaleString()}
              change={{ value: 2, type: 'increase' }}
              icon="🚩"
            />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <AdminCard className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-admin-text mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">Content Type</label>
                <select 
                  className="admin-input w-full px-3 py-2"
                  value={filters.contentType}
                  onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value }))}
                >
                  <option value="">All Types</option>
                  <option value="PRODUCT">Product</option>
                  <option value="JOB_LISTING">Job Listing</option>
                  <option value="SERVICE">Service</option>
                  <option value="ORGANIZATION">Organization</option>
                  <option value="USER_PROFILE">User Profile</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">Status</label>
                <select 
                  className="admin-input w-full px-3 py-2"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="FLAGGED">Flagged</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-1">Priority</label>
                <select 
                  className="admin-input w-full px-3 py-2"
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
          </AdminCard>
        )}

        {/* Moderation Queue */}
        <AdminCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-admin-text">Moderation Queue</h2>
          </div>
          
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableHeaderCell>Content Type</AdminTableHeaderCell>
                <AdminTableHeaderCell>Priority</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                <AdminTableHeaderCell>Reason</AdminTableHeaderCell>
                <AdminTableHeaderCell>Reporter</AdminTableHeaderCell>
                <AdminTableHeaderCell>Created</AdminTableHeaderCell>
                <AdminTableHeaderCell>Actions</AdminTableHeaderCell>
              </AdminTableRow>
            </AdminTableHeader>
            <AdminTableBody>
              {moderationItems.map((item) => (
                <AdminTableRow key={item.id}>
                  <AdminTableCell>
                    <AdminBadge variant="low">{item.contentType}</AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge variant={getPriorityColor(item.priority)}>
                      {item.priority}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    <AdminBadge variant={getStatusColor(item.status)}>
                      {item.status}
                    </AdminBadge>
                  </AdminTableCell>
                  <AdminTableCell>
                    {item.reason || '-'}
                  </AdminTableCell>
                  <AdminTableCell>
                    {item.reporter ? `${item.reporter.firstName} ${item.reporter.lastName}` : '-'}
                  </AdminTableCell>
                  <AdminTableCell>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className="flex gap-2">
                      <AdminButton 
                        variant="outline" 
                        size="sm"
                        onClick={() => openContentDetails(item)}
                      >
                        Review
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

        {/* Content Review Modal */}
        {selectedItem && contentDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-admin-surface rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-admin-text">
                  Review {selectedItem.contentType}
                </h3>
                <AdminButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedItem(null);
                    setContentDetails(null);
                  }}
                >
                  Close
                </AdminButton>
              </div>

              {/* Content Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Title/Name</label>
                  <p className="text-admin-text">{contentDetails.title || contentDetails.name || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Description</label>
                  <p className="text-admin-text">{contentDetails.description || 'No description'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Status</label>
                  <AdminBadge variant="low">{contentDetails.status || (contentDetails.isActive ? 'Active' : 'Inactive')}</AdminBadge>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-1">Created</label>
                  <p className="text-admin-text">{new Date(contentDetails.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Moderation Actions */}
              <div className="flex items-center gap-3">
                <AdminButton 
                  variant="primary" 
                  onClick={() => handleModerationAction('APPROVE')}
                >
                  Approve
                </AdminButton>
                <AdminButton 
                  variant="danger" 
                  onClick={() => handleModerationAction('REJECT')}
                >
                  Reject
                </AdminButton>
                <AdminButton 
                  variant="secondary" 
                  onClick={() => handleModerationAction('FLAG')}
                >
                  Flag
                </AdminButton>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
      </main>
    </div>
  );
}