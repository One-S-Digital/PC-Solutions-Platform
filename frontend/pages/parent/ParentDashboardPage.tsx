
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { HomeIcon, ClipboardDocumentListIcon, UserCircleIcon, WrenchScrewdriverIcon, HeartIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';

const ParentDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  // Mock data based on UI Spec
  const enquiryStatus = {
    sent: 3,
    responses: 2,
    pending: 1,
  };

  const quickActions = [
    { labelKey: 'parentDashboard.quickActions.findDaycare', path: '/parent-lead-form', icon: HomeIcon, variant: 'primary' },
    { labelKey: 'parentDashboard.quickActions.viewEnquiries', path: '/parent/enquiries', icon: ClipboardDocumentListIcon, variant: 'secondary' },
    { labelKey: 'parentDashboard.quickActions.updateProfile', path: '/settings', icon: UserCircleIcon, variant: 'outline' },
    { labelKey: 'parentDashboard.quickActions.browseServices', path: '/marketplace/services', icon: WrenchScrewdriverIcon, variant: 'outline' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          {t('parentDashboard.title')}
        </h1>
        <p className="text-gray-500 mt-1">{t('parentDashboard.welcomeMessage', { name: currentUser?.name?.split(' ')[0] })}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Enquiries & Quick Actions) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('parentDashboard.enquiry.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-swiss-teal">{enquiryStatus.sent}</p>
                <p className="text-sm text-gray-600">{t('parentDashboard.enquiry.sent')}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-swiss-mint">{enquiryStatus.responses}</p>
                <p className="text-sm text-gray-600">{t('parentDashboard.enquiry.responses')}</p>
              </div>
               <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-swiss-coral">{enquiryStatus.pending}</p>
                <p className="text-sm text-gray-600">{t('parentDashboard.enquiry.pending')}</p>
              </div>
            </div>
             <div className="mt-6 text-center">
                <Button variant="primary" onClick={() => navigate('/parent/enquiries')}>
                    {t('parentDashboard.enquiry.button')}
                </Button>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('parentDashboard.quickActions.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map(action => (
                <Button key={action.labelKey} variant={action.variant as any} leftIcon={action.icon} onClick={() => navigate(action.path)} className="w-full !justify-start p-4 text-base">
                  {t(action.labelKey)}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar-like column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-swiss-charcoal mb-4">{t('parentDashboard.childProfile.title')}</h2>
            <div className="space-y-2 text-sm">
                <p><strong>{t('parentDashboard.childProfile.name')}:</strong> Child's Name (from Profile)</p>
                <p><strong>{t('parentDashboard.childProfile.age')}:</strong> 3 years</p>
                <p><strong>{t('parentDashboard.childProfile.location')}:</strong> Geneva</p>
                <p><strong>{t('parentDashboard.childProfile.languages')}:</strong> French, English</p>
                <p><strong>{t('parentDashboard.childProfile.specialNeeds')}:</strong> None specified</p>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => navigate('/settings')}>{t('parentDashboard.childProfile.button')}</Button>
          </Card>
          <Card className="p-6 bg-swiss-sand/20">
             <HeartIcon className="w-8 h-8 text-amber-700 mb-2"/>
            <h2 className="text-xl font-semibold text-amber-800 mb-2">{t('parentDashboard.favorites.title')}</h2>
            <p className="text-sm text-amber-800 mb-4">{t('parentDashboard.favorites.subtitle')}</p>
            <Button variant="secondary" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => alert('View Favorites TBD')}>{t('parentDashboard.favorites.button')}</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboardPage;
