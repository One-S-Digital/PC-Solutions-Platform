import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
    ],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly secretKey: string;
  // Map userId → Set of socket IDs for multi-tab support
  private userSockets = new Map<string, Set<string>>();
  private socketToUser = new Map<string, string>();

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('CLERK_SECRET_KEY', '');
  }

  async handleConnection(client: Socket) {
    // Require a Clerk session JWT in handshake.auth.token
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.headers?.authorization as string | undefined)?.replace(/^Bearer /, '');

    if (!token) {
      this.logger.warn(`Socket ${client.id} rejected: no token`);
      client.disconnect();
      return;
    }

    let userId: string;
    try {
      const payload = await verifyToken(token, {
        secretKey: this.secretKey,
        clockSkewInMs: 60_000,
      });
      userId = payload.sub;
    } catch {
      this.logger.warn(`Socket ${client.id} rejected: invalid token`);
      client.disconnect();
      return;
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);
    this.socketToUser.set(client.id, userId);

    this.logger.log(`User ${userId} connected (socket ${client.id})`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
      this.socketToUser.delete(client.id);
    }
    this.logger.log(`Socket ${client.id} disconnected`);
  }

  sendToUser(userId: string, event: string, data: unknown) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, data);
    }
  }

  pushNotification(userId: string, notification: unknown) {
    this.sendToUser(userId, 'notification', notification);
  }
}
