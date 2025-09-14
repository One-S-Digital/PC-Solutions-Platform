import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { marketplaceService, Product, CreateProductData, UpdateProductData } from '../services/marketplaceService';
import { SwissCard, SwissButton, Input, Badge, Status } from '@repo/ui';
import { ProductForm } from '../components/marketplace/ProductForm';
import { useTranslation } from 'react-i18next';

export function ProductManagementPage() {
  const { user } = useUser();
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await marketplaceService.getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (data: CreateProductData) => {
    try {
      await marketplaceService.createProduct(data);
      await loadProducts();
      setShowForm(false);
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleUpdateProduct = async (id: string, data: UpdateProductData) => {
    try {
      await marketplaceService.updateProduct(id, data);
      await loadProducts();
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm(t('marketplace.confirmDelete', 'Are you sure you want to delete this product?'))) {
      try {
        await marketplaceService.deleteProduct(id);
        await loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      await marketplaceService.updateProduct(product.id, {
        isActive: !product.isActive,
      });
      await loadProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price?: number) => {
    if (!price) return t('marketplace.priceOnRequest', 'Price on request');
    return `CHF ${price.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-surface-1">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-default mb-2">
              {t('marketplace.productManagement', 'Product Management')}
            </h1>
            <p className="text-text-secondary">
              {t('marketplace.manageYourProducts', 'Manage your product catalog')}
            </p>
          </div>
          <SwissButton
            variant="primary"
            onClick={() => setShowForm(true)}
          >
            {t('marketplace.addProduct', 'Add Product')}
          </SwissButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SwissCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-default">
                {products.length}
              </div>
              <div className="text-sm text-text-secondary">
                {t('marketplace.totalProducts', 'Total Products')}
              </div>
            </div>
          </SwissCard>
          <SwissCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {products.filter(p => p.isActive).length}
              </div>
              <div className="text-sm text-text-secondary">
                {t('marketplace.activeProducts', 'Active Products')}
              </div>
            </div>
          </SwissCard>
          <SwissCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-danger">
                {products.filter(p => !p.isActive).length}
              </div>
              <div className="text-sm text-text-secondary">
                {t('marketplace.inactiveProducts', 'Inactive Products')}
              </div>
            </div>
          </SwissCard>
          <SwissCard>
            <div className="text-center">
              <div className="text-2xl font-bold text-text-default">
                {new Set(products.map(p => p.category)).size}
              </div>
              <div className="text-sm text-text-secondary">
                {t('marketplace.categories', 'Categories')}
              </div>
            </div>
          </SwissCard>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder={t('marketplace.searchProducts', 'Search products...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Products Table */}
        <SwissCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-text-default">
                    {t('marketplace.product', 'Product')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-default">
                    {t('marketplace.category', 'Category')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-default">
                    {t('marketplace.price', 'Price')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-default">
                    {t('marketplace.status', 'Status')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-default">
                    {t('marketplace.created', 'Created')}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-text-default">
                    {t('marketplace.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-4 px-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-surface-2 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-surface-2 rounded w-1/2"></div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse h-4 bg-surface-2 rounded w-1/3"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse h-4 bg-surface-2 rounded w-1/4"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse h-6 bg-surface-2 rounded w-16"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse h-4 bg-surface-2 rounded w-20"></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="animate-pulse h-8 bg-surface-2 rounded w-20 ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-secondary">
                      {t('marketplace.noProducts', 'No products found')}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(product => (
                    <tr key={product.id} className="border-b border-border hover:bg-surface-2">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-surface-2 rounded-lg overflow-hidden flex-shrink-0">
                            {product.imageAsset ? (
                              <img
                                src={product.imageAsset.publicUrl}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text-secondary">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-text-default">
                              {product.title}
                            </div>
                            <div className="text-sm text-text-secondary line-clamp-1">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {product.category && (
                          <Badge variant="secondary">
                            {product.category}
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-text-default">
                          {formatPrice(product.price)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Status
                          variant={product.isActive ? 'success' : 'danger'}
                        >
                          {product.isActive 
                            ? t('marketplace.active', 'Active')
                            : t('marketplace.inactive', 'Inactive')
                          }
                        </Status>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-text-secondary">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <SwissButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(product)}
                          >
                            {product.isActive ? t('marketplace.deactivate', 'Deactivate') : t('marketplace.activate', 'Activate')}
                          </SwissButton>
                          <SwissButton
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProduct(product)}
                          >
                            {t('marketplace.edit', 'Edit')}
                          </SwissButton>
                          <SwissButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            {t('marketplace.delete', 'Delete')}
                          </SwissButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SwissCard>
      </div>

      {/* Product Form Modal */}
      {(showForm || editingProduct) && (
        <ProductForm
          product={editingProduct}
          onSave={editingProduct 
            ? (data) => handleUpdateProduct(editingProduct.id, data)
            : handleCreateProduct
          }
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}