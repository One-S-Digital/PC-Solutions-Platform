import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { 
  QuestionMarkCircleIcon, 
  LifebuoyIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  PlusIcon,
  InboxIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import {
  supportApi,
  SupportTicket,
  CreateTicketData,
  getTicketStatusClass,
  getTicketPriorityClass,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TicketCategory,
  TicketPriority,
} from '../../services/supportService';

interface FAQItemProps {
  questionKey: string;
  answerKey: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ questionKey, answerKey }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full text-left"
      >
        <h3 className="text-md font-medium text-swiss-charcoal">{t(`dashboard:${questionKey}`)}</h3>
        {isOpen ? <ChevronUpIcon className="w-5 h-5 text-swiss-teal" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{t(`dashboard:${answerKey}`)}</p>}
    </div>
  );
};

const SupplierSupportPage: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { request } = useAuthenticatedApi();

  // State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newResponse, setNewResponse] = useState('');

  // New ticket form
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('GENERAL');
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('MEDIUM');

  const faqs = [
    { questionKey: "supplierSupportPage.faq.addProduct.q", answerKey: "supplierSupportPage.faq.addProduct.a" },
    { questionKey: "supplierSupportPage.faq.processOrders.q", answerKey: "supplierSupportPage.faq.processOrders.a" },
    { questionKey: "supplierSupportPage.faq.manageProfile.q", answerKey: "supplierSupportPage.faq.manageProfile.a" },
    { questionKey: "supplierSupportPage.faq.commissionRates.q", answerKey: "supplierSupportPage.faq.commissionRates.a" },
  ];

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await request<SupportTicket[]>(supportApi.getTicketsEndpoint());
      if (res.success && res.data) {
        setTickets(res.data);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(t('common:errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [request, t]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Submit new ticket
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const config = supportApi.createTicketConfig({
        subject: ticketSubject,
        message: ticketMessage,
        category: ticketCategory,
        priority: ticketPriority,
      });

      const res = await request(config.endpoint, {
        method: config.method,
        body: config.body,
      });

      if (res.success) {
        setTicketSubject('');
        setTicketMessage('');
        setTicketCategory('GENERAL');
        setTicketPriority('MEDIUM');
        setShowNewTicketForm(false);
        setError(null);
        await fetchTickets();
      } else {
        setError(t('common:errors.submitFailed'));
      }
    } catch (err) {
      console.error('Error submitting ticket:', err);
      setError(t('common:errors.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit response to ticket
  const handleResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newResponse.trim()) return;

    setSubmitting(true);

    try {
      const config = supportApi.respondToTicketConfig(selectedTicket.id, { message: newResponse });
      const res = await request<SupportTicket>(config.endpoint, {
        method: config.method,
        body: config.body,
      });

      if (res.success && res.data) {
        setSelectedTicket(res.data);
        setNewResponse('');
        setError(null);
        await fetchTickets();
      } else {
        setError(t('common:errors.submitFailed'));
      }
    } catch (err) {
      console.error('Error submitting response:', err);
      setError(t('common:errors.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Ticket detail modal/card
  const TicketDetail = () => {
    if (!selectedTicket) return null;

    return (
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-swiss-charcoal">{selectedTicket.subject}</h3>
            <div className="flex gap-2 mt-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTicketStatusClass(selectedTicket.status)}`}>
                {TICKET_STATUS_LABELS[selectedTicket.status as keyof typeof TICKET_STATUS_LABELS] || selectedTicket.status}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTicketPriorityClass(selectedTicket.priority)}`}>
                {TICKET_PRIORITY_LABELS[selectedTicket.priority as keyof typeof TICKET_PRIORITY_LABELS] || selectedTicket.priority}
              </span>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                {TICKET_CATEGORY_LABELS[selectedTicket.category as keyof typeof TICKET_CATEGORY_LABELS] || selectedTicket.category}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
            {t('common:buttons.close')}
          </Button>
        </div>

        {/* Original message */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.message}</p>
          <p className="text-xs text-gray-400 mt-2">
            {new Date(selectedTicket.createdAt).toLocaleString(i18n.language)}
          </p>
        </div>

        {/* Responses */}
        <div className="space-y-3 mb-4">
          {selectedTicket.responses.map(response => (
            <div 
              key={response.id} 
              className={`p-4 rounded-lg ${response.isStaff ? 'bg-swiss-teal/10 ml-4' : 'bg-gray-50 mr-4'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-medium ${response.isStaff ? 'text-swiss-teal' : 'text-gray-600'}`}>
                  {response.isStaff ? t('common:supportPage.staffResponse') : response.userName || t('common:supportPage.you')}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(response.createdAt).toLocaleString(i18n.language)}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.message}</p>
            </div>
          ))}
        </div>

        {/* Response form */}
        {selectedTicket.status !== 'CLOSED' && (
          <form onSubmit={handleResponseSubmit} className="border-t pt-4">
            <textarea
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              placeholder={t('common:supportPage.ticketForm.responsePlaceholder')}
              rows={3}
              className={STANDARD_INPUT_FIELD}
              required
            />
            <div className="flex justify-end mt-2">
              <Button type="submit" variant="primary" disabled={submitting || !newResponse.trim()}>
                {submitting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : t('common:buttons.reply')}
              </Button>
            </div>
          </form>
        )}
      </Card>
    );
  };

  // Main render
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
        <LifebuoyIcon className="w-8 h-8 mr-3 text-swiss-mint" />
        {t('dashboard:sidebar.support')}
      </h1>

      {/* FAQ Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
          <QuestionMarkCircleIcon className="w-6 h-6 mr-2 text-swiss-teal" />
          {t('common:supportPage.faqTitle')}
        </h2>
        {faqs.map(faq => <FAQItem key={faq.questionKey} questionKey={faq.questionKey} answerKey={faq.answerKey} />)}
        <div className="mt-6 border-t pt-6">
          <h2 className="text-xl font-semibold text-swiss-charcoal mb-2">{t('common:supportPage.furtherAssistanceTitle')}</h2>
          <p className="text-gray-600 text-sm">
            {t('common:supportPage.furtherAssistanceText')}{' '}
            <a href="mailto:support@procrechesolutions.com" className="text-swiss-mint hover:underline">
              {t('common:supportPage.emailLinkText')}
            </a>{' '}
            {t('common:supportPage.orSubmitTicket')}
          </p>
        </div>
      </Card>

      {/* Selected Ticket Detail */}
      {selectedTicket && <TicketDetail />}

      {/* My Tickets Section */}
      {!selectedTicket && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-swiss-charcoal flex items-center">
              <ChatBubbleLeftRightIcon className="w-6 h-6 mr-2 text-swiss-teal" />
              {t('common:supportPage.myTicketsTitle')}
            </h2>
            <Button 
              variant="primary" 
              size="sm" 
              leftIcon={PlusIcon}
              onClick={() => setShowNewTicketForm(!showNewTicketForm)}
            >
              {t('common:supportPage.newTicketButton')}
            </Button>
          </div>

          {/* New Ticket Form */}
          {showNewTicketForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-swiss-charcoal mb-3">
                {t('common:supportPage.submitTicketTitle')}
              </h3>
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('common:supportPage.ticketForm.categoryLabel')}
                    </label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value as TicketCategory)}
                      className={STANDARD_INPUT_FIELD}
                    >
                      {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('common:supportPage.ticketForm.priorityLabel')}
                    </label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as TicketPriority)}
                      className={STANDARD_INPUT_FIELD}
                    >
                      {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common:supportPage.ticketForm.subjectLabel')}
                  </label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    required
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('common:supportPage.ticketForm.subjectPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('common:supportPage.ticketForm.messageLabel')}
                  </label>
                  <textarea
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    required
                    rows={5}
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('common:supportPage.ticketForm.messagePlaceholder')}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    type="button" 
                    onClick={() => setShowNewTicketForm(false)}
                  >
                    {t('common:buttons.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : t('common:buttons.submitTicket')}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Tickets List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-swiss-teal" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchTickets}>{t('common:buttons.retry')}</Button>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <InboxIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              {t('common:supportPage.noTickets')}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  className="py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded"
                  onClick={() => setSelectedTicket(ticket)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedTicket(ticket)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${t('common:supportPage.viewTicket')}: ${ticket.subject}`}
                >
                  <div>
                    <h4 className="text-sm font-medium text-swiss-charcoal">{ticket.subject}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTicketStatusClass(ticket.status)}`}>
                        {TICKET_STATUS_LABELS[ticket.status as keyof typeof TICKET_STATUS_LABELS] || ticket.status}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {new Date(ticket.createdAt).toLocaleDateString(i18n.language)}
                      </span>
                      {ticket.responses.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {ticket.responses.length} {t('common:supportPage.responses')}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDownIcon className="w-5 h-5 text-gray-400 -rotate-90" />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default SupplierSupportPage;
