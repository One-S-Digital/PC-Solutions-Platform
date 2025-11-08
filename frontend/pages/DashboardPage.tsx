import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { ChartBarIcon, UsersIcon, ShoppingCartIcon, BriefcaseIcon, CogIcon as SettingsIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { APP_NAME } from '../constants'; // Import APP_NAME

const DashboardPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const navigate = useNavigate();

  const userName = currentUser?.name.split(' ')[0] || t('dashboardPage.defaultUser');

  const stats = [
    { key: 'activeUsers', name: t('dashboardPage.activeUsers'), value: '1,234', icon: UsersIcon, color: 'text-swiss-mint', bgColor: 'bg-swiss-mint/10', trend: '+5%' },
    { key: 'newOrders', name: t('dashboardPage.newOrders'), value: '56', icon: ShoppingCartIcon, color: 'text-swiss-sand', bgColor: 'bg-swiss-sand/20', trend: '+12%' },
    { key: 'openJobs', name: t('dashboardPage.openJobs'), value: '12', icon: BriefcaseIcon, color: 'text-swiss-teal', bgColor: 'bg-swiss-teal/10', trend: '-2%' },
    { key: 'pageViews', name: t('dashboardPage.pageViews'), value: '25,678', icon: ChartBarIcon, color: 'text-swiss-coral', bgColor: 'bg-swiss-coral/10', trend: '+8%' },
  ];

  const settingsPath = currentUser?.role === UserRole.SERVICE_PROVIDER ? '/settings/service-provider' : '/settings';

  const quickLinksData = [
    {nameKey: 'dashboardPage.browseMarketplace', path: '/marketplace', icon: ShoppingCartIcon},
    {nameKey: 'dashboardPage.postNewJob', path: '/recruitment', icon: BriefcaseIcon},
    {nameKey: 'dashboardPage.manageUsers', path: '/users', icon: UsersIcon},
    {nameKey: 'dashboardPage.platformSettings', path: settingsPath, icon: SettingsIcon},
  ];

  const recentActivityData = [
      { id:1, user: 'Lina Meier', actionKey: 'dashboardPage.activityLina', timeRaw: 15, timeUnit: 'minutes', avatarSeed: 'lina'},
      { id:2, user: 'EcoToys GmbH', actionKey: 'dashboardPage.activityEcoToys', timeRaw: 1, timeUnit: 'hours', avatarSeed: 'ecotoys'},
      { id:3, user: 'John Smith', actionKey: 'dashboardPage.activityJohn', timeRaw: 3, timeUnit: 'hours', avatarSeed: 'john'},
      { id:4, user: 'Parent Example', actionKey: 'dashboardPage.activityParent', timeRaw: 5, timeUnit: 'hours', avatarSeed: 'parent'},
  ];
  
  const formatTimeAgo = (timeRaw: number, timeUnit: 'minutes' | 'hours' | 'yesterday') => {
    if (timeUnit === 'yesterday') return t('dashboardPage.timeAgo.yesterday');
    return t(`dashboardPage.timeAgo.${timeUnit}`, { count: timeRaw });
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          {t('dashboardPage.welcome', { name: userName })}
        </h1>
        <p className="text-gray-500 mt-1">{t('dashboardPage.overviewSubtitle', { appName: APP_NAME })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.key} className="p-0 overflow-hidden" hoverEffect>
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
                    onClick={() => navigate(`/dashboard/details/${stat.key}`)} 
                    className={`font-medium ${stat.color} hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-current rounded`}
                    aria-label={t('dashboardPage.viewDetailsFor', { name: stat.name })}
                >
                    {t('buttons.viewDetails')} &rarr;
                </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-5">{t('dashboardPage.recentActivity')}</h2>
          <ul className="space-y-4">
            {recentActivityData.map(activity => (
              <li key={activity.id} className="flex items-center p-3 -m-3 rounded-lg hover:bg-gray-50 transition-colors">
                <img src={`https://picsum.photos/seed/${activity.avatarSeed}/40/40`} className="w-10 h-10 rounded-full mr-4 border border-gray-200" alt={`${activity.user} avatar`} />
                <div>
                  <p className="text-sm">
                    <span className="font-medium text-swiss-charcoal">{activity.user}</span>
                    <span className="text-gray-600"> {t(activity.actionKey)}.</span>
                  </p>
                  <p className="text-xs text-gray-400">{formatTimeAgo(activity.timeRaw, activity.timeUnit as 'minutes' | 'hours' | 'yesterday')}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-5">{t('dashboardPage.quickLinks')}</h2>
           <ul className="space-y-2.5">
            {quickLinksData.map(link => {
                const LinkIcon = link.icon;
                return (
                    <li key={link.nameKey}>
                        <button
                        onClick={() => navigate(link.path)}
                        className="flex items-center text-swiss-teal hover:text-swiss-mint hover:underline font-medium group transition-colors p-2 -m-2 rounded-md hover:bg-swiss-mint/5 w-full text-left focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-swiss-mint/70"
                        aria-label={t(link.nameKey)}
                        >
                        <LinkIcon className="w-5 h-5 mr-2.5 text-swiss-teal/70 group-hover:text-swiss-mint transition-colors"/>
                        {t(link.nameKey)}
                        </button>
                    </li>
                );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;