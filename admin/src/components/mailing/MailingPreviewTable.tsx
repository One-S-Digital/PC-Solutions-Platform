import React from 'react'
import { MailingPreviewRow } from '../../types/api'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatRole } from '../../utils/formatRole'

interface Props {
  rows: MailingPreviewRow[]
  loading: boolean
  count: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
}

const roleBadge = (role: string) => {
  const colors: Record<string, string> = {
    FOUNDATION: 'bg-purple-100 text-purple-700',
    PRODUCT_SUPPLIER: 'bg-orange-100 text-orange-700',
    SERVICE_PROVIDER: 'bg-teal-100 text-teal-700',
    EDUCATOR: 'bg-blue-100 text-blue-700',
    PARENT: 'bg-pink-100 text-pink-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[role] || 'bg-gray-100 text-gray-600'}`}>
      {formatRole(role)}
    </span>
  )
}

const MailingPreviewTable: React.FC<Props> = ({
  rows, loading, count, page, totalPages, onPageChange,
  selectedIds, onToggleSelect, onToggleSelectAll,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No recipients match your filters</p>
        <p className="text-sm mt-1">Try adjusting your filter criteria</p>
      </div>
    )
  }

  const allPageSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id))

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canton</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mailing</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 ${row.mailingListOptOut ? 'opacity-60' : ''} ${selectedIds.has(row.id) ? 'bg-blue-50' : ''}`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => onToggleSelect(row.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-[200px]">{row.email}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.firstName} {row.lastName}
                </td>
                <td className="px-4 py-3">{roleBadge(row.role)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[160px]">{row.orgName || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.canton || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${row.mailingListOptOut ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {row.mailingListOptOut ? 'Unsubscribed' : 'Subscribed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({count} recipients)
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
            >
              Prev
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MailingPreviewTable
