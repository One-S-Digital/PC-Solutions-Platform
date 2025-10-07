
import React, { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusCircleIcon, PencilSquareIcon, TrashIcon, EyeIcon, EyeSlashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { Product, StockStatus } from '../../types';
import { MOCK_PRODUCTS, ICON_INPUT_FIELD } from '../../constants';

const SupplierProductListingsPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');

  const myProducts = useMemo(() => {
    return products
      .filter(p => p.supplierId === currentUser?.orgId)
      .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, currentUser?.orgId, searchTerm]);
  
  const getStockStatusColor = (status: StockStatus) => {
    switch(status) {
      case 'In Stock': return 'bg-green-100 text-green-700';
      case 'Low Stock': return 'bg-yellow-100 text-yellow-700';
      case 'Out of Stock': return 'bg-red-100 text-red-700';
      case 'On Demand': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleToggleVisibility = (productId: string) => {
    // Mock action
    alert(`Toggling visibility for product ${productId} (TBD)`);
  };
  
  const handleDeleteProduct = (productId: string) => {
     if (window.confirm('Are you sure you want to delete this product?')) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        alert(`Product ${productId} deleted. (Mock action)`);
     }
  };
  
  const handleEditProduct = (product: Product) => {
      alert(`Editing product: ${product.title} (TBD)`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('supplierProductListingsPage.title')}</h1>
        <Button variant="primary" leftIcon={PlusCircleIcon} onClick={() => alert(t('supplierProductListingsPage.addProductAlert'))}>
          {t('supplierProductListingsPage.addProductButton')}
        </Button>
      </div>
      <Card className="p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('supplierProductListingsPage.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${ICON_INPUT_FIELD} w-full`}
          />
        </div>
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierProductListingsPage.table.product')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierProductListingsPage.table.price')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierProductListingsPage.table.stock')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierProductListingsPage.table.visibility')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('supplierProductListingsPage.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {myProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-md object-cover" src={product.imageUrl} alt={product.title} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.title}</div>
                        <div className="text-sm text-gray-500">{product.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">CHF {product.price?.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockStatusColor(product.stockStatus)}`}>
                      {t(`stockStatus.${product.stockStatus.replace(/\s+/g, '').toLowerCase()}`, product.stockStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Mock visibility */}
                    <span className="text-green-600 font-medium">Visible</span> 
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                    <Button variant="ghost" size="xs" onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-700" title="Edit"><PencilSquareIcon className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="xs" onClick={() => handleToggleVisibility(product.id)} title="Toggle Visibility"><EyeIcon className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="xs" onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-700" title="Delete"><TrashIcon className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {myProducts.length === 0 && <p className="text-center text-gray-500 py-8">{t('supplierProductListingsPage.emptyState')}</p>}
        </div>
      </Card>
    </div>
  );
};

export default SupplierProductListingsPage;
