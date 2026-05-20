import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Plus, Download, Send, Save, Trash2, RefreshCw, Users, BarChart3, List, UserPlus, Pencil, Check, X, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import { useApiClient, apiService } from '../services/api'
import { MailingFilters, MailingPreviewResponse, MailingSegment, MailingCustomList, MailingTemplate } from '../types/api'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import Card from '../components/design-system/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import MailingFilterPanel from '../components/mailing/MailingFilterPanel'
import MailingPreviewTable from '../components/mailing/MailingPreviewTable'
import SaveSegmentModal from '../components/mailing/SaveSegmentModal'
import ExportModal from '../components/mailing/ExportModal'
import ComposeEmailModal from '../components/mailing/ComposeEmailModal'
import SendProgressOverlay from '../components/mailing/SendProgressOverlay'
import AddToListModal from '../components/mailing/AddToListModal'
import CustomListMembersModal from '../components/mailing/CustomListMembersModal'
import TemplateEditorModal from '../components/mailing/TemplateEditorModal'

type Tab = 'build' | 'segments' | 'campaigns' | 'lists' | 'templates'

const TAB_KEYS: { key: Tab; labelKey: string; icon: React.ElementType }[] = [
  { key: 'build', labelKey: 'admin:mailing.tabs.build', icon: Users },
  { key: 'lists', labelKey: 'admin:mailing.tabs.lists', icon: List },
  { key: 'segments', labelKey: 'admin:mailing.tabs.segments', icon: Save },
  { key: 'campaigns', labelKey: 'admin:mailing.tabs.campaigns', icon: BarChart3 },
  { key: 'templates', labelKey: 'admin:mailing.tabs.templates', icon: FileText },
]

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    SENDING: 'bg-blue-100 text-blue-700',
    SENT: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

/** Don't retry on 404 (endpoint not deployed), 401/403 (auth/permission). */
const noRetryOnClientError = (failureCount: number, error: any) => {
  const status = error?.response?.status
  if (status === 404 || status === 401 || status === 403) return false
  return failureCount < 2
}

