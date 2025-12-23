import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LifeBuoy,
  Search,
  Filter,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  User,
  Calendar,
  Tag,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useApiClient, apiService } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { SupportTicket, TicketCategory, TicketPriority, TicketStatus, TicketStats, TicketResponse } from '../types';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/clerk-react';
import { useSupportThread } from '../hooks/useSupportThread';
import SupportReplyComposer from '../components/support/SupportReplyComposer';

const Support: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | ''>('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const apiClient = useApiClient();
  const { t } = useTranslation(['common', 'admin']);
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  // Stable callback for ticket updates
  const handleTicketUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
  }, [queryClient]);

  // Use shared thread hook for replies management
  const currentUserId = user?.id || '';
  const { replies, sendReply, messagesEndRef, scrollContainerRef } = useSupportThread({
    ticketId: selectedTicket?.id || null,
    userId: currentUserId,
    onTicketUpdate: handleTicketUpdate,
  });

  // Fetch current user to check assignment
  const { data: currentUserResponse } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiService.getCurrentUser(apiClient),
  });

  const currentUser = currentUserResponse?.data?.data;

  // Fetch tickets with filters
  const { data: ticketsResponse, isLoading: ticketsLoading } = useQuery({
    queryKey: ['support-tickets', selectedStatus, selectedPriority, selectedCategory, searchQuery],
    queryFn: () =>
      apiService.getSupportTickets(apiClient, {
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
      }),
  });

  // Fetch ticket statistics
  const { data: statsResponse } = useQuery({
    queryKey: ['support-stats'],
    queryFn: () => apiService.getSupportTicketStats(apiClient),
  });

  const tickets: SupportTicket[] = ticketsResponse?.data?.data || [];
  const stats: TicketStats = statsResponse?.data?.data || {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    byStatus: {},
    byPriority: {},
    byCategory: {},
  };

  // Update ticket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: TicketStatus }) =>
      apiService.updateTicketStatus(apiClient, ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-stats'] });
      if (selectedTicket) {
        apiService.getSupportTicket(apiClient, selectedTicket.id).then((response) => {
          setSelectedTicket(response.data.data);
        });
      }
    },
  });

  // Assign ticket mutation
  const assignTicketMutation = useMutation({
    mutationFn: (ticketId: string) => apiService.assignTicket(apiClient, ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      if (selectedTicket) {
        apiService.getSupportTicket(apiClient, selectedTicket.id).then((response) => {
          setSelectedTicket(response.data.data);
        });
      }
    },
  });


  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    updateStatusMutation.mutate({ ticketId, status });
  };

  const handleAssignToMe = (ticketId: string) => {
    assignTicketMutation.mutate(ticketId);
  };

  // Memoize ticketId to ensure stable prop
  const currentTicketId = useMemo(() => selectedTicket?.id || null, [selectedTicket?.id]);

  // Stable callback for sending replies - sendReply already has ticketId in closure
  const handleSendReply = useCallback(async (content: string) => {
    await sendReply(content);
    // Invalidate queries to refresh ticket list
    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    if (currentTicketId) {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', currentTicketId] });
    }
  }, [sendReply, queryClient, currentTicketId]);

  // Memoize whether to show composer (stable boolean)
  const showComposer = useMemo(() => {
    return selectedTicket && selectedTicket.status !== 'CLOSED';
  }, [selectedTicket?.id, selectedTicket?.status]);

  // Auto-scroll to bottom on mount or when selected ticket changes
  useEffect(() => {
    if (selectedTicket) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedTicket?.id]);

  const getStatusColor = (status: TicketStatus): string => {
    switch (status) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: TicketPriority): string => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return <AlertCircle className="h-4 w-4" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4" />;
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CLOSED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (ticketsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <LifeBuoy className="h-8 w-8 mr-3 text-blue-600" />
            {t('admin:support.title')}
          </h1>
          <p className="mt-2 text-gray-600">{t('admin:support.subtitle', { total: stats.total })}</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('common:supportPage.stats.open')}</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('common:supportPage.stats.inProgress')}</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('common:supportPage.stats.resolved')}</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('common:supportPage.stats.total')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{t('common:filters.title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin:support.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as TicketStatus | '')}
          >
            <option value="">{t('common:filters.status.all')}</option>
            <option value="OPEN">{t('common:open')}</option>
            <option value="IN_PROGRESS">{t('common:inprogress')}</option>
            <option value="RESOLVED">{t('common:resolved')}</option>
            <option value="CLOSED">{t('common:closed')}</option>
          </select>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as TicketPriority | '')}
          >
            <option value="">{t('common:filters.priority.all')}</option>
            <option value="LOW">{t('common:low')}</option>
            <option value="MEDIUM">{t('common:medium')}</option>
            <option value="HIGH">{t('common:high')}</option>
            <option value="URGENT">{t('common:urgent')}</option>
          </select>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as TicketCategory | '')}
          >
            <option value="">{t('common:filters.category.all')}</option>
            <option value="GENERAL">{t('common:general')}</option>
            <option value="TECHNICAL">{t('common:technical')}</option>
            <option value="BILLING">{t('common:billing')}</option>
            <option value="FEATURE_REQUEST">{t('common:featurerequest')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin:support.table.ticket')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin:support.table.user')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin:support.table.assignedTo')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin:support.table.priority')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin:support.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin:support.table.created')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {t('admin:support.noTickets')}
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <MessageSquare className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 line-clamp-1">{ticket.subject}</p>
                              <p className="text-xs text-gray-500 mt-1 flex items-center">
                                <Tag className="h-3 w-3 mr-1" />
                                {ticket.category}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {ticket.user
                                ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() ||
                                  ticket.user.email
                                : t('common:unknown')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {ticket.assignee ? (
                              <>
                                <UserCheck className="h-4 w-4 text-green-600 mr-2" />
                                <div className="text-sm text-gray-900">
                                  {`${ticket.assignee.firstName || ''} ${ticket.assignee.lastName || ''}`.trim() ||
                                    ticket.assignee.email ||
                                    t('admin:support.staff')}
                                </div>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400 italic">{t('admin:support.unassigned')}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                              ticket.status
                            )}`}
                          >
                            <span className="mr-1">{getStatusIcon(ticket.status)}</span>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Ticket Detail Panel */}
        <div className="lg:col-span-1">
          {selectedTicket ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedTicket.subject}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                      selectedTicket.status
                    )}`}
                  >
                    {getStatusIcon(selectedTicket.status)}
                    <span className="ml-1">{selectedTicket.status.replace('_', ' ')}</span>
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                      selectedTicket.priority
                    )}`}
                  >
                    {selectedTicket.priority}
                  </span>
                </div>

                {/* Assignee Information */}
                {selectedTicket.assignee && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center text-sm text-blue-800">
                      <UserCheck className="h-4 w-4 mr-2" />
                      <span className="font-medium">
                        {t('admin:support.assignedTo')}:{' '}
                        {`${selectedTicket.assignee.firstName || ''} ${selectedTicket.assignee.lastName || ''}`.trim() ||
                          selectedTicket.assignee.email ||
                          t('admin:support.staffMember')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-2">
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as TicketStatus)}
                  >
                    <option value="OPEN">{t('common:open')}</option>
                    <option value="IN_PROGRESS">{t('common:inprogress')}</option>
                    <option value="RESOLVED">{t('common:resolved')}</option>
                    <option value="CLOSED">{t('common:closed')}</option>
                  </select>
                  {!selectedTicket.assignedTo || selectedTicket.assignedTo !== currentUser?.id ? (
                    <button
                      onClick={() => handleAssignToMe(selectedTicket.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center text-sm"
                      disabled={assignTicketMutation.isPending}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {assignTicketMutation.isPending ? t('admin:support.assigning') : t('admin:support.assignToMe')}
                    </button>
                  ) : (
                    <div className="w-full bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg flex items-center justify-center text-sm font-medium">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('admin:support.assignedToYou')}
                    </div>
                  )}
                </div>
              </div>

              <div 
                ref={scrollContainerRef}
                className="p-6 max-h-96 overflow-y-auto"
              >
                <div className="space-y-4">
                  {/* Original Message */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedTicket.user
                          ? `${selectedTicket.user.firstName || ''} ${selectedTicket.user.lastName || ''}`.trim()
                          : t('admin:support.user')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{selectedTicket.message}</p>
                  </div>

                  {/* Responses - sorted by createdAt */}
                  {replies.map((response) => (
                      <div
                        key={response.id}
                        className={`border-l-4 ${
                          response.isStaff ? 'border-green-500' : 'border-gray-300'
                        } pl-4`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {response.userName || t('common:unknown')}
                            {response.isStaff && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                {t('admin:support.staff')}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(response.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{response.message}</p>
                      </div>
                    ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Reply Box */}
              {showComposer && currentTicketId && (
                <div className="p-6 border-t border-gray-200">
                  <SupportReplyComposer
                    ticketId={currentTicketId}
                    onSend={handleSendReply}
                    placeholder={t('admin:support.replyPlaceholder')}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{t('admin:support.selectTicket')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Support;

