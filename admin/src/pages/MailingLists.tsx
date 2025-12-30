import React, { Fragment, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Menu, Transition } from '@headlessui/react'
import { Plus, MoreVertical, Download, Send, Eye, Trash2, Settings2, ShieldOff, Mail as MailIcon } from 'lucide-react'
import { toast } from 'sonner'

import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { STANDARD_INPUT_FIELD } from '../constants/design-system'
import { useApiClient, apiService } from '../services/api'
import { UserRole } from '../types'

type MailingListType = 'ALL_USERS' | 'ROLE_FILTER' | 'CUSTOM'

type MailingList = {
  id: string
  name: string
  type: MailingListType
  roles: UserRole[]
  regions: string[]
  includeInactive: boolean
  members?: Array<{ userId: string }>
  _count?: { members?: number; campaigns?: number; listOptOuts?: number }
  createdAt?: string
  updatedAt?: string
}

type Recipient = {
  userId: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: UserRole
  organizationName?: string | null
  region?: string | null
}

const LIST_TYPES: Array<{ value: MailingListType; labelKey: string; defaultLabel: string }> = [
  { value: 'ALL_USERS', labelKey: 'admin:mailingLists.types.allUsers', defaultLabel: 'All users' },
  { value: 'ROLE_FILTER', labelKey: 'admin:mailingLists.types.byRole', defaultLabel: 'Filter by role' },
  { value: 'CUSTOM', labelKey: 'admin:mailingLists.types.custom', defaultLabel: 'Custom selection' },
]

const ROLE_OPTIONS: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.FOUNDATION,
  UserRole.PRODUCT_SUPPLIER,
  UserRole.SERVICE_PROVIDER,
  UserRole.EDUCATOR,
  UserRole.PARENT,
]

