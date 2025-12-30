import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  FileText
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import { Candidate, User } from '../types/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import AddCandidateModal, { CandidateFormData } from '../components/AddCandidateModal'
import EditUserModal from '../components/EditUserModal'
import { getFrontendBaseUrl } from '../utils/frontendUrl'

const Candidates: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const openCandidateProfile = (candidateProfileId: string) => {
    // Open the main app's candidate profile view (same view foundations use)
    const baseUrl = getFrontendBaseUrl()
    const url = new URL(`/candidate/${candidateProfileId}`, `${baseUrl}/`).toString()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const { data: currentUserResponse } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiService.getCurrentUser(apiClient),
    enabled: !!apiClient,
    staleTime: 5 * 60 * 1000,
  })

  const { data: candidatesResponse, isLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => apiService.getCandidates(apiClient),
    enabled: !!apiClient,
  })

  const { data: selectedUserResponse, isLoading: isSelectedUserLoading } = useQuery({
    queryKey: ['user', selectedUserId],
    queryFn: () => apiService.getUserById(apiClient, selectedUserId as string),
    enabled: !!apiClient && !!selectedUserId,
  })

  const createCandidateMutation = useMutation({
    mutationFn: (data: CandidateFormData) => apiService.createCandidate(apiClient, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      setIsAddModalOpen(false)
    },
    onError: (error) => {
      console.error('Failed to create candidate:', error)
      // Error is handled in the modal's try-catch for user feedback
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: (updatedUser: User) => apiService.updateUser(apiClient, updatedUser.id, updatedUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['user', selectedUserId] })
      }
      setIsEditModalOpen(false)
      setSelectedUserId(null)
    },
  })

  const handleCreateCandidate = async (data: CandidateFormData) => {
    await createCandidateMutation.mutateAsync(data)
  }

  const handleEditUser = (candidate: Candidate) => {
    // Prefer profileId when available; backend supports either profileId or appUserId.
    setSelectedUserId(candidate.profileId || candidate.id)
    setIsEditModalOpen(true)
  }

  const handleUpdateUser = async (updatedUser: User) => {
    await updateUserMutation.mutateAsync(updatedUser)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedUserId(null)
  }

  const candidates: Candidate[] = useMemo(
    () => candidatesResponse?.data?.data || [],
    [candidatesResponse]
  )

  const statusOptions = useMemo(() => {
    const statuses = candidates
      .map((c: Candidate) => c.availabilityStatus)
      .filter(Boolean)
    return Array.from(new Set(statuses))
  }, [candidates])

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate: Candidate) => {
      const name = (candidate.name || candidate.user?.name || '').toLowerCase()
      const email = (candidate.email || candidate.user?.email || '').toLowerCase()
      const matchesSearch =
        name.includes(searchQuery.toLowerCase()) ||
        email.includes(searchQuery.toLowerCase())
      const status = candidate.availabilityStatus || ''
      const matchesStatus = !selectedStatus || status === selectedStatus
      return matchesSearch && matchesStatus
    })
  }, [candidates, searchQuery, selectedStatus])

  const totalCandidates = filteredCandidates.length
  const totalPages = Math.max(1, Math.ceil(totalCandidates / pageSize))
  const showingFrom = totalCandidates === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = totalCandidates === 0 ? 0 : Math.min(page * pageSize, totalCandidates)
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  const paginatedCandidates = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredCandidates.slice(start, start + pageSize)
  }, [filteredCandidates, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedStatus, pageSize])

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const statusColors = useMemo(() => {
    const palette = [
      'bg-green-100 text-green-800',
      'bg-blue-100 text-blue-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
    ]
    return statusOptions.reduce((acc: Record<string, string>, status, idx) => {
      acc[status] = palette[idx % palette.length]
      return acc
    }, {})
  }, [statusOptions])

  if (isLoading) {
    return <LoadingSpinner />
  }

  const selectedUser = (() => {
    const responseData = selectedUserResponse?.data
    if (!responseData) {
      return null
    }

    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'success' in responseData &&
      'data' in responseData
    ) {
      // TODO: Remove legacy fallback once all endpoints return wrapped payloads.
      const wrappedData = responseData as { data?: User | null }
      return wrappedData.data ?? null
    }

    return responseData as User
  })()
  const currentUser = currentUserResponse?.data?.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <UserCheck className="h-8 w-8 mr-3 text-swiss-teal" />
            {t('admin:candidates.title')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('admin:candidates.subtitle', { count: candidates.length })}
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-swiss-mint hover:bg-swiss-teal text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('admin:candidates.addButton')}
        </button>
      </div>

      {/* Add Candidate Modal */}
      <AddCandidateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateCandidate}
        isSubmitting={createCandidateMutation.isPending}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        user={selectedUser}
        onSave={handleUpdateUser}
        isLoading={updateUserMutation.isPending}
        isFetchingUser={isSelectedUserLoading}
        currentUserRole={currentUser?.role}
        showCandidatePoolControls
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin:candidates.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">{t('admin:candidates.statusFilter.all')}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as 25 | 50 | 100)}
            >
              <option value={25}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 25</option>
              <option value={50}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 50</option>
              <option value={100}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:candidates.table.candidate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:candidates.table.position')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:candidates.table.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:candidates.table.pool', 'POOL')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:candidates.table.appliedDate')}
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCandidates.map((candidate: Candidate) => {
                const name = candidate.name || candidate.user?.name || ''
                const email = candidate.email || candidate.user?.email || ''
                const phone = candidate.phone || ''
                const position = candidate.currentRoleOrTitle || candidate.role
                const status = candidate.availabilityStatus || ''
                const appliedDate = candidate.createdAt
                const isInPool = Boolean(candidate.candidatePoolVisible)
                return (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-swiss-teal flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{name}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isInPool ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {isInPool
                          ? t('admin:candidates.poolStatus.inPool', 'In pool')
                          : t('admin:candidates.poolStatus.outOfPool', 'Not in pool')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {appliedDate ? new Date(appliedDate).toLocaleDateString() : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="p-2 rounded-full hover:bg-gray-100">
                          <MoreVertical className="h-4 w-4" />
                        </Menu.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div className="py-1">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                    onClick={() => openCandidateProfile((candidate as any).profileId || candidate.id)}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    {t('admin:candidates.actions.viewProfile', 'View Profile')}
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                    onClick={() => handleEditUser(candidate)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit User
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </button>
                                )}
                              </Menu.Item>
                            </div>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {filteredCandidates.length === 0 && (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:candidates.emptyState.title')}</h3>
            <p className="text-gray-600">{t('admin:candidates.emptyState.description')}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-gray-600">
          {t(
            'admin:users.pagination.showing',
            'Showing {{from}}-{{to}} of {{total}}',
            { from: showingFrom, to: showingTo, total: totalCandidates },
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canGoPrev}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            {t('admin:users.pagination.previous', 'Previous')}
          </button>
          <span className="text-sm text-gray-600 px-2">
            {t('admin:users.pagination.pageOf', 'Page {{page}} of {{totalPages}}', { page, totalPages })}
          </span>
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canGoNext}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            {t('admin:users.pagination.next', 'Next')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Candidates
