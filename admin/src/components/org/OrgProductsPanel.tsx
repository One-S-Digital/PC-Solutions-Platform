import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Package, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useApiClient, apiService } from '../../services/api';
import Card from '../design-system/Card';
import Button from '../design-system/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import EditProductModal from '../products/EditProductModal';
import { Product } from '../../types/api';
import { STANDARD_INPUT_FIELD } from '../../constants/design-system';

interface OrgProductsPanelProps {
  orgId: string;
}

interface ProductFormState {
  title: string;
  description: string;
  category: string;
  price: string;
  isActive: boolean;
}

const EMPTY_FORM: ProductFormState = { title: '', description: '', category: '', price: '', isActive: true };

const OrgProductsPanel: React.FC<OrgProductsPanelProps> = ({ orgId }) => {
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [addForm, setAddForm] = useState<ProductFormState>(EMPTY_FORM);
  const [addError, setAddError] = useState<string | null>(null);

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-org-products', orgId],
    queryFn: () => apiService.getAdminOrgProducts(apiClient, orgId),
    enabled: !!apiClient && !!orgId,
  });

  const products: any[] = data?.data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-org-products', orgId] });

  const createMutation = useMutation({
    mutationFn: (payload: any) => apiService.createAdminOrgProduct(apiClient, orgId, payload),
    onSuccess: () => { invalidate(); setIsAddFormOpen(false); setAddForm(EMPTY_FORM); toast.success(t('admin:orgProducts.created', 'Product created')); },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('admin:orgProducts.createError', 'Failed to create product')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: any }) =>
      apiService.updateAdminOrgProduct(apiClient, orgId, productId, data),
    onSuccess: () => { invalidate(); setIsEditModalOpen(false); setEditProduct(null); toast.success(t('admin:orgProducts.updated', 'Product updated')); },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('admin:orgProducts.updateError', 'Failed to update product')),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => apiService.deleteAdminOrgProduct(apiClient, orgId, productId),
    onSuccess: () => { invalidate(); setDeleteId(null); toast.success(t('admin:orgProducts.deleted', 'Product deleted')); },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('admin:orgProducts.deleteError', 'Failed to delete product')),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!addForm.title.trim()) { setAddError(t('admin:orgProducts.titleRequired', 'Title is required')); return; }
    const parsedPrice = addForm.price.trim() ? parseFloat(addForm.price) : undefined;
    if (addForm.price.trim() && !isFinite(parsedPrice!)) { setAddError(t('admin:orgProducts.priceInvalid', 'Price must be a number')); return; }
    createMutation.mutate({ title: addForm.title.trim(), description: addForm.description.trim() || undefined, category: addForm.category.trim() || undefined, price: parsedPrice, isActive: addForm.isActive });
  };

  const handleEditSave = async ({ id, data }: { id: string; data: Partial<Product> }) => {
    await updateMutation.mutateAsync({ productId: id, data });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Package className="w-5 h-5 mr-2 text-amber-600" />
          {t('admin:orgProducts.title', 'Products')}
          {products.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({products.length})</span>
          )}
        </h3>
        <Button
          variant="secondary"
          leftIcon={Plus}
          size="sm"
          onClick={() => { setIsAddFormOpen(true); setAddError(null); setAddForm(EMPTY_FORM); }}
        >
          {t('admin:orgProducts.addProduct', 'Add Product')}
        </Button>
      </div>

      {/* Inline create form */}
      {isAddFormOpen && (
        <div className="mb-4 p-4 border border-amber-200 rounded-lg bg-amber-50">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-sm text-gray-800">{t('admin:orgProducts.newProduct', 'New Product')}</p>
            <button type="button" onClick={() => setIsAddFormOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            {addError && <p className="text-red-600 text-sm">{addError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('admin:products.fields.title', 'Title')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.title}
                  onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                  className={STANDARD_INPUT_FIELD}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('admin:products.fields.description', 'Description')}
                </label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className={STANDARD_INPUT_FIELD}
                  disabled={createMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('admin:products.fields.category', 'Category')}
                </label>
                <input
                  type="text"
                  value={addForm.category}
                  onChange={(e) => setAddForm((p) => ({ ...p, category: e.target.value }))}
                  className={STANDARD_INPUT_FIELD}
                  disabled={createMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t('admin:products.fields.price', 'Price (CHF)')}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={addForm.price}
                  onChange={(e) => setAddForm((p) => ({ ...p, price: e.target.value }))}
                  className={STANDARD_INPUT_FIELD}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  id="addProductActive"
                  type="checkbox"
                  checked={addForm.isActive}
                  onChange={(e) => setAddForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 text-swiss-teal border-gray-300 rounded"
                  disabled={createMutation.isPending}
                />
                <label htmlFor="addProductActive" className="text-xs text-gray-700">
                  {t('admin:products.status.active', 'Active (visible)')}
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={createMutation.isPending}
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 inline-flex items-center gap-1"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <LoadingSpinner size="small" />}
                {t('common:create', 'Create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product list */}
      {isLoading ? (
        <div className="flex justify-center py-6"><LoadingSpinner /></div>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          {t('admin:orgProducts.noProducts', 'No products yet. Click "Add Product" to get started.')}
        </p>
      ) : (
        <div className="space-y-2">
          {products.map((product: any) => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900 truncate">{product.title}</p>
                <p className="text-xs text-gray-500">
                  {product.category && <span>{product.category} · </span>}
                  {product.price != null && <span>CHF {product.price} · </span>}
                  <span className={product.isActive !== false ? 'text-green-600' : 'text-red-500'}>
                    {product.isActive !== false ? t('admin:products.status.active', 'Active') : t('admin:products.status.blocked', 'Blocked')}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <button
                  type="button"
                  onClick={() => { setEditProduct(product as Product); setIsEditModalOpen(true); }}
                  className="p-1.5 text-gray-400 hover:text-swiss-teal hover:bg-white rounded"
                  title={t('common:edit', 'Edit')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(product.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded"
                  title={t('common:delete', 'Delete')}
                  disabled={deleteMutation.isPending && deleteId === product.id}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="mt-3 p-3 border border-red-200 rounded-lg bg-red-50 flex items-center justify-between">
          <p className="text-sm text-red-700">{t('admin:orgProducts.deleteConfirm', 'Are you sure you want to delete this product? This cannot be undone.')}</p>
          <div className="flex gap-2 ml-3">
            <button type="button" onClick={() => setDeleteId(null)} className="px-3 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50">
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1"
            >
              {deleteMutation.isPending && <LoadingSpinner size="small" />}
              {t('common:delete', 'Delete')}
            </button>
          </div>
        </div>
      )}

      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditProduct(null); }}
        product={editProduct}
        onSave={handleEditSave}
        isLoading={updateMutation.isPending}
      />
    </Card>
  );
};

export default OrgProductsPanel;
