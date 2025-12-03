import React, { useState, useEffect, Fragment, useRef } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { 
  Handshake, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  MoreVertical,
  Globe,
  Mail,
  Phone,
  User,
  X,
  AlertTriangle,
  Star,
  Building2,
  GraduationCap,
  Landmark,
  Heart,
  Newspaper,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  Calendar
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition, Dialog } from '@headlessui/react'
import { Partner, PartnerType, PartnerStats } from '../types/api'
import { useTranslation } from 'react-i18next'
import Card from '../components/design-system/Card'
import Button from '../components/design-system/Button'
import { STANDARD_INPUT_FIELD } from '../constants/design-system'
import logger from '../utils/logger'

// Partner type options
const PARTNER_TYPES: { value: PartnerType; label: string }[] = [
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'GOVERNMENTAL', label: 'Governmental' },
  { value: 'NON_PROFIT', label: 'Non-Profit' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'TECHNOLOGY', label: 'Technology' },
]

// Add/Edit Partner Modal
interface PartnerModalProps {
  isOpen: boolean
  onClose: () => void
  partner: Partner | null
  onSave: (partner: Partial<Partner>) => Promise<void>
  isLoading: boolean
  mode: 'add' | 'edit'
}

const PartnerModal: React.FC<PartnerModalProps> = ({ 
  isOpen, 
  onClose, 
  partner, 
  onSave, 
  isLoading,
  mode
}) => {
  const { t } = useTranslation(['admin', 'common'])
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<Partial<Partner>>({
    name: '',
    type: 'CORPORATE',
    description: '',
    websiteUrl: '',
    countryRegion: '',
    contactEmail: '',
    contactPhone: '',
    contactPerson: '',
    logoUrl: '',
    isActive: true,
    isFeatured: false,
    displayOrder: 0,
    partnershipStart: '',
    partnershipEnd: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && partner) {
        setFormData({
          id: partner.id,
          name: partner.name || '',
          type: partner.type || 'CORPORATE',
          description: partner.description || '',
          websiteUrl: partner.websiteUrl || '',
          countryRegion: partner.countryRegion || '',
          contactEmail: partner.contactEmail || '',
          contactPhone: partner.contactPhone || '',
          contactPerson: partner.contactPerson || '',
          logoUrl: partner.logoUrl || '',
          isActive: partner.isActive ?? true,
          isFeatured: partner.isFeatured ?? false,
          displayOrder: partner.displayOrder ?? 0,
          partnershipStart: partner.partnershipStart ? partner.partnershipStart.split('T')[0] : '',
          partnershipEnd: partner.partnershipEnd ? partner.partnershipEnd.split('T')[0] : '',
        })
      } else {
        setFormData({
          name: '',
          type: 'CORPORATE',
          description: '',
          websiteUrl: '',
          countryRegion: '',
          contactEmail: '',
          contactPhone: '',
          contactPerson: '',
          logoUrl: '',
          isActive: true,
          isFeatured: false,
          displayOrder: 0,
          partnershipStart: '',
          partnershipEnd: '',
        })
      }
      setError(null)
    }
  }, [partner, isOpen, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!formData.name?.trim()) {
      setError('Partner name is required')
      return
    }
    
    try {
      await onSave(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save partner')
    }
  }

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
                    {mode === 'add' ? 'Add New Partner' : 'Edit Partner'}
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
                      <h3 className="text-sm font-medium text-gray-700 border-b pb-2">Basic Information</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Partner Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          ref={nameInputRef}
                          type="text"
                          className={STANDARD_INPUT_FIELD}
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter partner name"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            className={STANDARD_INPUT_FIELD}
                            value={formData.type || 'CORPORATE'}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as PartnerType })}
                          >
                            {PARTNER_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Country/Region</label>
                          <input
                            type="text"
                            className={STANDARD_INPUT_FIELD}
                            value={formData.countryRegion || ''}
                            onChange={(e) => setFormData({ ...formData, countryRegion: e.target.value })}
                            placeholder="e.g., Switzerland"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          className={`${STANDARD_INPUT_FIELD} min-h-[80px]`}
                          value={formData.description || ''}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Brief description of the partner"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                        <input
                          type="url"
                          className={STANDARD_INPUT_FIELD}
                          value={formData.websiteUrl || ''}
                          onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                        <input
                          type="url"
                          className={STANDARD_INPUT_FIELD}
                          value={formData.logoUrl || ''}
                          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-700 border-b pb-2">Contact Information</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                          <input
                            type="text"
                            className={STANDARD_INPUT_FIELD}
                            value={formData.contactPerson || ''}
                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            className={STANDARD_INPUT_FIELD}
                            value={formData.contactEmail || ''}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            placeholder="contact@example.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          className={STANDARD_INPUT_FIELD}
                          value={formData.contactPhone || ''}
                          onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                          placeholder="+41 XX XXX XX XX"
                        />
                      </div>
                    </div>

                    {/* Partnership Details */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-700 border-b pb-2">Partnership Details</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Partnership Start</label>
                          <input
                            type="date"
                            className={STANDARD_INPUT_FIELD}
                            value={formData.partnershipStart || ''}
                            onChange={(e) => setFormData({ ...formData, partnershipStart: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Partnership End</label>
                          <input
                            type="date"
                            className={STANDARD_INPUT_FIELD}
                            value={formData.partnershipEnd || ''}
                            onChange={(e) => setFormData({ ...formData, partnershipEnd: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                        <input
                          type="number"
                          className={STANDARD_INPUT_FIELD}
                          value={formData.displayOrder || 0}
                          onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                          min={0}
                          placeholder="0"
                        />
                        <p className="mt-1 text-xs text-gray-500">Lower numbers appear first</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-700 border-b pb-2">Visibility</h3>
                      
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-4 h-4 text-swiss-teal border-gray-300 rounded focus:ring-swiss-teal"
                          />
                          <span className="text-sm text-gray-700">Active</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isFeatured}
                            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                            className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                          />
                          <span className="text-sm text-gray-700">Featured</span>
                        </label>
                      </div>
                    </div>
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
                      {isLoading ? 'Saving...' : mode === 'add' ? 'Create Partner' : 'Save Changes'}
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
  partner: Partner | null
  onConfirm: () => Promise<void>
  isLoading: boolean
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  partner, 
  onConfirm, 
  isLoading 
}) => {
  const { t } = useTranslation(['admin', 'common'])
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <Transition appear show={isOpen && !!partner} as={Fragment}>
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
                      Delete Partner
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-gray-600">
                      Are you sure you want to delete <span className="font-medium">{partner?.name}</span>? 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    ref={cancelButtonRef}
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('common:cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Deleting...' : 'Delete Partner'}
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

// Partner Card Component
interface PartnerCardProps {
  partner: Partner
  onEdit: (partner: Partner) => void
  onDelete: (partner: Partner) => void
  onToggleActive: (partner: Partner) => void
  onToggleFeatured: (partner: Partner) => void
}

const PartnerCard: React.FC<PartnerCardProps> = ({ partner, onEdit, onDelete, onToggleActive, onToggleFeatured }) => {
  const getTypeIcon = () => {
    switch (partner.type) {
      case 'ACADEMIC':
        return <GraduationCap className="h-6 w-6 text-blue-600" />
      case 'CORPORATE':
        return <Building2 className="h-6 w-6 text-indigo-600" />
      case 'GOVERNMENTAL':
        return <Landmark className="h-6 w-6 text-emerald-600" />
      case 'NON_PROFIT':
        return <Heart className="h-6 w-6 text-rose-600" />
      case 'MEDIA':
        return <Newspaper className="h-6 w-6 text-purple-600" />
      case 'TECHNOLOGY':
        return <Cpu className="h-6 w-6 text-cyan-600" />
      default:
        return <Handshake className="h-6 w-6 text-gray-600" />
    }
  }

  const getTypeBadgeColor = () => {
    switch (partner.type) {
      case 'ACADEMIC':
        return 'bg-blue-100 text-blue-800'
      case 'CORPORATE':
        return 'bg-indigo-100 text-indigo-800'
      case 'GOVERNMENTAL':
        return 'bg-emerald-100 text-emerald-800'
      case 'NON_PROFIT':
        return 'bg-rose-100 text-rose-800'
      case 'MEDIA':
        return 'bg-purple-100 text-purple-800'
      case 'TECHNOLOGY':
        return 'bg-cyan-100 text-cyan-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = () => {
    const typeObj = PARTNER_TYPES.find(t => t.value === partner.type)
    return typeObj?.label || partner.type
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${!partner.isActive ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 overflow-hidden">
            {partner.logoUrl ? (
              <img src={partner.logoUrl} alt={partner.name} className="w-10 h-10 object-contain" />
            ) : (
              getTypeIcon()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{partner.name}</h3>
              {partner.isFeatured && (
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              )}
            </div>
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
                      onClick={() => onEdit(partner)}
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
                      onClick={() => onToggleActive(partner)}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                    >
                      {partner.isActive ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onToggleFeatured(partner)}
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm ${partner.isFeatured ? 'text-amber-600' : 'text-gray-700'}`}
                    >
                      <Star className={`h-4 w-4 mr-2 ${partner.isFeatured ? 'fill-amber-500' : ''}`} />
                      {partner.isFeatured ? 'Remove Featured' : 'Mark Featured'}
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => onDelete(partner)}
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
      
      {partner.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{partner.description}</p>
      )}

      <div className="space-y-2">
        {partner.countryRegion && (
          <div className="flex items-center text-sm text-gray-600">
            <Globe className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span>{partner.countryRegion}</span>
          </div>
        )}
        {partner.contactEmail && (
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span className="truncate">{partner.contactEmail}</span>
          </div>
        )}
        {partner.contactPhone && (
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span>{partner.contactPhone}</span>
          </div>
        )}
        {partner.contactPerson && (
          <div className="flex items-center text-sm text-gray-600">
            <User className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
            <span>{partner.contactPerson}</span>
          </div>
        )}
        {partner.websiteUrl && (
          <a 
            href={partner.websiteUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-sm text-swiss-teal hover:underline"
          >
            <ExternalLink className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Visit Website</span>
          </a>
        )}
      </div>

      {/* Status badges */}
      <div className="mt-4 flex items-center gap-2">
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${partner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {partner.isActive ? 'Active' : 'Inactive'}
        </span>
        {partner.partnershipStart && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            Since {new Date(partner.partnershipStart).getFullYear()}
          </span>
        )}
      </div>
    </div>
  )
}

// Stats Card Component
interface StatsCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-50">
        {icon}
      </div>
    </div>
  </div>
)

// Main Partners Component
const Partners: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<PartnerType | ''>('')
  const [filterActive, setFilterActive] = useState<string>('')
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  
  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  // Fetch partners
  const { data: partnersResponse, isLoading, error } = useQuery({
    queryKey: ['partners', filterType, filterActive, searchQuery],
    queryFn: () => apiService.getPartners(apiClient, {
      type: filterType || undefined,
      isActive: filterActive ? filterActive === 'true' : undefined,
      search: searchQuery || undefined,
    }),
  })

  // Fetch stats
  const { data: statsResponse } = useQuery({
    queryKey: ['partnerStats'],
    queryFn: () => apiService.getPartnerStats(apiClient),
  })

  const partners: Partner[] = partnersResponse?.data?.data || []
  const stats: PartnerStats | null = statsResponse?.data?.data || null

  // Create partner mutation
  const createMutation = useMutation({
    mutationFn: (partnerData: Partial<Partner>) => 
      apiService.createPartner(apiClient, partnerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      queryClient.invalidateQueries({ queryKey: ['partnerStats'] })
      setIsAddModalOpen(false)
      logger.log('Partner created successfully')
    },
    onError: (error) => {
      logger.error('Failed to create partner:', error)
    },
  })

  // Update partner mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Partner> }) => 
      apiService.updatePartner(apiClient, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      queryClient.invalidateQueries({ queryKey: ['partnerStats'] })
      setIsEditModalOpen(false)
      setSelectedPartner(null)
      logger.log('Partner updated successfully')
    },
    onError: (error) => {
      logger.error('Failed to update partner:', error)
    },
  })

  // Delete partner mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deletePartner(apiClient, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      queryClient.invalidateQueries({ queryKey: ['partnerStats'] })
      setIsDeleteModalOpen(false)
      setSelectedPartner(null)
      logger.log('Partner deleted successfully')
    },
    onError: (error) => {
      logger.error('Failed to delete partner:', error)
    },
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => apiService.togglePartnerActive(apiClient, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      queryClient.invalidateQueries({ queryKey: ['partnerStats'] })
    },
    onError: (error) => {
      logger.error('Failed to toggle partner active status:', error)
    },
  })

  // Toggle featured mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: (id: string) => apiService.togglePartnerFeatured(apiClient, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
      queryClient.invalidateQueries({ queryKey: ['partnerStats'] })
    },
    onError: (error) => {
      logger.error('Failed to toggle partner featured status:', error)
    },
  })

  // Handlers
  const handleAddPartner = () => {
    setSelectedPartner(null)
    setIsAddModalOpen(true)
  }

  const handleEditPartner = (partner: Partner) => {
    setSelectedPartner(partner)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (partner: Partner) => {
    setSelectedPartner(partner)
    setIsDeleteModalOpen(true)
  }

  const handleSaveNew = async (partnerData: Partial<Partner>) => {
    await createMutation.mutateAsync(partnerData)
  }

  const handleSaveEdit = async (partnerData: Partial<Partner>) => {
    if (selectedPartner) {
      await updateMutation.mutateAsync({ id: selectedPartner.id, data: partnerData })
    }
  }

  const handleConfirmDelete = async () => {
    if (selectedPartner) {
      await deleteMutation.mutateAsync(selectedPartner.id)
    }
  }

  const handleToggleActive = (partner: Partner) => {
    toggleActiveMutation.mutate(partner.id)
  }

  const handleToggleFeatured = (partner: Partner) => {
    toggleFeaturedMutation.mutate(partner.id)
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
        <div className="text-red-500 mb-4">Failed to load partners</div>
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
            <Handshake className="h-8 w-8 mr-3 text-swiss-teal" />
            Partners
          </h1>
          <p className="mt-2 text-gray-600">
            Manage partner organizations and sponsors ({partners.length} total)
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={Plus}
          onClick={handleAddPartner}
        >
          Add Partner
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Partners"
            value={stats.total}
            icon={<Handshake className="h-6 w-6 text-swiss-teal" />}
            color=""
          />
          <StatsCard
            title="Active"
            value={stats.active}
            icon={<Eye className="h-6 w-6 text-green-600" />}
            color=""
          />
          <StatsCard
            title="Featured"
            value={stats.featured}
            icon={<Star className="h-6 w-6 text-amber-500" />}
            color=""
          />
          <StatsCard
            title="Types"
            value={stats.byType.length}
            icon={<Globe className="h-6 w-6 text-blue-600" />}
            color=""
          />
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search partners..."
                className={`${STANDARD_INPUT_FIELD} pl-10`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="w-40">
            <select
              className={STANDARD_INPUT_FIELD}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as PartnerType | '')}
            >
              <option value="">All Types</option>
              {PARTNER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <select
              className={STANDARD_INPUT_FIELD}
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map((partner) => (
          <PartnerCard
            key={partner.id}
            partner={partner}
            onEdit={handleEditPartner}
            onDelete={handleDeleteClick}
            onToggleActive={handleToggleActive}
            onToggleFeatured={handleToggleFeatured}
          />
        ))}
      </div>

      {/* Empty State */}
      {partners.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Handshake className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filterType || filterActive
              ? 'No partners found'
              : 'No partners yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filterType || filterActive
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first partner'}
          </p>
          {!searchQuery && !filterType && !filterActive && (
            <Button variant="primary" leftIcon={Plus} onClick={handleAddPartner}>
              Add Partner
            </Button>
          )}
        </div>
      )}

      {/* Add Modal */}
      <PartnerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        partner={null}
        onSave={handleSaveNew}
        isLoading={createMutation.isPending}
        mode="add"
      />

      {/* Edit Modal */}
      <PartnerModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedPartner(null)
        }}
        partner={selectedPartner}
        onSave={handleSaveEdit}
        isLoading={updateMutation.isPending}
        mode="edit"
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedPartner(null)
        }}
        partner={selectedPartner}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

export default Partners
