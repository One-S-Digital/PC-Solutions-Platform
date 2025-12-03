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
import { Logger } from '@nestjs/common';

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
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private connectedClients = new Map<string, { userId: string; conversationIds: Set<string> }>();

  afterInit(server: Server) {
    this.logger.log('Messaging WebSocket Gateway initialized on namespace /messaging');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      // TODO: CRITICAL - Implement JWT authentication before production
      // Required implementation:
      // 1. Inject JwtService or ClerkService
      // 2. Validate the token
      // 3. Extract authenticated userId from token payload
      // 4. Reject connections with invalid/missing tokens
      //
      // Example:
      // if (!token) {
      //   this.logger.warn(`Connection rejected: missing token`);
      //   client.disconnect();
      //   return;
      // }
      // const payload = await this.jwtService.verifyAsync(token);
      // const userId = payload.sub || payload.userId;
      // if (!userId) {
      //   this.logger.warn(`Connection rejected: invalid token`);
      //   client.disconnect();
      //   return;
      // }
      
      // TEMPORARY: Using query userId (INSECURE - allows impersonation)
      const userId = client.handshake.query?.userId as string || client.id;
      
      this.connectedClients.set(client.id, {
        userId,
        conversationIds: new Set(),
      });
      
      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error('WebSocket connection error:', error);
      client.disconnect();
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

    // TODO: CRITICAL - Add authorization check before production
    // Required implementation:
    // 1. Inject ConversationService or PrismaService
    // 2. Verify user is a participant in the conversation
    // 3. Reject if not authorized
    //
    // Example:
    // const isParticipant = await this.conversationService.isUserParticipant(
    //   data.conversationId,
    //   clientData.userId
    // );
    // if (!isParticipant) {
    //   client.emit('error', { message: 'Unauthorized to join conversation' });
    //   return;
    // }

    clientData.conversationIds.add(data.conversationId);
    client.join(`conversation:${data.conversationId}`);
    this.logger.log(`Client ${client.id} joined conversation ${data.conversationId}`);
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
    const clientData = this.connectedClients.get(client.id);
    if (!clientData || !clientData.conversationIds.has(data.conversationId)) {
      return;
    }
    
    // Broadcast to all clients in the conversation except the sender
    client.to(`conversation:${data.conversationId}`).emit('user-typing', {
      conversationId: data.conversationId,
      userId: clientData.userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing-stop')
  handleTypingStop(
    @MessageBody() data: { conversationId: string },
    client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData || !clientData.conversationIds.has(data.conversationId)) {
      return;
    }
    
    // Broadcast to all clients in the conversation except the sender
    client.to(`conversation:${data.conversationId}`).emit('user-typing', {
      conversationId: data.conversationId,
      userId: clientData.userId,
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

