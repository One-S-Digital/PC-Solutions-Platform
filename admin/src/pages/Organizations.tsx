import React, { useState, useEffect, Fragment, useMemo, useRef } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { 
  Building2, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  MoreVertical,
  MapPin,
  Phone,
  Mail,
  Users,
  X,
  AlertTriangle,
  Home,
  Briefcase,
  Package,
  Wrench,
  Globe
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition, Dialog } from '@headlessui/react'
import { Organization } from '../types/api'
import { useTranslation } from 'react-i18next'
import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'
import { STANDARD_INPUT_FIELD } from '../constants/design-system'
import logger from '../utils/logger'

type TabType = 'foundations' | 'organisations'
type OrganizationType = 'FOUNDATION' | 'SERVICE_PROVIDER' | 'PRODUCT_SUPPLIER'

// Add/Edit Organization Modal
interface OrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  organization: Organization | null
  onSave: (org: Partial<Organization>) => Promise<void>
  isLoading: boolean
  mode: 'add' | 'edit'
  defaultType?: OrganizationType
}

const OrganizationModal: React.FC<OrganizationModalProps> = ({ 
  isOpen, 
  onClose, 
  organization, 
  onSave, 
  isLoading,
  mode,
  defaultType = 'FOUNDATION'
}) => {
  const { t } = useTranslation(['admin', 'common'])
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<Partial<Organization>>({
    name: '',
    type: defaultType,
    address: '',
    phone: '',
    email: '',
    region: '',
    description: '',
    website: '',
    capacity: undefined,
    pedagogy: [],
    languagesSpoken: [],
  })
  const [error, setError] = useState<string | null>(null)
  const [pedagogyInput, setPedagogyInput] = useState('')
  const [languageInput, setLanguageInput] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && organization) {
        setFormData({
          id: organization.id,
          name: organization.name || '',
          type: organization.type || 'FOUNDATION',
          address: organization.address || '',
          phone: organization.phone || '',
          email: organization.email || '',
          region: organization.region || '',
          description: organization.description || '',
          website: organization.website || '',
          capacity: organization.capacity,
          pedagogy: organization.pedagogy || [],
          languagesSpoken: organization.languagesSpoken || [],
        })
      } else {
        setFormData({
          name: '',
          type: defaultType,
          address: '',
          phone: '',
          email: '',
          region: '',
          description: '',
          website: '',
          capacity: undefined,
          pedagogy: [],
          languagesSpoken: [],
        })
      }
      setError(null)
      setPedagogyInput('')
      setLanguageInput('')
    }
  }, [organization, isOpen, mode, defaultType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!formData.name?.trim()) {
      setError(t('admin:organizations.form.nameRequired', 'Organization name is required'))
      return
    }
    
    try {
      await onSave(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin:organizations.form.saveFailed', 'Failed to save organization'))
    }
  }

  const addPedagogy = () => {
    if (pedagogyInput.trim() && !formData.pedagogy?.includes(pedagogyInput.trim())) {
      setFormData({ 
        ...formData, 
        pedagogy: [...(formData.pedagogy || []), pedagogyInput.trim()] 
      })
      setPedagogyInput('')
    }
  }

  const removePedagogy = (item: string) => {
    setFormData({ 
      ...formData, 
      pedagogy: formData.pedagogy?.filter(p => p !== item) || [] 
    })
  }

  const addLanguage = () => {
    if (languageInput.trim() && !formData.languagesSpoken?.includes(languageInput.trim())) {
      setFormData({ 
        ...formData, 
        languagesSpoken: [...(formData.languagesSpoken || []), languageInput.trim()] 
      })
      setLanguageInput('')
    }
  }

  const removeLanguage = (item: string) => {
    setFormData({ 
      ...formData, 
      languagesSpoken: formData.languagesSpoken?.filter(l => l !== item) || [] 
    })
  }

  const isFoundation = formData.type === 'FOUNDATION'

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={isLoading ? () => {} : onClose}
        initialFocus={nameInputRef}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <Dialog.Title as="h2" className="text-xl font-semibold text-gray-900">
                    {mode === 'add' ? t('admin:organizations.modal.addTitle', 'Add Organization') : t('admin:organizations.modal.editTitle', 'Edit Organization')}
                  </Dialog.Title>
                  <button 
                    onClick={onClose} 
                    className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    disabled={isLoading}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="p-6 space-y-4">
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}

                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-700 border-b pb-2">{t('admin:organizations.form.basicInfo', 'Basic Information')}</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('admin:organizations.form.name', 'Organization Name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={nameInputRef}
                          type="text"
                          className={STANDARD_INPUT_FIELD}
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t('admin:organizations.form.namePlaceholder', 'Enter organization name')}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:organizations.form.type', 'Type')}</label>
                        <select
                          className={STANDARD_INPUT_FIELD}
                          value={formData.type || 'FOUNDATION'}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as OrganizationType })}
                        >
                          <option value="FOUNDATION">{t('admin:organizations.types.foundation', 'Foundation (Daycare)')}</option>
                          <option value="SERVICE_PROVIDER">{t('admin:organizations.types.serviceProvider', 'Service Provider')}</option>
                          <option value="PRODUCT_SUPPLIER">{t('admin:organizations.types.productSupplier', 'Product Supplier')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:organizations.form.description', 'Description')}</label>
                        <textarea
                          className={`${STANDARD_INPUT_FIELD} min-h-[80px]`}
                          value={formData.description || ''}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder={t('admin:organizations.form.descriptionPlaceholder', 'Brief description of the organization')}
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-700 border-b pb-2">{t('admin:organizations.form.contactInfo', 'Contact Information')}</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:organizations.form.email', 'Email')}</label>
                          <input
                            type="email"
                            className={STANDARD_INPUT_FIELD}
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder={t('admin:forms.organization.emailPlaceholder')}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:organizations.form.phone', 'Phone')}</label>
                          <input
                            type="tel"
                            className={STANDARD_INPUT_FIELD}
                            value={formData.phone || ''}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder={t('common:placeholders.41xxxxxxxxx')}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:organizations.form.address', 'Address')}</label>
                        <input
                          type="text"
                          className={STANDARD_INPUT_FIELD}
                          value={formData.address || ''}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder={t('admin:organizations.form.addressPlaceholder', 'Street address, City')}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:organizations.form.region', 'Region/Canton')}</label>
                          <input
                            type="text"
                            className={STANDARD_INPUT_FIELD}
                            value={formData.region || ''}
                            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                            placeholder={t('admin:forms.organization.regionPlaceholder')}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:organizations.form.website', 'Website')}</label>
                          <input
                            type="url"
                            className={STANDARD_INPUT_FIELD}
                            value={formData.website || ''}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            placeholder={t('admin:forms.organization.websitePlaceholder')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Foundation-specific fields */}
                    {isFoundation && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700 border-b pb-2">{t('admin:organizations.form.daycareDetails', 'Daycare Details')}</h3>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:organizations.form.capacity', 'Capacity (Children)')}</label>
                          <input
                            type="number"
                            className={STANDARD_INPUT_FIELD}
                            value={formData.capacity || ''}
                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || undefined })}
                            placeholder={t('admin:organizations.form.capacityPlaceholder', 'Number of children')}
                            min={0}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:organizations.form.pedagogy', 'Pedagogy Approaches')}</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              className={`${STANDARD_INPUT_FIELD} flex-1`}
                              value={pedagogyInput}
                              onChange={(e) => setPedagogyInput(e.target.value)}
                              placeholder={t('admin:forms.organization.pedagogyPlaceholder')}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPedagogy())}
                            />
                            <Button type="button" variant="secondary" onClick={addPedagogy}>{t('common:add', 'Add')}</Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.pedagogy?.map((item) => (
                              <span 
                                key={item} 
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-swiss-teal/10 text-swiss-teal"
                              >
                                {item}
                                <button 
                                  type="button" 
                                  onClick={() => removePedagogy(item)}
                                  className="ml-2 text-swiss-teal/70 hover:text-swiss-teal"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:organizations.form.languages', 'Languages Spoken')}</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              className={`${STANDARD_INPUT_FIELD} flex-1`}
                              value={languageInput}
                              onChange={(e) => setLanguageInput(e.target.value)}
                              placeholder={t('admin:forms.organization.languagePlaceholder')}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                            />
                            <Button type="button" variant="secondary" onClick={addLanguage}>{t('common:add', 'Add')}</Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.languagesSpoken?.map((item) => (
                              <span 
                                key={item} 
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-swiss-mint/10 text-swiss-mint"
                              >
                                {item}
                                <button 
                                  type="button" 
                                  onClick={() => removeLanguage(item)}
                                  className="ml-2 text-swiss-mint/70 hover:text-swiss-mint"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onClose}
                      disabled={isLoading}
                    >
                      {t('common:cancel', 'Cancel')}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isLoading}
                    >
                      {isLoading ? t('common:saving', 'Saving...') : mode === 'add' ? t('admin:organizations.actions.create', 'Create Organization') : t('admin:organizations.actions.save', 'Save Changes')}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

// Delete Confirmation Modal
interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  organization: Organization | null
  onConfirm: () => Promise<void>
  isLoading: boolean
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  organization, 
  onConfirm, 
  isLoading 
}) => {
  const { t } = useTranslation(['admin', 'common'])
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <Transition appear show={isOpen && !!organization} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={isLoading ? () => {} : onClose}
        initialFocus={cancelButtonRef}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md bg-white shadow-xl rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  
                  <div className="mt-4 text-center">
                    <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                      {t('admin:organizations.delete.title', 'Delete Organization')}
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-gray-600">
                      {t('admin:organizations.delete.confirmation', 'Are you sure you want to delete')} <span className="font-medium">{organization?.name}</span>? 
                      {t('admin:organizations.delete.warning', 'This action cannot be undone and will permanently remove all associated data including products, services, and job listings.')}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                  <Button
                    ref={cancelButtonRef}
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {t('common:cancel', 'Cancel')}
                  </Button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {isLoading ? t('common:deleting', 'Deleting...') : t('admin:organizations.actions.delete', 'Delete Organization')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

// Organization Card Component
interface OrganizationCardProps {
  org: Organization
  onEdit: (org: Organization) => void
  onDelete: (org: Organization) => void
}

const OrganizationCard: React.FC<OrganizationCardProps> = ({ org, onEdit, onDelete }) => {
  const { t } = useTranslation(['admin', 'common'])

  const getTypeIcon = () => {
    switch (org.type) {
      case 'FOUNDATION':
        return <Home className="h-6 w-6 text-swiss-teal" />
      case 'SERVICE_PROVIDER':
        return <Wrench className="h-6 w-6 text-indigo-600" />
      case 'PRODUCT_SUPPLIER':
        return <Package className="h-6 w-6 text-amber-600" />
      default:
        return <Building2 className="h-6 w-6 text-swiss-teal" />
    }
  }

  const getTypeBadgeColor = () => {
    switch (org.type) {
      case 'FOUNDATION':
        return 'bg-swiss-teal/10 text-swiss-teal'
      case 'SERVICE_PROVIDER':
        return 'bg-indigo-100 text-indigo-800'
      case 'PRODUCT_SUPPLIER':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = () => {
    switch (org.type) {
      case 'FOUNDATION':
        return t('admin:organizations.types.daycare', 'Daycare')
      case 'SERVICE_PROVIDER':
        return t('admin:organizations.types.serviceProvider', 'Service Provider')
      case 'PRODUCT_SUPPLIER':
        return t('admin:organizations.types.productSupplier', 'Product Supplier')
      default:
        return org.type
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="w-10 h-10 object-contain rounded" />
            ) : (
              getTypeIcon()
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getTypeBadgeColor()}`}>
              {getTypeLabel()}
            </span>
          </div>
        </div>
        <Menu as="div" className="relative">
          <Menu.Button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <MoreVertical className="h-4 w-4 text-gray-500" />
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
                      onClick={() => onEdit(org)}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {t('common:edit', 'Edit')}
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onDelete(org)}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common:delete', 'Delete')}
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
      
      <div className="space-y-2">
        {org.address && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span className="truncate">{org.address}</span>
          </div>
        )}
        {org.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span>{org.phone}</span>
          </div>
        )}
        {org.email && (
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span className="truncate">{org.email}</span>
          </div>
        )}
        {org.region && (
          <div className="flex items-center text-sm text-gray-600">
            <Globe className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span>{org.region}</span>
          </div>
        )}
        {org.type === 'FOUNDATION' && org.capacity && (
          <div className="flex items-center text-sm text-gray-600">
            <Users className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span>{org.capacity} {t('admin:organizations.childrenCapacity', 'children capacity')}</span>
          </div>
        )}
      </div>

      {/* Tags/Pedagogy for Foundations */}
      {org.type === 'FOUNDATION' && org.pedagogy && org.pedagogy.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1">
          {org.pedagogy.slice(0, 3).map((p) => (
            <span key={p} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              {p}
            </span>
          ))}
          {org.pedagogy.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
              +{org.pedagogy.length - 3} {t('common:more', 'more')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Main Organizations Component
const Organizations: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('foundations')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25)
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const { data: orgsResponse, isLoading, error } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiService.getOrganizations(apiClient),
  })

  // Handle different response structures from compat controller
  // Compat controller returns: { success: true, data: { organizations: [...], pagination: {...} } }
  // or direct array in data.data
  const organizations: Organization[] = (() => {
    if (!orgsResponse?.data?.data) return [];
    // Check if data.data is an array (direct array response)
    if (Array.isArray(orgsResponse.data.data)) {
      return orgsResponse.data.data;
    }
    // Check if data.data.organizations exists (nested response with pagination)
    if (orgsResponse.data.data.organizations && Array.isArray(orgsResponse.data.data.organizations)) {
      return orgsResponse.data.data.organizations;
    }
    // Fallback to empty array
    return [];
  })()

  // Create organization mutation
  const createMutation = useMutation({
    mutationFn: (orgData: Partial<Organization>) => 
      apiService.createOrganization(apiClient, orgData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setIsAddModalOpen(false)
      logger.log('Organization created successfully')
    },
    onError: (error) => {
      logger.error('Failed to create organization:', error)
    },
  })

  // Update organization mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Organization> }) => 
      apiService.updateOrganization(apiClient, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setIsEditModalOpen(false)
      setSelectedOrganization(null)
      logger.log('Organization updated successfully')
    },
    onError: (error) => {
      logger.error('Failed to update organization:', error)
    },
  })

  // Delete organization mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteOrganization(apiClient, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setIsDeleteModalOpen(false)
      setSelectedOrganization(null)
      logger.log('Organization deleted successfully')
    },
    onError: (error) => {
      logger.error('Failed to delete organization:', error)
    },
  })

  // Filter organizations by type and search
  const filteredOrgs = useMemo(() => {
    return (Array.isArray(organizations) ? organizations : []).filter((org) => {
      const matchesSearch = 
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.address && org.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (org.region && org.region.toLowerCase().includes(searchQuery.toLowerCase()))
      
      if (activeTab === 'foundations') {
        return matchesSearch && org.type === 'FOUNDATION'
      } else {
        return matchesSearch && (org.type === 'SERVICE_PROVIDER' || org.type === 'PRODUCT_SUPPLIER')
      }
    })
  }, [organizations, searchQuery, activeTab])

  const totalOrgs = filteredOrgs.length
  const totalPages = Math.max(1, Math.ceil(totalOrgs / pageSize))
  const showingFrom = totalOrgs === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = totalOrgs === 0 ? 0 : Math.min(page * pageSize, totalOrgs)
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  const paginatedOrgs = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredOrgs.slice(start, start + pageSize)
  }, [filteredOrgs, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, activeTab, pageSize])

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const foundationsCount = (Array.isArray(organizations) ? organizations : []).filter(o => o.type === 'FOUNDATION').length
  const organisationsCount = (Array.isArray(organizations) ? organizations : []).filter(o => o.type === 'SERVICE_PROVIDER' || o.type === 'PRODUCT_SUPPLIER').length

  // Handlers
  const handleAddOrganization = () => {
    setSelectedOrganization(null)
    setIsAddModalOpen(true)
  }

  const handleEditOrganization = (org: Organization) => {
    setSelectedOrganization(org)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (org: Organization) => {
    setSelectedOrganization(org)
    setIsDeleteModalOpen(true)
  }

  const handleSaveNew = async (orgData: Partial<Organization>) => {
    await createMutation.mutateAsync(orgData)
  }

  const handleSaveEdit = async (orgData: Partial<Organization>) => {
    if (selectedOrganization) {
      await updateMutation.mutateAsync({ id: selectedOrganization.id, data: orgData })
    }
  }

  const handleConfirmDelete = async () => {
    if (selectedOrganization) {
      await deleteMutation.mutateAsync(selectedOrganization.id)
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
        <div className="text-red-500 mb-4">{t('admin:organizations.error.title', 'Failed to load organizations')}</div>
        <p className="text-gray-600">{t('admin:organizations.error.description', 'Please check your connection and try again.')}</p>
      </div>
    )
  }

  const getDefaultType = (): OrganizationType => {
    return activeTab === 'foundations' ? 'FOUNDATION' : 'SERVICE_PROVIDER'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-8 w-8 mr-3 text-swiss-teal" />
            {t('admin:organizations.title', 'Organizations')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('admin:organizations.subtitle', 'Manage all organizations across the platform')} ({Array.isArray(organizations) ? organizations.length : 0} {t('common:total', 'total')})
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={Plus}
          onClick={handleAddOrganization}
        >
          {t('common:add', 'Add')} {activeTab === 'foundations' ? t('admin:organizations.foundation', 'Foundation') : t('admin:organizations.organisation', 'Organisation')}
        </Button>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('foundations')}
            className={`flex items-center px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'foundations'
                ? 'bg-swiss-teal text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Home className={`h-5 w-5 mr-2 ${activeTab === 'foundations' ? 'text-white' : 'text-gray-400'}`} />
            {t('admin:organizations.tabs.foundations', 'Foundations')}
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'foundations' 
                ? 'bg-white/20 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {foundationsCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('organisations')}
            className={`flex items-center px-6 py-3 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'organisations'
                ? 'bg-swiss-teal text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Briefcase className={`h-5 w-5 mr-2 ${activeTab === 'organisations' ? 'text-white' : 'text-gray-400'}`} />
            {t('admin:organizations.tabs.organisations', 'Organisations')}
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'organisations' 
                ? 'bg-white/20 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {organisationsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Description */}
      <div className="bg-gradient-to-r from-swiss-teal/5 to-swiss-mint/5 rounded-lg p-4 border border-swiss-teal/10">
        {activeTab === 'foundations' ? (
          <div className="flex items-center">
            <Home className="h-5 w-5 text-swiss-teal mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('admin:organizations.foundationsDesc.title', 'Foundations (Daycares)')}</p>
              <p className="text-xs text-gray-600">{t('admin:organizations.foundationsDesc.subtitle', 'Childcare centers and daycare facilities registered on the platform')}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            <Briefcase className="h-5 w-5 text-swiss-teal mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('admin:organizations.organisationsDesc.title', 'Organisations (Service Providers & Product Suppliers)')}</p>
              <p className="text-xs text-gray-600">{t('admin:organizations.organisationsDesc.subtitle', 'Companies providing services or products to childcare organizations')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin:organizations.searchPlaceholder', `Search ${activeTab === 'foundations' ? 'foundations' : 'organisations'} by name, address, or region...`)}
              className={`${STANDARD_INPUT_FIELD} pl-10`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sm:w-48">
            <select
              className={STANDARD_INPUT_FIELD}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as 25 | 50 | 100)}
            >
              <option value={25}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 25</option>
              <option value={50}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 50</option>
              <option value={100}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 100</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedOrgs.map((org) => (
          <OrganizationCard
            key={org.id}
            org={org}
            onEdit={handleEditOrganization}
            onDelete={handleDeleteClick}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredOrgs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery 
              ? t('admin:organizations.emptyState.noResults', `No ${activeTab === 'foundations' ? 'foundations' : 'organisations'} found`)
              : t('admin:organizations.emptyState.noData', `No ${activeTab === 'foundations' ? 'foundations' : 'organisations'} yet`)}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery 
              ? t('admin:organizations.emptyState.adjustSearch', 'Try adjusting your search criteria')
              : t('admin:organizations.emptyState.getStarted', `Get started by adding your first ${activeTab === 'foundations' ? 'foundation' : 'organisation'}`)}
          </p>
          {!searchQuery && (
            <Button variant="primary" leftIcon={Plus} onClick={handleAddOrganization}>
              {t('common:add', 'Add')} {activeTab === 'foundations' ? t('admin:organizations.foundation', 'Foundation') : t('admin:organizations.organisation', 'Organisation')}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-gray-600">
          {t(
            'admin:users.pagination.showing',
            'Showing {{from}}-{{to}} of {{total}}',
            { from: showingFrom, to: showingTo, total: totalOrgs },
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

      {/* Add Modal */}
      <OrganizationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        organization={null}
        onSave={handleSaveNew}
        isLoading={createMutation.isPending}
        mode="add"
        defaultType={getDefaultType()}
      />

      {/* Edit Modal */}
      <OrganizationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedOrganization(null)
        }}
        organization={selectedOrganization}
        onSave={handleSaveEdit}
        isLoading={updateMutation.isPending}
        mode="edit"
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedOrganization(null)
        }}
        organization={selectedOrganization}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

export default Organizations
