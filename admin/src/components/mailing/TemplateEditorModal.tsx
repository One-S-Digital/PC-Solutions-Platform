import React, { useState, useEffect } from 'react'
import { X, Eye, Save } from 'lucide-react'
import DOMPurify from 'dompurify'
import { MailingTemplate } from '../../types/api'

const TOKENS = [
  { token: '{{firstName}}', label: 'First name' },
  { token: '{{lastName}}', label: 'Last name' },
  { token: '{{email}}', label: 'Email' },
  { token: '{{role}}', label: 'Role' },
  { token: '{{orgName}}', label: 'Org name' },
  { token: '{{canton}}', label: 'Canton' },
  { token: '{{logoUrl}}', label: 'Logo URL' },
  { token: '{{iconUrl}}', label: 'Icon URL' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; description?: string; subject: string; bodyHtml: string }) => Promise<void>
  loading: boolean
  initial?: Partial<MailingTemplate>
  title?: string
}

const TemplateEditorModal: React.FC<Props> = ({ isOpen, onClose, onSave, loading, initial, title = 'New Template' }) => {
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

  const insertToken = (token: string) => setBodyHtml((prev) => prev + token)

  const handleSave = async () => {
    await onSave({ name, description: description || undefined, subject, bodyHtml })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Monthly newsletter"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Body (HTML) *</label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                {showPreview ? 'Edit' : 'Preview'}
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
                placeholder="<p>Hello {{firstName}},</p><p>Your content here...</p>"
                rows={10}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Personalization tokens — click to insert</label>
            <div className="flex flex-wrap gap-1.5">
              {TOKENS.map(({ token, label }) => (
                <button
                  key={token}
                  onClick={() => insertToken(token)}
                  title={label}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200 hover:bg-gray-200 font-mono"
                >
                  {token}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Use <code className="bg-gray-100 px-1 rounded">{'<img src="{{logoUrl}}" />'}</code> to embed the platform logo.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !subject.trim() || !bodyHtml.trim() || loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplateEditorModal
