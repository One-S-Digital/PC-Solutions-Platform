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
      'http://localhost:5174', // Vite dev server
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
      // Get user ID from auth token
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      // TODO: Validate JWT token and extract userId
      // For now, use client ID as userId (should be replaced with actual auth)
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
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-conversation')
  handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    client: Socket,
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.conversationIds.add(data.conversationId);
      client.join(`conversation:${data.conversationId}`);
      this.logger.log(`Client ${client.id} joined conversation ${data.conversationId}`);
    }
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
    @MessageBody() data: { conversationId: string; userId: string; userName: string },
    client: Socket,
  ) {
    // Broadcast to all clients in the conversation except the sender
    client.to(`conversation:${data.conversationId}`).emit('user-typing', {
      conversationId: data.conversationId,
      userId: data.userId,
      userName: data.userName,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing-stop')
  handleTypingStop(
    @MessageBody() data: { conversationId: string; userId: string },
    client: Socket,
  ) {
    // Broadcast to all clients in the conversation except the sender
    client.to(`conversation:${data.conversationId}`).emit('user-typing', {
      conversationId: data.conversationId,
      userId: data.userId,
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

