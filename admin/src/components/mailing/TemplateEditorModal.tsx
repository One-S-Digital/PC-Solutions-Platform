import React, { useState, useEffect } from 'react'
import { X, Eye, Save } from 'lucide-react'
import DOMPurify from 'dompurify'
import { useTranslation } from 'react-i18next'
import { MailingTemplate } from '../../types/api'

const TOKENS = [
  '{{firstName}}', '{{lastName}}', '{{email}}', '{{role}}', '{{orgName}}', '{{canton}}',
  '{{logoUrl}}', '{{iconUrl}}',
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; description?: string; subject: string; bodyHtml: string }) => Promise<void>
  loading: boolean
  initial?: Partial<MailingTemplate>
  title?: string
}

const TemplateEditorModal: React.FC<Props> = ({ isOpen, onClose, onSave, loading, initial, title }) => {
  const { t } = useTranslation(['admin'])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName(initial?.name ?? '')
      setDescription(initial?.description ?? '')
      setSubject(initial?.subject ?? '')
      setBodyHtml(initial?.bodyHtml ?? '')
      setShowPreview(false)
    }
  }, [isOpen, initial])

  if (!isOpen) return null

  const modalTitle = title ?? t('admin:mailing.template.newTemplate')

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{modalTitle}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailing.template.nameLabel')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('admin:mailing.template.namePlaceholder')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailing.template.descriptionLabel')}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('admin:mailing.template.descriptionPlaceholder')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:mailing.template.subjectLabel')} *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('admin:mailing.template.subjectPlaceholder')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                {t('admin:mailing.template.bodyLabel')} *
              </label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                {showPreview ? t('admin:mailing.compose.edit') : t('admin:mailing.compose.preview')}
              </button>
            </div>
            {showPreview ? (
              <div
                className="border border-gray-300 rounded-md p-3 min-h-[200px] text-sm bg-white prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml) }}
              />
            ) : (
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder={t('admin:mailing.compose.bodyPlaceholder')}
                rows={10}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              {t('admin:mailing.template.tokenLabel')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TOKENS.map((token) => (
                <button
                  key={token}
                  onClick={() => setBodyHtml((prev) => prev + token)}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200 hover:bg-gray-200 font-mono"
                >
                  {token}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('admin:mailing.template.logoHint')}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            {t('admin:mailing.campaign.detail.cancel')}
          </button>
          <button
            onClick={() => onSave({ name, description: description || undefined, subject, bodyHtml })}
            disabled={!name.trim() || !subject.trim() || !bodyHtml.trim() || loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? t('admin:mailing.template.saving') : t('admin:mailing.template.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplateEditorModal
