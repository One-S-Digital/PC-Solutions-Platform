import React, { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  LifeBuoy,
  Tag,
  User,
  UserCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/clerk-react';

import LoadingSpinner from '../components/ui/LoadingSpinner';
import SupportReplyComposer from '../components/support/SupportReplyComposer';
import { useSupportThread } from '../hooks/useSupportThread';
import { useApiClient, apiService } from '../services/api';
import { SupportTicket as SupportTicketType, TicketPriority, TicketStatus } from '../types';
import { getTicketPriorityColor, getTicketStatusColor, getTicketStatusIcon } from '../utils/supportTicketUi';

const SupportTicket: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { t } = useTranslation(['common', 'admin']);
  const { user } = useUser();

  const currentUserId = user?.id || '';

  const { data: currentUserResponse } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiService.getCurrentUser(apiClient),
  });
  const currentUser = currentUserResponse?.data?.data;

  const resolvedTicketId = ticketId || '';

  const {
    data: ticketResponse,
    isLoading: ticketLoading,
    isError: ticketError,
  } = useQuery({
    queryKey: ['support-ticket', resolvedTicketId],
    queryFn: () => apiService.getSupportTicket(apiClient, resolvedTicketId),
    enabled: !!resolvedTicketId,
  });

  const ticket: SupportTicketType | null = ticketResponse?.data?.data || null;

  const handleTicketUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    if (resolvedTicketId) {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', resolvedTicketId] });
    }
  }, [queryClient, resolvedTicketId]);

  const { replies, sendReply, messagesEndRef, scrollContainerRef } = useSupportThread({
    ticketId: resolvedTicketId || null,
    userId: currentUserId,
    onTicketUpdate: handleTicketUpdate,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status }: { status: TicketStatus }) =>
      apiService.updateTicketStatus(apiClient, resolvedTicketId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      await queryClient.invalidateQueries({ queryKey: ['support-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['support-ticket', resolvedTicketId] });
    },
  });

  const assignTicketMutation = useMutation({
    mutationFn: () => apiService.assignTicket(apiClient, resolvedTicketId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      await queryClient.invalidateQueries({ queryKey: ['support-ticket', resolvedTicketId] });
    },
  });

  const handleStatusChange = useCallback(
    (status: TicketStatus) => {
      if (!resolvedTicketId) return;
      updateStatusMutation.mutate({ status });
    },
    [resolvedTicketId, updateStatusMutation]
  );

  const handleAssignToMe = useCallback(() => {
    if (!resolvedTicketId) return;
    assignTicketMutation.mutate();
  }, [resolvedTicketId, assignTicketMutation]);

  const handleSendReply = useCallback(
    async (content: string) => {
      await sendReply(content);
      await queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      await queryClient.invalidateQueries({ queryKey: ['support-ticket', resolvedTicketId] });
    },
    [sendReply, queryClient, resolvedTicketId]
  );

  const showComposer = useMemo(() => {
    return !!ticket && ticket.status !== 'CLOSED';
  }, [ticket?.id, ticket?.status]);

  // Ticket badge helpers live in ../utils/supportTicketUi

  if (!resolvedTicketId) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-gray-700">
          {t('admin:support.ticketNotFound', { defaultValue: 'Ticket not found.' })}
        </div>
      </div>
    );
  }

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (ticketError || !ticket) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/support')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('admin:support.backToList', { defaultValue: 'Back to tickets' })}
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 text-gray-900 font-semibold">
            <LifeBuoy className="h-5 w-5 text-blue-600" />
            {t('admin:support.ticketNotFound', { defaultValue: 'Ticket not found.' })}
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {t('admin:support.ticketNotFoundHint', {
              defaultValue: 'This ticket may have been deleted, or you may not have access.',
            })}
          </p>
        </div>
      </div>
    );
  }

  const isAssignedToYou = !!currentUser?.id && ticket.assignedTo === currentUser.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate('/support')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('admin:support.backToList', { defaultValue: 'Back to tickets' })}
          </button>

          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 flex items-center min-w-0">
            <LifeBuoy className="h-7 w-7 mr-3 text-blue-600 flex-shrink-0" />
            <span className="truncate">{ticket.subject}</span>
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTicketStatusColor(
                ticket.status
              )}`}
            >
              {getTicketStatusIcon(ticket.status)}
              <span className="ml-1">{ticket.status.replace('_', ' ')}</span>
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTicketPriorityColor(
                ticket.priority
              )}`}
            >
              {ticket.priority}
            </span>
            <span className="inline-flex items-center text-xs text-gray-600">
              <Tag className="h-3 w-3 mr-1" />
              {ticket.category}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thread */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div
              ref={scrollContainerRef}
              className="p-6 max-h-[60vh] overflow-y-auto"
            >
              <div className="space-y-4">
                {/* Original Message */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {ticket.user
                        ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() ||
                          ticket.user.email ||
                          t('common:unknown')
                        : t('common:unknown')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
                </div>

                {/* Responses */}
                {replies.map((response) => (
                  <div
                    key={response.id}
                    className={`border-l-4 ${response.isStaff ? 'border-green-500' : 'border-gray-300'} pl-4`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
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
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.message}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {showComposer && (
              <div className="p-6 border-t border-gray-200">
                <SupportReplyComposer
                  ticketId={resolvedTicketId}
                  onSend={handleSendReply}
                  placeholder={t('admin:support.replyPlaceholder')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: actions + meta */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              {t('admin:support.quickActions', { defaultValue: 'Quick actions' })}
            </h2>

            <div className="mt-4 space-y-2">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                disabled={updateStatusMutation.isPending}
              >
                <option value="OPEN">{t('common:open')}</option>
                <option value="IN_PROGRESS">{t('common:inprogress')}</option>
                <option value="RESOLVED">{t('common:resolved')}</option>
                <option value="CLOSED">{t('common:closed')}</option>
              </select>

              {!isAssignedToYou ? (
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center text-sm"
                  disabled={assignTicketMutation.isPending}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {assignTicketMutation.isPending
                    ? t('admin:support.assigning')
                    : t('admin:support.assignToMe')}
                </button>
              ) : (
                <div className="w-full bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg flex items-center justify-center text-sm font-medium">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('admin:support.assignedToYou')}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              {t('admin:support.details', { defaultValue: 'Details' })}
            </h2>

            <dl className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-gray-500 flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  {t('admin:support.table.user')}
                </dt>
                <dd className="text-sm text-gray-900 text-right">
                  {ticket.user
                    ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() ||
                      ticket.user.email ||
                      t('common:unknown')
                    : t('common:unknown')}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-gray-500 flex items-center">
                  <UserCheck className="h-4 w-4 mr-2 text-gray-400" />
                  {t('admin:support.table.assignedTo')}
                </dt>
                <dd className="text-sm text-gray-900 text-right">
                  {ticket.assignee
                    ? `${ticket.assignee.firstName || ''} ${ticket.assignee.lastName || ''}`.trim() ||
                      ticket.assignee.email ||
                      t('admin:support.staffMember')
                    : t('admin:support.unassigned')}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-gray-500 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {t('admin:support.table.created')}
                </dt>
                <dd className="text-sm text-gray-900 text-right">
                  {new Date(ticket.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportTicket;

