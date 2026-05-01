import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Menu, Transition } from '@headlessui/react'
import { Building2, Edit, MoreVertical, Package, Search, ShieldOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EditProductModal from '../components/products/EditProductModal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { apiService, useApiClient } from '../services/api'
import logger from '../utils/logger'
import { Product } from '../types/api'

const Products: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isMutating, setIsMutating] = useState(false)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const selectAllRef = useRef<HTMLInputElement | null>(null)

  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiService.getProducts(apiClient),
    enabled: !!apiClient,
  })

  const products: Product[] = productsResponse?.data?.data || []

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return products.filter((product) => {
      const matchesSearch = !q
        ? true
        : [
            product.title,
            product.description,
            product.supplierName,
            product.category,
            ...(product.tags || []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q)
      const matchesCategory = !selectedCategory || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  const totalProducts = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize))
  const showingFrom = totalProducts === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = totalProducts === 0 ? 0 : Math.min(page * pageSize, totalProducts)
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, page, pageSize])

  const allOnPageSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedIds.has(p.id))
  const someOnPageSelected =
    paginatedProducts.some((p) => selectedIds.has(p.id)) && !allOnPageSelected

  useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = someOnPageSelected
  }, [someOnPageSelected])

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [searchQuery, selectedCategory, pageSize])

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  const openEdit = (product: Product) => {
    setSelectedProduct(product)
    setIsEditModalOpen(true)
  }

  const closeEdit = () => {
    setIsEditModalOpen(false)
    setSelectedProduct(null)
  }

  const updateOne = async (id: string, data: Partial<Product>) => {
    await apiService.updateProduct(apiClient, id, data)
  }

  const handleSaveEdit = async ({ id, data }: { id: string; data: Partial<Product> }) => {
    setIsMutating(true)
    try {
      await updateOne(id, data)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      closeEdit()
    } catch (e) {
      logger.error('Failed to update product:', e)
      throw e
    } finally {
      setIsMutating(false)
    }
  }

  const handleDeleteOne = async (product: Product) => {
    const ok = window.confirm(
      t('admin:products.confirmDelete', 'Delete "{{title}}"? This cannot be undone.', {
        title: product.title,
      }),
    )
    if (!ok) return

    setIsMutating(true)
    try {
      await apiService.deleteProduct(apiClient, product.id)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
    } catch (e) {
      logger.error('Failed to delete product:', e)
      window.alert(t('admin:products.deleteFailed', 'Failed to delete product'))
    } finally {
      setIsMutating(false)
    }
  }

  const handleToggleBlockOne = async (product: Product) => {
    setIsMutating(true)
    try {
      await updateOne(product.id, { isActive: product.isActive === false })
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (e) {
      logger.error('Failed to toggle product visibility:', e)
      window.alert(t('admin:products.blockFailed', 'Failed to update product visibility'))
    } finally {
      setIsMutating(false)
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const idsOnPage = paginatedProducts.map((p) => p.id)
      const shouldSelectAll = !idsOnPage.every((id) => next.has(id))
      idsOnPage.forEach((id) => {
        if (shouldSelectAll) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }

  const runBulk = async (label: string, op: (id: string) => Promise<unknown>) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setIsMutating(true)
    try {
      const results = await Promise.allSettled(ids.map((id) => op(id)))
      const okCount = results.filter((r) => r.status === 'fulfilled').length
      const failCount = results.length - okCount
      if (failCount > 0) {
        window.alert(
          t(
            'admin:products.bulkPartial',
            '{{label}} completed: {{ok}} succeeded, {{fail}} failed.',
            { label, ok: okCount, fail: failCount },
          ),
        )
      }
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      setSelectedIds(new Set())
    } finally {
      setIsMutating(false)
    }
  }

  const bulkBlock = () => runBulk(t('admin:products.bulk.block', 'Block'), (id) => updateOne(id, { isActive: false }))
  const bulkUnblock = () => runBulk(t('admin:products.bulk.unblock', 'Unblock'), (id) => updateOne(id, { isActive: true }))
  const bulkDelete = async () => {
    const ok = window.confirm(
      t('admin:products.bulk.confirmDelete', 'Delete {{count}} products? This cannot be undone.', {
        count: selectedIds.size,
      }),
    )
    if (!ok) return
    await runBulk(t('admin:products.bulk.delete', 'Delete'), (id) => apiService.deleteProduct(apiClient, id))
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
        <div className="text-red-500 mb-4">{t('admin:products.error.title', 'Failed to load products')}</div>
        <p className="text-gray-600">{t('admin:products.error.description', 'Please try again later.')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="h-8 w-8 mr-3 text-swiss-teal" />
            {t('dashboard:sidebar.products', 'Products')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('admin:products.subtitle', 'Total: {{count}}', { count: products.length })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin:products.searchPlaceholder', 'Search products...')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="sm:w-56">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">{t('admin:products.categoryFilter.all', 'All categories')}</option>
              {Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as 25 | 50 | 100)}
            >
              <option value={25}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 25</option>
              <option value={50}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 50</option>
              <option value={100}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 100</option>
            </select>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-sm text-gray-700">
              {t('admin:products.bulk.selected', '{{count}} selected', { count: selectedIds.size })}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-white disabled:opacity-50"
                disabled={isMutating}
                onClick={bulkBlock}
              >
                {t('admin:products.bulk.block', 'Block')}
              </button>
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-white disabled:opacity-50"
                disabled={isMutating}
                onClick={bulkUnblock}
              >
                {t('admin:products.bulk.unblock', 'Unblock')}
              </button>
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-md border border-red-200 text-red-700 hover:bg-white disabled:opacity-50"
                disabled={isMutating}
                onClick={bulkDelete}
              >
                {t('admin:products.bulk.delete', 'Delete')}
              </button>
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-white disabled:opacity-50"
                disabled={isMutating}
                onClick={() => setSelectedIds(new Set())}
              >
                {t('admin:products.bulk.clear', 'Clear')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    aria-label={t('admin:products.bulk.selectAll', 'Select all on page')}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:products.table.product', 'Product')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:products.table.owner', 'Owner')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:products.table.category', 'Category')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:products.table.price', 'Price')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:products.table.status', 'Status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common:actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedProducts.map((product) => {
                const active = product.isActive !== false
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelected(product.id)}
                        aria-label={t('admin:products.bulk.selectOne', 'Select product')}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[16rem]">
                        <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{product.title}</div>
                          {product.description && (
                            <div className="text-xs text-gray-500 truncate">{product.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {product.supplierName || t('common:notAvailable', 'N/A')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {product.category || t('common:notAvailable', 'N/A')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {typeof product.price === 'number' ? `CHF ${product.price.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {active ? t('admin:products.status.active', 'Active') : t('admin:products.status.blocked', 'Blocked')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50" disabled={isMutating}>
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
                          <Menu.Items className="absolute right-0 mt-2 w-52 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div className="py-1">
                              <Menu.Item>
                                {({ active: isActiveItem }) => (
                                  <button
                                    type="button"
                                    onClick={() => openEdit(product)}
                                    className={`${isActiveItem ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t('common:buttons.edit', 'Edit')}
                                  </button>
                                )}
                              </Menu.Item>
                              {product.supplierId && (
                                <Menu.Item>
                                  {({ active: isActiveItem }) => (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/organizations/${product.supplierId}/profile`)}
                                      className={`${isActiveItem ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                    >
                                      <Building2 className="h-4 w-4 mr-2" />
                                      {t('admin:products.actions.editSupplierProfile', 'Supplier Profile')}
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                              <Menu.Item>
                                {({ active: isActiveItem }) => (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBlockOne(product)}
                                    className={`${isActiveItem ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
                                  >
                                    <ShieldOff className="h-4 w-4 mr-2" />
                                    {active ? t('admin:products.actions.block', 'Block') : t('admin:products.actions.unblock', 'Unblock')}
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active: isActiveItem }) => (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOne(product)}
                                    className={`${isActiveItem ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('common:buttons.delete', 'Delete')}
                                  </button>
                                )}
                              </Menu.Item>
                            </div>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('admin:products.emptyState.title', 'No products found')}
            </h3>
            <p className="text-gray-600">{t('admin:products.emptyState.description', 'Try adjusting filters.')}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">
        <div className="text-sm text-gray-600 text-center sm:text-left">
          {t('admin:users.pagination.showing', 'Showing {{from}}-{{to}} of {{total}}', {
            from: showingFrom,
            to: showingTo,
            total: totalProducts,
          })}
        </div>
        <div className="flex items-center justify-center gap-2">
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
        <div className="hidden sm:block" />
      </div>

      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={closeEdit}
        product={selectedProduct}
        onSave={handleSaveEdit}
        isLoading={isMutating}
      />
    </div>
  )
}

export default Products
