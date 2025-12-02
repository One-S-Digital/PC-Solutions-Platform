/**
 * Foundation Orders Service
 * Provides API calls for the foundation orders and appointments page
 */

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierLogoUrl?: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface ServiceAppointment {
  id: string;
  providerId: string;
  providerName: string;
  providerLogoUrl?: string;
  serviceName: string;
  serviceTitle: string;
  status: string;
  description?: string;
  requestedAt: string;
  scheduledAt?: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type ServiceRequestStatus = 'PENDING' | 'CONFIRMED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// API endpoints
export const FOUNDATION_ORDERS_ENDPOINTS = {
  orders: '/marketplace/orders',
  serviceRequests: '/marketplace/service-requests',
};

/**
 * Hook-compatible service functions
 */
export const foundationOrdersApi = {
  /**
   * Get orders endpoint
   */
  getOrdersEndpoint: () => FOUNDATION_ORDERS_ENDPOINTS.orders,

  /**
   * Get single order endpoint
   */
  getOrderEndpoint: (orderId: string) => `${FOUNDATION_ORDERS_ENDPOINTS.orders}/${orderId}`,

  /**
   * Update order status - returns config for PATCH request
   */
  updateOrderStatusConfig: (orderId: string, status: OrderStatus) => ({
    endpoint: `${FOUNDATION_ORDERS_ENDPOINTS.orders}/${orderId}/status`,
    method: 'PATCH' as const,
    body: JSON.stringify({ status }),
  }),

  /**
   * Get service requests/appointments endpoint
   */
  getServiceRequestsEndpoint: () => FOUNDATION_ORDERS_ENDPOINTS.serviceRequests,

  /**
   * Update service request status - returns config for PATCH request
   */
  updateServiceRequestStatusConfig: (requestId: string, status: ServiceRequestStatus) => ({
    endpoint: `${FOUNDATION_ORDERS_ENDPOINTS.serviceRequests}/${requestId}/status`,
    method: 'PATCH' as const,
    body: JSON.stringify({ status }),
  }),

  /**
   * Create service request - returns config for POST request
   */
  createServiceRequestConfig: (data: {
    serviceId: string;
    description?: string;
    scheduledAt?: string;
  }) => ({
    endpoint: FOUNDATION_ORDERS_ENDPOINTS.serviceRequests,
    method: 'POST' as const,
    body: JSON.stringify(data),
  }),
};

/**
 * Get status display class for orders
 */
export const getOrderStatusClass = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'SHIPPED':
      return 'bg-purple-100 text-purple-800';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get status display class for service requests
 */
export const getServiceStatusClass = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
    case 'SCHEDULED':
      return 'bg-blue-100 text-blue-800';
    case 'IN_PROGRESS':
      return 'bg-purple-100 text-purple-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default foundationOrdersApi;
