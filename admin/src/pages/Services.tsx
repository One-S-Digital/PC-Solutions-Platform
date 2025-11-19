import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Wrench,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  Clock,
  MapPin,
  Users
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import logger from '../utils/logger'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import EditServiceModal from '../components/services/EditServiceModal'
import { Service } from '../types/api'
import { formatServiceCategory } from '../utils/serviceFormatting'


const Services: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  const apiClient = useApiClient()
  const { t } = useTranslation()

  const { data: servicesResponse, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: () => apiService.getServices(apiClient),
  })

  const services: Service[] = servicesResponse?.data?.data || []

  const filteredServices = services.filter((service) => {
    const matchesSearch = (service.title ?? '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || service.category === selectedCategory
    return matchesSearch && matchesCategory
  })


  const handleUpdateService = async (updatedService: Service) => {
    try {
      await apiService.updateService(apiClient, updatedService.id, updatedService)
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setIsEditModalOpen(false)
    } catch (error) {
      logger.error('Failed to update service:', error)
      // You might want to show an error message to the user
    }
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
        <div className="text-red-500 mb-4">Failed to load services</div>
        <p className="text-gray-600">Please check your connection and try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Wrench className="h-8 w-8 mr-3 text-swiss-teal" />
            Services
          </h1>
          <p className="mt-2 text-gray-600">
            Manage services and offerings ({services.length} total)
          </p>
        </div>
        <button className="bg-swiss-mint hover:bg-swiss-teal text-white px-4 py-2 rounded-lg flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Service
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
                placeholder="Search services..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Childcare">Childcare</option>
              <option value="Education">Education</option>
              <option value="Health">Health</option>
              <option value="Nutrition">Nutrition</option>
              <option value="Special Needs">Special Needs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredServices.map((service) => (
            <div key={service.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-swiss-teal/10 rounded-lg flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-swiss-teal" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                    <p className="text-sm text-gray-600">{formatServiceCategory(t, service.category)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{service.availability || 'Flexible'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{service.deliveryType || 'On-site'}</span>
                    </div>
                  </div>
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
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
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
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-semibold text-green-600">{service.priceInfo || 'N/A'}</span>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{service.providerName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('serviceProvider.noServicesFound')}</h3>
          <p className="text-gray-600">Try adjusting your search criteria or add a new service.</p>
        </div>
      )}
    </div>
  )
}

export default Services
