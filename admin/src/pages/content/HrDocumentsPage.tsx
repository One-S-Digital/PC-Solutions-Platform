import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { DocumentTextIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import ContentUploadModal, { HR_CATEGORIES } from '../../components/ContentUploadModal'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import { useApiClient } from '../../services/api'
import * as api from '../../services/api'
import { retryWithBackoff, RetryPresets } from '../../utils/retryUtility'
import { ContentCard, Pagination, PaginationInfo, UploadedContent, useDebouncedValue } from './ContentShared'

const STATUS_OPTIONS = ['', 'Draft', 'In Review', 'Approved', 'Published', 'Archived', 'Upcoming'] as const

export default function HrDocumentsPage() {
  const { t } = useTranslation(['admin', 'common'])
  const apiClient = useApiClient()

  const [category, setCategory] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const [items, setItems] = useState<UploadedContent[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 12, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContent, setEditingContent] = useState<any>(null)
  const [preview, setPreview] = useState<UploadedContent | null>(null)

  const fetchContent = useCallback(
    async (page = pagination.page) => {
      setIsLoading(true)
      try {
        const currentLang = i18n.language || 'en'
        const res = await api.getHrDocuments(apiClient, {
          page,
          limit: pagination.limit,
          search: debouncedSearch.trim() || undefined,
          category: category || undefined,
          status: status || undefined,
          lang: currentLang,
        })

        if (res.data?.success) {
          const result = res.data as any
          setItems(result.data || [])
          if (result.pagination) setPagination(result.pagination)
          else setPagination((prev) => ({ ...prev, page }))
        } else {
          throw new Error(res.data?.message || 'Failed to fetch HR documents')
        }
      } catch (e: any) {
        toast.error(e?.response?.data?.message || e?.message || 'Failed to fetch HR documents')
      } finally {
        setIsLoading(false)
      }
    },
    [apiClient, pagination.page, pagination.limit, debouncedSearch, category, status],
  )

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    void fetchContent(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, status, i18n.language])

  const onPageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
    void fetchContent(page)
  }

  const openAdd = () => {
    setEditingContent(null)
    setIsModalOpen(true)
  }

  const openEdit = (item: UploadedContent) => {
    setEditingContent(item)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingContent(null)
  }

  const handleSubmit = async (data: any, file?: File, onProgress?: (progress: number) => void) => {
    try {
      let response: any

      if (editingContent) {
        response = await api.updateHrDocument(apiClient, editingContent.id, data)
        toast.success(t('admin:content.updateSuccess', 'Content updated successfully'))
      } else {
        const formData = new FormData()
        if (file) formData.append('file', file)
        Object.keys(data).forEach((key) => {
          const val = data[key]
          if (val === undefined || val === null) return
          formData.append(key, Array.isArray(val) ? JSON.stringify(val) : val)
        })

        const uploadPromise = async () => api.uploadHrDocument(apiClient, formData, onProgress)
        const result = await retryWithBackoff(uploadPromise, {
          ...RetryPresets.upload,
          onRetry: (_err, attempt) => {
            toast.message(t('admin:content.uploadRetry', 'Upload failed. Retrying (attempt {{attempt}})…', { attempt }))
            onProgress?.(0)
          },
        })
        if (!result.success) throw result.error
        response = result.data
        toast.success(t('admin:content.uploadSuccess', 'Content uploaded successfully'))
      }

      if (response) {
        await fetchContent(pagination.page)
        closeModal()
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to submit content')
      throw e
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('admin:content.deleteConfirm', 'Are you sure you want to delete this content?'))) return
    try {
      const res = await api.deleteHrDocument(apiClient, id)
      if (res.data?.success) {
        toast.success(t('admin:content.deleteSuccess', 'Content deleted successfully'))
        await fetchContent(pagination.page)
      } else {
        throw new Error(res.data?.message || 'Failed to delete content')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to delete content')
    }
  }

  const emptyLabel = useMemo(() => {
    if (search.trim()) return t('admin:content.hrDocuments.noResults', 'No results found')
    return t('admin:content.hrDocuments.empty', 'No HR documents yet')
  }, [search, t])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="h-7 w-7 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('admin:content.hrDocuments.title', 'HR Documents')}
              </h2>
              <p className="text-sm text-gray-600">
                {t('admin:content.hrDocuments.total', 'Total')}: {pagination.total}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {t('admin:content.addHRDocument', 'Add HR Document')}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:content.search', 'Search')}
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin:content.hrDocuments.searchPlaceholder', 'Search HR documents...')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:content.category', 'Category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">{t('admin:content.allCategories', 'All categories')}</option>
              {HR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:content.status', 'Status')}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s || '__all'} value={s}>
                  {s ? s : t('admin:content.all', 'All')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          <p className="mt-2 text-sm text-gray-500">{t('admin:content.hrDocuments.loading', 'Loading...')}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">{emptyLabel}</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('admin:content.hrDocuments.addFirst', 'Add your first item')}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item.id)}
                onView={() => {
                  if (!item.fileUrl && !item.publicUrl) {
                    toast.error(t('admin:content.noFileUrl', 'No file URL available for this content'))
                    return
                  }
                  setPreview(item)
                }}
              />
            ))}
          </div>
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={onPageChange} />
        </>
      )}

      <ContentUploadModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        contentType="hr"
        existingContent={editingContent}
      />

      {preview && (
        <DocumentPreviewModal
          isOpen={!!preview}
          onClose={() => setPreview(null)}
          fileUrl={(preview.fileUrl || preview.publicUrl) as string}
          fileName={preview.filename || preview.title}
          fileType={preview.type || 'FILE'}
        />
      )}
    </div>
  )
}

