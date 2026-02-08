import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
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
  namespace: '/support',
})
@Injectable()
export class SupportGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);
  private connectedClients = new Map<string, { userId: string; ticketIds: Set<string> }>();
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
    this.logger.log('Support WebSocket Gateway initialized on namespace /support');
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
   * Verify Clerk token and extract user info
   */
  private async verifyTokenAndGetUser(token: string): Promise<{ userId: string; role?: string } | null> {
    try {
      // Decode token payload without verifying to read `iss` (Clerk can mint tokens with different issuers
      // depending on instance / environment). This mirrors the logic used in `ClerkAuthGuard`.
      const decodeBase64Url = (s: string) =>
        Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      const [, rawPayload] = token.split('.');
      let decodedPayload: any = undefined;
      try {
        decodedPayload = rawPayload ? JSON.parse(decodeBase64Url(rawPayload)) : undefined;
      } catch {}

      // NOTE: `@clerk/backend`'s VerifyTokenOptions typings vary by version.
      // We keep options flexible to avoid deploy-time type breaks.
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
      const clerkId = (payload as any)?.sub as string | undefined;
      if (!clerkId) {
        this.logger.warn('Token verified but missing sub claim');
        return null;
      }

      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });

      if (!user) {
        this.logger.warn(`User not found for Clerk ID: ${clerkId}`);
        return null;
      }

      // Prefer role from AppUser (source of truth for authorization)
      const appUser = await this.prisma.appUser.findUnique({
        where: { clerkId },
        select: { role: true },
      });

      return {
        userId: user.id,
        role: (appUser?.role as string | undefined) || undefined,
      };
    } catch (error) {
      this.logger.error(`Token verification failed: ${(error as Error).message}`);
      return null;
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const userInfo = await this.verifyTokenAndGetUser(token);
      if (!userInfo) {
        this.logger.warn(`Client ${client.id} failed authentication`);
        client.disconnect();
        return;
      }

      // Store client info
      this.connectedClients.set(client.id, {
        userId: userInfo.userId,
        ticketIds: new Set(),
      });

      // Store user info on socket for easy access
      (client as any).data = {
        userId: userInfo.userId,
        role: userInfo.role,
      };

      this.logger.log(`Client ${client.id} connected (user: ${userInfo.userId})`);
    } catch (error) {
      this.logger.error(`Error handling connection: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Join a ticket room to receive updates
   */
  @SubscribeMessage('join-ticket')
  async handleJoinTicket(client: Socket, data: { ticketId: string }) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const ticketId = data.ticketId;
    if (!ticketId) {
      client.emit('error', { message: 'Ticket ID required' });
      return;
    }

    // Verify user has access to this ticket
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { userId: true, assignedTo: true },
    });

    if (!ticket) {
      client.emit('error', { message: 'Ticket not found' });
      return;
    }

    const userRole = (client as any).data?.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const hasAccess = isAdmin || ticket.userId === clientInfo.userId || ticket.assignedTo === clientInfo.userId;

    if (!hasAccess) {
      client.emit('error', { message: 'Access denied to this ticket' });
      return;
    }

    // Join the ticket room
    await client.join(`ticket:${ticketId}`);
    clientInfo.ticketIds.add(ticketId);
    this.logger.log(`Client ${client.id} joined ticket ${ticketId}`);
  }

  /**
   * Leave a ticket room
   */
  @SubscribeMessage('leave-ticket')
  async handleLeaveTicket(client: Socket, data: { ticketId: string }) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) {
      return;
    }

    const ticketId = data.ticketId;
    if (ticketId) {
      await client.leave(`ticket:${ticketId}`);
      clientInfo.ticketIds.delete(ticketId);
      this.logger.log(`Client ${client.id} left ticket ${ticketId}`);
    }
  }

  /**
   * Emit a new reply event to all clients in the ticket room
   */
  emitReplyCreated(ticketId: string, reply: any) {
    this.server.to(`ticket:${ticketId}`).emit('supportTicket:replyCreated', {
      ticketId,
      reply,
    });
    this.logger.log(`Emitted replyCreated for ticket ${ticketId}`);
  }

  /**
   * Emit a reply deleted event to all clients in the ticket room
   */
  emitReplyDeleted(ticketId: string, replyId: string) {
    this.server.to(`ticket:${ticketId}`).emit('supportTicket:replyDeleted', {
      ticketId,
      replyId,
    });
    this.logger.log(`Emitted replyDeleted for ticket ${ticketId}`);
  }

  /**
   * Emit ticket updated event (for list updates)
   */
  emitTicketUpdated(ticketId: string, ticket: any) {
    this.server.to(`ticket:${ticketId}`).emit('supportTicket:ticketUpdated', {
      ticketId,
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        updatedAt: ticket.updatedAt,
        lastMessage: ticket.responses?.[ticket.responses.length - 1]?.message || ticket.message,
      },
    });
    this.logger.log(`Emitted ticketUpdated for ticket ${ticketId}`);
  }
}

