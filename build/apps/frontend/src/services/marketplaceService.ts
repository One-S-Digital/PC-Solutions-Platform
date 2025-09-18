import { useState, useEffect } from 'react';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  supplier: {
    id: string;
    name: string;
    avatar?: string;
  };
  specifications: {
    [key: string]: string;
  };
  availability: 'in_stock' | 'out_of_stock' | 'limited';
  minimumOrderQuantity: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  hourlyRate: number;
  dailyRate: number;
  currency: string;
  category: string;
  provider: {
    id: string;
    name: string;
    avatar?: string;
  };
  serviceAreas: string[];
  availability: {
    monday: { available: boolean; startTime: string; endTime: string };
    tuesday: { available: boolean; startTime: string; endTime: string };
    wednesday: { available: boolean; startTime: string; endTime: string };
    thursday: { available: boolean; startTime: string; endTime: string };
    friday: { available: boolean; startTime: string; endTime: string };
    saturday: { available: boolean; startTime: string; endTime: string };
    sunday: { available: boolean; startTime: string; endTime: string };
  };
  requirements: string[];
  certifications: string[];
  experience: number;
  languages: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  type: 'product' | 'service';
  item: Product | Service;
  quantity: number;
  addedAt: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  customer: {
    id: string;
    name: string;
    email: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    canton: string;
    postalCode: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  service: Service;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  duration: number; // hours
  totalCost: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

class MarketplaceService {
  private baseUrl = (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_URL) || 'http://localhost:3001/api';

  // Product Management
  async getProducts(filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    availability?: string;
  }): Promise<Product[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.availability) params.append('availability', filters.availability);

      const response = await fetch(`${this.baseUrl}/marketplace/products?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching products:', error);
      // Return mock data for development
      return [
        {
          id: '1',
          name: 'Educational Toys Set',
          description: 'High-quality educational toys for children aged 3-6',
          price: 89.99,
          currency: 'CHF',
          category: 'toys',
          images: ['https://via.placeholder.com/300x200'],
          supplier: {
            id: 'supplier1',
            name: 'EduToys Ltd',
            avatar: 'https://via.placeholder.com/50x50'
          },
          specifications: {
            'Age Range': '3-6 years',
            'Material': 'Wood',
            'Safety': 'CE Certified'
          },
          availability: 'in_stock',
          minimumOrderQuantity: 1,
          tags: ['educational', 'wooden', 'safe'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
  }

  async getProduct(productId: string): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/products/${productId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        throw new Error(`Failed to create product: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update product: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete product: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Service Management
  async getServices(filters?: {
    category?: string;
    minRate?: number;
    maxRate?: number;
    search?: string;
    location?: string;
  }): Promise<Service[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.minRate) params.append('minRate', filters.minRate.toString());
      if (filters?.maxRate) params.append('maxRate', filters.maxRate.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.location) params.append('location', filters.location);

      const response = await fetch(`${this.baseUrl}/marketplace/services?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching services:', error);
      // Return mock data for development
      return [
        {
          id: '1',
          name: 'Childcare Consulting',
          description: 'Professional childcare consulting services',
          hourlyRate: 75,
          dailyRate: 500,
          currency: 'CHF',
          category: 'consulting',
          provider: {
            id: 'provider1',
            name: 'ChildCare Experts',
            avatar: 'https://via.placeholder.com/50x50'
          },
          serviceAreas: ['Zurich', 'Basel', 'Geneva'],
          availability: {
            monday: { available: true, startTime: '09:00', endTime: '17:00' },
            tuesday: { available: true, startTime: '09:00', endTime: '17:00' },
            wednesday: { available: true, startTime: '09:00', endTime: '17:00' },
            thursday: { available: true, startTime: '09:00', endTime: '17:00' },
            friday: { available: true, startTime: '09:00', endTime: '17:00' },
            saturday: { available: false, startTime: '09:00', endTime: '17:00' },
            sunday: { available: false, startTime: '09:00', endTime: '17:00' }
          },
          requirements: ['Valid license', 'Insurance'],
          certifications: ['Childcare Professional'],
          experience: 5,
          languages: ['German', 'English'],
          tags: ['consulting', 'professional', 'licensed'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
  }

  async getService(serviceId: string): Promise<Service> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/services/${serviceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch service: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching service:', error);
      throw error;
    }
  }

  async createService(service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(service),
      });

      if (!response.ok) {
        throw new Error(`Failed to create service: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  async updateService(serviceId: string, updates: Partial<Service>): Promise<Service> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update service: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }

  async deleteService(serviceId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete service: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  }

  // Cart Management
  async addToCart(item: CartItem): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        throw new Error(`Failed to add to cart: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async getCart(): Promise<CartItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/cart`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cart: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching cart:', error);
      return [];
    }
  }

  async removeFromCart(itemId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/cart/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to remove from cart: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  async updateCartItem(itemId: string, quantity: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/cart/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update cart item: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  // Order Management
  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async getOrders(): Promise<Order[]> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update order status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  // Booking Management
  async createBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify(booking),
      });

      if (!response.ok) {
        throw new Error(`Failed to create booking: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  async getBookings(): Promise<Booking[]> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/bookings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }
  }

  async updateBookingStatus(bookingId: string, status: Booking['status']): Promise<Booking> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update booking status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  private async getAuthToken(): Promise<string> {
    // This would typically get the auth token from Clerk
    return 'placeholder-token';
  }
}

export const marketplaceService = new MarketplaceService();

// React hooks for marketplace functionality
export function useProducts(filters?: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await marketplaceService.getProducts(filters);
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [filters]);

  return {
    products,
    loading,
    error,
    refreshProducts: loadProducts,
  };
}

export function useServices(filters?: any) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await marketplaceService.getServices(filters);
      setServices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [filters]);

  return {
    services,
    loading,
    error,
    refreshServices: loadServices,
  };
}

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await marketplaceService.getCart();
      setCart(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (item: CartItem) => {
    try {
      await marketplaceService.addToCart(item);
      await loadCart();
    } catch (err: any) {
      setError(err.message || 'Failed to add to cart');
      throw err;
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      await marketplaceService.removeFromCart(itemId);
      await loadCart();
    } catch (err: any) {
      setError(err.message || 'Failed to remove from cart');
      throw err;
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    try {
      await marketplaceService.updateCartItem(itemId, quantity);
      await loadCart();
    } catch (err: any) {
      setError(err.message || 'Failed to update cart item');
      throw err;
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  return {
    cart,
    loading,
    error,
    addToCart,
    removeFromCart,
    updateCartItem,
    refreshCart: loadCart,
  };
}
