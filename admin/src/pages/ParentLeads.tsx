import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Heart, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  Baby,
  MapPin
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { LeadMainStatus } from '../types'
import { ParentLead } from '../types/api'
import { useTranslation } from 'react-i18next';

const ParentLeads: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<LeadMainStatus | ''>('')
  const apiClient = useApiClient()
  const { t } = useTranslation(['common', 'admin']);

  const { data: leadsResponse, isLoading, error } = useQuery({
    queryKey: ['parent-leads'],
    queryFn: () => apiService.getParentLeads(apiClient),
  })

  const leads: ParentLead[] = leadsResponse?.data?.data || []

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      lead.contactName?.toLowerCase().includes(query) ||
      lead.contactEmail?.toLowerCase().includes(query) ||
      lead.parent?.name?.toLowerCase().includes(query) ||
      lead.parent?.email?.toLowerCase().includes(query)
    const matchesStatus = !selectedStatus || lead.mainStatus === selectedStatus
    return matchesSearch && matchesStatus
  })

  const statusColors: Record<LeadMainStatus, string> = {
    [LeadMainStatus.NEW]: 'bg-blue-100 text-blue-800',
    [LeadMainStatus.PROCESSING]: 'bg-yellow-100 text-yellow-800',
    [LeadMainStatus.PARENT_ACTION_REQUIRED]: 'bg-orange-100 text-orange-800',
    [LeadMainStatus.CLOSED_ENROLLED]: 'bg-green-100 text-green-800',
    [LeadMainStatus.CLOSED_OTHER]: 'bg-gray-100 text-gray-800',
  }

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
        <div className="text-red-500 mb-4">{t('admin:parentLeads.error.loadFailed', 'Failed to load parent leads')}</div>
        <p className="text-gray-600">{t('admin:parentLeads.error.description', 'Please check your connection and try again.')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Heart className="h-8 w-8 mr-3 text-swiss-teal" />
            {t('admin:parentLeads.title', 'Parent Leads')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('admin:parentLeads.subtitle', 'Manage parent inquiries and leads ({{count}} total)', { count: leads.length })}
          </p>
        </div>
        <button className="bg-swiss-mint hover:bg-swiss-teal text-white px-4 py-2 rounded-lg flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          {t('admin:parentLeads.addLead', 'Add Lead')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('common:placeholders.searchparentleads')}
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
              onChange={(e) => setSelectedStatus(e.target.value as LeadMainStatus | '')}
            >
              <option value="">{t('common:filters.status.all')}</option>
              {Object.values(LeadMainStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Parent Leads List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:parentLeads.table.parent', 'Parent')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:parentLeads.table.childInfo', 'Child Info')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:parentLeads.table.location', 'Location')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:parentLeads.table.status', 'Status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:parentLeads.table.inquiryDate', 'Inquiry Date')}
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">{t('admin:parentLeads.table.actions', 'Actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => {
                const displayName = lead.parent?.name || lead.contactName || t('admin:parentLeads.labels.unknown', 'Unknown')
                const displayEmail = lead.parent?.email || lead.contactEmail || t('admin:parentLeads.labels.noEmail', 'N/A')
                return (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-swiss-teal flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {displayName?.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{displayName}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {displayEmail}
                        </div>
                        {lead.contactPhone && (
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {lead.contactPhone}
                        </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Baby className="h-4 w-4 mr-1" />
                      {lead.childAge} {t('admin:parentLeads.labels.yearsOld', 'years old')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {lead.canton} {lead.municipality && `- ${lead.municipality}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        statusColors[lead.mainStatus as LeadMainStatus] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {lead.mainStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(lead.submissionDate).toLocaleDateString()}
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
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('admin:parentLeads.actions.editStatus', 'Edit Status')}
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('admin:parentLeads.actions.delete', 'Delete')}
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        
        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:parentLeads.emptyState.title', 'No parent leads found')}</h3>
            <p className="text-gray-600">{t('admin:parentLeads.emptyState.description', 'Try adjusting your search criteria or add a new lead.')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ParentLeads
