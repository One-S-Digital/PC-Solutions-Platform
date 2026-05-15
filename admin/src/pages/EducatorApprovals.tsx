import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  User,
  MapPin,
  Briefcase,
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { toast } from 'sonner'

type ApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

interface Educator {
  id: string
  email: string
  firstName?: string
  lastName?: string
  approvalStatus: ApprovalStatus
  approvalNotes?: string
  createdAt: string
  region?: string
  jobRole?: string
  jobRoles?: string[]
  shortBio?: string
  cvUrl?: string
  skills?: string[]
  certifications?: string[]
  workExperience?: string
  education?: string
  phoneNumber?: string
  avatarAsset?: { publicUrl: string }
}

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

const STATUS_STYLES: Record<ApprovalStatus, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const EducatorApprovals: React.FC = () => {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<ApprovalStatus>('PENDING_REVIEW')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['educator-approvals', activeTab, page],
    queryFn: () => apiService.getEducatorApprovals(apiClient, { status: activeTab, page, limit: 20 }),
    enabled: !!apiClient,
  })

  const { data: pendingCountData } = useQuery({
    queryKey: ['educator-approvals-pending-count'],
    queryFn: () => apiService.getEducatorApprovalsPendingCount(apiClient),
    enabled: !!apiClient,
    refetchInterval: 60_000,
  })

  const pendingCount = (pendingCountData?.data as any)?.count ?? 0
  const educators: Educator[] = (data?.data as any)?.educators ?? []
  const total: number = (data?.data as any)?.total ?? 0
  const totalPages: number = (data?.data as any)?.totalPages ?? 1

  const filteredEducators = search
    ? educators.filter(e => {
        const name = `${e.firstName ?? ''} ${e.lastName ?? ''}`.toLowerCase()
        const email = (e.email ?? '').toLowerCase()
        const q = search.toLowerCase()
        return name.includes(q) || email.includes(q)
      })
    : educators

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiService.approveEducator(apiClient, id),
    onSuccess: () => {
      toast.success('Educator approved successfully')
      queryClient.invalidateQueries({ queryKey: ['educator-approvals'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to approve educator')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiService.rejectEducator(apiClient, id, notes),
    onSuccess: () => {
      toast.success('Educator application rejected')
      queryClient.invalidateQueries({ queryKey: ['educator-approvals'] })
      setIsRejectModalOpen(false)
      setRejectNotes('')
      setRejectTarget(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reject educator')
    },
  })

  const openRejectModal = (id: string) => {
    setRejectTarget(id)
    setRejectNotes('')
    setIsRejectModalOpen(true)
  }

  const handleRejectConfirm = () => {
    if (!rejectTarget || !rejectNotes.trim()) return
    rejectMutation.mutate({ id: rejectTarget, notes: rejectNotes })
  }

  const tabs: { key: ApprovalStatus; label: string }[] = [
    { key: 'PENDING_REVIEW', label: 'Pending' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Educator Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve educator profile applications
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-sm font-semibold px-3 py-1.5 rounded-full">
            <Clock className="w-4 h-4" />
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1) }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-swiss-mint text-swiss-mint'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.key === 'PENDING_REVIEW' && pendingCount > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-swiss-mint/50"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : filteredEducators.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <User className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No educators found</p>
            <p className="text-sm mt-1">
              {activeTab === 'PENDING_REVIEW' ? 'All educator applications have been reviewed.' : `No ${STATUS_LABELS[activeTab].toLowerCase()} educators.`}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Educator</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role / Region</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Applied</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEducators.map(educator => (
                <tr key={educator.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {educator.avatarAsset?.publicUrl ? (
                        <img
                          src={educator.avatarAsset.publicUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-swiss-mint/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-swiss-mint text-xs font-semibold">
                            {(educator.firstName?.[0] ?? educator.email?.[0] ?? '?').toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {educator.firstName} {educator.lastName}
                        </p>
                        <p className="text-gray-500 text-xs">{educator.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex flex-col gap-0.5">
                      {educator.jobRole && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                          {educator.jobRole}
                        </span>
                      )}
                      {educator.region && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" />
                          {educator.region}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(educator.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[educator.approvalStatus]}`}>
                      {STATUS_LABELS[educator.approvalStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/users/${educator.id}/profile`)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Review
                      </button>
                      {educator.approvalStatus === 'PENDING_REVIEW' && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(educator.id)}
                            disabled={approveMutation.isPending}
                            className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(educator.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
            <span>{total} total educators</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsRejectModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Reject Educator Application</h3>
            <p className="text-sm text-gray-600">
              Please provide a reason for rejecting this application. This will be shared with the educator.
            </p>
            <textarea
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="E.g. Incomplete profile, missing certifications, does not meet minimum experience requirements..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectNotes.trim() || rejectMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EducatorApprovals
