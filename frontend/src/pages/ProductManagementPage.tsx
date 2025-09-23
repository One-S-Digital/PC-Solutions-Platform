import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, Select, Textarea } from '@repo/ui';
import { useAuthContext } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  ShoppingBagIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  TagIcon,
  PhotoIcon,
  ChartBarIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface Product {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  currency: string;
  category: string;
  subcategory: string;
  tags: string[];
  images: string[];
  thumbnail: string;
  sku: string;
  stock: number;
  minOrderQuantity: number;
  maxOrderQuantity: number;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  specifications: Record<string, string>;
  features: string[];
  benefits: string[];
  status: 'draft' | 'published' | 'archived' | 'out_of_stock';
  visibility: 'public' | 'private' | 'foundation_only';
  createdAt: string;
  updatedAt: string;
  views: number;
  orders: number;
  rating: number;
  reviews: number;
  supplier: {
    id: string;
    name: string;
    logo: string;
    rating: number;
  };
}

interface ProductCategory {
  id: string;
  name: string;
  description: string;
  subcategories: ProductSubcategory[];
  icon: string;
}

interface ProductSubcategory {
  id: string;
  name: string;
  description: string;
}

const ProductManagementPage: React.FC = () => {
  const { user, hasPermission } = useAuthContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const canManageProducts = hasPermission('products.manage');

  useEffect(() => {
    if (canManageProducts) {
      fetchProducts();
      fetchCategories();
    }
  }, [canManageProducts]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory, selectedStatus, selectedVisibility, sortBy]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/marketplace/products', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.data);
      } else {
        throw new Error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      console.log('notification', {
        type: 'error',
        title: 'Error Loading Products',
        message: 'Failed to load products. Please try again.',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/marketplace/categories', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const getAuthToken = async () => {
    return 'mock-token';
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Apply status filter
    if (selectedStatus) {
      filtered = filtered.filter(product => product.status === selectedStatus);
    }

    // Apply visibility filter
    if (selectedVisibility) {
      filtered = filtered.filter(product => product.visibility === selectedVisibility);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'popular':
        filtered.sort((a, b) => b.orders - a.orders);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
    }

    setFilteredProducts(filtered);
  };

  const deleteProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/marketplace/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        console.log('notification', {
          type: 'success',
          title: 'Product Deleted',
          message: 'Product has been deleted successfully.',
          duration: 3000
        });
        fetchProducts(); // Refresh products
      } else {
        throw new Error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      console.log('notification', {
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete product. Please try again.',
        duration: 5000
      });
    }
  };

  const toggleProductStatus = async (productId: string, newStatus: Product['status']) => {
    try {
      const response = await fetch(`/api/marketplace/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        console.log('notification', {
          type: 'success',
          title: 'Product Updated',
          message: `Product status updated to ${newStatus.replace('_', ' ')}.`,
          duration: 3000
        });
        fetchProducts(); // Refresh products
      } else {
        throw new Error('Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      console.log('notification', {
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update product. Please try again.',
        duration: 5000
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'bg-blue-100 text-blue-800';
      case 'private': return 'bg-purple-100 text-purple-800';
      case 'foundation_only': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryOptions = () => {
    return [
      { value: '', label: 'All Categories' },
      ...categories.map(category => ({ value: category.id, label: category.name }))
    ];
  };

  const renderProductCard = (product: Product) => (
    <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img
          src={product.thumbnail || '/api/placeholder/300/200'}
          alt={product.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-4 right-4 flex space-x-2">
          <Badge variant="info" className={getStatusColor(product.status)}>
            {product.status.replace('_', ' ')}
          </Badge>
          <Badge variant="info" className={getVisibilityColor(product.visibility)}>
            {product.visibility.replace('_', ' ')}
          </Badge>
        </div>
        {product.stock === 0 && (
          <div className="absolute top-4 left-4">
            <Badge variant="error">Out of Stock</Badge>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {product.title}
          </h3>
          <div className="flex items-center ml-2">
            <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="text-sm text-gray-600 ml-1">{product.rating.toFixed(1)}</span>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {product.shortDescription}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-4 w-4 mr-1" />
            <span>{product.currency} {product.price.toFixed(2)}</span>
          </div>
          <div className="flex items-center">
            <TagIcon className="h-4 w-4 mr-1" />
            <span>{product.category}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-4 w-4 mr-1" />
            <span>{product.orders} orders</span>
          </div>
          <div className="flex items-center">
            <EyeIcon className="h-4 w-4 mr-1" />
            <span>{product.views} views</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Stock: {product.stock} units
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingProduct(product)}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteProduct(product.id)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderFilters = () => (
    <Card className="p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={getCategoryOptions()}
        />
        <Select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          options={[
            { value: '', label: 'All Status' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'archived', label: 'Archived' },
            { value: 'out_of_stock', label: 'Out of Stock' }
          ]}
        />
        <Select
          value={selectedVisibility}
          onChange={(e) => setSelectedVisibility(e.target.value)}
          options={[
            { value: '', label: 'All Visibility' },
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
            { value: 'foundation_only', label: 'Foundation Only' }
          ]}
        />
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: 'newest', label: 'Newest First' },
            { value: 'oldest', label: 'Oldest First' },
            { value: 'price-high', label: 'Price: High to Low' },
            { value: 'price-low', label: 'Price: Low to High' },
            { value: 'popular', label: 'Most Popular' },
            { value: 'rating', label: 'Highest Rated' }
          ]}
        />
      </div>
    </Card>
  );

  const renderStats = () => {
    const totalProducts = products.length;
    const publishedProducts = products.filter(p => p.status === 'published').length;
    const draftProducts = products.filter(p => p.status === 'draft').length;
    const outOfStockProducts = products.filter(p => p.status === 'out_of_stock').length;
    const totalOrders = products.reduce((sum, p) => sum + p.orders, 0);
    const totalViews = products.reduce((sum, p) => sum + p.views, 0);
    const averageRating = products.reduce((sum, p) => sum + p.rating, 0) / totalProducts || 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 text-center">
          <ShoppingBagIcon className="h-8 w-8 text-swiss-mint mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
          <div className="text-sm text-gray-600">Total Products</div>
        </Card>
        <Card className="p-6 text-center">
          <ChartBarIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{publishedProducts}</div>
          <div className="text-sm text-gray-600">Published</div>
        </Card>
        <Card className="p-6 text-center">
          <CurrencyDollarIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
          <div className="text-sm text-gray-600">Total Orders</div>
        </Card>
        <Card className="p-6 text-center">
          <StarIcon className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Avg Rating</div>
        </Card>
      </div>
    );
  };

  if (!canManageProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBagIcon className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to manage products.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Product Management
              </h1>
              <p className="text-gray-600">
                Manage your product catalog and inventory
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {renderStats()}
        {renderFilters()}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(renderProductCard)}
          </div>
        )}

        {filteredProducts.length === 0 && !isLoading && (
          <Card className="p-12 text-center">
            <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">
              {products.length === 0 
                ? "You haven't created any products yet. Start by adding your first product."
                : "Try adjusting your search criteria to find products."
              }
            </p>
            {products.length === 0 && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Product
              </Button>
            )}
          </Card>
        )}
      </div>

    </div>
  );
};

export default ProductManagementPage;
