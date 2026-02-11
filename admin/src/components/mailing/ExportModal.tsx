import React, { useState } from 'react'
import { X, Download } from 'lucide-react'

const ALL_COLUMNS = [
  { key: 'email', label: 'Email' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'role', label: 'Role' },
  { key: 'orgName', label: 'Organization' },
  { key: 'canton', label: 'Canton' },
  { key: 'city', label: 'City' },
  { key: 'languages', label: 'Languages' },
  { key: 'subscriptionStatus', label: 'Subscription Status' },
  { key: 'subscriptionTier', label: 'Subscription Tier' },
  { key: 'isActive', label: 'Active' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'lastActiveAt', label: 'Last Active' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onExport: (format: 'csv' | 'xlsx', columns: string[]) => Promise<void>
  loading: boolean
  count: number
}

const ExportModal: React.FC<Props> = ({ isOpen, onClose, onExport, loading, count }) => {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'email', 'firstName', 'lastName', 'role', 'orgName', 'canton',
  ])

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Export Recipients</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Exporting <span className="font-semibold">{count.toLocaleString()}</span> recipients
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <div className="flex gap-3">
              {(['csv', 'xlsx'] as const).map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={format === f}
                    onChange={() => setFormat(f)}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">{f.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Columns ({selectedColumns.length} selected)
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={() => onExport(format, selectedColumns)}
            disabled={selectedColumns.length === 0 || loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
