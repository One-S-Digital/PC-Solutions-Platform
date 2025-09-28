import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ChartBarIcon, UsersIcon, ShoppingCartIcon, BriefcaseIcon, CogIcon as SettingsIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import DashboardTopBar from '../components/ui/DashboardTopBar';
import DashboardSidebar from '../components/ui/DashboardSidebar';
import { APP_NAME } from '../constants';

const DashboardPage: React.FC = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();

  // Debug logging
  console.log('DashboardPage render:', { user, isLoaded });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  if (!user) {
    console.log('DashboardPage: No user found, redirecting to login');
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-swiss-charcoal mb-4">Not Authenticated</h1>
          <p className="text-gray-600">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  console.log('DashboardPage: User found:', user);

  // Get user role from Clerk metadata
  const userRole = user?.publicMetadata?.role as string;
  console.log('DashboardPage: User role:', userRole);

  const stats = [
    { name: 'Active Users', value: '1,234', icon: UsersIcon, color: 'text-swiss-mint', bgColor: 'bg-swiss-mint/10', trend: '+5%' },
    { name: 'New Orders', value: '56', icon: ShoppingCartIcon, color: 'text-swiss-sand', bgColor: 'bg-swiss-sand/20', trend: '+12%' },
    { name: 'Open Jobs', value: '12', icon: BriefcaseIcon, color: 'text-swiss-teal', bgColor: 'bg-swiss-teal/10', trend: '-2%' },
    { name: 'Page Views', value: '25,678', icon: ChartBarIcon, color: 'text-swiss-coral', bgColor: 'bg-swiss-coral/10', trend: '+8%' },
  ];

  const quickLinksData = [
    {nameKey: 'Browse Marketplace', path: '/marketplace', icon: ShoppingCartIcon},
    {nameKey: 'Post New Job', path: '/recruitment', icon: BriefcaseIcon},
    {nameKey: 'Manage Users', path: '/users', icon: UsersIcon},
    {nameKey: 'Platform Settings', path: '/settings', icon: SettingsIcon},
  ];

  const recentActivityData = [
      { id:1, user: 'Lina Meier', actionKey: 'posted a new job listing', timeRaw: 15, timeUnit: 'minutes', avatarSeed: 'lina'},
      { id:2, user: 'EcoToys GmbH', actionKey: 'updated their product catalog', timeRaw: 1, timeUnit: 'hours', avatarSeed: 'ecotoys'},
      { id:3, user: 'John Smith', actionKey: 'applied for Lead Educator position', timeRaw: 3, timeUnit: 'hours', avatarSeed: 'john'},
      { id:4, user: 'Parent Example', actionKey: 'submitted a childcare inquiry', timeRaw: 5, timeUnit: 'hours', avatarSeed: 'parent'},
  ];
  
  const formatTimeAgo = (timeRaw: number, timeUnit: 'minutes' | 'hours' | 'yesterday') => {
    if (timeUnit === 'yesterday') return 'Yesterday';
    return `${timeRaw} ${timeUnit} ago`;
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <DashboardTopBar />
      <div className="flex">
        <DashboardSidebar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-swiss-charcoal">
                  Welcome, {user?.fullName?.split(' ')[0] || user?.emailAddresses?.[0]?.emailAddress || 'User'}!
                </h1>
                <p className="text-gray-500 mt-1">Overview of your {APP_NAME} dashboard</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                  <Card key={stat.name} className="p-0 overflow-hidden" hoverEffect>
                    <div className="p-5">
                      <div className="flex justify-between items-start">
                        <div className={`p-2.5 inline-flex rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        {stat.trend && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {stat.trend}
                          </span>
                        )}
                      </div>
                      <h3 className="text-3xl font-semibold text-swiss-charcoal mt-3">{stat.value}</h3>
                      <p className="text-sm text-gray-500">{stat.name}</p>
                    </div>
                    <div className={`px-5 py-2.5 text-xs text-center ${stat.bgColor}`}>
                      <button
                        onClick={() => navigate(`/dashboard/details/${stat.name.toLowerCase().replace(/\s+/g, '-')}`)}
                        className={`font-medium ${stat.color} hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-current rounded`}
                        aria-label={`View details for ${stat.name}`}
                      >
                        View Details &rarr;
                      </button>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6">
                  <h2 className="text-xl font-semibold text-swiss-charcoal mb-5">Recent Activity</h2>
                  <ul className="space-y-4">
                    {recentActivityData.map((activity) => (
                      <li key={activity.id} className="flex items-center p-3 -m-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <img
                          src={`https://picsum.photos/seed/${activity.avatarSeed}/40/40`}
                          className="w-10 h-10 rounded-full mr-4 border border-gray-200"
                          alt={`${activity.user} avatar`}
                        />
                        <div>
                          <p className="text-sm">
                            <span className="font-medium text-swiss-charcoal">{activity.user}</span>
                            <span className="text-gray-600"> {activity.actionKey}.</span>
                          </p>
                          <p className="text-xs text-gray-400">{formatTimeAgo(activity.timeRaw, activity.timeUnit as 'minutes' | 'hours' | 'yesterday')}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-swiss-charcoal mb-5">Quick Links</h2>
                  <ul className="space-y-2.5">
                    {quickLinksData.map((link) => {
                      const LinkIcon = link.icon;
                      return (
                        <li key={link.nameKey}>
                          <button
                            onClick={() => navigate(link.path)}
                            className="flex items-center text-swiss-teal hover:text-swiss-mint hover:underline font-medium group transition-colors p-2 -m-2 rounded-md hover:bg-swiss-mint/5 w-full text-left focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-swiss-mint/70"
                            aria-label={link.nameKey}
                          >
                            <LinkIcon className="w-5 h-5 mr-2.5 text-swiss-teal/70 group-hover:text-swiss-mint transition-colors" />
                            {link.nameKey}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
