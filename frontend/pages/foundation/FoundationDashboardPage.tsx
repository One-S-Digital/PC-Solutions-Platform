import React, { useState, useEffect, useCallback } from 'react';
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
  SunIcon,
  CloudIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { replacementsService, StaffingSignals } from '../../services/replacementsService';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  foundationDashboardApi, 
  FoundationQuickStats, 
  FoundationActivity, 
  CalendarEvent, 
  WeatherData 
} from '../../services/foundationDashboardService';

// ── Staffing KPI Card ─────────────────────────────────────────────────────────
interface StaffingKpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}

const StaffingKpiCard: React.FC<StaffingKpiCardProps> = ({ icon: Icon, label, value, color, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-card shadow-minimal border border-gray-100 p-4 text-left w-full hover:shadow-interactive transition-shadow"
  >
    <div className={`w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center mb-2 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <p className="text-2xl font-bold text-swiss-charcoal">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </button>
);

// Activity type to icon mapping
const ACTIVITY_ICONS: Record<string, React.ComponentType<any>> = {
  lead: InboxArrowDownIcon,
  application: BriefcaseIcon,
  order: BanknotesIcon,
  service: DocumentTextIcon,
  message: ChatBubbleLeftEllipsisIcon,
  job: BriefcaseIcon,
};

// Activity type to color mapping
const ACTIVITY_COLORS: Record<string, string> = {
  lead: 'text-swiss-mint',
  application: 'text-swiss-teal',
  order: 'text-swiss-sand',
  service: 'text-swiss-coral',
  message: 'text-gray-500',
  job: 'text-swiss-teal',
};

const FoundationDashboardPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { request } = useAuthenticatedApi();

  // State for API data
  const [quickStats, setQuickStats] = useState<FoundationQuickStats | null>(null);
  const [activities, setActivities] = useState<FoundationActivity[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [staffingSignals, setStaffingSignals] = useState<StaffingSignals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [messageSending, setMessageSending] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all dashboard data in parallel
      const [statsRes, activitiesRes, calendarRes, weatherRes, signalsData] = await Promise.all([
        request<FoundationQuickStats>(foundationDashboardApi.getQuickStatsEndpoint()),
        request<FoundationActivity[]>(foundationDashboardApi.getActivitiesEndpoint(10)),
        request<CalendarEvent[]>(foundationDashboardApi.getCalendarEndpoint()),
        request<WeatherData>(foundationDashboardApi.getWeatherEndpoint()),
        replacementsService.getStaffingSignals().catch(() => null),
      ]);

      if (statsRes.success && statsRes.data) {
        setQuickStats(statsRes.data);
      }
      if (activitiesRes.success && activitiesRes.data) {
        setActivities(activitiesRes.data);
      }
      if (calendarRes.success && calendarRes.data) {
        setCalendarEvents(calendarRes.data);
      }
      if (weatherRes.success && weatherRes.data) {
        setWeather(weatherRes.data);
      }
      if (signalsData) {
        setStaffingSignals(signalsData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(t('common:errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [request, t]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return t('dashboardPage.timeAgo.minutes', { count: diffMins });
    } else if (diffHours < 24) {
      return t('dashboardPage.timeAgo.hours', { count: diffHours });
    } else if (diffDays === 1) {
      return t('dashboardPage.timeAgo.yesterday');
    } else {
      return t('dashboardPage.timeAgo.days', { count: diffDays });
    }
  };

  // Format time from ISO string
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleSendQuickMessage = useCallback(() => {
    if (!quickMessage.trim()) return;
    setMessageSending(true);
    try {
      navigate('/messages', { state: { quickMessageToAdmin: quickMessage.trim() } });
    } finally {
      setMessageSending(false);
    }
  }, [quickMessage, navigate]);

  // Quick actions (no change needed)
  const quickActions = [
    { labelKey: 'foundationDashboard.quickActions.postJob', onClick: () => navigate('/recruitment/job-listings'), icon: BriefcaseIcon },
    { labelKey: 'foundationDashboard.quickActions.findReplacement', onClick: () => navigate('/foundation/replacements'), icon: ArrowPathIcon },
    { labelKey: 'foundationDashboard.quickActions.reviewApplicants', onClick: () => navigate('/recruitment/candidate-pool'), icon: ClipboardDocumentCheckIcon },
    { labelKey: 'foundationDashboard.quickActions.browseMarketplace', onClick: () => navigate('/marketplace'), icon: ShoppingBagIcon },
    { labelKey: 'foundationDashboard.quickActions.viewParentLeads', onClick: () => navigate('/foundation/leads'), icon: UserGroupIcon },
    { labelKey: 'foundationDashboard.quickActions.viewAnalytics', onClick: () => navigate('/foundation/analytics'), icon: PresentationChartLineIcon },
  ];

  // Build quick stats display
  const statsDisplay = quickStats ? [
    { 
      labelKey: 'foundationDashboard.quickStats.enrolled', 
      value: `${quickStats.enrolled} / ${quickStats.capacity}`, 
      trend: quickStats.trend.enrolled > 0 ? `+${quickStats.trend.enrolled}` : undefined, 
      icon: UsersIcon, 
      color: 'text-swiss-mint' 
    },
    { 
      labelKey: 'foundationDashboard.quickStats.availableSpots', 
      value: quickStats.availableSpots.toString(), 
      icon: UserPlusIcon, 
      color: 'text-swiss-sand' 
    },
    { 
      labelKey: 'foundationDashboard.quickStats.pendingApps', 
      value: quickStats.pendingApplications.toString(), 
      icon: InboxArrowDownIcon, 
      color: 'text-swiss-coral' 
    },
    { 
      labelKey: 'foundationDashboard.quickStats.upcomingAppointments', 
      value: quickStats.upcomingAppointments.toString(), 
      icon: CalendarDaysIcon, 
      color: 'text-swiss-teal' 
    },
  ] : [];

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal">
            {t('foundationDashboard.title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('foundationDashboard.welcomeMessage', { name: currentUser?.name?.split(' ')[0] })}</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-swiss-teal" />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal">
            {t('foundationDashboard.title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('foundationDashboard.welcomeMessage', { name: currentUser?.name?.split(' ')[0] })}</p>
        </div>
        <Card className="p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>{t('common:buttons.retry')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal">
            {t('foundationDashboard.title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('foundationDashboard.welcomeMessage', { name: currentUser?.name?.split(' ')[0] })}</p>
        </div>
      </div>

      {/* ── Staffing KPI Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StaffingKpiCard
          icon={BriefcaseIcon}
          label={t('foundationDashboard.staffing.openPositions', 'Open Positions')}
          value={quickStats?.activeJobListings ?? 0}
          color="text-swiss-teal"
          onClick={() => navigate('/recruitment/job-listings')}
        />
        <StaffingKpiCard
          icon={InboxArrowDownIcon}
          label={t('foundationDashboard.staffing.awaitingReview', 'Awaiting Review')}
          value={quickStats?.pendingApplications ?? 0}
          color="text-swiss-coral"
          onClick={() => navigate('/recruitment/candidate-pool')}
        />
        <StaffingKpiCard
          icon={ArrowPathIcon}
          label={t('foundationDashboard.staffing.openReplacements', 'Open Replacements')}
          value={staffingSignals?.openRequests ?? 0}
          color="text-swiss-mint"
          onClick={() => navigate('/foundation/replacements')}
        />
        <StaffingKpiCard
          icon={UserGroupIcon}
          label={t('foundationDashboard.staffing.replacementPool', 'Replacement Pool')}
          value={staffingSignals?.replacementPoolSize ?? 0}
          color="text-swiss-sand"
          onClick={() => navigate('/foundation/replacements')}
        />
      </div>

      {/* ── Action Row ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" leftIcon={BriefcaseIcon} onClick={() => navigate('/recruitment/job-listings')}>
          {t('foundationDashboard.staffing.postJob', 'Post a Job')}
        </Button>
        <Button variant="secondary" leftIcon={MagnifyingGlassIcon} onClick={() => navigate('/recruitment/candidate-pool')}>
          {t('foundationDashboard.staffing.findStaff', 'Find Staff')}
        </Button>
        <Button variant="outline" leftIcon={ClipboardDocumentCheckIcon} onClick={() => navigate('/recruitment/candidate-pool')}>
          {t('foundationDashboard.staffing.reviewApplicants', 'Review Applicants')}
        </Button>
        <Button variant="outline" leftIcon={ArrowPathIcon} onClick={() => navigate('/foundation/replacements')}>
          {t('foundationDashboard.staffing.postReplacement', 'Post Replacement')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Quick Stats) - 3/12 on large screens */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-swiss-charcoal mb-3">{t('foundationDashboard.quickStats.title')}</h2>
            <div className="space-y-4">
              {statsDisplay.map(stat => (
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
              {statsDisplay.length === 0 && (
                <p className="text-sm text-gray-500">{t('common:noData')}</p>
              )}
            </div>
          </Card>
          
          <Card className="p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-swiss-charcoal">{t('foundationDashboard.todayAtGlance')}</h2>
              {weather && (
                <div className="flex items-center text-sm text-yellow-600 font-semibold">
                  {weather.condition === 'Sunny' ? (
                    <SunIcon className="w-5 h-5 mr-1"/>
                  ) : (
                    <CloudIcon className="w-5 h-5 mr-1"/>
                  )}
                  <span>{weather.temperature}°C</span>
                </div>
              )}
            </div>
            <ul className="space-y-2">
              {calendarEvents.length > 0 ? (
                calendarEvents.map(event => (
                  <li key={event.id} className="flex items-center text-sm">
                    <span className="w-12 text-gray-500 font-medium">{formatTime(event.startTime)}</span>
                    <span className="flex-1 text-gray-700">{event.title}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500">{t('foundationDashboard.calendar.noEvents')}</li>
              )}
            </ul>
          </Card>
        </div>

        {/* Center Column (Recent Activity) - 6/12 on large screens */}
        <div className="lg:col-span-6">
          <Card className="p-5 h-full">
            <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">{t('foundationDashboard.activity.title')}</h2>
            <ul className="space-y-3">
              {activities.length > 0 ? (
                activities.map(activity => {
                  const IconComponent = ACTIVITY_ICONS[activity.type] || DocumentTextIcon;
                  const iconColor = ACTIVITY_COLORS[activity.type] || 'text-gray-500';
                  
                  return (
                    <li key={activity.id} className="flex items-start p-3 -m-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`p-2 rounded-full bg-gray-100 mr-3 ${iconColor}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">{activity.title}:</span> {activity.description}
                        </p>
                        <p className="text-xs text-gray-400">{formatRelativeTime(activity.timestamp)}</p>
                      </div>
                      <Button variant="ghost" size="xs">{t('common:buttons.view')}</Button>
                    </li>
                  );
                })
              ) : (
                <li className="text-sm text-gray-500 py-4">{t('foundationDashboard.activity.noActivity')}</li>
              )}
            </ul>
          </Card>
        </div>

        {/* Right Column (Quick Actions) - 3/12 on large screens */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-swiss-charcoal mb-3">{t('foundationDashboard.quickActions.title')}</h2>
            <div className="space-y-2.5">
              {quickActions.map(action => (
                <Button key={action.labelKey} variant="light" leftIcon={action.icon} onClick={action.onClick} className="w-full justify-start text-left">
                  {t(action.labelKey)}
                </Button>
              ))}
            </div>
          </Card>
          <Card className="p-5 bg-swiss-teal text-white">
            <h2 className="text-lg font-semibold mb-2">{t('foundationDashboard.quickMessage.title')}</h2>
            <textarea
              placeholder={t('foundationDashboard.quickMessage.placeholder')}
              rows={3}
              value={quickMessage}
              onChange={(e) => setQuickMessage(e.target.value)}
              className="w-full p-2 rounded-md text-sm bg-white text-swiss-charcoal placeholder-gray-500 border border-gray-300 focus:ring-swiss-mint focus:border-swiss-mint"
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-2 !bg-white !text-swiss-teal"
              disabled={!quickMessage.trim() || messageSending}
              onClick={handleSendQuickMessage}
            >
              {t('common:buttons.sendMessage')}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FoundationDashboardPage;
