import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Send, XCircle, CheckCircle, AlertTriangle, Clock, Loader2, Mail, Calendar,
} from 'lucide-react'
import DOMPurify from 'dompurify'
import { toast } from 'sonner'

import { useApiClient, apiService } from '../services/api'
import { MailingCampaignDetail as CampaignType } from '../types/api'
import Card from '../components/design-system/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import SendProgressOverlay from '../components/mailing/SendProgressOverlay'

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  DRAFT: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' },
  SCHEDULED: { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
  SENDING: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100' },
  SENT: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  FAILED: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  CANCELLED: { icon: XCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
}

const MailingCampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [sendingOpen, setSendingOpen] = useState(false)

  const { data: campaign, isLoading } = useQuery<CampaignType>({
    queryKey: ['mailing-campaign', id],
    queryFn: async () => {
      const res = await apiService.mailingGetCampaign(apiClient, id!)
      return res.data
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data as CampaignType | undefined
      return d?.status === 'SENDING' || d?.status === 'SCHEDULED' ? 5000 : false
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>
  }

  if (!campaign) {
    return <div className="text-center py-20 text-gray-400">Campaign not found</div>
  }

  const status = statusConfig[campaign.status] ?? statusConfig.DRAFT!
  const StatusIcon = status!.icon
  const progress =
    campaign.totalEstimated > 0
      ? Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalEstimated) * 100)
      : 0

  const canResume = campaign.status === 'DRAFT' || campaign.status === 'SENDING'
  const canCancel = campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED' || campaign.status === 'SENDING'

  const handleCancel = async () => {
    if (!confirm('Cancel this campaign? This cannot be undone.')) return
    try {
      await apiService.mailingCancelCampaign(apiClient, campaign.id)
      toast.success('Campaign cancelled')
      queryClient.invalidateQueries({ queryKey: ['mailing-campaign', id] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/mailing?tab=campaigns')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 truncate">{campaign.subject}</h1>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${status!.bg} ${status!.color}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${campaign.status === 'SENDING' ? 'animate-spin' : ''}`} />
              {campaign.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Created {new Date(campaign.createdAt).toLocaleString()}
            {campaign.segment && <> &middot; Segment: {campaign.segment.name}</>}
            {campaign.scheduledAt && (
              <> &middot; <span className="text-purple-600 font-medium">Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canResume && (
            <button
              onClick={() => setSendingOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              {campaign.status === 'DRAFT' ? 'Start Sending' : 'Resume Sending'}
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{campaign.totalEstimated.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Estimated</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{campaign.sentCount.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Sent</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{campaign.failedCount.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Failed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{progress}%</p>
          <p className="text-sm text-gray-500">Completion</p>
        </Card>
      </div>

      {/* Progress bar */}
      {campaign.totalEstimated > 0 && (
        <Card className="p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Delivery Progress</span>
            <span>{campaign.sentCount + campaign.failedCount} / {campaign.totalEstimated}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                campaign.status === 'SENT'
                  ? 'bg-green-500'
                  : campaign.status === 'FAILED'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {campaign.sentAt && (
            <p className="text-xs text-gray-400 mt-2">
              Started: {new Date(campaign.sentAt).toLocaleString()}
              {campaign.completedAt && <> &middot; Completed: {new Date(campaign.completedAt).toLocaleString()}</>}
            </p>
          )}
        </Card>
      )}

      {/* Email preview */}
      <Card className="p-0">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">Email Content Preview</h3>
        </div>
        <div className="p-4">
          <div className="text-sm text-gray-500 mb-2">
            <strong>Subject:</strong> {campaign.subject}
          </div>
          <div
            className="border rounded-lg p-4 bg-white prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(campaign.bodyHtml) }}
          />
        </div>
      </Card>

      {/* Send progress overlay */}
      {sendingOpen && (
        <SendProgressOverlay
          isOpen={sendingOpen}
          campaignId={campaign.id}
          onClose={() => {
            setSendingOpen(false)
            queryClient.invalidateQueries({ queryKey: ['mailing-campaign', id] })
          }}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['mailing-campaign', id] })
          }}
        />
      )}
    </div>
  )
}

export default MailingCampaignDetailPage
