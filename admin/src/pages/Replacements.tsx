import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowPathIcon, CalendarDaysIcon, MapPinIcon, ExclamationTriangleIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useApiClient, apiService } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useTranslation } from 'react-i18next'

type StatusFilter = 'ALL' | 'OPEN' | 'MATCHED' | 'FILLED' | 'CANCELLED'

interface ReplacementRequest {
  id: string
  role: string
  status: StatusFilter
  urgency: 'NORMAL' | 'URGENT'
  startDate: string
  endDate: string
  shiftStart?: string
  shiftEnd?: string
  location?: string
  description?: string
  createdAt: string
  foundation?: { id: string; name: string }
  matches?: Array<{
    id: string
    status: string
    educator?: { id: string; firstName?: string; lastName?: string; jobRole?: string; region?: string }
  }>
}

const STATUS_BADGES: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  MATCHED: 'bg-yellow-100 text-yellow-700',
  FILLED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const MATCH_BADGES: Record<string, string> = {
  PROPOSED: 'bg-gray-100 text-gray-600',
  ACCEPTED: 'bg-blue-100 text-blue-700',
  DECLINED: 'bg-red-100 text-red-600',
  CONFIRMED: 'bg-green-100 text-green-700',
}

const Replacements: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [selected, setSelected] = useState<ReplacementRequest | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['replacement-requests', statusFilter],
    queryFn: () =>
      apiService.getReplacementRequests(apiClient, statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    enabled: !!apiClient,
    select: (res) => (Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []) as ReplacementRequest[],
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiService.cancelReplacementRequest(apiClient, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replacement-requests'] })
      setSelected(null)
    },
  })

  const confirmMutation = useMutation({
    mutationFn: ({ matchId }: { matchId: string }) =>
      apiService.respondReplacementMatch(apiClient, matchId, 'CONFIRMED'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['replacement-requests'] }),
  })

  const statuses: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Matched', value: 'MATCHED' },
    { label: 'Filled', value: 'FILLED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ArrowPathIcon className="w-6 h-6 text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-800">Replacement Staffing</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Table */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : !data?.length ? (
            <div className="bg-white rounded-xl border p-10 text-center text-gray-400">No replacement requests found</div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Foundation</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Dates</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Matches</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((req) => (
                    <tr key={req.id} className={`hover:bg-gray-50 transition-colors ${selected?.id === req.id ? 'bg-indigo-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{req.foundation?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{req.role}</span>
                        {req.urgency === 'URGENT' && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-red-600 font-semibold">
                            <ExclamationTriangleIcon className="w-3 h-3" /> Urgent
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <div className="flex items-center gap-1">
                          <CalendarDaysIcon className="w-3.5 h-3.5" />
                          {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                        </div>
                        {req.location && (
                          <div className="flex items-center gap-1 text-xs mt-0.5">
                            <MapPinIcon className="w-3 h-3" />{req.location}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_BADGES[req.status] || STATUS_BADGES.OPEN}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{req.matches?.length ?? 0}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(selected?.id === req.id ? null : req)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 shrink-0 bg-white rounded-xl border p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">{selected.role}</h2>
                <p className="text-xs text-gray-500">{selected.foundation?.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm space-y-1.5">
              <div><span className="font-medium">Dates:</span> {new Date(selected.startDate).toLocaleDateString()} – {new Date(selected.endDate).toLocaleDateString()}</div>
              {selected.shiftStart && <div><span className="font-medium">Shift:</span> {selected.shiftStart}–{selected.shiftEnd}</div>}
              {selected.location && <div><span className="font-medium">Location:</span> {selected.location}</div>}
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_BADGES[selected.status]}`}>{selected.status}</span>
              </div>
              {selected.urgency === 'URGENT' && (
                <div className="text-red-600 font-medium flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-4 h-4" /> Urgent
                </div>
              )}
            </div>

            {selected.description && (
              <p className="text-sm text-gray-600 border-t pt-3">{selected.description}</p>
            )}

            {selected.matches && selected.matches.length > 0 && (
              <div className="border-t pt-3">
                <h3 className="text-sm font-semibold mb-2">Matched Educators</h3>
                <ul className="space-y-2">
                  {selected.matches.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.educator?.firstName} {m.educator?.lastName}</p>
                        <p className="text-xs text-gray-500 truncate">{m.educator?.jobRole}{m.educator?.region ? ` · ${m.educator.region}` : ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${MATCH_BADGES[m.status] || MATCH_BADGES.PROPOSED}`}>{m.status}</span>
                        {m.status === 'ACCEPTED' && (
                          <button
                            onClick={() => confirmMutation.mutate({ matchId: m.id })}
                            disabled={confirmMutation.isPending}
                            className="text-xs text-green-700 font-medium hover:underline"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(selected.status === 'OPEN' || selected.status === 'MATCHED') && (
              <button
                onClick={() => cancelMutation.mutate(selected.id)}
                disabled={cancelMutation.isPending}
                className="w-full mt-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Cancel Request
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Replacements
