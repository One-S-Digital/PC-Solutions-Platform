
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  UsersIcon, 
  InboxArrowDownIcon, 
  CalendarDaysIcon, 
  UserPlusIcon, 
  DocumentTextIcon, 
  BanknotesIcon, 
  BriefcaseIcon, 
  ShoppingBagIcon, 
  UserGroupIcon, 
  PresentationChartLineIcon, 
  ChatBubbleLeftEllipsisIcon,
  SunIcon
} from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from '@workspace/translations';

const FoundationDashboardPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  // Mock data based on UI Spec
  const quickStats = [
    { labelKey: 'foundationDashboard.quickStats.enrolled', value: '45 / 50', trend: '+2', icon: UsersIcon, color: 'text-swiss-mint' },
    { labelKey: 'foundationDashboard.quickStats.availableSpots', value: '5', icon: UserPlusIcon, color: 'text-swiss-sand' },
    { labelKey: 'foundationDashboard.quickStats.pendingApps', value: '3', icon: InboxArrowDownIcon, color: 'text-swiss-coral' },
    { labelKey: 'foundationDashboard.quickStats.upcomingAppointments', value: '2', icon: CalendarDaysIcon, color: 'text-swiss-teal' },
  ];

  const recentActivity = [
    { id: 1, icon: InboxArrowDownIcon, textKey: 'foundationDashboard.activity.parentInquiry', details: 'S. Dubois for a 2-year-old', time: t('dashboardPage.timeAgo.minutes', { count: 15 }), color: 'text-swiss-mint' },
    { id: 2, icon: BriefcaseIcon, textKey: 'foundationDashboard.activity.jobApplication', details: 'J. Miller for Lead Educator', time: t('dashboardPage.timeAgo.hours', { count: 1 }), color: 'text-swiss-teal' },
    { id: 3, icon: BanknotesIcon, textKey: 'foundationDashboard.activity.orderConfirmation', details: '#ORD123 from EcoToys', time: t('dashboardPage.timeAgo.hours', { count: 3 }), color: 'text-swiss-sand' },
    { id: 4, icon: DocumentTextIcon, textKey: 'foundationDashboard.activity.serviceUpdate', details: 'ProClean confirmed cleaning for Friday', time: t('dashboardPage.timeAgo.hours', { count: 5 }), color: 'text-swiss-coral' },
    { id: 5, icon: ChatBubbleLeftEllipsisIcon, textKey: 'foundationDashboard.activity.newMessage', details: 'From candidate T. Fischer', time: t('dashboardPage.timeAgo.yesterday'), color: 'text-gray-500' },
  ];
  
  const quickActions = [
    { labelKey: 'foundationDashboard.quickActions.postJob', onClick: () => navigate('/recruitment'), icon: BriefcaseIcon },
    { labelKey: 'foundationDashboard.quickActions.browseMarketplace', onClick: () => navigate('/marketplace'), icon: ShoppingBagIcon },
    { labelKey: 'foundationDashboard.quickActions.viewParentLeads', onClick: () => navigate('/foundation/leads'), icon: UserGroupIcon },
    { labelKey: 'foundationDashboard.quickActions.viewAnalytics', onClick: () => navigate('/foundation/analytics'), icon: PresentationChartLineIcon },
  ];
  
  const calendarEvents = [
    { time: '10:00', titleKey: 'foundationDashboard.calendar.event1' },
    { time: '14:00', titleKey: 'foundationDashboard.calendar.event2' },
    { time: '16:30', titleKey: 'foundationDashboard.calendar.event3' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          {t('foundationDashboard.title')}
        </h1>
        <p className="text-gray-500 mt-1">{t('foundationDashboard.welcomeMessage', { name: currentUser?.name?.split(' ')[0] })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Quick Stats) - 3/12 on large screens */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-swiss-charcoal mb-3">{t('foundationDashboard.quickStats.title')}</h2>
            <div className="space-y-4">
              {quickStats.map(stat => (
                <div key={stat.labelKey} className="flex items-center">
                  <div className={`p-2 rounded-lg bg-gray-100 mr-3 ${stat.color}`}>
                    <stat.icon className="w-5 h-5"/>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t(stat.labelKey)}</p>
                    <p className="text-lg font-bold text-swiss-charcoal">{stat.value}</p>
                  </div>
                  {stat.trend && <span className="ml-auto text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{stat.trend}</span>}
                </div>
              ))}
            </div>
          </Card>
           <Card className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-swiss-charcoal">{t('foundationDashboard.todayAtGlance')}</h2>
                <div className="flex items-center text-sm text-yellow-600 font-semibold">
                  <SunIcon className="w-5 h-5 mr-1"/>
                  <span>18°C</span>
                </div>
              </div>
              <ul className="space-y-2">
                {calendarEvents.map(event => (
                  <li key={event.titleKey} className="flex items-center text-sm">
                    <span className="w-12 text-gray-500 font-medium">{event.time}</span>
                    <span className="flex-1 text-gray-700">{t(event.titleKey)}</span>
                  </li>
                ))}
              </ul>
            </Card>
        </div>

        {/* Center Column (Recent Activity) - 6/12 on large screens */}
        <div className="lg:col-span-6">
          <Card className="p-5 h-full">
            <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">{t('foundationDashboard.activity.title')}</h2>
            <ul className="space-y-3">
              {recentActivity.map(activity => (
                <li key={activity.id} className="flex items-start p-3 -m-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-full bg-gray-100 mr-3 ${activity.color}`}>
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">{t(activity.textKey)}:</span> {activity.details}
                    </p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                  <Button variant="ghost" size="xs">{t('buttons.view')}</Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right Column (Quick Actions) - 3/12 on large screens */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-swiss-charcoal mb-3">{t('foundationDashboard.quickActions.title')}</h2>
            <div className="space-y-2.5">
              {quickActions.map(action => (
                <Button key={action.labelKey} variant="light" leftIcon={action.icon} onClick={action.onClick} className="w-full !justify-start">
                  {t(action.labelKey)}
                </Button>
              ))}
            </div>
          </Card>
          <Card className="p-5 bg-swiss-teal text-white">
            <h2 className="text-lg font-semibold mb-2">{t('foundationDashboard.quickMessage.title')}</h2>
            <textarea placeholder={t('foundationDashboard.quickMessage.placeholder')} rows={3} className="w-full p-2 rounded-md text-sm text-swiss-charcoal placeholder-gray-500 border-gray-300 focus:ring-swiss-mint focus:border-swiss-mint"></textarea>
            <Button variant="secondary" size="sm" className="w-full mt-2 !bg-white !text-swiss-teal">{t('buttons.sendMessage')}</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FoundationDashboardPage;
