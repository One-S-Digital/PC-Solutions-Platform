import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export interface UploadedContent {
  id: string
  title: string
  description?: string
  category?: string
  type?: string
  country?: string
  region?: string
  policyType?: string
  status?: string
  filename: string
  publicUrl: string
  updatedAt: string
  fileUrl?: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])

  return debounced
}

export function ContentCard({
  item,
  onEdit,
  onDelete,
  onView,
}: {
  item: UploadedContent
  onEdit: () => void
  onDelete: () => void
  onView: () => void
}) {
  const { t } = useTranslation(['admin', 'common'])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
          {item.status && (
            <span className="shrink-0 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
              {item.status}
            </span>
          )}
        </div>

        {item.description && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>}

        <div className="flex flex-wrap gap-2 mb-3">
          {item.category && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
              {item.category}
            </span>
          )}
          {item.country && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
              {item.country}
              {item.region ? ` • ${item.region}` : ''}
            </span>
          )}
        </div>

        <div className="text-xs text-gray-500 mb-4">
          {t('admin:content.updated', 'Updated')}: {new Date(item.updatedAt).toLocaleDateString()}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onView}
            className="flex-1 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
          >
            {t('admin:content.view', 'View')}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            {t('admin:content.edit', 'Edit')}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
          >
            {t('admin:content.delete', 'Delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const pages = useMemo(() => {
    if (totalPages <= 1) return []

    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, idx) => startPage + idx)
  }, [currentPage, totalPages])

  if (totalPages <= 1) return null

  const startPage = pages[0] ?? 1
  const endPage = pages[pages.length - 1] ?? totalPages

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      {startPage > 1 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(1)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            1
          </button>
          {startPage > 2 && <span className="px-2">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          type="button"
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 border rounded-md ${
            currentPage === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2">...</span>}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  )
}

