import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  HomeIcon, 
  ClipboardDocumentListIcon, 
  UserCircleIcon, 
  HeartIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { ParentLead, LeadMainStatus, UserRole } from '../../types';

interface EnquiryStats {
  sent: number;
  responses: number;
  pending: number;
}

const ParentDashboardPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { currentUser, leads, leadsLoading, refreshLeads } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();
  
  // State for user profile data
  const [profileLoading, setProfileLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    childName?: string;
    childAge?: number;
    location?: string;
    languages?: string[];
    specialNeeds?: string;
  } | null>(null);

  // Calculate enquiry statistics from real leads data
  const getEnquiryStats = useCallback((): EnquiryStats => {
    if (!currentUser || !leads) {
      return { sent: 0, responses: 0, pending: 0 };
    }

    // Filter leads for this parent
    const myLeads = leads.filter(lead => lead.parentId === currentUser.id);
    
    const sent = myLeads.length;
    const responses = myLeads.reduce((count, lead) => {
      return count + (lead.responses?.length || 0);
    }, 0);
    const pending = myLeads.filter(lead => 
      lead.mainStatus === LeadMainStatus.NEW || 
      lead.mainStatus === LeadMainStatus.PROCESSING
    ).length;

    return { sent, responses, pending };
  }, [currentUser, leads]);

  // Load user profile data
  const loadUserProfile = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setProfileLoading(true);
      const response = await authenticatedRequest<any>('/profiles/me');
      
      if (response.success && response.data) {
        // Extract child information from the most recent lead or profile settings
        const myLeads = leads.filter(lead => lead.parentId === currentUser.id);
        const recentLead = myLeads[0];
        
        setUserProfile({
          childName: recentLead?.childName || response.data.childName || undefined,
          childAge: recentLead?.childAge || response.data.childAge,
          location: recentLead?.canton || recentLead?.municipality || response.data.location,
          languages: recentLead?.languages || response.data.preferredLanguages || [],
          specialNeeds: recentLead?.specialNeeds || response.data.specialNeeds,
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [currentUser, leads, authenticatedRequest]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Refresh leads when component mounts
  useEffect(() => {
    if (currentUser?.role === UserRole.PARENT) {
      refreshLeads();
    }
  }, [currentUser, refreshLeads]);

  const enquiryStatus = getEnquiryStats();

  const quickActions = [
    { labelKey: 'parentDashboard.quickActions.findDaycare', path: '/parent-lead-form', icon: HomeIcon, variant: 'primary' },
    { labelKey: 'parentDashboard.quickActions.browseFoundations', path: '/parent/foundations', icon: BuildingOfficeIcon, variant: 'secondary' },
    { labelKey: 'parentDashboard.quickActions.viewEnquiries', path: '/parent/enquiries', icon: ClipboardDocumentListIcon, variant: 'outline' },
    { labelKey: 'parentDashboard.quickActions.updateProfile', path: '/settings', icon: UserCircleIcon, variant: 'outline' },
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-swiss-charcoal">{t('parentDashboard.enquiry.title')}</h2>
              {leadsLoading && (
                <ArrowPathIcon className="w-5 h-5 animate-spin text-swiss-teal" />
              )}
            </div>
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
                <Button 
                  key={action.labelKey} 
                  variant={action.variant as any} 
                  leftIcon={action.icon} 
                  onClick={() => navigate(action.path)} 
                  className="w-full !justify-start p-4 text-base"
                >
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
            {profileLoading ? (
              <div className="flex justify-center py-4">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-swiss-teal" />
              </div>
            ) : userProfile ? (
              <div className="space-y-2 text-sm">
                {userProfile.childName && (
                  <p><strong>{t('parentDashboard.childProfile.name')}:</strong> {userProfile.childName}</p>
                )}
                {userProfile.childAge !== undefined && (
                  <p><strong>{t('parentDashboard.childProfile.age')}:</strong> {userProfile.childAge} {t('common:leadCard.yearsOld', 'years')}</p>
                )}
                {userProfile.location && (
                  <p><strong>{t('parentDashboard.childProfile.location')}:</strong> {userProfile.location}</p>
                )}
                {userProfile.languages && userProfile.languages.length > 0 && (
                  <p><strong>{t('parentDashboard.childProfile.languages')}:</strong> {userProfile.languages.join(', ')}</p>
                )}
                <p><strong>{t('parentDashboard.childProfile.specialNeeds')}:</strong> {userProfile.specialNeeds || t('common:notSpecified', 'None specified')}</p>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                <p>{t('parentDashboard.childProfile.noData', 'No child profile information yet.')}</p>
                <p className="mt-2">{t('parentDashboard.childProfile.submitEnquiry', 'Submit an enquiry to add your child\'s information.')}</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => navigate('/settings')}>{t('parentDashboard.childProfile.button')}</Button>
          </Card>
          <Card className="p-6 bg-swiss-sand/20">
             <HeartIcon className="w-8 h-8 text-amber-700 mb-2"/>
            <h2 className="text-xl font-semibold text-amber-800 mb-2">{t('parentDashboard.favorites.title')}</h2>
            <p className="text-sm text-amber-800 mb-4">{t('parentDashboard.favorites.subtitle')}</p>
            <Button variant="secondary" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => navigate('/parent/foundations')}>{t('parentDashboard.favorites.button')}</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboardPage;
