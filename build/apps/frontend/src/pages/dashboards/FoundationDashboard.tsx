import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  SwissCard, 
  SwissButton, 
  Badge, 
  Status,
  ThemeToggle
} from '@repo/ui';

interface DashboardStats {
  totalChildren: number;
  activeEducators: number;
  pendingApplications: number;
  upcomingEvents: number;
  monthlyRevenue: number;
  occupancyRate: number;
}

interface RecentActivity {
  id: string;
  type: 'application' | 'enrollment' | 'payment' | 'event';
  title: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
}

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

export default function FoundationDashboard() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      
      // Fetch dashboard data
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch('/api/dashboard/foundation/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/dashboard/foundation/activities', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks: QuickLink[] = [
    {
      title: 'Manage Children',
      description: 'View and manage enrolled children',
      href: '/children',
      icon: '👶',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Recruit Educators',
      description: 'Find and hire qualified educators',
      href: '/recruitment',
      icon: '👩‍🏫',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Order Supplies',
      description: 'Browse and order educational materials',
      href: '/marketplace',
      icon: '📦',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Book Services',
      description: 'Schedule cleaning, maintenance, and other services',
      href: '/marketplace',
      icon: '🔧',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      title: 'View Reports',
      description: 'Access financial and operational reports',
      href: '/reports',
      icon: '📊',
      color: 'bg-indigo-100 text-indigo-600'
    },
    {
      title: 'Manage Team',
      description: 'Invite and manage team members',
      href: '/team',
      icon: '👥',
      color: 'bg-pink-100 text-pink-600'
    }
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'info';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen frontend-page flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen frontend-page">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-surface-1/80 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-accent"></div>
          <h1 className="text-text-strong font-semibold tracking-tight">Foundation Dashboard</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="info">Foundation</Badge>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-strong">Welcome back!</h1>
          <p className="text-text-muted mt-2">Here's what's happening at your foundation today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Total Children</p>
                <p className="text-2xl font-bold text-accent">{stats?.totalChildren || 0}</p>
              </div>
              <div className="text-2xl">👶</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Active Educators</p>
                <p className="text-2xl font-bold text-accent">{stats?.activeEducators || 0}</p>
              </div>
              <div className="text-2xl">👩‍🏫</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Pending Applications</p>
                <p className="text-2xl font-bold text-accent">{stats?.pendingApplications || 0}</p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Occupancy Rate</p>
                <p className="text-2xl font-bold text-accent">{stats?.occupancyRate || 0}%</p>
              </div>
              <div className="text-2xl">📊</div>
            </div>
          </SwissCard>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-text-strong mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => (
              <SwissCard key={index} className="p-6 hover:shadow-float transition-all duration-150 cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${link.color}`}>
                    {link.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-strong mb-1">{link.title}</h3>
                    <p className="text-text-muted text-sm">{link.description}</p>
                  </div>
                </div>
              </SwissCard>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SwissCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm">
                      {activity.type === 'application' ? '📋' : 
                       activity.type === 'enrollment' ? '👶' :
                       activity.type === 'payment' ? '💳' : '📅'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-text-strong">{activity.title}</h4>
                      <p className="text-text-muted text-sm">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getStatusVariant(activity.status)}>
                          {activity.status}
                        </Badge>
                        <span className="text-text-subtle text-xs">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-text-muted">No recent activity</p>
                </div>
              )}
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Upcoming Events</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">
                  📅
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Parent-Teacher Conference</h4>
                  <p className="text-text-muted text-sm">Tomorrow at 2:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                  🎉
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Spring Festival</h4>
                  <p className="text-text-muted text-sm">Next Friday at 10:00 AM</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm">
                  📚
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Staff Training</h4>
                  <p className="text-text-muted text-sm">Next Monday at 9:00 AM</p>
                </div>
              </div>
            </div>
          </SwissCard>
        </div>
      </main>
    </div>
  );
}