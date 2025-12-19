import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
    ],
    credentials: true,
  },
  namespace: '/platform',
})
export class MaintenanceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MaintenanceGateway.name);
  private connectedClients = new Map<string, Socket>();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // For now, allow all connections
      // In production, validate JWT from client.handshake.auth.token
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      // TODO: Add JWT validation here when Clerk auth is configured
      // const user = await this.validateToken(token);
      
      this.connectedClients.set(client.id, client);
      this.logger.log(`Client connected: ${client.id} (Total: ${this.connectedClients.size})`);
    } catch (error) {
      this.logger.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  /**
   * Broadcast maintenance mode changes to all connected clients
   */
  @OnEvent('platform.maintenance.changed')
  broadcastMaintenanceUpdate(payload: {
    enabled: boolean;
    message?: string;
    timestamp: string;
  }) {
    this.logger.log(`Broadcasting maintenance mode update: ${payload.enabled}`);
    this.server.emit('maintenanceModeChanged', payload);
  }

  /**
   * Broadcast general platform settings changes
   */
  @OnEvent('platform.settings.changed')
  broadcastSettingsUpdate(settings: any) {
    this.logger.log('Broadcasting platform settings update');
    this.server.emit('settingsChanged', {
      revision: settings.revision,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get number of active connections
   */
  getConnectionCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, event: string, data: any) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.emit(event, data);
    }
  }

  /**
   * Send message to all clients except one
   */
  broadcastExcept(excludeClientId: string, event: string, data: any) {
    this.connectedClients.forEach((client, id) => {
      if (id !== excludeClientId) {
        client.emit(event, data);
      }
    });
  }
}
