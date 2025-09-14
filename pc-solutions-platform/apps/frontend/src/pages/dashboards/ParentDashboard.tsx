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

interface ParentStats {
  applicationsSent: number;
  interviewsScheduled: number;
  offersReceived: number;
  favoritesCount: number;
  messagesUnread: number;
  childAge: number;
}

interface ChildcareOption {
  id: string;
  name: string;
  type: 'foundation' | 'family' | 'nanny';
  location: string;
  rating: number;
  price: number;
  availability: string;
  status: 'applied' | 'interview' | 'offer' | 'waitlist' | 'rejected';
}

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

export default function ParentDashboard() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [stats, setStats] = useState<ParentStats | null>(null);
  const [childcareOptions, setChildcareOptions] = useState<ChildcareOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      
      // Fetch dashboard data
      const [statsResponse, optionsResponse] = await Promise.all([
        fetch('/api/dashboard/parent/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/dashboard/parent/options', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (optionsResponse.ok) {
        const optionsData = await optionsResponse.json();
        setChildcareOptions(optionsData.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks: QuickLink[] = [
    {
      title: 'Find Childcare',
      description: 'Search for childcare options',
      href: '/search',
      icon: '🔍',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'My Applications',
      description: 'Track your applications',
      href: '/applications',
      icon: '📋',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Favorites',
      description: 'View your saved options',
      href: '/favorites',
      icon: '❤️',
      color: 'bg-red-100 text-red-600'
    },
    {
      title: 'Messages',
      description: 'Communicate with providers',
      href: '/messages',
      icon: '💬',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Reviews',
      description: 'Read and write reviews',
      href: '/reviews',
      icon: '⭐',
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      title: 'Resources',
      description: 'Access helpful guides',
      href: '/resources',
      icon: '📚',
      color: 'bg-indigo-100 text-indigo-600'
    }
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'applied': return 'info';
      case 'interview': return 'warning';
      case 'offer': return 'success';
      case 'waitlist': return 'warning';
      case 'rejected': return 'error';
      default: return 'info';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'foundation': return '🏫';
      case 'family': return '👨‍👩‍👧‍👦';
      case 'nanny': return '👩‍🍼';
      default: return '🏠';
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
          <h1 className="text-text-strong font-semibold tracking-tight">Parent Dashboard</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="info">Parent</Badge>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-strong">Welcome back!</h1>
          <p className="text-text-muted mt-2">Find the perfect childcare for your little one.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Applications Sent</p>
                <p className="text-2xl font-bold text-accent">{stats?.applicationsSent || 0}</p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Interviews Scheduled</p>
                <p className="text-2xl font-bold text-accent">{stats?.interviewsScheduled || 0}</p>
              </div>
              <div className="text-2xl">🎯</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Offers Received</p>
                <p className="text-2xl font-bold text-accent">{stats?.offersReceived || 0}</p>
              </div>
              <div className="text-2xl">🎉</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Favorites</p>
                <p className="text-2xl font-bold text-accent">{stats?.favoritesCount || 0}</p>
              </div>
              <div className="text-2xl">❤️</div>
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

        {/* Recent Applications & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SwissCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Recent Applications</h2>
            <div className="space-y-4">
              {childcareOptions.length > 0 ? (
                childcareOptions.map((option) => (
                  <div key={option.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm">
                      {getTypeIcon(option.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-text-strong">{option.name}</h4>
                      <p className="text-text-muted text-sm">{option.location} • CHF {option.price}/month</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getStatusVariant(option.status)}>
                          {option.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">⭐</span>
                          <span className="text-text-subtle text-xs">{option.rating}/5</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏫</div>
                  <p className="text-text-muted">No applications yet</p>
                  <SwissButton variant="primary" className="mt-4">
                    Start Searching
                  </SwissButton>
                </div>
              )}
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Recommended for You</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">
                  🏫
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Sunshine Daycare</h4>
                  <p className="text-text-muted text-sm">Near your location • CHF 1,200/month</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-text-subtle text-xs">4.8/5</span>
                    </div>
                    <Badge variant="success">Available</Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                  👨‍👩‍👧‍👦
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Family Care Center</h4>
                  <p className="text-text-muted text-sm">Small group setting • CHF 1,000/month</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-text-subtle text-xs">4.6/5</span>
                    </div>
                    <Badge variant="warning">Waitlist</Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm">
                  👩‍🍼
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Nanny Service</h4>
                  <p className="text-text-muted text-sm">In-home care • CHF 2,500/month</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="text-text-subtle text-xs">4.9/5</span>
                    </div>
                    <Badge variant="info">Flexible</Badge>
                  </div>
                </div>
              </div>
            </div>
          </SwissCard>
        </div>
      </main>
    </div>
  );
}