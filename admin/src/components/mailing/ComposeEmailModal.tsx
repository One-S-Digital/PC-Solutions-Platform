import React, { useState } from 'react'
import { X, Send, Eye } from 'lucide-react'
import DOMPurify from 'dompurify'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSend: (subject: string, bodyHtml: string) => Promise<void>
  loading: boolean
  recipientCount: number
}

const ComposeEmailModal: React.FC<Props> = ({ isOpen, onClose, onSend, loading, recipientCount }) => {
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  if (!isOpen) return null

  const tokens = [
    '{{firstName}}', '{{lastName}}', '{{email}}', '{{role}}', '{{orgName}}', '{{canton}}',
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Compose Campaign Email</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700">
            This email will be sent to <span className="font-semibold">{recipientCount.toLocaleString()}</span> recipients.
            An unsubscribe link and company footer will be appended automatically.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
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
                placeholder="<p>Hello {{firstName}},</p><p>Your email content here...</p>"
                rows={10}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Available personalization tokens</label>
            <div className="flex flex-wrap gap-1.5">
              {tokens.map((token) => (
                <button
                  key={token}
                  onClick={() => setBodyHtml((prev) => prev + token)}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200 hover:bg-gray-200 font-mono"
                >
                  {token}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={() => onSend(subject, bodyHtml)}
            disabled={!subject.trim() || !bodyHtml.trim() || loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Campaign & Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ComposeEmailModal
