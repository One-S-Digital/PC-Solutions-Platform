import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ArrowLeftIcon, ChartBarIcon, UsersIcon, ShoppingCartIcon, BriefcaseIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface DetailContent {
  pageTitleKey: string; // Key for translation
  dataContent: React.ReactNode;
  icon: React.ElementType;
}

// Note: Mock data itself isn't translated here for brevity, but keys for titles are.
// In a real app, if mock data needs translation, it should also use t() or be structured differently.
const getMockDetailData = (t: Function): Record<string, DetailContent> => ({
  'activeUsers': {
    pageTitleKey: "dashboardDetailPage.activeUsers.title",
    icon: UsersIcon,
    dataContent: (
      <div className="space-y-3">
        <p className="font-semibold text-lg">{t('dashboardDetailPage.activeUsers.recentActivity')}</p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>{t('dashboardDetailPage.activeUsers.aliceActivity')}</li>
          <li>{t('dashboardDetailPage.activeUsers.bobActivity')}</li>
          <li>{t('dashboardDetailPage.activeUsers.carolActivity')}</li>
          <li>{t('dashboardDetailPage.activeUsers.davidActivity')}</li>
        </ul>
        <div className="mt-4 p-4 bg-swiss-mint/10 rounded-lg">
            <p className="font-medium text-swiss-mint">{t('dashboardDetailPage.activeUsers.totalToday', { count: 152 })}</p>
        </div>
      </div>
    )
  },
  'newOrders': {
    pageTitleKey: "dashboardDetailPage.newOrders.title",
    icon: ShoppingCartIcon,
    dataContent: (
        <div className="space-y-3">
            <p className="font-semibold text-lg">{t('dashboardDetailPage.newOrders.recentOrders')}</p>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboardDetailPage.newOrders.table.orderId')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboardDetailPage.newOrders.table.product')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboardDetailPage.newOrders.table.amount')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('dashboardDetailPage.newOrders.table.status')}</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    <tr><td className="px-4 py-2">{t('dashboardDetailPage.newOrders.order789')}</td><td className="px-4 py-2">{t('dashboardDetailPage.newOrders.ecotoysBlocks')}</td><td className="px-4 py-2">$49.99</td><td className="px-4 py-2"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{t('dashboardDetailPage.newOrders.status.paid')}</span></td></tr>
                    <tr><td className="px-4 py-2">{t('dashboardDetailPage.newOrders.order790')}</td><td className="px-4 py-2">{t('dashboardDetailPage.newOrders.freshBitesMeal')}</td><td className="px-4 py-2">$120.00</td><td className="px-4 py-2"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{t('dashboardDetailPage.newOrders.status.paid')}</span></td></tr>
                    <tr><td className="px-4 py-2">{t('dashboardDetailPage.newOrders.order791')}</td><td className="px-4 py-2">{t('dashboardDetailPage.newOrders.artFunPack')}</td><td className="px-4 py-2">$25.50</td><td className="px-4 py-2"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">{t('dashboardDetailPage.newOrders.status.pending')}</span></td></tr>
                </tbody>
            </table>
             <div className="mt-4 p-4 bg-swiss-sand/20 rounded-lg">
                <p className="font-medium text-amber-700">{t('dashboardDetailPage.newOrders.totalThisWeek', { count: 12 })}</p>
            </div>
        </div>
    )
  },
  'openJobs': {
    pageTitleKey: "dashboardDetailPage.openJobs.title",
    icon: BriefcaseIcon,
    dataContent: (
      <div className="space-y-3">
        <p className="font-semibold text-lg">{t('dashboardDetailPage.openJobs.currentPositions')}</p>
        <ul className="space-y-2">
            <li className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium text-swiss-teal">{t('dashboardDetailPage.openJobs.leadEducatorGeneva')}</p>
                <p className="text-xs text-gray-500">{t('dashboardDetailPage.openJobs.applications', { count: 7 })} | {t('dashboardDetailPage.openJobs.status.open')}</p>
            </li>
            <li className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium text-swiss-teal">{t('dashboardDetailPage.openJobs.assistantEducatorLausanne')}</p>
                <p className="text-xs text-gray-500">{t('dashboardDetailPage.openJobs.applications', { count: 3 })} | {t('dashboardDetailPage.openJobs.status.open')}</p>
            </li>
             <li className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium text-swiss-teal">{t('dashboardDetailPage.openJobs.daycareDirectorZurich')}</p>
                <p className="text-xs text-gray-500">{t('dashboardDetailPage.openJobs.applications', { count: 1 })} | {t('dashboardDetailPage.openJobs.status.interviewing')}</p>
            </li>
        </ul>
        <div className="mt-4 p-4 bg-swiss-teal/10 rounded-lg">
            <p className="font-medium text-swiss-teal">{t('dashboardDetailPage.openJobs.totalOpenPositions', { count: 5 })}</p>
        </div>
      </div>
    )
  },
  'pageViews': {
    pageTitleKey: "dashboardDetailPage.pageViews.title",
    icon: ChartBarIcon,
    dataContent: (
      <div className="space-y-3">
        <p className="font-semibold text-lg">{t('dashboardDetailPage.pageViews.keyMetrics')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-100 rounded"><strong>{t('dashboardDetailPage.pageViews.totalToday')}</strong> 2,345</div>
            <div className="p-3 bg-gray-100 rounded"><strong>{t('dashboardDetailPage.pageViews.uniqueVisitors')}</strong> 867</div>
            <div className="p-3 bg-gray-100 rounded"><strong>{t('dashboardDetailPage.pageViews.mostViewed')}</strong> {t('dashboardDetailPage.pageViews.dashboardViews')}</div>
            <div className="p-3 bg-gray-100 rounded"><strong>{t('dashboardDetailPage.pageViews.avgSession')}</strong> {t('dashboardDetailPage.pageViews.sessionDuration')}</div>
        </div>
        <div className="bg-swiss-coral/10 h-48 w-full mt-4 flex items-center justify-center text-swiss-coral/70 rounded-lg">
            {t('dashboardDetailPage.pageViews.mockChartText')}
        </div>
      </div>
    )
  }
});

const DashboardDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { detailType } = useParams<{ detailType: string }>();
  const navigate = useNavigate();
  const mockDetailData = getMockDetailData(t);

  const formattedDetailType = detailType || 'unknown';
  const content = mockDetailData[formattedDetailType];

  const pageDisplayTitle = detailType
    ? t(`dashboardPage.${detailType}`, { defaultValue: detailType })
    : t('dashboardDetailPage.defaultTitle');

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} aria-label={t('buttons.goBack')}>
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('dashboardDetailPage.detailsFor', { pageDisplayTitle })}</h1>
      </div>

      {content ? (
        <Card className="p-6">
          <div className="flex items-center mb-6">
            <content.icon className="h-10 w-10 text-swiss-teal mr-4" />
            <h2 className="text-2xl font-semibold text-swiss-charcoal">
              {t(content.pageTitleKey)}
            </h2>
          </div>
          <div>
            {content.dataContent}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">
            {t('dashboardDetailPage.detailsFor', { pageDisplayTitle })}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('dashboardDetailPage.noSpecificView', { pageDisplayTitle })}
          </p>
        </Card>
      )}

      <div className="mt-8 text-center">
        <Button variant="primary" onClick={() => navigate('/dashboard')} leftIcon={ArrowLeftIcon}>
          {t('buttons.goBack')}
        </Button>
      </div>
    </div>
  );
};

export default DashboardDetailPage;
