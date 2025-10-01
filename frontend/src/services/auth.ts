import { apiClient } from './api';

// Auth types
export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
  workExperience?: string;
  education?: string;
  certifications?: string[];
  skills?: string[];
  availability?: string;
  cvUrl?: string;
  stripeCustomerId?: string;
  lastActiveAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  EDUCATOR = 'EDUCATOR',
  PARENT = 'PARENT',
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface SignupData {
  organisationName: string;
  contactPerson: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  canton: string;
  languagesSpoken: string[];
  capacity?: number;
  category?: string;
  serviceType?: string;
  childAge?: number;
  childStartDate: string;
  termsAccepted: boolean;
}

// Auth service class
class AuthService {
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  private listeners: ((state: AuthState) => void)[] = [];

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    this.setLoading(true);
    try {
      // TODO: Initialize Clerk auth here
      // For now, check if we have a stored token
      const token = this.getStoredToken();
      if (token) {
        await this.validateToken(token);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.clearAuth();
    } finally {
      this.setLoading(false);
    }
  }

  private getStoredToken(): string | null {
    // TODO: Get token from Clerk
    return localStorage.getItem('auth_token');
  }

  private setStoredToken(token: string) {
    // TODO: Store token via Clerk
    localStorage.setItem('auth_token', token);
  }

  private clearStoredToken() {
    // TODO: Clear token via Clerk
    localStorage.removeItem('auth_token');
  }

  private async validateToken(token: string): Promise<void> {
    try {
      apiClient.updateAuthToken(token);
      const user = await apiClient.get<User>('/users/me');
      this.setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Token validation failed:', error);
      this.clearAuth();
      throw error;
    }
  }


  private setLoading(isLoading: boolean) {
    this.setAuthState({ isLoading });
  }

  private setError(error: string | null) {
    this.setAuthState({ error });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Public methods
  async login(credentials: LoginCredentials): Promise<{ success: boolean; message?: string }> {
    this.setLoading(true);
    this.setError(null);

    try {
      // TODO: Implement Clerk login
      // For now, simulate login with mock data
      const response = await apiClient.post<{ user: User; token: string }>('/auth/login', credentials);
      
      this.setStoredToken(response.token);
      apiClient.updateAuthToken(response.token);
      
      this.setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error: any) {
      const message = error.message || 'Login failed';
      this.setError(message);
      this.setLoading(false);
      return { success: false, message };
    }
  }

  async signup(data: SignupData): Promise<{ success: boolean; message?: string; redirectTo?: string }> {
    this.setLoading(true);
    this.setError(null);

    try {
      // TODO: Implement Clerk signup
      const response = await apiClient.post<{ user: User; token: string; redirectTo?: string }>('/auth/signup', data);
      
      this.setStoredToken(response.token);
      apiClient.updateAuthToken(response.token);
      
      this.setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { 
        success: true, 
        redirectTo: response.redirectTo 
      };
    } catch (error: any) {
      const message = error.message || 'Signup failed';
      this.setError(message);
      this.setLoading(false);
      return { success: false, message };
    }
  }

  async logout(): Promise<void> {
    try {
      // TODO: Implement Clerk logout
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  private clearAuth() {
    this.clearStoredToken();
    apiClient.updateAuthToken(null);
    this.setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }

  async refreshToken(): Promise<boolean> {
    try {
      // TODO: Implement token refresh with Clerk
      const response = await apiClient.post<{ token: string }>('/auth/refresh');
      this.setStoredToken(response.token);
      apiClient.updateAuthToken(response.token);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuth();
      return false;
    }
  }

  // State management
  getAuthState(): AuthState {
    return this.authState;
  }

  setAuthState(newState: Partial<AuthState>) {
    this.authState = { ...this.authState, ...newState };
    this.notifyListeners();
  }

  updateAuthToken(token: string | null) {
    if (token) {
      this.setStoredToken(token);
      apiClient.updateAuthToken(token);
    } else {
      this.clearStoredToken();
      apiClient.updateAuthToken(null);
    }
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Utility methods
  hasRole(role: UserRole): boolean {
    return this.authState.user?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return this.authState.user ? roles.includes(this.authState.user.role) : false;
  }

  isAdmin(): boolean {
    return this.hasAnyRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  }

  isFoundation(): boolean {
    return this.hasRole(UserRole.FOUNDATION);
  }

  isEducator(): boolean {
    return this.hasRole(UserRole.EDUCATOR);
  }

  isParent(): boolean {
    return this.hasRole(UserRole.PARENT);
  }

  isSupplier(): boolean {
    return this.hasRole(UserRole.PRODUCT_SUPPLIER);
  }

  isServiceProvider(): boolean {
    return this.hasRole(UserRole.SERVICE_PROVIDER);
  }
}

// Create singleton instance
export const authService = new AuthService();

// Export types and service
export { AuthService };
export default authService;