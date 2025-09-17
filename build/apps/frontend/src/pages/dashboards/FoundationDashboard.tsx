import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  Button, 
  Badge, 
  Status,
  ThemeToggle
} from '@repo/ui';
import { 
  UsersIcon, 
  AcademicCapIcon, 
  ClipboardDocumentListIcon, 
  ChartBarIcon,
  PlusIcon,
  EyeIcon,
  CalendarIcon,
  GiftIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

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
  icon: React.ElementType;
  color: string;
  bgColor: string;
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
      icon: UsersIcon,
      color: 'text-swiss-teal',
      bgColor: 'bg-swiss-teal-light'
    },
    {
      title: 'Recruit Educators',
      description: 'Find and hire qualified educators',
      href: '/recruitment',
      icon: AcademicCapIcon,
      color: 'text-swiss-mint',
      bgColor: 'bg-swiss-mint-light'
    },
    {
      title: 'Order Supplies',
      description: 'Browse and order educational materials',
      href: '/marketplace',
      icon: GiftIcon,
      color: 'text-swiss-coral',
      bgColor: 'bg-swiss-coral-light'
    },
    {
      title: 'Book Services',
      description: 'Schedule cleaning, maintenance, and other services',
      href: '/marketplace',
      icon: ClipboardDocumentListIcon,
      color: 'text-swiss-sand',
      bgColor: 'bg-swiss-sand-light'
    },
    {
      title: 'View Reports',
      description: 'Access financial and operational reports',
      href: '/reports',
      icon: ChartBarIcon,
      color: 'text-swiss-teal',
      bgColor: 'bg-swiss-teal-light'
    },
    {
      title: 'Manage Team',
      description: 'Invite and manage team members',
      href: '/team',
      icon: UsersIcon,
      color: 'text-swiss-mint',
      bgColor: 'bg-swiss-mint-light'
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-swiss-mint mx-auto"></div>
          <p className="mt-4 text-swiss-gray">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen frontend-page">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="h-6 w-1.5 rounded-full bg-swiss-mint"></div>
          <h1 className="text-swiss-charcoal font-semibold tracking-tight">Foundation Dashboard</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="mint">Foundation</Badge>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-swiss-charcoal">Welcome back!</h1>
          <p className="text-swiss-gray mt-2">Here's what's happening at your foundation today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card variant="accent" className="p-0 overflow-hidden" hoverEffect>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="p-2.5 inline-flex rounded-lg bg-swiss-teal-light">
                  <UsersIcon className="h-6 w-6 text-swiss-teal" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  +5%
                </span>
              </div>
              <h3 className="text-3xl font-semibold text-swiss-charcoal mt-3">{stats?.totalChildren || 0}</h3>
              <p className="text-sm text-gray-500">Total Children</p>
            </div>
            <div className="px-5 py-2.5 text-xs text-center bg-swiss-teal-light">
              <button className="font-medium text-swiss-teal hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-swiss-teal rounded">
                View Details &rarr;
              </button>
            </div>
          </Card>

          <Card variant="accent" className="p-0 overflow-hidden" hoverEffect>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="p-2.5 inline-flex rounded-lg bg-swiss-mint-light">
                  <AcademicCapIcon className="h-6 w-6 text-swiss-mint" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  +12%
                </span>
              </div>
              <h3 className="text-3xl font-semibold text-swiss-charcoal mt-3">{stats?.activeEducators || 0}</h3>
              <p className="text-sm text-gray-500">Active Educators</p>
            </div>
            <div className="px-5 py-2.5 text-xs text-center bg-swiss-mint-light">
              <button className="font-medium text-swiss-mint hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-swiss-mint rounded">
                View Details &rarr;
              </button>
            </div>
          </Card>

          <Card variant="accent" className="p-0 overflow-hidden" hoverEffect>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="p-2.5 inline-flex rounded-lg bg-swiss-coral-light">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-swiss-coral" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  -2%
                </span>
              </div>
              <h3 className="text-3xl font-semibold text-swiss-charcoal mt-3">{stats?.pendingApplications || 0}</h3>
              <p className="text-sm text-gray-500">Pending Applications</p>
            </div>
            <div className="px-5 py-2.5 text-xs text-center bg-swiss-coral-light">
              <button className="font-medium text-swiss-coral hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-swiss-coral rounded">
                View Details &rarr;
              </button>
            </div>
          </Card>

          <Card variant="accent" className="p-0 overflow-hidden" hoverEffect>
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className="p-2.5 inline-flex rounded-lg bg-swiss-sand-light">
                  <ChartBarIcon className="h-6 w-6 text-swiss-sand" />
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  +8%
                </span>
              </div>
              <h3 className="text-3xl font-semibold text-swiss-charcoal mt-3">{stats?.occupancyRate || 0}%</h3>
              <p className="text-sm text-gray-500">Occupancy Rate</p>
            </div>
            <div className="px-5 py-2.5 text-xs text-center bg-swiss-sand-light">
              <button className="font-medium text-swiss-sand hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-swiss-sand rounded">
                View Details &rarr;
              </button>
            </div>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => {
              const LinkIcon = link.icon;
              return (
                <Card key={index} className="p-6 hover:shadow-interactive transition-all duration-200 cursor-pointer" hoverEffect>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${link.bgColor}`}>
                      <LinkIcon className={`h-6 w-6 ${link.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-swiss-charcoal mb-1">{link.title}</h3>
                      <p className="text-swiss-gray text-sm">{link.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity & Upcoming Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-center p-3 -m-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-4">
                      {activity.type === 'application' ? <ClipboardDocumentListIcon className="h-5 w-5 text-swiss-coral" /> : 
                       activity.type === 'enrollment' ? <UsersIcon className="h-5 w-5 text-swiss-teal" /> :
                       activity.type === 'payment' ? <ChartBarIcon className="h-5 w-5 text-swiss-mint" /> : 
                       <CalendarIcon className="h-5 w-5 text-swiss-sand" />}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium text-swiss-charcoal">{activity.title}</span>
                        <span className="text-gray-600"> {activity.description}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getStatusVariant(activity.status)}>
                          {activity.status}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-swiss-gray">No recent activity</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">Upcoming Events</h2>
            <div className="space-y-4">
              <div className="flex items-center p-3 -m-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <CalendarIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium text-swiss-charcoal">Parent-Teacher Conference</span>
                    <span className="text-gray-600"> Tomorrow at 2:00 PM</span>
                  </p>
                  <p className="text-xs text-gray-400">Meeting Room A</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 -m-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <GiftIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium text-swiss-charcoal">Spring Festival</span>
                    <span className="text-gray-600"> Next Friday at 10:00 AM</span>
                  </p>
                  <p className="text-xs text-gray-400">Main Hall</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 -m-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                  <BookOpenIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium text-swiss-charcoal">Staff Training</span>
                    <span className="text-gray-600"> Next Monday at 9:00 AM</span>
                  </p>
                  <p className="text-xs text-gray-400">Conference Room</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}