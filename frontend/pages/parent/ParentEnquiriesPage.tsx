import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { UserRole, LeadMainStatus, FoundationLeadResponseStatus } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  ClipboardDocumentListIcon, 
  InboxIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface FoundationResponse {
  id: string;
  foundationId: string;
  foundationName: string;
  status: string;
  message: string | null;
  respondedAt: string | null;
}

interface ParentLeadWithResponses {
  id: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  childName: string;
  childAge: number;
  message?: string;
  preferredLocation?: string;
  preferredLanguages?: string[];
  specialRequirements?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  foundationResponses: FoundationResponse[];
  // Legacy fields from compat endpoint
  canton?: string;
  municipality?: string;
  specialNeeds?: string;
  desiredStartDate?: string;
  submissionDate?: string;
  mainStatus?: string;
  assignedFoundations?: string[];
  responses?: any[];
}

const ParentEnquiriesPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { currentUser, refreshLeads } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();

  // State
  const [leads, setLeads] = useState<ParentLeadWithResponses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLeads, setExpandedLeads] = useState<Record<string, boolean>>({});

  // Fetch parent's leads with foundation responses
  const fetchLeads = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the parent-specific leads endpoint
      const response = await authenticatedRequest<ParentLeadWithResponses[]>('/leads/parent/my-leads');
      
      if (response.success && response.data) {
        setLeads(response.data);
      } else {
        // Fallback to compat endpoint and filter by parent
        const compatResponse = await authenticatedRequest<any>('/compat/parent-leads');
        if (compatResponse.success && compatResponse.data) {
          // The compat endpoint returns all leads, filter by parentId
          const parentLeads = (compatResponse.data || []).filter((lead: any) => 
            lead.parentId === currentUser.id || lead.parentEmail === currentUser.email
          );
          setLeads(parentLeads);
        }
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      // Try compat endpoint as fallback
      try {
        const compatResponse = await authenticatedRequest<any>('/compat/parent-leads');
        if (compatResponse.success && compatResponse.data) {
          const parentLeads = (compatResponse.data || []).filter((lead: any) => 
            lead.parentId === currentUser.id || lead.parentEmail === currentUser.email
          );
          setLeads(parentLeads);
        }
      } catch (fallbackErr) {
        setError(t('common:errors.fetchFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, authenticatedRequest, t]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Toggle lead expansion
  const toggleLead = (leadId: string) => {
    setExpandedLeads(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toUpperCase() || 'NEW';
    switch (normalizedStatus) {
      case 'NEW': return 'bg-blue-100 text-blue-700';
      case 'PROCESSING': return 'bg-yellow-100 text-yellow-700';
      case 'PARENT_ACTION_REQUIRED': return 'bg-orange-100 text-orange-700';
      case 'CLOSED_ENROLLED': return 'bg-green-100 text-green-700';
      case 'CLOSED_OTHER': return 'bg-gray-100 text-gray-700';
      case 'ASSIGNED': return 'bg-purple-100 text-purple-700';
      case 'CONTACTED': return 'bg-indigo-100 text-indigo-700';
      case 'CONVERTED': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  // Get response status info
  const getFoundationResponseStatusInfo = (status: string) => {
    const normalizedStatus = status?.toUpperCase() || '';
    switch(normalizedStatus) {
      case 'INTERESTED': 
        return { text: t('leadCard.status.interested', 'Interested'), color: 'text-green-600', icon: CheckCircleIcon, bgColor: 'bg-green-50' };
      case 'NOT_INTERESTED': 
        return { text: t('leadCard.status.notInterested', 'Not Interested'), color: 'text-red-600', icon: XCircleIcon, bgColor: 'bg-red-50' };
      case 'NEEDS_MORE_INFO': 
        return { text: t('leadCard.status.needsMoreInfo', 'Needs More Info'), color: 'text-orange-600', icon: InformationCircleIcon, bgColor: 'bg-orange-50' };
      case 'ENROLLED': 
        return { text: t('leadCard.status.enrolled', 'Enrolled'), color: 'text-purple-600', icon: CheckCircleIcon, bgColor: 'bg-purple-50' };
      default: 
        return { text: t('leadCard.status.notResponded', 'Awaiting Response'), color: 'text-gray-500', icon: ClockIcon, bgColor: 'bg-gray-50' };
    }
  };

  // Get display status
  const getDisplayStatus = (lead: ParentLeadWithResponses) => {
    return lead.mainStatus || lead.status || 'NEW';
  };

  // Get submission date
  const getSubmissionDate = (lead: ParentLeadWithResponses) => {
    const date = lead.submissionDate || lead.createdAt;
    return date ? new Date(date).toLocaleDateString(i18n.language) : '';
  };

  // Access check
  if (!currentUser || currentUser.role !== UserRole.PARENT) {
    return (
      <div className="text-center p-10">
        <h1 className="text-2xl font-bold text-swiss-charcoal">{t('parentEnquiriesPage.accessDenied.title')}</h1>
        <p className="text-gray-600">{t('parentEnquiriesPage.accessDenied.message')}</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
            <ClipboardDocumentListIcon className="w-8 h-8 mr-3 text-swiss-mint" />
            {t('parentEnquiriesPage.title')}
          </h1>
        </div>
        <div className="flex justify-center items-center py-12">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-swiss-teal" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <ClipboardDocumentListIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('parentEnquiriesPage.title')}
        </h1>
        <Card className="p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchLeads}>{t('common:buttons.retry')}</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <ClipboardDocumentListIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('parentEnquiriesPage.title')}
        </h1>
        <Button 
          variant="primary" 
          onClick={() => navigate('/parent-lead-form')}
        >
          {t('parentEnquiriesPage.newEnquiry', 'New Enquiry')}
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-swiss-teal">{leads.length}</p>
          <p className="text-sm text-gray-600">{t('parentEnquiriesPage.stats.totalEnquiries', 'Total Enquiries')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-swiss-mint">
            {leads.reduce((count, lead) => count + ((lead.foundationResponses || lead.responses || []).length), 0)}
          </p>
          <p className="text-sm text-gray-600">{t('parentEnquiriesPage.stats.totalResponses', 'Total Responses')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-swiss-coral">
            {leads.filter(l => {
              const status = getDisplayStatus(l);
              return status === 'NEW' || status === 'PROCESSING';
            }).length}
          </p>
          <p className="text-sm text-gray-600">{t('parentEnquiriesPage.stats.pending', 'Pending')}</p>
        </Card>
      </div>

      {/* Empty state */}
      {leads.length === 0 && (
        <Card className="p-10 text-center">
          <InboxIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">{t('parentEnquiriesPage.emptyState.title')}</h2>
          <p className="text-gray-500 mb-4">
            {t('parentEnquiriesPage.emptyState.message.0', 'You haven\'t submitted any enquiries yet.')}{' '}
            <Link to="/parent-lead-form" className="text-swiss-mint hover:underline">
              {t('parentEnquiriesPage.emptyState.message.1', 'Send your first enquiry')}
            </Link>
          </p>
          <Button variant="primary" onClick={() => navigate('/parent-lead-form')}>
            {t('parentEnquiriesPage.findDaycare', 'Find a Daycare')}
          </Button>
        </Card>
      )}

      {/* Enquiries list */}
      {leads.map((lead) => {
        const isExpanded = expandedLeads[lead.id];
        const displayStatus = getDisplayStatus(lead);
        const responses = lead.foundationResponses || lead.responses || [];
        const hasResponses = responses.length > 0;

        return (
          <Card key={lead.id} className="overflow-hidden">
            {/* Lead header - clickable to expand */}
            <button
              onClick={() => toggleLead(lead.id)}
              className="w-full p-5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-swiss-teal">
                      {lead.canton || lead.preferredLocation || t('parentEnquiriesPage.card.enquiry', 'Enquiry')}
                      {lead.municipality && ` - ${lead.municipality}`}
                    </h2>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(displayStatus)}`}>
                      {displayStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {t('parentEnquiriesPage.card.submitted')}: {getSubmissionDate(lead)}
                    </span>
                    <span className="flex items-center">
                      <UserIcon className="w-4 h-4 mr-1" />
                      {lead.childName || t('parentEnquiriesPage.card.child', 'Child')}: {lead.childAge} {t('common:leadCard.yearsOld', 'years old')}
                    </span>
                    {lead.desiredStartDate && (
                      <span className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {t('parentEnquiriesPage.card.startDate', 'Start')}: {new Date(lead.desiredStartDate).toLocaleDateString(i18n.language)}
                      </span>
                    )}
                  </div>

                  {hasResponses && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm font-medium text-swiss-mint">
                        {responses.length} {t('parentEnquiriesPage.card.responses', 'response(s)')}
                      </span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-500">
                        {t('parentEnquiriesPage.card.clickToView', 'Click to view details')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-gray-200">
                {/* Lead details */}
                <div className="p-5 bg-gray-50">
                  <h3 className="font-medium text-swiss-charcoal mb-3">{t('parentEnquiriesPage.card.enquiryDetails', 'Enquiry Details')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>{t('parentEnquiriesPage.card.childName', 'Child Name')}:</strong> {lead.childName}</p>
                      <p><strong>{t('parentEnquiriesPage.card.childAge', 'Child Age')}:</strong> {lead.childAge} {t('common:leadCard.yearsOld', 'years')}</p>
                      {lead.preferredLanguages && lead.preferredLanguages.length > 0 && (
                        <p><strong>{t('parentEnquiriesPage.card.languages', 'Languages')}:</strong> {lead.preferredLanguages.join(', ')}</p>
                      )}
                    </div>
                    <div>
                      <p><strong>{t('parentEnquiriesPage.card.location', 'Location')}:</strong> {lead.canton || lead.preferredLocation || '-'}</p>
                      {lead.desiredStartDate && (
                        <p><strong>{t('parentEnquiriesPage.card.desiredStart', 'Desired Start')}:</strong> {new Date(lead.desiredStartDate).toLocaleDateString(i18n.language)}</p>
                      )}
                    </div>
                  </div>
                  {(lead.specialNeeds || lead.specialRequirements || lead.message) && (
                    <div className="mt-3 p-3 bg-white rounded-md">
                      <p className="text-sm">
                        <InformationCircleIcon className="w-4 h-4 inline mr-1 text-gray-400" />
                        <strong>{t('parentEnquiriesPage.card.notes')}:</strong> {lead.specialNeeds || lead.specialRequirements || lead.message}
                      </p>
                    </div>
                  )}
                </div>

                {/* Foundation responses */}
                <div className="p-5">
                  <h3 className="font-medium text-swiss-charcoal mb-4">
                    {t('parentEnquiriesPage.card.responsesTitle', 'Daycare Responses')}:
                  </h3>
                  
                  {!hasResponses && displayStatus === 'NEW' && (
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <ClockIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-sm text-blue-600">{t('parentEnquiriesPage.card.awaitingMatch', 'Your enquiry is being matched with suitable daycares.')}</p>
                      <p className="text-xs text-blue-500 mt-1">{t('parentEnquiriesPage.card.checkBack', 'Check back soon for responses.')}</p>
                    </div>
                  )}

                  {!hasResponses && displayStatus !== 'NEW' && (
                    <p className="text-sm text-gray-500 italic">{t('parentEnquiriesPage.card.noResponses', 'No responses yet.')}</p>
                  )}

                  {responses.map((response: any) => {
                    const statusInfo = getFoundationResponseStatusInfo(response.status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <div key={response.id || response.foundationId} className={`p-4 mb-3 rounded-lg ${statusInfo.bgColor}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <BuildingOfficeIcon className="w-6 h-6 text-swiss-teal" />
                            <div>
                              <p className="font-medium text-swiss-charcoal">{response.foundationName}</p>
                              {response.respondedAt && (
                                <p className="text-xs text-gray-500">
                                  {t('parentEnquiriesPage.card.respondedOn', 'Responded on')} {new Date(response.respondedAt).toLocaleDateString(i18n.language)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                            <StatusIcon className="w-5 h-5" />
                            <span className="text-sm font-semibold">{statusInfo.text}</span>
                          </div>
                        </div>
                        
                        {(response.messageToParent || response.message) && (
                          <div className="mt-3 p-3 bg-white rounded-md">
                            <p className="text-sm text-gray-700">
                              <ChatBubbleLeftEllipsisIcon className="w-4 h-4 inline mr-1 text-gray-400" />
                              <span className="italic">"{response.messageToParent || response.message}"</span>
                            </p>
                          </div>
                        )}

                        {response.status?.toUpperCase() === 'INTERESTED' && (
                          <div className="mt-3 flex gap-2">
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => navigate('/messages')}
                            >
                              {t('parentEnquiriesPage.card.contactDaycare', 'Contact Daycare')}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {hasResponses && responses.length < (lead.assignedFoundations?.length || 0) && displayStatus !== 'CLOSED_ENROLLED' && displayStatus !== 'CLOSED_OTHER' && (
                    <p className="text-sm text-gray-500 mt-3 italic">
                      {t('parentEnquiriesPage.card.waitingForMoreResponses', 'Waiting for more daycares to respond...')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default ParentEnquiriesPage;