const MailingListPage: React.FC = () => {
  const { t } = useTranslation(['admin'])
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const activeTab = (searchParams.get('tab') as Tab) || 'build'
  const setActiveTab = (tab: Tab) => setSearchParams({ tab })

  // ---- Build a List state ----
  // Default: show all users (broadcast mode). Admin can switch to
  // "Newsletter subscribers" in the Audience filter to exclude opted-out users.
  const [filters, setFilters] = useState<MailingFilters>({ excludeUnsubscribed: false })
  const debouncedFilters = useDebouncedValue(filters, 400)
  const [previewPage, setPreviewPage] = useState(1)

  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [composeModalOpen, setComposeModalOpen] = useState(false)
  const [addToListModalOpen, setAddToListModalOpen] = useState(false)
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  // Custom list action state
  const [activeList, setActiveList] = useState<MailingCustomList | null>(null)
  const [listMembersModalOpen, setListMembersModalOpen] = useState(false)
  const [listComposeModalOpen, setListComposeModalOpen] = useState(false)
  const [listExportModalOpen, setListExportModalOpen] = useState(false)
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editingListName, setEditingListName] = useState('')

  // Template state
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MailingTemplate | null>(null)
  const [templateActionLoading, setTemplateActionLoading] = useState(false)

  const toggleSelectUser = useCallback((id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Preview query — disable retries for 404 (route not yet deployed)
  const { data: preview, isLoading: previewLoading, error: previewError } = useQuery<MailingPreviewResponse>({
    queryKey: ['mailing-preview', debouncedFilters, previewPage],
    queryFn: async () => {
      const res = await apiService.mailingPreview(apiClient, {
        filters: debouncedFilters,
        page: previewPage,
        pageSize: 20,
      })
      return res.data
    },
    enabled: activeTab === 'build',
    retry: noRetryOnClientError,
  })

  const toggleSelectAllOnPage = useCallback(() => {
    if (!preview?.rows) return
    const pageIds = preview.rows.map((r) => r.id)
    setSelectedUserIds((prev) => {
      const allSelected = pageIds.every((id) => prev.has(id))
      const next = new Set(prev)
      for (const id of pageIds) {
        if (allSelected) { next.delete(id) } else { next.add(id) }
      }
      return next
    })
  }, [preview?.rows])

  // Segments query
  const { data: segmentsData, isLoading: segmentsLoading } = useQuery({
    queryKey: ['mailing-segments'],
    queryFn: async () => {
      const res = await apiService.mailingListSegments(apiClient, { pageSize: 100 })
      return res.data
    },
    enabled: activeTab === 'segments',
    retry: noRetryOnClientError,
  })

  // Campaigns query
  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['mailing-campaigns'],
    queryFn: async () => {
      const res = await apiService.mailingListCampaigns(apiClient, { pageSize: 100 })
      return res.data
    },
    enabled: activeTab === 'campaigns',
    retry: noRetryOnClientError,
  })

  // Transport status — loaded once on mount so we can show a config warning
  const { data: transportStatus } = useQuery({
    queryKey: ['mailing-transport-status'],
    queryFn: async () => {
      const res = await apiService.mailingTransportStatus(apiClient)
      return res.data as {
        configured: boolean
        activeProvider: string | null
        providers: {
          mailgun: { configured: boolean; present: Record<string, boolean> }
          smtp: { configured: boolean; present: Record<string, boolean> }
          sendgrid: { configured: boolean; present: Record<string, boolean> }
        }
        fromEmail: string | null
        fromName: string | null
      }
    },
    staleTime: 60_000,
    retry: false,
  })

  // Custom Lists query
  const { data: customListsData, isLoading: customListsLoading } = useQuery({
    queryKey: ['mailing-custom-lists'],
    queryFn: async () => {
      const res = await apiService.mailingListCustomLists(apiClient, { pageSize: 100 })
      return res.data
    },
    enabled: activeTab === 'lists' || addToListModalOpen,
    retry: noRetryOnClientError,
  })

  // Templates query
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['mailing-templates'],
    queryFn: async () => {
      const res = await apiService.mailingListTemplates(apiClient, { pageSize: 100 })
      return res.data
    },
    enabled: activeTab === 'templates',
    retry: noRetryOnClientError,
  })

  // Reset preview page when filters change
  useEffect(() => { setPreviewPage(1) }, [debouncedFilters])

  // Clear selection when filters change (preserve selections across pages)
  useEffect(() => { setSelectedUserIds(new Set()) }, [debouncedFilters])

  // ---- Actions ----
  const handleSaveSegment = useCallback(async (name: string, description: string) => {
    setActionLoading(true)
    try {
      await apiService.mailingCreateSegment(apiClient, { name, description, filters })
      toast.success(t('admin:mailing.segment.saved'))
      setSaveModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['mailing-segments'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save segment')
    } finally {
      setActionLoading(false)
    }
  }, [apiClient, filters, queryClient])

  const handleExport = useCallback(async (format: 'csv' | 'xlsx', columns: string[]) => {
    setActionLoading(true)
    try {
      const res = await apiService.mailingExport(apiClient, {
        filters,
        format,
        columns,
        deduplicateByEmail: true,
      })
      // Download the blob
      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mailing_export_${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`Exported ${preview?.count || 0} recipients`)
      setExportModalOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Export failed')
    } finally {
      setActionLoading(false)
    }
  }, [apiClient, filters, preview?.count])

  const handleCreateCampaign = useCallback(async (subject: string, bodyHtml: string) => {
    setActionLoading(true)
    try {
      const res = await apiService.mailingCreateCampaign(apiClient, {
        subject,
        bodyHtml,
        filters,
      })
      const campaignId = res.data?.campaignId
      toast.success('Campaign created')
      setComposeModalOpen(false)
      if (campaignId) {
        setSendingCampaignId(campaignId)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create campaign')
    } finally {
      setActionLoading(false)
    }
  }, [apiClient, filters])

  const handleDeleteSegment = useCallback(async (id: string) => {
    if (!confirm(t('admin:mailing.segment.deleteConfirm'))) return
    try {
      await apiService.mailingDeleteSegment(apiClient, id)
      toast.success(t('admin:mailing.segment.deleted'))
      queryClient.invalidateQueries({ queryKey: ['mailing-segments'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete')
    }
  }, [apiClient, queryClient])

  const handleUseSegment = useCallback(async (segment: MailingSegment) => {
    setFilters(segment.filtersJson)
    setActiveTab('build')
  }, [])

  const handleCreateListCampaign = useCallback(async (subject: string, bodyHtml: string) => {
    if (!activeList) return
    setActionLoading(true)
    try {
      const res = await apiService.mailingCreateCampaign(apiClient, {
        subject,
        bodyHtml,
        customListId: activeList.id,
      })
      const campaignId = res.data?.campaignId
      toast.success('Campaign created')
      setListComposeModalOpen(false)
      if (campaignId) setSendingCampaignId(campaignId)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create campaign')
    } finally {
      setActionLoading(false)
    }
  }, [apiClient, activeList])

  const handleExportList = useCallback(async (format: 'csv' | 'xlsx', columns: string[]) => {
    if (!activeList) return
    setActionLoading(true)
    try {
      const res = await apiService.mailingExport(apiClient, {
        customListId: activeList.id,
        format,
        columns,
        deduplicateByEmail: true,
      })
      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const sanitizedName = activeList.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[/\\:*?"<>|]+/g, '').replace(/\s+/g, '_').trim().slice(0, 100)
      a.download = `${sanitizedName}_export_${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`Exported ${activeList._count?.members || 0} members`)
      setListExportModalOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Export failed')
    } finally {
      setActionLoading(false)
    }
  }, [apiClient, activeList])

  const handleDeleteCustomList = useCallback(async (listId: string) => {
    if (!confirm(t('admin:mailing.customLists.deleteConfirm', 'Delete this list?'))) return
    setActionLoading(true)
    try {
      await apiService.mailingDeleteCustomList(apiClient, listId)
      toast.success(t('admin:mailing.customLists.deleted', 'List deleted'))
      queryClient.invalidateQueries({ queryKey: ['mailing-custom-lists'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete')
    } finally {
      setActionLoading(false)
    }
  }, [apiClient, queryClient, t])

  const handleRenameList = useCallback(async (listId: string, newName: string) => {
    if (!newName.trim()) return
    try {
      await apiService.mailingUpdateCustomList(apiClient, listId, { name: newName.trim() })
      toast.success('List renamed')
      setEditingListId(null)
      queryClient.invalidateQueries({ queryKey: ['mailing-custom-lists'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to rename list')
    }
  }, [apiClient, queryClient])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('admin:mailing.title')}</h1>
            <p className="text-sm text-gray-500">{t('admin:mailing.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Transport not configured warning */}
      {transportStatus && !transportStatus.configured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Email transport not configured — newsletters cannot be sent</p>
              <p className="text-xs text-amber-700 mt-1">
                Set one of the following in your server environment, then redeploy:
              </p>
              <ul className="text-xs text-amber-700 mt-1 list-disc list-inside space-y-0.5">
                {!transportStatus.providers.mailgun.configured && (
                  <li>
                    Mailgun: <code className="bg-amber-100 px-1 rounded">MAILGUN_API_KEY</code> +{' '}
                    <code className="bg-amber-100 px-1 rounded">MAILGUN_DOMAIN</code>
                    {transportStatus.providers.mailgun.present.MAILGUN_API_KEY && !transportStatus.providers.mailgun.present.MAILGUN_DOMAIN && (
                      <span className="ml-1 text-amber-600">(API key found — only MAILGUN_DOMAIN is missing)</span>
                    )}
                    {!transportStatus.providers.mailgun.present.MAILGUN_API_KEY && transportStatus.providers.mailgun.present.MAILGUN_DOMAIN && (
                      <span className="ml-1 text-amber-600">(domain found — only MAILGUN_API_KEY is missing)</span>
                    )}
                  </li>
                )}
                {!transportStatus.providers.smtp.configured && (
                  <li>
                    SMTP: <code className="bg-amber-100 px-1 rounded">MAILING_SMTP_HOST</code> +{' '}
                    <code className="bg-amber-100 px-1 rounded">MAILING_SMTP_USER</code> +{' '}
                    <code className="bg-amber-100 px-1 rounded">MAILING_SMTP_PASS</code>
                  </li>
                )}
                {!transportStatus.providers.sendgrid.configured && (
                  <li>
                    SendGrid: <code className="bg-amber-100 px-1 rounded">SENDGRID_API_KEY</code>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TAB_KEYS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>
      </div>

      {/* BUILD A LIST tab */}
      {activeTab === 'build' && (
        <div className="flex gap-6">
          {/* Filter panel */}
          <Card className="w-72 shrink-0 p-4 overflow-y-auto max-h-[calc(100vh-220px)]">
            <MailingFilterPanel filters={filters} onChange={setFilters} />
          </Card>

          {/* Preview area */}
          <div className="flex-1 min-w-0">
            {/* Error banner when API endpoint is unavailable */}
            {previewError && (() => {
              const previewStatus = (previewError as any)?.response?.status
              const is404 = previewStatus === 404
              return (
              <Card className="mb-4 p-4 border-red-200 bg-red-50">
                <div className="flex items-center gap-3 text-red-700">
                  <Mail className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">
                      {is404
                        ? t('admin:mailing.errors.endpointNotAvailable', 'Mailing API endpoint is not available. The server may need to be redeployed.')
                        : t('admin:mailing.errors.previewFailed', 'Failed to load recipient preview. Please try again later.')}
                    </p>
                    <p className="text-xs mt-1 text-red-600">
                      {is404
                        ? t('admin:mailing.errors.endpointNotAvailableDetail', 'The mailing service endpoint is not registered. A redeployment may be required.')
                        : (previewError as any)?.message || 'Unknown error'}
                    </p>
                  </div>
                </div>
              </Card>
              )
            })()}

            {/* Action bar */}
            <Card className="mb-4 p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-semibold text-gray-900">
                    {previewLoading ? '...' : (preview?.count || 0).toLocaleString()} recipients
                  </div>
                  {(preview?.warnings?.length || 0) > 0 && (
                    <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      {preview!.warnings[0]}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedUserIds.size > 0 && (
                    <button
                      onClick={() => setAddToListModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      <UserPlus className="w-4 h-4" /> {t('admin:mailing.actions.addToList', 'Add to List')} ({selectedUserIds.size})
                    </button>
                  )}
                  <button
                    onClick={() => setSaveModalOpen(true)}
                    disabled={!preview?.count}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Save className="w-4 h-4" /> {t('admin:mailing.actions.saveSegment')}
                  </button>
                  <button
                    onClick={() => setExportModalOpen(true)}
                    disabled={!preview?.count}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" /> {t('admin:mailing.actions.export')}
                  </button>
                  <button
                    onClick={() => setComposeModalOpen(true)}
                    disabled={!preview?.count}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> {t('admin:mailing.actions.sendEmail')}
                  </button>
                </div>
              </div>
            </Card>

            {/* Preview table */}
            <Card className="overflow-hidden">
              <MailingPreviewTable
                rows={preview?.rows || []}
                loading={previewLoading}
                count={preview?.count || 0}
                page={previewPage}
                totalPages={preview?.totalPages || 1}
                onPageChange={setPreviewPage}
                selectedIds={selectedUserIds}
                onToggleSelect={toggleSelectUser}
                onToggleSelectAll={toggleSelectAllOnPage}
              />
            </Card>
          </div>
        </div>
      )}

      {/* SEGMENTS tab */}
      {activeTab === 'segments' && (
        <Card className="overflow-hidden">
          {segmentsLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : !segmentsData?.segments?.length ? (
            <div className="text-center py-16 text-gray-400">
              <Save className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>{t('admin:mailing.segment.noSegments')}</p>
              <button
                onClick={() => setActiveTab('build')}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800"
              >
                {t('admin:mailing.segment.buildFirst')}
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaigns</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {segmentsData.segments.map((seg: MailingSegment) => (
                  <tr key={seg.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{seg.name}</div>
                      {seg.description && <div className="text-xs text-gray-500 truncate max-w-xs">{seg.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{seg.estimatedSize?.toLocaleString() || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{seg._count?.campaigns || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(seg.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleUseSegment(seg)}
                          className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Use
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await apiService.mailingRefreshSegment(apiClient, seg.id)
                              queryClient.invalidateQueries({ queryKey: ['mailing-segments'] })
                              toast.success(t('admin:mailing.segment.sizeRefreshed'))
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message || 'Failed to refresh segment size')
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Refresh size"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSegment(seg.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* CAMPAIGNS tab */}
      {activeTab === 'campaigns' && (
        <Card className="overflow-hidden">
          {campaignsLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : !campaignsData?.campaigns?.length ? (
            <div className="text-center py-16 text-gray-400">
              <Send className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>{t('admin:mailing.campaign.noCampaigns')}</p>
              <button
                onClick={() => setActiveTab('build')}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800"
              >
                {t('admin:mailing.campaign.noCampaignsHint')}
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent / Failed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaignsData.campaigns.map((c: any) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/mailing/campaigns/${c.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-xs">{c.subject}</td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.totalEstimated.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-green-600">{c.sentCount}</span>
                      {' / '}
                      <span className="text-red-600">{c.failedCount}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.segmentName || 'Ad-hoc'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* CUSTOM LISTS tab */}
      {activeTab === 'lists' && (
        <Card className="overflow-hidden">
          {customListsLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">
                  {t('admin:mailing.customLists.title', 'Custom Lists')}
                  {customListsData?.total ? ` (${customListsData.total})` : ''}
                </h3>
                <button
                  onClick={() => setAddToListModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /> {t('admin:mailing.customLists.createNewList', 'Create new list')}
                </button>
              </div>
              {!customListsData?.lists?.length ? (
                <div className="text-center py-16 text-gray-400">
                  <List className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>{t('admin:mailing.customLists.noLists', 'No custom lists yet')}</p>
                  <p className="text-sm mt-1 text-gray-400">
                    {t('admin:mailing.customLists.noListsHint', 'Select users in the Build tab and click "Add to List" to create one')}
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customListsData.lists.map((list: MailingCustomList) => (
                      <tr key={list.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {editingListId === list.id ? (
                            <form
                              className="flex items-center gap-2"
                              onSubmit={(e) => { e.preventDefault(); handleRenameList(list.id, editingListName) }}
                            >
                              <input
                                autoFocus
                                value={editingListName}
                                onChange={(e) => setEditingListName(e.target.value)}
                                className="text-sm border border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                              />
                              <button type="submit" className="p-1 text-green-600 hover:text-green-800">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => setEditingListId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          ) : (
                            <>
                              <div className="text-sm font-medium text-gray-900">{list.name}</div>
                              {list.description && <div className="text-xs text-gray-500 truncate max-w-xs">{list.description}</div>}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setActiveList(list); setListMembersModalOpen(true) }}
                            className="text-sm text-blue-600 hover:underline"
                            title="View members"
                          >
                            {(list._count?.members ?? 0).toLocaleString()} members
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(list.updatedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Send email / Create campaign */}
                            <button
                              onClick={() => { setActiveList(list); setListComposeModalOpen(true) }}
                              disabled={(list._count?.members ?? 0) === 0}
                              className="flex items-center gap-1 text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Create mail campaign for this list"
                            >
                              <Send className="w-3 h-3" /> Send
                            </button>
                            {/* Export list */}
                            <button
                              onClick={() => { setActiveList(list); setListExportModalOpen(true) }}
                              disabled={(list._count?.members ?? 0) === 0}
                              className="flex items-center gap-1 text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Export list members"
                            >
                              <Download className="w-3 h-3" /> Export
                            </button>
                            {/* View members */}
                            <button
                              onClick={() => { setActiveList(list); setListMembersModalOpen(true) }}
                              className="flex items-center gap-1 text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                              title="View members"
                            >
                              <Users className="w-3 h-3" /> Members
                            </button>
                            {/* Rename */}
                            <button
                              onClick={() => { setEditingListId(list.id); setEditingListName(list.name) }}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Rename list"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteCustomList(list.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Delete list"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </Card>
      )}

      {/* TEMPLATES tab */}
      {activeTab === 'templates' && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">
              Email Templates{templatesData?.total ? ` (${templatesData.total})` : ''}
            </h3>
            <button
              onClick={() => { setEditingTemplate(null); setTemplateEditorOpen(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>
          {templatesLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : !templatesData?.templates?.length ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No templates yet</p>
              <p className="text-sm mt-1 text-gray-400">Create reusable HTML templates to speed up campaign creation</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templatesData.templates.map((tpl: MailingTemplate) => (
                  <tr key={tpl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{tpl.name}</div>
                      {tpl.description && <div className="text-xs text-gray-500 truncate max-w-xs">{tpl.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">{tpl.subject}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(tpl.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditingTemplate(tpl); setTemplateEditorOpen(true) }}
                          className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete template "${tpl.name}"?`)) return
                            try {
                              await apiService.mailingDeleteTemplate(apiClient, tpl.id)
                              queryClient.invalidateQueries({ queryKey: ['mailing-templates'] })
                              toast.success('Template deleted')
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message || 'Failed to delete template')
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Modals */}
      <AddToListModal
        isOpen={addToListModalOpen}
        onClose={() => setAddToListModalOpen(false)}
        selectedUserIds={Array.from(selectedUserIds)}
        onComplete={() => {
          setSelectedUserIds(new Set())
          queryClient.invalidateQueries({ queryKey: ['mailing-custom-lists'] })
        }}
      />
      <SaveSegmentModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveSegment}
        loading={actionLoading}
      />
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
        loading={actionLoading}
        count={preview?.count || 0}
      />
      <ComposeEmailModal
        isOpen={composeModalOpen}
        onClose={() => setComposeModalOpen(false)}
        onSend={handleCreateCampaign}
        loading={actionLoading}
        recipientCount={preview?.count || 0}
      />
      {sendingCampaignId && (
        <SendProgressOverlay
          isOpen={!!sendingCampaignId}
          campaignId={sendingCampaignId}
          onClose={() => {
            setSendingCampaignId(null)
            queryClient.invalidateQueries({ queryKey: ['mailing-campaigns'] })
          }}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['mailing-campaigns'] })
          }}
        />
      )}

      {/* Custom list — view members */}
      {activeList && (
        <CustomListMembersModal
          isOpen={listMembersModalOpen}
          onClose={() => setListMembersModalOpen(false)}
          list={activeList}
        />
      )}

      {/* Custom list — compose campaign email */}
      <ComposeEmailModal
        isOpen={listComposeModalOpen}
        onClose={() => setListComposeModalOpen(false)}
        onSend={handleCreateListCampaign}
        loading={actionLoading}
        recipientCount={activeList?._count?.members ?? 0}
      />

      {/* Custom list — export members */}
      <ExportModal
        isOpen={listExportModalOpen}
        onClose={() => setListExportModalOpen(false)}
        onExport={handleExportList}
        loading={actionLoading}
        count={activeList?._count?.members ?? 0}
      />

      {/* Template editor */}
      <TemplateEditorModal
        isOpen={templateEditorOpen}
        onClose={() => { setTemplateEditorOpen(false); setEditingTemplate(null) }}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
        initial={editingTemplate ?? undefined}
        loading={templateActionLoading}
        onSave={async (data) => {
          setTemplateActionLoading(true)
          try {
            if (editingTemplate) {
              await apiService.mailingUpdateTemplate(apiClient, editingTemplate.id, data)
              toast.success('Template updated')
            } else {
              await apiService.mailingCreateTemplate(apiClient, data)
              toast.success('Template created')
            }
            queryClient.invalidateQueries({ queryKey: ['mailing-templates'] })
            setTemplateEditorOpen(false)
            setEditingTemplate(null)
          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save template')
          } finally {
            setTemplateActionLoading(false)
          }
        }}
      />
    </div>
  )
}

export default MailingListPage
