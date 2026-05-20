import React, { useState } from 'react'
import { X, Search, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useApiClient, apiService } from '../../services/api'
import { MailingTemplate } from '../../types/api'
import LoadingSpinner from '../ui/LoadingSpinner'
import EmailPreview from './EmailPreview'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: MailingTemplate) => void
}

const TemplatePickerModal: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
  const { t } = useTranslation(['admin'])
  const apiClient = useApiClient()
  const [search, setSearch] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['mailing-templates-picker'],
    queryFn: async () => {
      const res = await apiService.mailingListTemplates(apiClient, { pageSize: 100 })
      return res.data
    },
    enabled: isOpen,
  })

  const { data: previewTemplate } = useQuery({
    queryKey: ['mailing-template-detail', previewId],
    queryFn: async () => {
      const res = await apiService.mailingGetTemplate(apiClient, previewId!)
      return res.data as MailingTemplate
    },
    enabled: !!previewId,
  })

  if (!isOpen) return null

  const filtered = (data?.templates ?? []).filter((tpl: MailingTemplate) =>
    tpl.name.toLowerCase().includes(search.toLowerCase()) ||
    tpl.subject.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl flex flex-col" style={{ height: 'min(85vh, 700px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{t('admin:mailing.template.picker.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — fixed height, two columns */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left: template list */}
          <div className="w-64 shrink-0 border-r flex flex-col">
            <div className="p-3 border-b shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('admin:mailing.template.picker.searchPlaceholder')}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400 px-4">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    {search
                      ? t('admin:mailing.template.picker.noMatch')
                      : t('admin:mailing.template.picker.noTemplates')}
                  </p>
                </div>
              ) : (
                filtered.map((tpl: MailingTemplate) => (
                  <button
                    key={tpl.id}
                    onClick={() => setPreviewId(tpl.id)}
                    className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      previewId === tpl.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 truncate">{tpl.name}</div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">{tpl.subject}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(tpl.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: preview */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {previewTemplate ? (
              <>
                {/* Subject bar */}
                <div className="p-3 border-b bg-gray-50 shrink-0">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">
                    {t('admin:mailing.template.picker.subjectLabel')}
                  </span>
                  <span className="text-sm text-gray-900">{previewTemplate.subject}</span>
                  {previewTemplate.description && (
                    <p className="text-xs text-gray-400 mt-1">{previewTemplate.description}</p>
                  )}
                </div>

                {/* Scrollable preview area */}
                <div className="flex-1 overflow-y-auto bg-gray-100">
                  <div className="p-3">
                    <div className="bg-white rounded shadow-sm overflow-hidden">
                      <EmailPreview html={previewTemplate.bodyHtml || ''} />
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="p-3 border-t shrink-0 flex justify-end bg-white">
                  <button
                    onClick={() => { onSelect(previewTemplate); onClose() }}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {t('admin:mailing.template.picker.useTemplate')}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">{t('admin:mailing.template.picker.selectHint')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TemplatePickerModal
