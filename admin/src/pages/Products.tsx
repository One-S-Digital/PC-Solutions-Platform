import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Package, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  MoreVertical,
  DollarSign,
  Tag,
  Star
} from 'lucide-react'
import { useApiClient, apiService } from '../services/api'
import logger from '../utils/logger'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import EditProductModal from '../components/products/EditProductModal'
import { Product } from '../types/api'


const Products: React.FC = () => {
  const { t } = useTranslation(['admin', 'common'])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const apiClient = useApiClient()
  const queryClient = useQueryClient()

  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiService.getProducts(apiClient),
  })

  const products: Product[] = productsResponse?.data?.data || []

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedCategory, pageSize])

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])


  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      await apiService.updateProduct(apiClient, updatedProduct.id, updatedProduct)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsEditModalOpen(false)
    } catch (error) {
      logger.error('Failed to update product:', error)
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
        <div className="text-red-500 mb-4">{t('admin:products.error.title')}</div>
        <p className="text-gray-600">{t('admin:products.error.description')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="h-8 w-8 mr-3 text-swiss-teal" />
            {t('admin:products.title')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('admin:products.subtitle', { count: products.length })}
          </p>
        </div>
        <button className="bg-swiss-mint hover:bg-swiss-teal text-white px-4 py-2 rounded-lg flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          {t('admin:products.addButton')}
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
                placeholder={t('admin:products.searchPlaceholder')}
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
              <option value="">{t('admin:products.categoryFilter.all')}</option>
              <option value="Educational">{t('common:educational')}</option>
              <option value="Safety">{t('common:safety')}</option>
              <option value="Nutrition">{t('common:nutrition')}</option>
              <option value="Hygiene">{t('common:hygiene')}</option>
              <option value="Furniture">{t('common:furniture')}</option>
            </select>
          </div>
          <div className="sm:w-48">
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swiss-mint focus:border-transparent"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as 25 | 50 | 100)}
            >
              <option value={25}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 25</option>
              <option value={50}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 50</option>
              <option value={100}>{t('admin:users.pagination.rowsPerPage', 'Rows per page')}: 100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="aspect-w-16 aspect-h-9">
              <img 
                src={product.imageUrl || '/api/placeholder/400/240'} 
                alt={product.name}
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.category}</p>
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
                              {t('admin:products.actions.edit')}
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-600`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('admin:products.actions.delete')}
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{product.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-lg font-semibold text-gray-900">{product.price}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600">{product.rating || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:products.emptyState.title')}</h3>
          <p className="text-gray-600">{t('admin:products.emptyState.description')}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-gray-600">
          {t(
            'admin:users.pagination.showing',
            'Showing {{from}}-{{to}} of {{total}}',
            { from: showingFrom, to: showingTo, total: totalProducts },
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
    </div>
  )
}

export default Products
