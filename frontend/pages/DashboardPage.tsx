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

  const userName = currentUser?.name.split(' ')[0] || t('dashboard:dashboardPage.defaultUser');

  const stats = [
    { key: 'activeUsers', name: t('dashboard:dashboardPage.activeUsers'), value: '1,234', icon: UsersIcon, color: 'text-swiss-mint', bgColor: 'bg-swiss-mint/10', trend: '+5%' },
    { key: 'newOrders', name: t('dashboard:dashboardPage.newOrders'), value: '56', icon: ShoppingCartIcon, color: 'text-swiss-sand', bgColor: 'bg-swiss-sand/20', trend: '+12%' },
    { key: 'openJobs', name: t('dashboard:dashboardPage.openJobs'), value: '12', icon: BriefcaseIcon, color: 'text-swiss-teal', bgColor: 'bg-swiss-teal/10', trend: '-2%' },
    { key: 'pageViews', name: t('dashboard:dashboardPage.pageViews'), value: '25,678', icon: ChartBarIcon, color: 'text-swiss-coral', bgColor: 'bg-swiss-coral/10', trend: '+8%' },
  ];

  const quickLinksData = [
    {nameKey: 'dashboard:dashboardPage.browseMarketplace', path: '/marketplace', icon: ShoppingCartIcon},
    {nameKey: 'dashboard:dashboardPage.postNewJob', path: '/recruitment', icon: BriefcaseIcon},
    {nameKey: 'dashboard:dashboardPage.manageUsers', path: '/users', icon: UsersIcon},
    {nameKey: 'dashboard:dashboardPage.platformSettings', path: '/settings', icon: SettingsIcon},
  ];

  const recentActivityData = [
      { id:1, user: 'Lina Meier', actionKey: 'dashboard:dashboardPage.activityLina', timeRaw: 15, timeUnit: 'minutes', avatarSeed: 'lina'},
      { id:2, user: 'EcoToys GmbH', actionKey: 'dashboard:dashboardPage.activityEcoToys', timeRaw: 1, timeUnit: 'hours', avatarSeed: 'ecotoys'},
      { id:3, user: 'John Smith', actionKey: 'dashboard:dashboardPage.activityJohn', timeRaw: 3, timeUnit: 'hours', avatarSeed: 'john'},
      { id:4, user: 'Parent Example', actionKey: 'dashboard:dashboardPage.activityParent', timeRaw: 5, timeUnit: 'hours', avatarSeed: 'parent'},
  ];
  
  const formatTimeAgo = (timeRaw: number, timeUnit: 'minutes' | 'hours' | 'yesterday') => {
    if (timeUnit === 'yesterday') return t('dashboard:dashboardPage.timeAgo.yesterday');
    return t(`dashboard:dashboardPage.timeAgo.${timeUnit}`, { count: timeRaw });
  }


  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-swiss-charcoal">
          {t('dashboard:dashboardPage.welcome', { name: userName })}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{t('dashboard:dashboardPage.overviewSubtitle', { appName: APP_NAME })}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
        {stats.map((stat) => (
          <Card key={stat.key} className="p-0 overflow-hidden" hoverEffect>
            <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex justify-between items-start">
                    <div className={`p-1.5 sm:p-2 lg:p-2.5 inline-flex rounded-lg ${stat.bgColor}`}>
                        <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 ${stat.color}`} />
                    </div>
                    {stat.trend && (
                        <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {stat.trend}
                        </span>
                    )}
                </div>
                <h3 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-swiss-charcoal mt-2 sm:mt-3">{stat.value}</h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{stat.name}</p>
            </div>
            <div className={`px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2.5 text-[10px] sm:text-xs text-center ${stat.bgColor}`}>
                <button
                    onClick={() => navigate(`/dashboard/details/${stat.key}`)} 
                    className={`font-medium ${stat.color} hover:underline focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-current rounded`}
                    aria-label={t('dashboard:dashboardPage.viewDetailsFor', { name: stat.name })}
                >
                    {t('common:buttons.viewDetails')} &rarr;
                </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <Card className="lg:col-span-2 p-3 sm:p-4 lg:p-6">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-swiss-charcoal mb-3 sm:mb-4 lg:mb-5">{t('dashboard:dashboardPage.recentActivity')}</h2>
          <ul className="space-y-2 sm:space-y-3 lg:space-y-4">
            {recentActivityData.map(activity => (
              <li key={activity.id} className="flex items-center p-2 sm:p-3 -m-2 sm:-m-3 rounded-lg hover:bg-gray-50 transition-colors">
                <img src={`https://picsum.photos/seed/${activity.avatarSeed}/40/40`} className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full mr-2 sm:mr-3 lg:mr-4 border border-gray-200" alt={`${activity.user} avatar`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm">
                    <span className="font-medium text-swiss-charcoal">{activity.user}</span>
                    <span className="text-gray-600"> {t(activity.actionKey)}.</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400">{formatTimeAgo(activity.timeRaw, activity.timeUnit as 'minutes' | 'hours' | 'yesterday')}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-3 sm:p-4 lg:p-6">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-swiss-charcoal mb-3 sm:mb-4 lg:mb-5">{t('dashboard:dashboardPage.quickLinks')}</h2>
           <ul className="space-y-1.5 sm:space-y-2 lg:space-y-2.5">
            {quickLinksData.map(link => {
                const LinkIcon = link.icon;
                return (
                    <li key={link.nameKey}>
                        <button
                        onClick={() => navigate(link.path)}
                        className="flex items-center text-xs sm:text-sm lg:text-base text-swiss-teal hover:text-swiss-mint hover:underline font-medium group transition-colors p-1.5 sm:p-2 -m-1.5 sm:-m-2 rounded-md hover:bg-swiss-mint/5 w-full text-left focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-swiss-mint/70"
                        aria-label={t(link.nameKey)}
                        >
                        <LinkIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5 mr-1.5 sm:mr-2 lg:mr-2.5 text-swiss-teal/70 group-hover:text-swiss-mint transition-colors flex-shrink-0"/>
                        <span className="truncate">{t(link.nameKey)}</span>
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