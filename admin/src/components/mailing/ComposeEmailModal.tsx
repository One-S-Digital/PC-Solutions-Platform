import React, { useState } from 'react'
import { X, Send, Eye, FileText, Save } from 'lucide-react'

const MAILING_TEMPLATES_ENABLED = import.meta.env.VITE_MAILING_TEMPLATES !== 'false'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useApiClient, apiService } from '../../services/api'
import { MailingTemplate } from '../../types/api'
import TemplatePickerModal from './TemplatePickerModal'
import EmailPreview from './EmailPreview'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSend: (subject: string, bodyHtml: string, extraEmails: string[]) => Promise<void>
  loading: boolean
  recipientCount: number
}

const TOKENS = [
  '{{firstName}}', '{{lastName}}', '{{email}}', '{{role}}', '{{orgName}}', '{{canton}}',
  '{{logoUrl}}', '{{iconUrl}}',
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseExtraEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0)
}

const ComposeEmailModal: React.FC<Props> = ({ isOpen, onClose, onSend, loading, recipientCount }) => {
  const { t } = useTranslation(['admin'])
  const apiClient = useApiClient()
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [extraEmailsRaw, setExtraEmailsRaw] = useState('')
  const [showExtraEmails, setShowExtraEmails] = useState(false)

  if (!isOpen) return null

  const handleSelectTemplate = (template: MailingTemplate) => {
    if ((subject.trim() || bodyHtml.trim()) &&
      !window.confirm(t('admin:mailing.compose.replaceConfirm'))) return
    setSubject(template.subject)
    setBodyHtml(template.bodyHtml ?? '')
  }

  const handleSaveAsTemplate = async () => {
    const trimmedName = saveAsName.trim()
    const trimmedSubject = subject.trim()
    if (!trimmedName || !trimmedSubject || !bodyHtml.trim()) return
    if (trimmedName.length > 200 || trimmedSubject.length > 998) {
      toast.error(t('admin:mailing.compose.templateSaveFailed'))
      return
    }
    setSavingTemplate(true)
    try {
      await apiService.mailingCreateTemplate(apiClient, { name: trimmedName, subject: trimmedSubject, bodyHtml })
      toast.success(t('admin:mailing.compose.templateSaved', { name: saveAsName }))
      setSaveAsName('')
      setShowSaveAs(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('admin:mailing.compose.templateSaveFailed'))
    } finally {
      setSavingTemplate(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">{t('admin:mailing.compose.title')}</h3>
            <div className="flex items-center gap-2">
              {MAILING_TEMPLATES_ENABLED && (
                <button
                  onClick={() => setTemplatePickerOpen(true)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
                >
                  <FileText className="w-3.5 h-3.5" /> {t('admin:mailing.compose.loadTemplate')}
                </button>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(() => {
              const parsedExtras = parseExtraEmails(extraEmailsRaw)
              const validExtras = parsedExtras.filter((e) => EMAIL_REGEX.test(e))
              const invalidExtras = parsedExtras.filter((e) => !EMAIL_REGEX.test(e))
              const totalCount = recipientCount + validExtras.length
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700">
                  {t('admin:mailing.compose.recipientInfo', { count: totalCount.toLocaleString() })}
                  {validExtras.length > 0 && (
                    <span className="ml-1 text-blue-600">
                      ({recipientCount.toLocaleString()} filtered + {validExtras.length} extra)
                    </span>
                  )}
                  {invalidExtras.length > 0 && (
                    <div className="mt-1 text-red-600 text-xs">
                      Invalid emails will be skipped: {invalidExtras.join(', ')}
                    </div>
                  )}
                </div>
              )
            })()}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:mailing.compose.subject')} *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('admin:mailing.compose.subjectPlaceholder')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">{t('admin:mailing.compose.body')} *</label>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  {showPreview ? t('admin:mailing.compose.edit') : t('admin:mailing.compose.preview')}
                </button>
              </div>

              {showPreview ? (
                <div className="border border-gray-200 rounded-md bg-gray-100 overflow-y-auto" style={{ maxHeight: '320px' }}>
                  <div className="p-2">
                    <div className="bg-white rounded shadow-sm overflow-hidden">
                      <EmailPreview html={bodyHtml} />
                    </div>
                  </div>
                </div>
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('admin:mailing.compose.extraEmails', 'Extra recipients')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowExtraEmails((v) => !v)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showExtraEmails
                    ? t('admin:mailing.compose.hideExtraEmails', 'Hide')
                    : t('admin:mailing.compose.addExtraEmails', '+ Add emails not in DB')}
                </button>
              </div>
              {showExtraEmails && (
                <div className="space-y-1">
                  <textarea
                    value={extraEmailsRaw}
                    onChange={(e) => setExtraEmailsRaw(e.target.value)}
                    placeholder={t(
                      'admin:mailing.compose.extraEmailsPlaceholder',
                      'Enter email addresses separated by commas, semicolons, or new lines',
                    )}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400">
                    {t(
                      'admin:mailing.compose.extraEmailsHint',
                      'These addresses are sent the email regardless of DB filters. Max 500.',
                    )}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('admin:mailing.compose.tokens')}</label>
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
              <p className="text-xs text-gray-400 mt-1">{t('admin:mailing.compose.tokenHint')}</p>
            </div>

            {MAILING_TEMPLATES_ENABLED && (showSaveAs ? (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  {t('admin:mailing.compose.saveAsTemplate')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={saveAsName}
                    onChange={(e) => setSaveAsName(e.target.value)}
                    placeholder={t('admin:mailing.compose.templateNamePlaceholder')}
                    maxLength={200}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSaveAsTemplate}
                    disabled={!saveAsName.trim() || savingTemplate}
                    className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    {savingTemplate ? t('admin:mailing.template.saving') : t('admin:mailing.template.save')}
                  </button>
                  <button
                    onClick={() => { setShowSaveAs(false); setSaveAsName('') }}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    {t('admin:mailing.campaign.detail.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveAs(true)}
                disabled={!subject.trim() || !bodyHtml.trim()}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
              >
                <Save className="w-3 h-3" /> {t('admin:mailing.compose.saveCurrentAsTemplate')}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              {t('admin:mailing.campaign.detail.cancel')}
            </button>
            <button
              onClick={() => {
                const validExtras = parseExtraEmails(extraEmailsRaw).filter((e) => EMAIL_REGEX.test(e))
                onSend(subject, bodyHtml, validExtras)
              }}
              disabled={!subject.trim() || !bodyHtml.trim() || loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {loading ? t('admin:mailing.compose.creating') : t('admin:mailing.compose.send')}
            </button>
          </div>
        </div>
      </div>

      {MAILING_TEMPLATES_ENABLED && (
        <TemplatePickerModal
          isOpen={templatePickerOpen}
          onClose={() => setTemplatePickerOpen(false)}
          onSelect={handleSelectTemplate}
        />
      )}
    </>
  )
}

export default ComposeEmailModal
