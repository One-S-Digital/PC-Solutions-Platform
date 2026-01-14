import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LifeBuoy,
  Search,
  Filter,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Tag,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useApiClient, apiService } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { SupportTicket, TicketCategory, TicketPriority, TicketStatus, TicketStats } from '../types';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getTicketPriorityColor, getTicketStatusColor, getTicketStatusIcon } from '../utils/supportTicketUi';

const Support: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | ''>('');

  const apiClient = useApiClient();
  const { t } = useTranslation(['common', 'admin']);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Deep-link compatibility: /support?ticket=<id> -> /support/tickets/<id>
  useEffect(() => {
    const ticketFromQuery = searchParams.get('ticket');
    if (ticketFromQuery) {
      navigate(`/support/tickets/${ticketFromQuery}`, { replace: true });
    }
  }, [searchParams, navigate]);

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
    },
  });

  // Assign ticket mutation
  const assignTicketMutation = useMutation({
    mutationFn: (ticketId: string) => apiService.assignTicket(apiClient, ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    updateStatusMutation.mutate({ ticketId, status });
  };

  const handleAssignToMe = (ticketId: string) => {
    assignTicketMutation.mutate(ticketId);
  };

  // Ticket badge helpers live in ../utils/supportTicketUi

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

      {/* Tickets List (table-only) */}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:support.table.actions', { defaultValue: 'Actions' })}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {t('admin:support.noTickets')}
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/support/tickets/${ticket.id}`)}
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
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTicketPriorityColor(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTicketStatusColor(
                          ticket.status
                        )}`}
                      >
                        <span className="mr-1">{getTicketStatusIcon(ticket.status)}</span>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <select
                          className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={ticket.status}
                          onChange={(e) => handleStatusChange(ticket.id, e.target.value as TicketStatus)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <option value="OPEN">{t('common:open')}</option>
                          <option value="IN_PROGRESS">{t('common:inprogress')}</option>
                          <option value="RESOLVED">{t('common:resolved')}</option>
                          <option value="CLOSED">{t('common:closed')}</option>
                        </select>

                        {!ticket.assignedTo || ticket.assignedTo !== currentUser?.id ? (
                          <button
                            type="button"
                            onClick={() => handleAssignToMe(ticket.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs inline-flex items-center"
                            disabled={assignTicketMutation.isPending}
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                            {t('admin:support.assignToMe')}
                          </button>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-green-800 bg-green-50 border border-green-200 px-2.5 py-1 rounded-md">
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            {t('admin:support.assignedToYou')}
                          </span>
                        )}
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
  );
};

export default Support;

