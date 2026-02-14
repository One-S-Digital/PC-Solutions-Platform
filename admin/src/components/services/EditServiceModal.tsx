import React, { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { STANDARD_INPUT_FIELD } from '../../constants/design-system'
import LoadingSpinner from '../ui/LoadingSpinner'
import { Service } from '../../types/api'

export interface EditServiceModalProps {
  isOpen: boolean
  onClose: () => void
  service: Service | null
  onSave: (payload: { id: string; data: Partial<Service> }) => Promise<void>
  isLoading: boolean
}

// Backend expects these exact enum/string values (see api/src/marketplace/dto/create-service.dto.ts)
const API_SERVICE_CATEGORIES = ['CLEANING', 'IT_SUPPORT', 'MAINTENANCE', 'CONSULTING', 'TRAINING', 'OTHER'] as const
type ApiCategory = (typeof API_SERVICE_CATEGORIES)[number]

const API_DELIVERY_TYPES = ['On-site', 'Remote', 'Hybrid'] as const
type ApiDeliveryType = (typeof API_DELIVERY_TYPES)[number]

const CATEGORY_LABELS: Record<string, string> = {
  CLEANING: 'Cleaning',
  IT_SUPPORT: 'IT Support',
  MAINTENANCE: 'Maintenance',
  CONSULTING: 'Consulting',
  TRAINING: 'Training',
  OTHER: 'Other',
}

const normalizeCategory = (value: unknown): ApiCategory => {
  const raw = String(value ?? '').trim()
  if (!raw) return 'OTHER'

  const normalized = raw.toUpperCase().replace(/[\s-]+/g, '_')
  if ((API_SERVICE_CATEGORIES as readonly string[]).includes(normalized)) return normalized as ApiCategory

  // Legacy admin values
  const legacyMap: Record<string, ApiCategory> = {
    CLEANING: 'CLEANING',
    IT_SUPPORT: 'IT_SUPPORT',
    IT: 'IT_SUPPORT',
    IT_SUPPORT_SUPPORT: 'IT_SUPPORT',
    MAINTENANCE: 'MAINTENANCE',
    CONSULTING: 'CONSULTING',
    TRAINING: 'TRAINING',
    STAFF_TRAINING: 'TRAINING',
    WORKSHOPS: 'TRAINING',
    OTHER: 'OTHER',
  }
  return legacyMap[normalized] ?? 'OTHER'
}

const normalizeDeliveryType = (value: unknown): ApiDeliveryType => {
  const raw = String(value ?? '').trim()
  if (!raw) return 'On-site'

  // Backend valid values
  if ((API_DELIVERY_TYPES as readonly string[]).includes(raw)) return raw as ApiDeliveryType

  // Legacy admin enum values
  const norm = raw.toLowerCase().replace(/[\s_]+/g, '-')
  if (norm === 'on-site' || norm === 'onsite') return 'On-site'
  if (norm === 'remote') return 'Remote'
  if (norm === 'hybrid') return 'Hybrid'
  return 'On-site'
}

const EditServiceModal: React.FC<EditServiceModalProps> = ({
  isOpen,
  onClose,
  service,
  onSave,
  isLoading,
}) => {
  const { t } = useTranslation(['admin', 'common'])
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ApiCategory>('OTHER')
  const [priceInfo, setPriceInfo] = useState('')
  const [availability, setAvailability] = useState('')
  const [deliveryType, setDeliveryType] = useState<ApiDeliveryType>('On-site')
  const [tagsText, setTagsText] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!isOpen || !service) return
    setTitle(service.title ?? '')
    setDescription(service.description ?? '')
    setCategory(normalizeCategory(service.category))
    setPriceInfo(service.priceInfo ?? '')
    setAvailability(service.availability ?? '')
    setDeliveryType(normalizeDeliveryType(service.deliveryType))
    setTagsText(Array.isArray(service.tags) ? service.tags.join(', ') : '')
    setIsActive(service.isActive !== false)
    setError(null)
  }, [isOpen, service])

  const tags = useMemo(() => {
    if (!tagsText.trim()) return []
    return tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }, [tagsText])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!service?.id) {
      setError(t('admin:servicesPage.errors.noService', 'No service selected'))
      return
    }

    if (!title.trim()) {
      setError(t('admin:servicesPage.errors.titleRequired', 'Title is required'))
      return
    }

    const updateData: Partial<Service> = {
      title: title.trim(),
      description: description.trim() || undefined,
      // Important: backend expects @workspace/types ServiceCategory values (e.g. CLEANING, IT_SUPPORT)
      category,
      priceInfo: priceInfo.trim() || undefined,
      availability: availability.trim() || undefined,
      // Important: backend expects 'On-site' | 'Remote' | 'Hybrid'
      deliveryType,
      tags,
      isActive,
    }

    try {
      await onSave({ id: service.id, data: updateData })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin:servicesPage.errors.updateFailed', 'Failed to update service'),
      )
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('admin:servicesPage.editTitle', 'Edit Service')}
            </h2>
            {service?.providerName && (
              <p className="text-sm text-gray-500 truncate">
                {t('admin:servicesPage.owner', 'Owner')}: {service.providerName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            disabled={isLoading}
            aria-label={t('common:close', 'Close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!service ? (
          <div className="p-8">
            <div className="flex items-center justify-center gap-3 text-gray-600">
              <LoadingSpinner />
              <span>{t('admin:servicesPage.loading', 'Loading service...')}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:servicesPage.fields.title', 'Title')}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={STANDARD_INPUT_FIELD}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:servicesPage.fields.description', 'Description')}
                  </label>
                  <textarea
                    className={STANDARD_INPUT_FIELD}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:servicesPage.fields.category', 'Category')}
                  </label>
                  <select
                    className={STANDARD_INPUT_FIELD}
                    value={String(category)}
                    onChange={(e) => setCategory(e.target.value as ApiCategory)}
                    disabled={isLoading}
                  >
                    {API_SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {t(`admin:servicesPage.categories.${c}`, CATEGORY_LABELS[c] ?? c)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:servicesPage.fields.deliveryType', 'Delivery type')}
                  </label>
                  <select
                    className={STANDARD_INPUT_FIELD}
                    value={String(deliveryType)}
                    onChange={(e) => setDeliveryType(e.target.value as ApiDeliveryType)}
                    disabled={isLoading}
                  >
                    {API_DELIVERY_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {t(`admin:servicesPage.deliveryTypes.${d}`, d)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:servicesPage.fields.priceInfo', 'Price info')}
                  </label>
                  <input
                    type="text"
                    className={STANDARD_INPUT_FIELD}
                    value={priceInfo}
                    onChange={(e) => setPriceInfo(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:servicesPage.fields.availability', 'Availability')}
                  </label>
                  <input
                    type="text"
                    className={STANDARD_INPUT_FIELD}
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:servicesPage.fields.tags', 'Tags (comma separated)')}
                  </label>
                  <input
                    type="text"
                    className={STANDARD_INPUT_FIELD}
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:servicesPage.fields.visibility', 'Visibility')}
                  </label>
                  <select
                    className={STANDARD_INPUT_FIELD}
                    value={isActive ? 'active' : 'blocked'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    disabled={isLoading}
                  >
                    <option value="active">{t('admin:servicesPage.status.active', 'Active (visible)')}</option>
                    <option value="blocked">{t('admin:servicesPage.status.blocked', 'Blocked (hidden)')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-swiss-teal border border-transparent rounded-md shadow-sm hover:bg-swiss-teal/90 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isLoading && <LoadingSpinner size="small" />}
                {t('common:save', 'Save')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default EditServiceModal

