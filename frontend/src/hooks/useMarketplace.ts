import { useState, useEffect, useCallback } from 'react';
import { marketplaceService } from '../services/marketplace';
import { Product, Service, Order, ServiceRequest, Catalog } from '../services/types';

// Hook for products
export const useProducts = (params?: {
  page?: number;
  limit?: number;
  category?: string;
  supplierId?: string;
  isActive?: boolean;
  search?: string;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await marketplaceService.getProducts(params);
      setProducts(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const createProduct = useCallback(async (data: {
    title: string;
    description?: string;
    price?: number;
    category?: string;
    tags?: string[];
    imageAssetId?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newProduct = await marketplaceService.createProduct(data);
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProduct = useCallback(async (productId: string, data: Partial<Product>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedProduct = await marketplaceService.updateProduct(productId, data);
      setProducts(prev => prev.map(product => product.id === productId ? updatedProduct : product));
      return updatedProduct;
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      await marketplaceService.deleteProduct(productId);
      setProducts(prev => prev.filter(product => product.id !== productId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    products,
    loading,
    error,
    pagination,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};

// Hook for services
export const useServices = (params?: {
  page?: number;
  limit?: number;
  category?: string;
  providerId?: string;
  isActive?: boolean;
  search?: string;
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await marketplaceService.getServices(params);
      setServices(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch services');
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const createService = useCallback(async (data: {
    title: string;
    description?: string;
    category: string;
    price?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newService = await marketplaceService.createService(data);
      setServices(prev => [newService, ...prev]);
      return newService;
    } catch (err: any) {
      setError(err.message || 'Failed to create service');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateService = useCallback(async (serviceId: string, data: Partial<Service>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedService = await marketplaceService.updateService(serviceId, data);
      setServices(prev => prev.map(service => service.id === serviceId ? updatedService : service));
      return updatedService;
    } catch (err: any) {
      setError(err.message || 'Failed to update service');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteService = useCallback(async (serviceId: string) => {
    setLoading(true);
    setError(null);

    try {
      await marketplaceService.deleteService(serviceId);
      setServices(prev => prev.filter(service => service.id !== serviceId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete service');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    services,
    loading,
    error,
    pagination,
    fetchServices,
    createService,
    updateService,
    deleteService,
  };
};

// Hook for orders
export const useOrders = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  supplierId?: string;
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await marketplaceService.getOrders(params);
      setOrders(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = useCallback(async (data: {
    items: {
      productId: string;
      quantity: number;
      price: number;
    }[];
    notes?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newOrder = await marketplaceService.createOrder(data);
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedOrder = await marketplaceService.updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(order => order.id === orderId ? updatedOrder : order));
      return updatedOrder;
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    orders,
    loading,
    error,
    pagination,
    fetchOrders,
    createOrder,
    updateOrderStatus,
  };
};

// Hook for service requests
export const useServiceRequests = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  serviceId?: string;
}) => {
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchServiceRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await marketplaceService.getServiceRequests(params);
      setServiceRequests(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch service requests');
      console.error('Error fetching service requests:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchServiceRequests();
  }, [fetchServiceRequests]);

  const createServiceRequest = useCallback(async (data: {
    serviceId: string;
    description?: string;
    scheduledAt?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newRequest = await marketplaceService.createServiceRequest(data);
      setServiceRequests(prev => [newRequest, ...prev]);
      return newRequest;
    } catch (err: any) {
      setError(err.message || 'Failed to create service request');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateServiceRequestStatus = useCallback(async (requestId: string, status: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedRequest = await marketplaceService.updateServiceRequestStatus(requestId, status);
      setServiceRequests(prev => prev.map(request => request.id === requestId ? updatedRequest : request));
      return updatedRequest;
    } catch (err: any) {
      setError(err.message || 'Failed to update service request status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    serviceRequests,
    loading,
    error,
    pagination,
    fetchServiceRequests,
    createServiceRequest,
    updateServiceRequestStatus,
  };
};

// Hook for catalogs
export const useCatalogs = (params?: {
  page?: number;
  limit?: number;
  supplierId?: string;
  isActive?: boolean;
  search?: string;
}) => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchCatalogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await marketplaceService.getCatalogs(params);
      setCatalogs(response.data);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch catalogs');
      console.error('Error fetching catalogs:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const createCatalog = useCallback(async (data: {
    title: string;
    description?: string;
    pdfAssetId?: string;
    csvAssetId?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const newCatalog = await marketplaceService.createCatalog(data);
      setCatalogs(prev => [newCatalog, ...prev]);
      return newCatalog;
    } catch (err: any) {
      setError(err.message || 'Failed to create catalog');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCatalog = useCallback(async (catalogId: string, data: Partial<Catalog>) => {
    setLoading(true);
    setError(null);

    try {
      const updatedCatalog = await marketplaceService.updateCatalog(catalogId, data);
      setCatalogs(prev => prev.map(catalog => catalog.id === catalogId ? updatedCatalog : catalog));
      return updatedCatalog;
    } catch (err: any) {
      setError(err.message || 'Failed to update catalog');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCatalog = useCallback(async (catalogId: string) => {
    setLoading(true);
    setError(null);

    try {
      await marketplaceService.deleteCatalog(catalogId);
      setCatalogs(prev => prev.filter(catalog => catalog.id !== catalogId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete catalog');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    catalogs,
    loading,
    error,
    pagination,
    fetchCatalogs,
    createCatalog,
    updateCatalog,
    deleteCatalog,
  };
};

// Hook for marketplace statistics
export const useMarketplaceStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await marketplaceService.getMarketplaceStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch marketplace statistics');
      console.error('Error fetching marketplace stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats,
  };
};

// Hook for search functionality
export const useMarketplaceSearch = () => {
  const [searchResults, setSearchResults] = useState<{
    products: Product[];
    services: Service[];
  }>({ products: [], services: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, filters?: {
    category?: string;
    supplierId?: string;
    providerId?: string;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    if (!query.trim()) {
      setSearchResults({ products: [], services: [] });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [products, services] = await Promise.all([
        marketplaceService.searchProducts(query, {
          category: filters?.category,
          supplierId: filters?.supplierId,
          minPrice: filters?.minPrice,
          maxPrice: filters?.maxPrice,
        }),
        marketplaceService.searchServices(query, {
          category: filters?.category,
          providerId: filters?.providerId,
          minPrice: filters?.minPrice,
          maxPrice: filters?.maxPrice,
        }),
      ]);

      setSearchResults({ products, services });
    } catch (err: any) {
      setError(err.message || 'Search failed');
      console.error('Error searching marketplace:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults({ products: [], services: [] });
    setError(null);
  }, []);

  return {
    searchResults,
    loading,
    error,
    search,
    clearSearch,
  };
};

export default useProducts;