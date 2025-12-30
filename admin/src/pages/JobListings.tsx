import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  MoreVertical,
  MapPin,
  Clock,
  DollarSign,
  Users
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import { JobListing } from '../types/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import AddJobListingModal, { JobListingFormData } from '../components/AddJobListingModal'

const JobListings: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const { data: jobsResponse, isLoading, error } = useQuery({
    queryKey: ['job-listings'],
    queryFn: () => apiService.getJobListings(apiClient),
  })

  const createJobListingMutation = useMutation({
    mutationFn: (data: JobListingFormData) => apiService.createJobListing(apiClient, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-listings'] })
      setIsAddModalOpen(false)
    },
    onError: (error) => {
      console.error('Failed to create job listing:', error)
      // Error is handled in the modal's try-catch for user feedback
    },
  })

  const updateJobListingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiService.updateJobListing(apiClient, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-listings'] })
    },
  })

  const deleteJobListingMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteJobListing(apiClient, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-listings'] })
    },
  })

  const handleCreateJobListing = async (data: JobListingFormData) => {
    await createJobListingMutation.mutateAsync(data)
  }

  const jobs: JobListing[] = jobsResponse?.data?.data || []

  const filteredJobs = useMemo(() => {
    return jobs.filter((job: JobListing) => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = !selectedStatus || job.status === selectedStatus
      return matchesSearch && matchesStatus
    })
  }, [jobs, searchQuery, selectedStatus])

  const totalJobs = filteredJobs.length
  const totalPages = Math.max(1, Math.ceil(totalJobs / pageSize))
  const showingFrom = totalJobs === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = totalJobs === 0 ? 0 : Math.min(page * pageSize, totalJobs)
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  const paginatedJobs = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredJobs.slice(start, start + pageSize)
  }, [filteredJobs, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedStatus, pageSize])

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{t('admin:jobListings.error.title')}</div>
        <p className="text-gray-600">{t('admin:jobListings.error.description')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Briefcase className="h-8 w-8 mr-3 text-swiss-teal" />
            {t('admin:jobListings.title')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('admin:jobListings.subtitle', { count: jobs.length })}
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-swiss-mint hover:bg-swiss-teal text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('admin:jobListings.addButton')}
        </button>
      </div>

      {/* Add Job Listing Modal */}
      <AddJobListingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateJobListing}
        isSubmitting={createJobListingMutation.isPending}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin:jobListings.searchPlaceholder')}
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
              <option value="">{t('admin:jobListings.statusFilter.all')}</option>
                <option value="PUBLISHED">{t('admin:jobListings.statusFilter.published', 'Published')}</option>
                <option value="DRAFT">{t('admin:jobListings.statusFilter.draft', 'Draft')}</option>
              <option value="CLOSED">{t('admin:jobListings.statusFilter.closed')}</option>
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

      {/* Job Listings */}
      <div className="space-y-4">
        {paginatedJobs.map((job: JobListing) => (
          <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-swiss-teal/10 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-swiss-teal" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-600">{job.organizationName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  job.status === 'PUBLISHED' 
                    ? 'bg-green-100 text-green-800'
                    : job.status === 'DRAFT'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {job.status}
                </span>
                <Menu as="div" className="relative">
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
                              onClick={() => updateJobListingMutation.mutate({ id: job.id, data: { status: 'PUBLISHED' } })}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t('admin:jobListings.actions.publish', 'Publish')}
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                              onClick={() => updateJobListingMutation.mutate({ id: job.id, data: { status: 'DRAFT' } })}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t('admin:jobListings.actions.draft', 'Save as Draft')}
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                              onClick={() => updateJobListingMutation.mutate({ id: job.id, data: { status: 'CLOSED' } })}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t('admin:jobListings.actions.close', 'Close')}
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                              onClick={() => deleteJobListingMutation.mutate(job.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('admin:jobListings.actions.delete')}
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-3">{job.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{job.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{job.type}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{job.salary}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{job.applicants || 0} applicants</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:jobListings.emptyState.title')}</h3>
          <p className="text-gray-600">{t('admin:jobListings.emptyState.description')}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-gray-600">
          {t(
            'admin:users.pagination.showing',
            'Showing {{from}}-{{to}} of {{total}}',
            { from: showingFrom, to: showingTo, total: totalJobs },
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

export default JobListings
