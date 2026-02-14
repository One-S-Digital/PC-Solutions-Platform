import React, { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { STANDARD_INPUT_FIELD } from '../../constants/design-system'
import LoadingSpinner from '../ui/LoadingSpinner'
import { Product } from '../../types/api'

export interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onSave: (payload: { id: string; data: Partial<Product> }) => Promise<void>
  isLoading: boolean
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
  isLoading,
}) => {
  const { t } = useTranslation(['admin', 'common'])
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState<string>('')
  const [tagsText, setTagsText] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!isOpen || !product) return
    setTitle(product.title ?? '')
    setDescription(product.description ?? '')
    setCategory(product.category ?? '')
    setPrice(product.price !== undefined && product.price !== null ? String(product.price) : '')
    setTagsText(Array.isArray(product.tags) ? product.tags.join(', ') : '')
    setIsActive(product.isActive !== false)
    setError(null)
  }, [isOpen, product])

  const tags = useMemo(() => {
    if (!tagsText.trim()) return []
    return tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  }, [tagsText])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!product?.id) {
      setError(t('admin:products.error.noProduct', 'No product selected'))
      return
    }

    if (!title.trim()) {
      setError(t('admin:products.error.titleRequired', 'Title is required'))
      return
    }

    const parsedPrice =
      price.trim().length === 0 ? undefined : Number.parseFloat(price)
    if (price.trim().length > 0 && !Number.isFinite(parsedPrice)) {
      setError(t('admin:products.error.priceInvalid', 'Price must be a number'))
      return
    }

    const updateData: Partial<Product> = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      tags,
      isActive,
      ...(parsedPrice !== undefined ? { price: parsedPrice } : { price: undefined }),
    }

    try {
      await onSave({ id: product.id, data: updateData })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('admin:products.error.updateFailed', 'Failed to update product'),
      )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('admin:products.editTitle', 'Edit Product')}
            </h2>
            {product?.supplierName && (
              <p className="text-sm text-gray-500 truncate">
                {t('admin:products.owner', 'Owner')}: {product.supplierName}
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

        {!product ? (
          <div className="p-8">
            <div className="flex items-center justify-center gap-3 text-gray-600">
              <LoadingSpinner />
              <span>{t('admin:products.loading', 'Loading product...')}</span>
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
                    {t('admin:products.fields.title', 'Title')}{' '}
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
                    {t('admin:products.fields.description', 'Description')}
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
                    {t('admin:products.fields.category', 'Category')}
                  </label>
                  <input
                    type="text"
                    className={STANDARD_INPUT_FIELD}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:products.fields.price', 'Price (CHF)')}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className={STANDARD_INPUT_FIELD}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={isLoading}
                    min={0}
                    step="0.01"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:products.fields.tags', 'Tags (comma separated)')}
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
                    {t('admin:products.fields.visibility', 'Visibility')}
                  </label>
                  <select
                    className={STANDARD_INPUT_FIELD}
                    value={isActive ? 'active' : 'blocked'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    disabled={isLoading}
                  >
                    <option value="active">{t('admin:products.status.active', 'Active (visible)')}</option>
                    <option value="blocked">{t('admin:products.status.blocked', 'Blocked (hidden)')}</option>
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

export default EditProductModal

