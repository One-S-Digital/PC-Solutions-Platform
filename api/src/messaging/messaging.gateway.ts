import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5174'] : []),
    ],
    credentials: true,
  },
  namespace: '/messaging',
})
@Injectable()
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private connectedClients = new Map<string, { userId: string; conversationIds: Set<string> }>();
  private readonly secretKey: string;
  private readonly issuer: string;
  private readonly authorizedParties: string[];
  private readonly jwtKey?: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Get Clerk secret key
    this.secretKey = this.configService.get<string>('CLERK_SECRET_KEY', '');
    if (!this.secretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }

    // Determine issuer based on Clerk instance (same logic as ClerkAuthGuard)
    const publishableKey = this.configService.get<string>('CLERK_PUBLISHABLE_KEY', '');
    if (publishableKey.includes('test')) {
      const instanceId = publishableKey.split('_')[2]?.split('.')[0];
      this.issuer = `https://${instanceId}.clerk.accounts.dev`;
    } else {
      this.issuer = this.configService.get<string>('CLERK_ISSUER', 'https://clerk.yourdomain.com');
    }

    // Authorized parties
    const adminOrigin = this.configService.get<string>('ADMIN_ORIGIN');
    const appOrigin = this.configService.get<string>('APP_ORIGIN');
    const extraAzp = this.configService.get<string>('AUTHORIZED_PARTIES');
    const azpList = [adminOrigin, appOrigin]
      .filter((v): v is string => !!v && v.trim().length > 0);
    if (extraAzp) {
      azpList.push(
        ...extraAzp
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      );
    }
    this.authorizedParties = azpList;

    // Optional static JWT verification key
    this.jwtKey = this.configService.get<string>('CLERK_JWT_KEY');
  }

  afterInit(server: Server) {
    this.logger.log('Messaging WebSocket Gateway initialized on namespace /messaging');
  }

  /**
   * Extract token from WebSocket handshake
   */
  private extractToken(client: Socket): string | null {
    // Try auth.token first (common for Socket.IO clients)
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    
    // Try Authorization header (Bearer token)
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    
    return null;
  }

  /**
   * Verify Clerk JWT token and extract payload
   */
  private async verifyClerkToken(token: string): Promise<{ sub: string } | null> {
    try {
      const decodeBase64Url = (s: string) => 
        Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      const [rawHeader, rawPayload] = token.split('.');
      let decodedPayload: any = undefined;
      try {
        decodedPayload = JSON.parse(decodeBase64Url(rawPayload));
      } catch {}

      const options: any = {
        secretKey: this.secretKey,
        authorizedParties: this.authorizedParties.length > 0 ? this.authorizedParties : undefined,
        clockSkewInMs: 60_000,
      };
      
      if (decodedPayload?.iss) {
        options.issuer = decodedPayload.iss;
      } else if (this.issuer) {
        options.issuer = this.issuer;
      }
      
      if (this.jwtKey) {
        options.jwtKey = this.jwtKey;
      }

      const payload = await verifyToken(token, options);
      return { sub: payload.sub };
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve Clerk ID to internal User.id
   */
  private async resolveUserId(clerkId: string): Promise<string | null> {
    const appUser = await this.prisma.appUser.findUnique({
      where: { clerkId },
      select: { id: true, clerkId: true },
    });

    if (!appUser) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: appUser.clerkId },
      select: { id: true },
    });

    return user?.id || null;
  }

  async handleConnection(client: Socket) {
    try {
      const socketId = client.id;
      
      // Extract token
      const token = this.extractToken(client);
      
      if (!token) {
        this.logger.warn({
          message: 'WebSocket connection rejected: missing token',
          socketId,
        });
        client.disconnect(true);
        return;
      }

      // Verify token
      const tokenPayload = await this.verifyClerkToken(token);
      
      if (!tokenPayload || !tokenPayload.sub) {
        this.logger.warn({
          message: 'WebSocket connection rejected: invalid token',
          socketId,
        });
        client.disconnect(true);
        return;
      }

      const clerkId = tokenPayload.sub;

      // Resolve to internal User.id
      const userId = await this.resolveUserId(clerkId);
      
      if (!userId) {
        this.logger.warn({
          message: 'WebSocket connection rejected: user not provisioned',
          socketId,
          clerkId,
        });
        client.disconnect(true);
        return;
      }

      // Store on socket for use in message handlers
      client.data.userId = userId;
      client.data.clerkId = clerkId;

      // Store in connected clients map
      this.connectedClients.set(socketId, {
        userId,
        conversationIds: new Set(),
      });
      
      this.logger.log({
        message: 'WS connected',
        nsp: client.nsp.name,
        socketId,
        hasUserId: !!client.data.userId,
      });
    } catch (error) {
      this.logger.error({
        message: 'WebSocket connection error',
        socketId: client.id,
        error: error instanceof Error ? error.message : String(error),
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      // Leave all conversation rooms
      clientData.conversationIds.forEach((conversationId) => {
        client.leave(`conversation:${conversationId}`);
      });
    }
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const clientData = this.connectedClients.get(client.id);
    if (!clientData) {
      client.emit('error', { message: 'Client not found' });
      return;
    }

    // Validate conversationId format
    if (!data.conversationId || typeof data.conversationId !== 'string') {
      client.emit('error', { message: 'Invalid conversationId' });
      return;
    }

    // Verify user is a participant in the conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: data.conversationId,
        participants: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
    });

    if (!conversation) {
      client.emit('error', { message: 'Unauthorized to join conversation' });
      return;
    }

    clientData.conversationIds.add(data.conversationId);
    client.join(`conversation:${data.conversationId}`);
    this.logger.log({
      message: 'Client joined conversation',
      socketId: client.id,
      userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('leave-conversation')
  handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.conversationIds.delete(data.conversationId);
      client.leave(`conversation:${data.conversationId}`);
      this.logger.log(`Client ${client.id} left conversation ${data.conversationId}`);
    }
  }

  @SubscribeMessage('typing-start')
  handleTypingStart(
    @MessageBody() data: { conversationId: string },
    client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    const clientData = this.connectedClients.get(client.id);
    if (!clientData || !clientData.conversationIds.has(data.conversationId)) {
      return;
    }
    
    // Broadcast to all clients in the conversation except the sender
    client.to(`conversation:${data.conversationId}`).emit('user-typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing-stop')
  handleTypingStop(
    @MessageBody() data: { conversationId: string },
    client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    const clientData = this.connectedClients.get(client.id);
    if (!clientData || !clientData.conversationIds.has(data.conversationId)) {
      return;
    }
    
    // Broadcast to all clients in the conversation except the sender
    client.to(`conversation:${data.conversationId}`).emit('user-typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: false,
    });
  }

  /**
   * Broadcast new message to all participants in a conversation
   */
  broadcastNewMessage(conversationId: string, message: any) {
    this.server.to(`conversation:${conversationId}`).emit('new-message', {
      conversationId,
      message,
    });
  }

  /**
   * Broadcast message update to all participants in a conversation
   */
  broadcastMessageUpdate(conversationId: string, message: any) {
    this.server.to(`conversation:${conversationId}`).emit('message-updated', {
      conversationId,
      message,
    });
  }

  /**
   * Broadcast message deletion to all participants in a conversation
   */
  broadcastMessageDelete(conversationId: string, messageId: string) {
    this.server.to(`conversation:${conversationId}`).emit('message-deleted', {
      conversationId,
      messageId,
    });
  }
}