function formatListType(t: MailingListType): string {
  if (t === 'ALL_USERS') return 'ALL_USERS'
  if (t === 'ROLE_FILTER') return 'ROLE_FILTER'
  return 'CUSTOM'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

interface CreateEditListModalProps {
  isOpen: boolean
  onClose: () => void
  initial?: MailingList | null
  regions: string[]
  onSave: (payload: any) => Promise<void>
}

const CreateEditListModal: React.FC<CreateEditListModalProps> = ({ isOpen, onClose, initial, regions, onSave }) => {
  const { t } = useTranslation(['admin', 'common'])
  const apiClient = useApiClient()

  const [name, setName] = useState('')
  const [type, setType] = useState<MailingListType>('ALL_USERS')
  const [roles, setRoles] = useState<UserRole[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [includeInactive, setIncludeInactive] = useState(false)
  const [memberUserIds, setMemberUserIds] = useState<Set<string>>(new Set())

  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [userPageSize] = useState(25)

  useEffect(() => {
    if (!isOpen) return
    setName(initial?.name ?? '')
    setType(initial?.type ?? 'ALL_USERS')
    setRoles((initial?.roles as any) ?? [])
    setSelectedRegions(initial?.regions ?? [])
    setIncludeInactive(Boolean(initial?.includeInactive))
    setMemberUserIds(new Set((initial?.members ?? []).map((m) => m.userId)))
    setUserSearch('')
    setUserPage(1)
  }, [isOpen, initial])

  const toggleRole = (r: UserRole) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))
  }

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) => (prev.includes(region) ? prev.filter((x) => x !== region) : [...prev, region]))
  }

  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['mailing-user-search', userSearch, userPage, userPageSize, type],
    queryFn: async () => {
      if (!apiClient) return null
      const resp = await apiService.searchMailingUsers(apiClient, {
        search: userSearch || undefined,
        page: userPage,
        limit: userPageSize,
      })
      return resp
    },
    enabled: isOpen && !!apiClient && type === 'CUSTOM',
    staleTime: 15_000,
  })

  const selectableUsers: Array<{ id: string; email: string; name: string; role: string; region?: string | null }> = useMemo(() => {
    const raw = (usersResponse as any)?.data?.data?.users ?? (usersResponse as any)?.data?.users ?? []
    return (raw as any[]).map((u) => ({
      id: u.userId || u.id,
      email: u.email,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      role: u.role,
      region: u.region ?? null,
    }))
  }, [usersResponse])

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!apiClient) throw new Error('API not ready')
      const resp = await apiService.previewMailingRecipientsForDefinition(apiClient, {
        type,
        roles: type === 'ROLE_FILTER' ? roles : [],
        regions: selectedRegions,
        includeInactive,
        memberUserIds: type === 'CUSTOM' ? Array.from(memberUserIds) : [],
        limit: '20',
      })
      return resp
    },
  })

  const preview = (previewMutation.data as any)?.data?.data
  const previewTotal: number | undefined = preview?.total
  const previewSample: Recipient[] = preview?.sample ?? []

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {initial?.id
              ? t('admin:mailingLists.edit.title', { defaultValue: 'Edit mailing list' })
              : t('admin:mailingLists.create.title', { defaultValue: 'Create mailing list' })}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailingLists.fields.name', { defaultValue: 'Name' })}
              </label>
              <input
                className={STANDARD_INPUT_FIELD}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('admin:mailingLists.fields.namePlaceholder', { defaultValue: 'e.g., All Educators (ZH)' })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailingLists.fields.type', { defaultValue: 'List type' })}
              </label>
              <select className={STANDARD_INPUT_FIELD} value={type} onChange={(e) => setType(e.target.value as MailingListType)}>
                {LIST_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
                  </option>
                ))}
              </select>
            </div>

            {type === 'ROLE_FILTER' && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {t('admin:mailingLists.fields.roles', { defaultValue: 'Roles' })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={roles.includes(r)} onChange={() => toggleRole(r)} />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-700">
                  {t('admin:mailingLists.fields.regions', { defaultValue: 'Regions' })}
                </div>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => setSelectedRegions([])}
                >
                  {t('admin:mailingLists.actions.clearRegions', { defaultValue: 'Clear' })}
                </button>
              </div>
              <div className="max-h-40 overflow-auto border border-gray-200 rounded-md p-2 space-y-1">
                {regions.length === 0 ? (
                  <div className="text-xs text-gray-500">{t('admin:mailingLists.regions.none', { defaultValue: 'No regions available' })}</div>
                ) : (
                  regions.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={selectedRegions.includes(r)} onChange={() => toggleRegion(r)} />
                      <span>{r}</span>
                    </label>
                  ))
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t('admin:mailingLists.regions.hint', {
                  defaultValue: 'If selected, recipients must match user.region or organization canton/regions served.',
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={includeInactive} onChange={() => setIncludeInactive((v) => !v)} />
              {t('admin:mailingLists.fields.includeInactive', { defaultValue: 'Include inactive users' })}
            </label>

            {type === 'CUSTOM' && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-700">
                    {t('admin:mailingLists.custom.selection', { defaultValue: 'Select users' })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('admin:mailingLists.custom.selectedCount', {
                      defaultValue: 'Selected: {{count}}',
                      count: memberUserIds.size,
                    })}
                  </div>
                </div>

                <input
                  className={STANDARD_INPUT_FIELD}
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    setUserPage(1)
                  }}
                  placeholder={t('admin:mailingLists.custom.searchPlaceholder', { defaultValue: 'Search by name or email...' })}
                />

                <div className="mt-3 max-h-56 overflow-auto border border-gray-200 rounded-md">
                  {isLoadingUsers ? (
                    <div className="p-4 flex justify-center"><LoadingSpinner /></div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {selectableUsers.map((u) => {
                        const checked = memberUserIds.has(u.id)
                        return (
                          <label key={u.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setMemberUserIds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(u.id)) next.delete(u.id)
                                  else next.add(u.id)
                                  return next
                                })
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate">{u.name}</div>
                              <div className="text-xs text-gray-500 truncate">
                                {u.email} • {u.role}{u.region ? ` • ${u.region}` : ''}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                      {selectableUsers.length === 0 && (
                        <div className="p-4 text-sm text-gray-500">
                          {t('admin:mailingLists.custom.noUsers', { defaultValue: 'No users found.' })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    >
                      {t('common:previous', { defaultValue: 'Previous' })}
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                      onClick={() => setUserPage((p) => p + 1)}
                    >
                      {t('common:next', { defaultValue: 'Next' })}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:text-red-800"
                    onClick={() => setMemberUserIds(new Set())}
                  >
                    {t('admin:mailingLists.custom.clearSelection', { defaultValue: 'Clear selection' })}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">
                {t('admin:mailingLists.preview.title', { defaultValue: 'Recipient preview' })}
              </div>
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
              >
                {previewMutation.isPending
                  ? t('admin:mailingLists.preview.loading', { defaultValue: 'Previewing...' })
                  : t('admin:mailingLists.preview.refresh', { defaultValue: 'Refresh preview' })}
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              {previewMutation.isPending ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : previewMutation.isError ? (
                <div className="text-sm text-red-600">
                  {t('admin:mailingLists.preview.error', { defaultValue: 'Failed to preview recipients.' })}
                </div>
              ) : previewTotal !== undefined ? (
                <>
                  <div className="text-sm text-gray-700 mb-3">
                    {t('admin:mailingLists.preview.total', { defaultValue: 'Total recipients: {{count}}', count: previewTotal })}
                    <div className="text-xs text-gray-500 mt-1">
                      {t('admin:mailingLists.preview.optOutNote', { defaultValue: 'Preview excludes global opt-outs.' })}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto divide-y divide-gray-100 border border-gray-100 rounded-md">
                    {previewSample.map((r) => (
                      <div key={`${r.email}-${r.userId}`} className="p-2 text-xs text-gray-700">
                        <div className="font-medium">{r.email}</div>
                        <div className="text-gray-500">
                          {r.role}{r.region ? ` • ${r.region}` : ''}{r.organizationName ? ` • ${r.organizationName}` : ''}
                        </div>
                      </div>
                    ))}
                    {previewSample.length === 0 && (
                      <div className="p-3 text-sm text-gray-500">
                        {t('admin:mailingLists.preview.empty', { defaultValue: 'No recipients match these filters.' })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  {t('admin:mailingLists.preview.hint', { defaultValue: 'Click “Refresh preview” to compute recipients.' })}
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500">
              {t('admin:mailingLists.preview.disclaimer', {
                defaultValue: 'Final recipient set may also exclude list-specific opt-outs after the list is created.',
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            {t('common:cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!name.trim()) {
                toast.error(t('admin:mailingLists.validation.nameRequired', { defaultValue: 'Name is required' }))
                return
              }
              if (type === 'ROLE_FILTER' && roles.length === 0) {
                toast.error(t('admin:mailingLists.validation.rolesRequired', { defaultValue: 'Please select at least one role' }))
                return
              }
              if (type === 'CUSTOM' && memberUserIds.size === 0) {
                toast.error(t('admin:mailingLists.validation.membersRequired', { defaultValue: 'Please select at least one user' }))
                return
              }

              await onSave({
                name: name.trim(),
                type,
                roles: type === 'ROLE_FILTER' ? roles : [],
                regions: selectedRegions,
                includeInactive,
                memberUserIds: type === 'CUSTOM' ? Array.from(memberUserIds) : [],
              })
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-swiss-teal rounded-md shadow-sm hover:bg-swiss-teal/90"
          >
            {initial?.id
              ? t('common:save', { defaultValue: 'Save' })
              : t('admin:mailingLists.actions.create', { defaultValue: 'Create' })}
          </button>
        </div>
      </div>
    </div>
  )
}

interface SendCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  mailingList: MailingList | null
  onSend: (payload: {
    mailingListId: string
    subject: string
    htmlContent?: string
    textContent?: string
    fromName?: string
    fromEmail?: string
    replyTo?: string
    testEmail?: string
    dryRun?: boolean
  }) => Promise<void>
}

const SendCampaignModal: React.FC<SendCampaignModalProps> = ({ isOpen, onClose, mailingList, onSend }) => {
  const { t } = useTranslation(['admin', 'common'])
  const [subject, setSubject] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [textContent, setTextContent] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [dryRun, setDryRun] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setSubject('')
    setFromName('')
    setFromEmail('')
    setReplyTo('')
    setHtmlContent('')
    setTextContent('')
    setTestEmail('')
    setDryRun(false)
  }, [isOpen])

  if (!isOpen || !mailingList) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('admin:mailingLists.send.title', { defaultValue: 'Send email' })} — {mailingList.name}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailingLists.send.subject', { defaultValue: 'Subject' })}
              </label>
              <input className={STANDARD_INPUT_FIELD} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={dryRun} onChange={() => setDryRun((v) => !v)} />
                {t('admin:mailingLists.send.dryRun', { defaultValue: 'Dry run (no emails sent)' })}
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:mailingLists.send.testEmail', { defaultValue: 'Test email (optional)' })}
                </label>
                <input
                  className={STANDARD_INPUT_FIELD}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={t('admin:mailingLists.send.testEmailPlaceholder', { defaultValue: 'you@example.com' })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailingLists.send.fromName', { defaultValue: 'From name (optional)' })}
              </label>
              <input className={STANDARD_INPUT_FIELD} value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailingLists.send.fromEmail', { defaultValue: 'From email (optional)' })}
              </label>
              <input className={STANDARD_INPUT_FIELD} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailingLists.send.replyTo', { defaultValue: 'Reply-to (optional)' })}
              </label>
              <input className={STANDARD_INPUT_FIELD} value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:mailingLists.send.html', { defaultValue: 'HTML content (optional)' })}
            </label>
            <textarea className={STANDARD_INPUT_FIELD} rows={6} value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} />
            <div className="text-xs text-gray-500 mt-1">
              {t('admin:mailingLists.send.unsubscribeNote', {
                defaultValue: 'An unsubscribe footer and one-click headers are automatically added.',
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:mailingLists.send.text', { defaultValue: 'Text content (optional)' })}
            </label>
            <textarea className={STANDARD_INPUT_FIELD} rows={4} value={textContent} onChange={(e) => setTextContent(e.target.value)} />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            {t('common:cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!subject.trim()) {
                toast.error(t('admin:mailingLists.send.subjectRequired', { defaultValue: 'Subject is required' }))
                return
              }
              onSend({
                mailingListId: mailingList.id,
                subject: subject.trim(),
                htmlContent: htmlContent.trim() ? htmlContent : undefined,
                textContent: textContent.trim() ? textContent : undefined,
                fromName: fromName.trim() ? fromName.trim() : undefined,
                fromEmail: fromEmail.trim() ? fromEmail.trim() : undefined,
                replyTo: replyTo.trim() ? replyTo.trim() : undefined,
                testEmail: testEmail.trim() ? testEmail.trim() : undefined,
                dryRun,
              })
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-swiss-mint rounded-md shadow-sm hover:bg-swiss-teal"
          >
            {t('admin:mailingLists.send.sendNow', { defaultValue: 'Send now' })}
          </button>
        </div>
      </div>
    </div>
  )
}

const MailingLists: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'lists' | 'optOuts' | 'email'>('lists')
  const [search, setSearch] = useState('')

  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false)
  const [editingList, setEditingList] = useState<MailingList | null>(null)

  const [previewList, setPreviewList] = useState<MailingList | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const [sendList, setSendList] = useState<MailingList | null>(null)
  const [isSendOpen, setIsSendOpen] = useState(false)

  const { data: regionsResponse } = useQuery({
    queryKey: ['mailing-regions'],
    queryFn: async () => apiService.getMailingRegions(apiClient),
    enabled: !!apiClient,
    staleTime: 5 * 60 * 1000,
  })
  const regions: string[] = (regionsResponse as any)?.data?.data ?? []

  const { data: listsResponse, isLoading: isLoadingLists } = useQuery({
    queryKey: ['mailing-lists', search],
    queryFn: async () => apiService.getMailingLists(apiClient, { search: search.trim() || undefined }),
    enabled: !!apiClient,
  })
  const lists: MailingList[] = (listsResponse as any)?.data?.data ?? []

  const previewQuery = useQuery({
    queryKey: ['mailing-preview', previewList?.id],
    queryFn: async () => {
      if (!apiClient || !previewList?.id) return null
      return apiService.previewMailingRecipients(apiClient, previewList.id, { limit: 20 })
    },
    enabled: !!apiClient && !!previewList?.id && isPreviewOpen,
  })
  const previewData = (previewQuery.data as any)?.data?.data

  const createListMutation = useMutation({
    mutationFn: async (payload: any) => apiService.createMailingList(apiClient, payload),
    onSuccess: async () => {
      toast.success(t('admin:mailingLists.toast.created', { defaultValue: 'Mailing list created' }))
      await queryClient.invalidateQueries({ queryKey: ['mailing-lists'] })
      setIsCreateEditOpen(false)
      setEditingList(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('admin:mailingLists.toast.createFailed', { defaultValue: 'Failed to create mailing list' }))
    },
  })

  const updateListMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => apiService.updateMailingList(apiClient, id, payload),
    onSuccess: async () => {
      toast.success(t('admin:mailingLists.toast.updated', { defaultValue: 'Mailing list updated' }))
      await queryClient.invalidateQueries({ queryKey: ['mailing-lists'] })
      setIsCreateEditOpen(false)
      setEditingList(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('admin:mailingLists.toast.updateFailed', { defaultValue: 'Failed to update mailing list' }))
    },
  })

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => apiService.deleteMailingList(apiClient, id),
    onSuccess: async () => {
      toast.success(t('admin:mailingLists.toast.deleted', { defaultValue: 'Mailing list deleted' }))
      await queryClient.invalidateQueries({ queryKey: ['mailing-lists'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('admin:mailingLists.toast.deleteFailed', { defaultValue: 'Failed to delete mailing list' }))
    },
  })

  const sendCampaignMutation = useMutation({
    mutationFn: async (payload: {
      mailingListId: string
      subject: string
      htmlContent?: string
      textContent?: string
      fromName?: string
      fromEmail?: string
      replyTo?: string
      testEmail?: string
      dryRun?: boolean
    }) => {
      if (!apiClient) throw new Error('API not ready')
      const created = await apiService.createMailingCampaign(apiClient, {
        mailingListId: payload.mailingListId,
        subject: payload.subject,
        htmlContent: payload.htmlContent,
        textContent: payload.textContent,
        fromName: payload.fromName,
        fromEmail: payload.fromEmail,
        replyTo: payload.replyTo,
      })
      const campaignId = (created as any)?.data?.data?.id ?? (created as any)?.data?.id
      return apiService.sendMailingCampaign(apiClient, campaignId, { testEmail: payload.testEmail, dryRun: payload.dryRun })
    },
    onSuccess: async (resp: any) => {
      const data = resp?.data?.data
      if (data?.dryRun) {
        toast.success(t('admin:mailingLists.toast.dryRunComplete', { defaultValue: 'Dry run complete' }))
      } else {
        toast.success(
          t('admin:mailingLists.toast.sentSummary', {
            defaultValue: 'Sent: {{sent}} • Failed: {{failed}} • Skipped: {{skipped}}',
            sent: data?.sent ?? 0,
            failed: data?.failed ?? 0,
            skipped: data?.skipped ?? 0,
          }),
        )
      }
      setIsSendOpen(false)
      setSendList(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t('admin:mailingLists.toast.sendFailed', { defaultValue: 'Failed to send campaign' }))
    },
  })

  const testEmailConnectionMutation = useMutation({
    mutationFn: async () => apiService.testMailingEmailConnection(apiClient),
    onSuccess: (resp: any) => {
      const ok = resp?.data?.data?.success ?? resp?.data?.success
      toast[ok ? 'success' : 'error'](
        ok
          ? t('admin:mailingLists.email.testOk', { defaultValue: 'Email connection OK' })
          : t('admin:mailingLists.email.testFailed', { defaultValue: 'Email connection failed' }),
      )
    },
    onError: () => toast.error(t('admin:mailingLists.email.testFailed', { defaultValue: 'Email connection failed' })),
  })

  // Email integrations (System Configuration)
  const { data: emailIntegrationsResponse } = useQuery({
    queryKey: ['email-integrations'],
    queryFn: async () => {
      if (!apiClient) return null
      return apiClient.get('/admin/system-configuration/integrations/type/email')
    },
    enabled: !!apiClient && activeTab === 'email',
    staleTime: 30_000,
  })
  const emailIntegrations: any[] = (emailIntegrationsResponse as any)?.data ?? []
  const activeEmailIntegration = emailIntegrations.find((i) => i?.isActive) ?? emailIntegrations[0]

  const [emailProvider, setEmailProvider] = useState<'smtp' | 'sendgrid'>('smtp')
  const [emailFromName, setEmailFromName] = useState('')
  const [emailFromEmail, setEmailFromEmail] = useState('')
  const [sendgridApiKey, setSendgridApiKey] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpSecure, setSmtpSecure] = useState(false)

  useEffect(() => {
    if (activeTab !== 'email') return
    const i = activeEmailIntegration
    if (!i) return
    setEmailProvider((i.provider as any) === 'sendgrid' ? 'sendgrid' : 'smtp')
    setEmailFromName(i.configuration?.fromName ?? '')
    setEmailFromEmail(i.configuration?.fromEmail ?? '')
    setSendgridApiKey(i.credentials?.apiKey ? '********' : '')
    setSmtpHost(i.credentials?.host ?? '')
    setSmtpPort(String(i.credentials?.port ?? '587'))
    setSmtpUser(i.credentials?.user ?? '')
    setSmtpPass(i.credentials?.pass ? '********' : '')
    setSmtpSecure(Boolean(i.credentials?.secure ?? false))
  }, [activeTab, activeEmailIntegration])

  const saveEmailIntegrationMutation = useMutation({
    mutationFn: async () => {
      if (!apiClient) throw new Error('API not ready')

      const configuration = {
        fromName: emailFromName.trim() || undefined,
        fromEmail: emailFromEmail.trim() || undefined,
      }

      const credentials =
        emailProvider === 'sendgrid'
          ? {
              apiKey: sendgridApiKey === '********' ? activeEmailIntegration?.credentials?.apiKey : sendgridApiKey,
            }
          : {
              host: smtpHost.trim(),
              port: Number(smtpPort || 587),
              user: smtpUser.trim(),
              pass: smtpPass === '********' ? activeEmailIntegration?.credentials?.pass : smtpPass,
              secure: smtpSecure,
            }

      if (emailProvider === 'sendgrid' && !credentials.apiKey) {
        throw new Error('SendGrid apiKey is required')
      }
      if (emailProvider === 'smtp' && (!credentials.host || !credentials.user || !credentials.pass)) {
        throw new Error('SMTP host, user, and pass are required')
      }

      let integrationId = activeEmailIntegration?.id as string | undefined
      if (integrationId) {
        await apiClient.put(`/admin/system-configuration/integrations/${integrationId}`, {
          provider: emailProvider,
          configuration,
          credentials,
          isActive: true,
        })
      } else {
        const created = await apiClient.post('/admin/system-configuration/integrations', {
          name: 'Primary email',
          type: 'email',
          provider: emailProvider,
          configuration,
          credentials,
        })
        integrationId = created?.data?.id
      }

      // Ensure only one active email integration
      const refreshed = await apiClient.get('/admin/system-configuration/integrations/type/email')
      const all = (refreshed?.data ?? []) as any[]
      await Promise.all(
        all.map((i) =>
          apiClient.put(`/admin/system-configuration/integrations/${i.id}`, {
            isActive: i.id === integrationId,
          }),
        ),
      )

      return true
    },
    onSuccess: async () => {
      toast.success(t('admin:mailingLists.email.saved', { defaultValue: 'Email settings saved' }))
      await queryClient.invalidateQueries({ queryKey: ['email-integrations'] })
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || t('admin:mailingLists.email.saveFailed', { defaultValue: 'Failed to save email settings' }))
    },
  })

  // Opt-outs tab
  const [optOutSearch, setOptOutSearch] = useState('')
  const { data: optOutsResponse, isLoading: isLoadingOptOuts } = useQuery({
    queryKey: ['mailing-opt-outs', optOutSearch],
    queryFn: async () => apiService.listMailingOptOuts(apiClient, { search: optOutSearch.trim() || undefined }),
    enabled: !!apiClient && activeTab === 'optOuts',
  })
  const globalOptOuts: any[] = (optOutsResponse as any)?.data?.data?.global ?? []
  const listOptOuts: any[] = (optOutsResponse as any)?.data?.data?.list ?? []

  const createOptOutMutation = useMutation({
    mutationFn: async (payload: any) => apiService.createMailingOptOut(apiClient, payload),
    onSuccess: async () => {
      toast.success(t('admin:mailingLists.optOuts.created', { defaultValue: 'Opt-out saved' }))
      await queryClient.invalidateQueries({ queryKey: ['mailing-opt-outs'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t('admin:mailingLists.optOuts.createFailed', { defaultValue: 'Failed to save opt-out' })),
  })

  const deleteOptOutMutation = useMutation({
    mutationFn: async ({ scope, id }: { scope: 'GLOBAL' | 'LIST'; id: string }) => apiService.deleteMailingOptOut(apiClient, scope, id),
    onSuccess: async () => {
      toast.success(t('admin:mailingLists.optOuts.deleted', { defaultValue: 'Opt-out removed' }))
      await queryClient.invalidateQueries({ queryKey: ['mailing-opt-outs'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t('admin:mailingLists.optOuts.deleteFailed', { defaultValue: 'Failed to remove opt-out' })),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
            <MailIcon className="h-8 w-8 mr-3 text-swiss-teal" />
            {t('admin:mailingLists.title', { defaultValue: 'Mailing Lists' })}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('admin:mailingLists.subtitle', { defaultValue: 'Create recipient lists, export CSVs, and send emails with built-in opt-out.' })}
          </p>
        </div>

        {activeTab === 'lists' && (
          <Button
            variant="primary"
            leftIcon={Plus}
            onClick={() => {
              setEditingList(null)
              setIsCreateEditOpen(true)
            }}
          >
            {t('admin:mailingLists.actions.newList', { defaultValue: 'New list' })}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('lists')}
          className={`px-4 py-2 text-sm rounded-md border ${activeTab === 'lists' ? 'bg-swiss-teal text-white border-swiss-teal' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        >
          {t('admin:mailingLists.tabs.lists', { defaultValue: 'Lists' })}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('optOuts')}
          className={`px-4 py-2 text-sm rounded-md border ${activeTab === 'optOuts' ? 'bg-swiss-teal text-white border-swiss-teal' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        >
          {t('admin:mailingLists.tabs.optOuts', { defaultValue: 'Opt-outs' })}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 text-sm rounded-md border ${activeTab === 'email' ? 'bg-swiss-teal text-white border-swiss-teal' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        >
          {t('admin:mailingLists.tabs.email', { defaultValue: 'Email server' })}
        </button>
      </div>

      {activeTab === 'lists' && (
        <>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <input
                className={STANDARD_INPUT_FIELD}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin:mailingLists.searchPlaceholder', { defaultValue: 'Search lists...' })}
              />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin:mailingLists.table.name', { defaultValue: 'Name' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin:mailingLists.table.type', { defaultValue: 'Type' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin:mailingLists.table.filters', { defaultValue: 'Filters' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin:mailingLists.table.stats', { defaultValue: 'Stats' })}
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">{t('common:actions', { defaultValue: 'Actions' })}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoadingLists ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10">
                        <div className="flex items-center justify-center">
                          <LoadingSpinner size="large" />
                        </div>
                      </td>
                    </tr>
                  ) : (
                    lists.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{l.name}</div>
                          <div className="text-xs text-gray-500">{l.id}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{formatListType(l.type)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="space-y-1">
                            {l.roles?.length > 0 && <div>{t('admin:mailingLists.filters.roles', { defaultValue: 'Roles:' })} {l.roles.join(', ')}</div>}
                            {l.regions?.length > 0 && <div>{t('admin:mailingLists.filters.regions', { defaultValue: 'Regions:' })} {l.regions.join(', ')}</div>}
                            {l.includeInactive && (
                              <div className="text-xs text-amber-700">
                                {t('admin:mailingLists.filters.includeInactive', { defaultValue: 'Including inactive users' })}
                              </div>
                            )}
                            {(!l.roles?.length && !l.regions?.length && !l.includeInactive) && (
                              <div className="text-xs text-gray-500">{t('admin:mailingLists.filters.none', { defaultValue: 'No filters' })}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="text-xs text-gray-500">
                            {t('admin:mailingLists.stats.members', { defaultValue: 'Members: {{count}}', count: l._count?.members ?? 0 })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t('admin:mailingLists.stats.campaigns', { defaultValue: 'Campaigns: {{count}}', count: l._count?.campaigns ?? 0 })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {t('admin:mailingLists.stats.optOuts', { defaultValue: 'List opt-outs: {{count}}', count: l._count?.listOptOuts ?? 0 })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewList(l)
                                setIsPreviewOpen(true)
                              }}
                              className="p-2 rounded-full hover:bg-gray-100"
                              title={t('admin:mailingLists.actions.preview', { defaultValue: 'Preview' })}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const resp = await apiService.exportMailingListCsv(apiClient, l.id)
                                  const blob = resp.data instanceof Blob ? resp.data : new Blob([resp.data], { type: 'text/csv' })
                                  downloadBlob(blob, `mailing-list-${l.id}.csv`)
                                } catch (e: any) {
                                  toast.error(e?.response?.data?.message || t('admin:mailingLists.toast.exportFailed', { defaultValue: 'Export failed' }))
                                }
                              }}
                              className="p-2 rounded-full hover:bg-gray-100"
                              title={t('admin:mailingLists.actions.export', { defaultValue: 'Export CSV' })}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSendList(l)
                                setIsSendOpen(true)
                              }}
                              className="p-2 rounded-full hover:bg-gray-100"
                              title={t('admin:mailingLists.actions.send', { defaultValue: 'Send email' })}
                            >
                              <Send className="h-4 w-4" />
                            </button>

                            <Menu as="div" className="relative inline-block text-left">
                              <Menu.Button className="p-2 rounded-full hover:bg-gray-100">
                                <MoreVertical className="h-4 w-4" />
                              </Menu.Button>
                              <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                                <Menu.Items className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                  <div className="py-1">
                                    <Menu.Item>
                                      {({ active }) => (
                                        <button
                                          onClick={() => {
                                            setEditingList(l)
                                            setIsCreateEditOpen(true)
                                          }}
                                          className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                        >
                                          <Settings2 className="h-4 w-4 mr-2" />
                                          {t('common:edit', { defaultValue: 'Edit' })}
                                        </button>
                                      )}
                                    </Menu.Item>
                                    <Menu.Item>
                                      {({ active }) => (
                                        <button
                                          onClick={() => {
                                            if (!confirm(t('admin:mailingLists.confirmDelete', { defaultValue: 'Delete this mailing list?' }) as any)) return
                                            deleteListMutation.mutate(l.id)
                                          }}
                                          className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          {t('common:delete', { defaultValue: 'Delete' })}
                                        </button>
                                      )}
                                    </Menu.Item>
                                  </div>
                                </Menu.Items>
                              </Transition>
                            </Menu>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!isLoadingLists && lists.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-600">{t('admin:mailingLists.empty', { defaultValue: 'No mailing lists yet.' })}</div>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === 'optOuts' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <input
              className={STANDARD_INPUT_FIELD}
              value={optOutSearch}
              onChange={(e) => setOptOutSearch(e.target.value)}
              placeholder={t('admin:mailingLists.optOuts.searchPlaceholder', { defaultValue: 'Search by email...' })}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <ShieldOff className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {t('admin:mailingLists.optOuts.global', { defaultValue: 'Global opt-outs' })}
                </span>
              </div>
              {isLoadingOptOuts ? (
                <div className="p-6 flex justify-center"><LoadingSpinner /></div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {globalOptOuts.map((o) => (
                    <div key={o.id} className="p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{o.email}</div>
                        <div className="text-xs text-gray-500">{o.reason || ''}</div>
                      </div>
                      <button
                        className="p-2 rounded-full hover:bg-gray-100 text-red-600"
                        title={t('admin:mailingLists.optOuts.remove', { defaultValue: 'Remove' })}
                        onClick={() => deleteOptOutMutation.mutate({ scope: 'GLOBAL', id: o.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {globalOptOuts.length === 0 && <div className="p-4 text-sm text-gray-500">{t('admin:mailingLists.optOuts.none', { defaultValue: 'None' })}</div>}
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <ShieldOff className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {t('admin:mailingLists.optOuts.list', { defaultValue: 'List opt-outs' })}
                </span>
              </div>
              {isLoadingOptOuts ? (
                <div className="p-6 flex justify-center"><LoadingSpinner /></div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {listOptOuts.map((o) => (
                    <div key={o.id} className="p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{o.email}</div>
                        <div className="text-xs text-gray-500">
                          {(o.mailingList?.name || o.mailingListId) + (o.reason ? ` • ${o.reason}` : '')}
                        </div>
                      </div>
                      <button
                        className="p-2 rounded-full hover:bg-gray-100 text-red-600"
                        title={t('admin:mailingLists.optOuts.remove', { defaultValue: 'Remove' })}
                        onClick={() => deleteOptOutMutation.mutate({ scope: 'LIST', id: o.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {listOptOuts.length === 0 && <div className="p-4 text-sm text-gray-500">{t('admin:mailingLists.optOuts.none', { defaultValue: 'None' })}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">{t('admin:mailingLists.optOuts.add', { defaultValue: 'Add opt-out' })}</div>
            <AddOptOutForm
              lists={lists}
              onSubmit={async (payload) => {
                await createOptOutMutation.mutateAsync(payload)
              }}
            />
          </div>
        </Card>
      )}

      {activeTab === 'email' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900">{t('admin:mailingLists.email.title', { defaultValue: 'Email server' })}</div>
              <div className="text-sm text-gray-600">
                {t('admin:mailingLists.email.subtitle', { defaultValue: 'Configure how campaigns are delivered (SMTP or SendGrid).' })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailingLists.email.provider', { defaultValue: 'Provider' })}
              </label>
              <select className={STANDARD_INPUT_FIELD} value={emailProvider} onChange={(e) => setEmailProvider(e.target.value as any)}>
                <option value="smtp">{t('admin:mailingLists.email.providers.smtp', { defaultValue: 'SMTP' })}</option>
                <option value="sendgrid">{t('admin:mailingLists.email.providers.sendgrid', { defaultValue: 'SendGrid' })}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailingLists.email.fromName', { defaultValue: 'From name (optional)' })}
              </label>
              <input className={STANDARD_INPUT_FIELD} value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailingLists.email.fromEmail', { defaultValue: 'From email (optional)' })}
              </label>
              <input className={STANDARD_INPUT_FIELD} value={emailFromEmail} onChange={(e) => setEmailFromEmail(e.target.value)} />
            </div>
          </div>

          {emailProvider === 'sendgrid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:mailingLists.email.sendgridApiKey', { defaultValue: 'SendGrid API key' })}
                </label>
                <input className={STANDARD_INPUT_FIELD} value={sendgridApiKey} onChange={(e) => setSendgridApiKey(e.target.value)} placeholder="SG...." />
                <div className="text-xs text-gray-500 mt-1">
                  {t('admin:mailingLists.email.secretHint', { defaultValue: 'Secrets are stored in IntegrationConfig credentials.' })}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:mailingLists.email.smtpHost', { defaultValue: 'SMTP host' })}
                </label>
                <input className={STANDARD_INPUT_FIELD} value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:mailingLists.email.smtpPort', { defaultValue: 'SMTP port' })}
                </label>
                <input className={STANDARD_INPUT_FIELD} value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:mailingLists.email.smtpUser', { defaultValue: 'SMTP user' })}
                </label>
                <input className={STANDARD_INPUT_FIELD} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:mailingLists.email.smtpPass', { defaultValue: 'SMTP password' })}
                </label>
                <input className={STANDARD_INPUT_FIELD} value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
                  <input type="checkbox" checked={smtpSecure} onChange={() => setSmtpSecure((v) => !v)} />
                  {t('admin:mailingLists.email.smtpSecure', { defaultValue: 'Use TLS (secure)' })}
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              leftIcon={Settings2}
              onClick={() => testEmailConnectionMutation.mutate()}
              disabled={testEmailConnectionMutation.isPending}
            >
              {testEmailConnectionMutation.isPending
                ? t('admin:mailingLists.email.testing', { defaultValue: 'Testing...' })
                : t('admin:mailingLists.email.testConnection', { defaultValue: 'Test connection' })}
            </Button>
            <Button
              variant="secondary"
              leftIcon={Settings2}
              onClick={() => saveEmailIntegrationMutation.mutate()}
              disabled={saveEmailIntegrationMutation.isPending}
            >
              {saveEmailIntegrationMutation.isPending
                ? t('admin:mailingLists.email.saving', { defaultValue: 'Saving...' })
                : t('common:save', { defaultValue: 'Save' })}
            </Button>
          </div>

          <div className="text-xs text-gray-500">
            {t('admin:mailingLists.email.unsubscribeNote', {
              defaultValue: 'Make sure APP_URL is set, so unsubscribe links point to the correct domain.',
            })}
          </div>
        </Card>
      )}

      <CreateEditListModal
        isOpen={isCreateEditOpen}
        onClose={() => {
          setIsCreateEditOpen(false)
          setEditingList(null)
        }}
        initial={editingList}
        regions={regions}
        onSave={async (payload) => {
          if (!apiClient) return
          if (editingList?.id) {
            await updateListMutation.mutateAsync({ id: editingList.id, payload })
          } else {
            await createListMutation.mutateAsync(payload)
          }
        }}
      />

      {/* Preview modal */}
      {isPreviewOpen && previewList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('admin:mailingLists.previewModal.title', { defaultValue: 'Recipient preview' })} — {previewList.name}
              </h2>
              <button
                onClick={() => {
                  setIsPreviewOpen(false)
                  setPreviewList(null)
                }}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {previewQuery.isLoading ? (
                <div className="flex justify-center py-10"><LoadingSpinner /></div>
              ) : previewQuery.isError ? (
                <div className="text-red-600">{t('admin:mailingLists.previewModal.error', { defaultValue: 'Failed to load preview.' })}</div>
              ) : (
                <>
                  <div className="text-sm text-gray-700 mb-3">
                    {t('admin:mailingLists.previewModal.total', { defaultValue: 'Total recipients: {{count}}', count: previewData?.total ?? 0 })}
                    <div className="text-xs text-gray-500 mt-1">
                      {t('admin:mailingLists.previewModal.optOutNote', { defaultValue: 'This excludes global + list-specific opt-outs.' })}
                    </div>
                  </div>
                  <div className="max-h-80 overflow-auto divide-y divide-gray-100 border border-gray-100 rounded-md">
                    {(previewData?.sample ?? []).map((r: Recipient) => (
                      <div key={`${r.email}-${r.userId}`} className="p-2 text-xs text-gray-700">
                        <div className="font-medium">{r.email}</div>
                        <div className="text-gray-500">
                          {r.role}{r.region ? ` • ${r.region}` : ''}{r.organizationName ? ` • ${r.organizationName}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <SendCampaignModal
        isOpen={isSendOpen}
        onClose={() => {
          setIsSendOpen(false)
          setSendList(null)
        }}
        mailingList={sendList}
        onSend={async (payload) => {
          await sendCampaignMutation.mutateAsync(payload)
        }}
      />
    </div>
  )
}

const AddOptOutForm: React.FC<{
  lists: MailingList[]
  onSubmit: (payload: any) => Promise<void>
}> = ({ lists, onSubmit }) => {
  const { t } = useTranslation(['admin', 'common'])
  const [email, setEmail] = useState('')
  const [scope, setScope] = useState<'GLOBAL' | 'LIST'>('GLOBAL')
  const [mailingListId, setMailingListId] = useState<string>('')
  const [reason, setReason] = useState('')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
      <div className="lg:col-span-2">
        <input
          className={STANDARD_INPUT_FIELD}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('admin:mailingLists.optOuts.emailPlaceholder', { defaultValue: 'Email address' })}
        />
      </div>
      <div>
        <select className={STANDARD_INPUT_FIELD} value={scope} onChange={(e) => setScope(e.target.value as any)}>
          <option value="GLOBAL">{t('admin:mailingLists.optOuts.scope.global', { defaultValue: 'Global' })}</option>
          <option value="LIST">{t('admin:mailingLists.optOuts.scope.list', { defaultValue: 'Specific list' })}</option>
        </select>
      </div>
      <div>
        <select
          className={STANDARD_INPUT_FIELD}
          value={mailingListId}
          onChange={(e) => setMailingListId(e.target.value)}
          disabled={scope !== 'LIST'}
        >
          <option value="">{t('admin:mailingLists.optOuts.selectList', { defaultValue: 'Select list' })}</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className="lg:col-span-3">
        <input
          className={STANDARD_INPUT_FIELD}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('admin:mailingLists.optOuts.reasonPlaceholder', { defaultValue: 'Reason (optional)' })}
        />
      </div>
      <div className="lg:col-span-1">
        <button
          type="button"
          className="w-full px-4 py-2 text-sm font-medium text-white bg-swiss-teal rounded-md shadow-sm hover:bg-swiss-teal/90 disabled:opacity-50"
          onClick={async () => {
            if (!email.trim()) {
              toast.error(t('admin:mailingLists.optOuts.emailRequired', { defaultValue: 'Email is required' }))
              return
            }
            if (scope === 'LIST' && !mailingListId) {
              toast.error(t('admin:mailingLists.optOuts.listRequired', { defaultValue: 'Please choose a list' }))
              return
            }
            await onSubmit({
              email: email.trim(),
              scope,
              mailingListId: scope === 'LIST' ? mailingListId : undefined,
              reason: reason.trim() || undefined,
            })
            setEmail('')
            setReason('')
            setMailingListId('')
            setScope('GLOBAL')
          }}
        >
          {t('admin:mailingLists.optOuts.addButton', { defaultValue: 'Add' })}
        </button>
      </div>
    </div>
  )
}

export default MailingLists

