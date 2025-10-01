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

interface ServiceProviderStats {
  totalBookings: number;
  monthlyRevenue: number;
  activeClients: number;
  pendingBookings: number;
  completedServices: number;
  averageRating: number;
}

interface RecentBooking {
  id: string;
  clientName: string;
  serviceType: string;
  scheduledDate: string;
  duration: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
}

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

export default function ServiceProviderDashboard() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [stats, setStats] = useState<ServiceProviderStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      
      // Fetch dashboard data
      const [statsResponse, bookingsResponse] = await Promise.all([
        fetch('/api/dashboard/service-provider/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/dashboard/service-provider/bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setRecentBookings(bookingsData.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks: QuickLink[] = [
    {
      title: 'Manage Services',
      description: 'Add and update your service offerings',
      href: '/marketplace/services',
      icon: '🔧',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'View Bookings',
      description: 'Manage your service appointments',
      href: '/bookings',
      icon: '📅',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Availability',
      description: 'Set your working hours and schedule',
      href: '/availability',
      icon: '⏰',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Clients',
      description: 'Manage client relationships',
      href: '/clients',
      icon: '👥',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      title: 'Reviews',
      description: 'View client feedback and ratings',
      href: '/reviews',
      icon: '⭐',
      color: 'bg-pink-100 text-pink-600'
    },
    {
      title: 'Messages',
      description: 'Communicate with clients',
      href: '/messages',
      icon: '💬',
      color: 'bg-indigo-100 text-indigo-600'
    }
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'in-progress': return 'info';
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
          <h1 className="text-text-strong font-semibold tracking-tight">Service Provider Dashboard</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="info">Service Provider</Badge>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-strong">Welcome back!</h1>
          <p className="text-text-muted mt-2">Manage your service bookings and clients.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Total Bookings</p>
                <p className="text-2xl font-bold text-accent">{stats?.totalBookings || 0}</p>
              </div>
              <div className="text-2xl">📅</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Monthly Revenue</p>
                <p className="text-2xl font-bold text-accent">CHF {stats?.monthlyRevenue || 0}</p>
              </div>
              <div className="text-2xl">💰</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Active Clients</p>
                <p className="text-2xl font-bold text-accent">{stats?.activeClients || 0}</p>
              </div>
              <div className="text-2xl">👥</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Average Rating</p>
                <p className="text-2xl font-bold text-accent">{stats?.averageRating || 0}/5</p>
              </div>
              <div className="text-2xl">⭐</div>
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

        {/* Recent Bookings & Upcoming Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SwissCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Recent Bookings</h2>
            <div className="space-y-4">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm">
                      🔧
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-text-strong">{booking.serviceType}</h4>
                      <p className="text-text-muted text-sm">{booking.clientName} • {booking.duration}min</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getStatusVariant(booking.status)}>
                          {booking.status}
                        </Badge>
                        <span className="text-text-subtle text-xs">
                          CHF {booking.totalAmount} • {new Date(booking.scheduledDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="text-text-muted">No recent bookings</p>
                </div>
              )}
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Today's Schedule</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">
                  ✅
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Cleaning Service</h4>
                  <p className="text-text-muted text-sm">ABC Daycare • 2:00 PM - 4:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                  🔧
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Equipment Maintenance</h4>
                  <p className="text-text-muted text-sm">XYZ Foundation • 4:30 PM - 6:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm">
                  📋
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Security Check</h4>
                  <p className="text-text-muted text-sm">DEF Childcare • 6:30 PM - 7:00 PM</p>
                </div>
              </div>
            </div>
          </SwissCard>
        </div>
      </main>
    </div>
  );
}