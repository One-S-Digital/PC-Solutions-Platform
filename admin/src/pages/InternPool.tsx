import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, Search, Plus, Edit, Trash2, MapPin, Users, MoreVertical } from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import { JobListing } from '../types/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import AddJobListingModal, { JobListingFormData } from '../components/AddJobListingModal'

const InternPool: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const { data: jobsResponse, isLoading, error } = useQuery({
    queryKey: ['intern-listings'],
    queryFn: () => apiService.getJobListings(apiClient),
  })

  const createMutation = useMutation({
    mutationFn: (data: JobListingFormData) => apiService.createJobListing(apiClient, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intern-listings'] })
      setIsAddModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiService.updateJobListing(apiClient, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['intern-listings'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteJobListing(apiClient, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['intern-listings'] }),
  })

  // Only show INTERNSHIP contract type
  const allJobs: JobListing[] = jobsResponse?.data?.data || []
  const internJobs = useMemo(
    () => allJobs.filter((j: JobListing) =>
      j.contractType === 'INTERNSHIP' &&
      j.title.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    [allJobs, searchQuery],
  )

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
        <p className="text-red-500 mb-2">{t('admin:jobListings.error.title')}</p>
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
            <GraduationCap className="h-8 w-8 mr-3 text-swiss-teal" />
            {t('admin:staffing.internPool', 'Intern Pool')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('admin:staffing.internPoolSubtitle', 'Internship positions — {{count}} listing(s)', { count: internJobs.length })}
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-swiss-mint hover:bg-swiss-teal text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('admin:jobListings.addButton', 'Add Internship')}
        </button>
      </div>

      <AddJobListingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={(data) => createMutation.mutateAsync({ ...data, contractType: 'INTERNSHIP' })}
        isSubmitting={createMutation.isPending}
      />

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin:jobListings.searchPlaceholder', 'Search internships…')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Listings */}
      <div className="space-y-4">
        {internJobs.map((job: JobListing) => (
          <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-swiss-teal/10 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-swiss-teal" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-500">{job.organizationName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  job.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {job.status}
                </span>
                <Menu as="div" className="relative">
                  <Menu.Button className="p-2 rounded-full hover:bg-gray-100">
                    <MoreVertical className="h-4 w-4" />
                  </Menu.Button>
                  <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                    <Menu.Items className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`} onClick={() => updateMutation.mutate({ id: job.id, data: { status: 'PUBLISHED' } })}>
                              <Edit className="h-4 w-4 mr-2" />{t('admin:jobListings.actions.publish', 'Publish')}
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`} onClick={() => updateMutation.mutate({ id: job.id, data: { status: 'DRAFT' } })}>
                              <Edit className="h-4 w-4 mr-2" />{t('admin:jobListings.actions.draft', 'Save as Draft')}
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`} onClick={() => deleteMutation.mutate(job.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />{t('admin:jobListings.actions.delete', 'Delete')}
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
              {job.location && <span><MapPin className="h-4 w-4 inline mr-1" />{job.location}</span>}
              <span><Users className="h-4 w-4 inline mr-1" />{job.applicants ?? 0} applicants</span>
            </div>
          </div>
        ))}
      </div>

      {internJobs.length === 0 && (
        <div className="text-center py-16">
          <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('admin:staffing.noInterns', 'No internship listings yet.')}</p>
        </div>
      )}
    </div>
  )
}

export default InternPool
