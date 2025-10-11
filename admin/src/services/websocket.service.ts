import { io, Socket } from 'socket.io-client';

interface MaintenanceModePayload {
  enabled: boolean;
  message?: string;
  timestamp: string;
}

type EventCallback = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers = new Map<string, EventCallback[]>();

  /**
   * Connect to WebSocket server
   */
  connect(token?: string) {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';

    this.socket = io(`${apiUrl}/platform`, {
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  /**
   * Setup default event handlers
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`WebSocket connection error (attempt ${this.reconnectAttempts}):`, error.message);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Giving up.');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ WebSocket reconnected after ${attemptNumber} attempts`);
    });

    // Listen for maintenance mode changes
    this.socket.on('maintenanceModeChanged', (data: MaintenanceModePayload) => {
      console.log('🔧 Maintenance mode changed:', data);
      this.triggerCallbacks('maintenanceModeChanged', data);
    });

    // Listen for general settings changes
    this.socket.on('settingsChanged', (data: any) => {
      console.log('⚙️ Settings changed:', data);
      this.triggerCallbacks('settingsChanged', data);
    });
  }

  /**
   * Register event handler
   */
  on(event: string, callback: EventCallback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  /**
   * Unregister event handler
   */
  off(event: string, callback: EventCallback) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Trigger registered callbacks for an event
   */
  private triggerCallbacks(event: string, data: any) {
    const callbacks = this.eventHandlers.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('WebSocket disconnected manually');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection status
   */
  getStatus() {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'connecting';
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
