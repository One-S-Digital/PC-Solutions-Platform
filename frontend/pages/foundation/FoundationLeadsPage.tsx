import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { UserRole } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  InboxArrowDownIcon, 
  InboxIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import FeatureLock from '../../components/shared/FeatureLock';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import {
  foundationLeadsApi,
  LeadWithResponses,
  LeadResponseStats,
  getLeadStatusInfo,
  getResponseStatusInfo,
  LeadResponseStatus,
} from '../../services/foundationLeadsService';

const FoundationLeadsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { request } = useAuthenticatedApi();

  // State
  const [leads, setLeads] = useState<LeadWithResponses[]>([]);
  const [stats, setStats] = useState<LeadResponseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterResponseStatus, setFilterResponseStatus] = useState<string>('');

  // UI state for each lead card
  const [showResponseInput, setShowResponseInput] = useState<Record<string, boolean>>({});
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const [respondingLeadId, setRespondingLeadId] = useState<string | null>(null);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters = {
        status: filterStatus || undefined,
        responseStatus: filterResponseStatus || undefined,
        search: searchQuery || undefined,
      };

      const [leadsRes, statsRes] = await Promise.all([
        request<LeadWithResponses[]>(foundationLeadsApi.getLeadsEndpoint(filters)),
        request<LeadResponseStats>(foundationLeadsApi.getStatsEndpoint()),
      ]);

      if (leadsRes.success && leadsRes.data) {
        setLeads(leadsRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(t('common:errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [request, filterStatus, filterResponseStatus, searchQuery, t]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle lead response
  const handleResponse = async (leadId: string, status: LeadResponseStatus, message?: string) => {
    setRespondingLeadId(leadId);
    
    try {
      const config = foundationLeadsApi.respondToLeadConfig(leadId, { status, message });
      const res = await request(config.endpoint, {
        method: config.method,
        body: config.body,
      });

      if (res.success) {
        // Refresh leads after successful response
        await fetchLeads();
        setShowResponseInput({ ...showResponseInput, [leadId]: false });
        setResponseTexts({ ...responseTexts, [leadId]: '' });
      }
    } catch (err) {
      console.error('Error responding to lead:', err);
    } finally {
      setRespondingLeadId(null);
    }
  };

  // Access check
  if (!currentUser || currentUser.role !== UserRole.FOUNDATION) {
    return (
      <div className="text-center p-10">
        <h1 className="text-2xl font-bold text-swiss-charcoal">{t('foundationLeadsPage.accessDenied.title')}</h1>
        <p className="text-gray-600">{t('foundationLeadsPage.accessDenied.message')}</p>
      </div>
    );
  }
  
  if (currentUser.plan === 'Basic') {
    return <FeatureLock featureName={t('sidebar.parentLeads')} requiredPlan="Pro" />;
  }

  // Render loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
            <InboxArrowDownIcon className="w-8 h-8 mr-3 text-swiss-mint" />
            {t('foundationLeadsPage.title')}
          </h1>
        </div>
        <div className="flex justify-center items-center py-12">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-swiss-teal" />
        </div>
      </div>
    );
  }

  // Render error
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
          <InboxArrowDownIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('foundationLeadsPage.title')}
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
          <InboxArrowDownIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('foundationLeadsPage.title')}
        </h1>
        
        {/* Stats summary */}
        {stats && (
          <div className="flex gap-4 text-sm">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
              {t('leadCard.status.interested')}: {stats.interested}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
              {t('leadCard.status.enrolled')}: {stats.enrolled}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
              {t('foundationLeadsPage.totalLeads')}: {stats.totalResponses}
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('foundationLeadsPage.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
        >
          <option value="">{t('foundationLeadsPage.allStatuses')}</option>
          <option value="NEW">{t('leadCard.status.new')}</option>
          <option value="PROCESSING">{t('leadCard.status.processing')}</option>
          <option value="CONVERTED">{t('leadCard.status.converted')}</option>
        </select>

        <select
          value={filterResponseStatus}
          onChange={(e) => setFilterResponseStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
        >
          <option value="">{t('foundationLeadsPage.allResponses')}</option>
          <option value="NOT_RESPONDED">{t('leadCard.status.notResponded')}</option>
          <option value="INTERESTED">{t('leadCard.status.interested')}</option>
          <option value="NOT_INTERESTED">{t('leadCard.status.notInterested')}</option>
          <option value="NEEDS_MORE_INFO">{t('leadCard.status.needsMoreInfo')}</option>
          <option value="ENROLLED">{t('leadCard.status.enrolled')}</option>
        </select>

        <Button 
          variant="outline" 
          leftIcon={FunnelIcon}
          onClick={fetchLeads}
        >
          {t('common:buttons.filter')}
        </Button>
      </div>

      {/* Empty state */}
      {leads.length === 0 && (
        <Card className="p-10 text-center">
          <InboxIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">{t('foundationLeadsPage.emptyState.title')}</h2>
          <p className="text-gray-500">{t('foundationLeadsPage.emptyState.message')}</p>
        </Card>
      )}

      {/* Leads grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leads.map((lead) => {
          const myResponse = lead.myResponse;
          const responseStatusInfo = myResponse
            ? getResponseStatusInfo(myResponse.status)
            : getResponseStatusInfo('NOT_RESPONDED');
          const leadStatusInfo = getLeadStatusInfo(lead.status);
          const isResponding = respondingLeadId === lead.id;

          return (
            <Card key={lead.id} className="flex flex-col p-5 space-y-3">
              <div>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-swiss-charcoal">
                    {t('leadCard.title', { name: lead.parentName })}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${responseStatusInfo.className}`}>
                    {responseStatusInfo.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {lead.preferredLocation || t('leadCard.noLocation')} • {lead.childName} ({lead.childAge} {t('leadCard.yearsOld')})
                </p>
              </div>
              
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>{t('leadCard.email')}:</strong> {lead.parentEmail}</p>
                {lead.parentPhone && <p><strong>{t('leadCard.phone')}:</strong> {lead.parentPhone}</p>}
                <p><strong>{t('leadCard.submittedOn')}:</strong> {new Date(lead.createdAt).toLocaleDateString(i18n.language)}</p>
                {lead.message && <p><strong>{t('leadCard.notes')}:</strong> <span className="italic">{lead.message}</span></p>}
              </div>

              {/* Action buttons for new/not responded leads */}
              {(!myResponse || myResponse.status === 'NEEDS_MORE_INFO') && (
                <>
                  <div className="pt-3 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      leftIcon={CheckCircleIcon}
                      onClick={() => handleResponse(lead.id, 'INTERESTED', t('leadCard.defaultMessages.interested'))}
                      disabled={isResponding}
                    >
                      {t('leadCard.buttons.interested')}
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      leftIcon={XCircleIcon}
                      onClick={() => handleResponse(lead.id, 'NOT_INTERESTED', t('leadCard.defaultMessages.notInterested'))}
                      disabled={isResponding}
                    >
                      {t('leadCard.buttons.notInterested')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      leftIcon={QuestionMarkCircleIcon}
                      onClick={() => setShowResponseInput({ ...showResponseInput, [lead.id]: true })}
                      disabled={isResponding}
                    >
                      {t('leadCard.buttons.needInfo')}
                    </Button>
                  </div>
                  
                  {showResponseInput[lead.id] && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('leadCard.questionFor', { name: lead.parentName })}:
                      </label>
                      <textarea
                        value={responseTexts[lead.id] || ''}
                        onChange={(e) => setResponseTexts({ ...responseTexts, [lead.id]: e.target.value })}
                        rows={2}
                        className="w-full text-sm border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-swiss-teal focus:border-transparent"
                        placeholder={t('leadCard.questionPlaceholder')}
                      />
                      <div className="mt-2 flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowResponseInput({ ...showResponseInput, [lead.id]: false })}
                        >
                          {t('common:buttons.cancel')}
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleResponse(lead.id, 'NEEDS_MORE_INFO', responseTexts[lead.id])}
                          disabled={!responseTexts[lead.id]?.trim() || isResponding}
                          leftIcon={PaperAirplaneIcon}
                        >
                          {t('leadCard.buttons.sendQuestion')}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Display response and follow-up actions */}
              {myResponse && myResponse.status !== 'NEEDS_MORE_INFO' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="p-3 bg-gray-50 rounded-md text-sm mb-3">
                    <p className="font-medium">
                      {t('leadCard.yourResponse')}: 
                      <span className={`ml-2 ${responseStatusInfo.className} px-1.5 py-0.5 rounded`}>
                        {responseStatusInfo.label}
                      </span>
                    </p>
                    {myResponse.message && (
                      <p className="italic mt-1">{t('leadCard.messageSent')}: "{myResponse.message}"</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      leftIcon={ChatBubbleLeftEllipsisIcon}
                      onClick={() => navigate('/messages')}
                    >
                      {t('leadCard.buttons.messageParent')}
                    </Button>
                    {myResponse.status === 'INTERESTED' && (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        leftIcon={CheckCircleIcon}
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleResponse(lead.id, 'ENROLLED', t('leadCard.defaultMessages.enrolled'))}
                        disabled={isResponding}
                      >
                        {t('leadCard.buttons.markEnrolled')}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isResponding && (
                <div className="flex justify-center py-2">
                  <ArrowPathIcon className="w-5 h-5 animate-spin text-swiss-teal" />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FoundationLeadsPage;
