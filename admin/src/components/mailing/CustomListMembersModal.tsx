import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Users, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useApiClient, apiService } from '../../services/api'
import { MailingCustomList, MailingCustomListMember } from '../../types/api'
import LoadingSpinner from '../ui/LoadingSpinner'

interface Props {
  isOpen: boolean
  onClose: () => void
  list: MailingCustomList
}

const CustomListMembersModal: React.FC<Props> = ({ isOpen, onClose, list }) => {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['custom-list-members', list.id, page],
    queryFn: async () => {
      const res = await apiService.mailingGetCustomListMembers(apiClient, list.id, {
        page,
        pageSize: PAGE_SIZE,
      })
      return res.data
    },
    enabled: isOpen,
  })

  const handleRemove = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email} from this list?`)) return
    try {
      await apiService.mailingRemoveUsersFromList(apiClient, list.id, [userId])
      toast.success(`Removed ${email} from list`)
      queryClient.invalidateQueries({ queryKey: ['custom-list-members', list.id] })
      queryClient.invalidateQueries({ queryKey: ['mailing-custom-lists'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove member')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              {list.name}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {data?.total ?? list._count?.members ?? 0} members
              {list.description && ` · ${list.description}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : !data?.members?.length ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No members in this list</p>
              <p className="text-sm mt-1 text-gray-400">
                Select users in the Build tab and click "Add to List" to add members
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.members.map((member: MailingCustomListMember) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{member.role?.toLowerCase()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(member.addedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(member.id, member.email)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Remove from list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-600">
              Page {data.page} of {data.totalPages} · {data.total} total
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-40 rounded hover:bg-gray-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-40 rounded hover:bg-gray-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomListMembersModal
