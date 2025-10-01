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

interface EducatorStats {
  applicationsSent: number;
  interviewsScheduled: number;
  jobOffers: number;
  profileViews: number;
  skillsCompleted: number;
  certificationsExpiring: number;
}

interface JobOpportunity {
  id: string;
  title: string;
  organization: string;
  location: string;
  salary: string;
  type: 'full-time' | 'part-time' | 'contract';
  postedDate: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
}

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

export default function EducatorDashboard() {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [stats, setStats] = useState<EducatorStats | null>(null);
  const [jobOpportunities, setJobOpportunities] = useState<JobOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      
      // Fetch dashboard data
      const [statsResponse, jobsResponse] = await Promise.all([
        fetch('/api/dashboard/educator/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/dashboard/educator/jobs', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setJobOpportunities(jobsData.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLinks: QuickLink[] = [
    {
      title: 'Browse Jobs',
      description: 'Find new job opportunities',
      href: '/jobs',
      icon: '💼',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'My Applications',
      description: 'Track your job applications',
      href: '/applications',
      icon: '📋',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Update Profile',
      description: 'Keep your profile current',
      href: '/profile',
      icon: '👤',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Skills & Certifications',
      description: 'Manage your qualifications',
      href: '/skills',
      icon: '🏆',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      title: 'Messages',
      description: 'Communicate with employers',
      href: '/messages',
      icon: '💬',
      color: 'bg-pink-100 text-pink-600'
    },
    {
      title: 'Resources',
      description: 'Access training materials',
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
      case 'rejected': return 'error';
      default: return 'info';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'full-time': return 'bg-green-100 text-green-600';
      case 'part-time': return 'bg-blue-100 text-blue-600';
      case 'contract': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
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
          <h1 className="text-text-strong font-semibold tracking-tight">Educator Dashboard</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="info">Educator</Badge>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-strong">Welcome back!</h1>
          <p className="text-text-muted mt-2">Ready to find your next opportunity?</p>
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
                <p className="text-text-muted text-sm">Job Offers</p>
                <p className="text-2xl font-bold text-accent">{stats?.jobOffers || 0}</p>
              </div>
              <div className="text-2xl">🎉</div>
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">Profile Views</p>
                <p className="text-2xl font-bold text-accent">{stats?.profileViews || 0}</p>
              </div>
              <div className="text-2xl">👀</div>
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

        {/* Job Opportunities & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SwissCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Recent Job Applications</h2>
            <div className="space-y-4">
              {jobOpportunities.length > 0 ? (
                jobOpportunities.map((job) => (
                  <div key={job.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm">
                      💼
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-text-strong">{job.title}</h4>
                      <p className="text-text-muted text-sm">{job.organization} • {job.location}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getStatusVariant(job.status)}>
                          {job.status}
                        </Badge>
                        <Badge variant="info" className={getTypeColor(job.type)}>
                          {job.type}
                        </Badge>
                        <span className="text-text-subtle text-xs">
                          {new Date(job.postedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">💼</div>
                  <p className="text-text-muted">No recent applications</p>
                  <SwissButton variant="primary" className="mt-4">
                    Browse Jobs
                  </SwissButton>
                </div>
              )}
            </div>
          </SwissCard>

          <SwissCard variant="accent" className="p-6">
            <h2 className="text-xl font-semibold text-text-strong mb-4">Profile Status</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">
                  ✅
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Profile Complete</h4>
                  <p className="text-text-muted text-sm">Your profile is 95% complete</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-sm">
                  ⚠️
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Certification Expiring</h4>
                  <p className="text-text-muted text-sm">First Aid certification expires in 30 days</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                  📈
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-strong">Profile Views</h4>
                  <p className="text-text-muted text-sm">Your profile was viewed 12 times this week</p>
                </div>
              </div>
            </div>
          </SwissCard>
        </div>
      </main>
    </div>
  );
}