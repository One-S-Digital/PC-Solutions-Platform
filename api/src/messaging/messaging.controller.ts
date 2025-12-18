import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('messaging')
@UseGuards(RolesGuard)
export class MessagingController {
  private readonly logger = new Logger('MessagingController');

  constructor(private readonly messagingService: MessagingService) {}

  // Conversation Management
  @Post('conversations')
  async createConversation(@Body() createConversationDto: CreateConversationDto, @Request() req) {
    // Use userId (Clerk ID) for conversation participants - the service handles Clerk ID lookup
    const creatorId = req.context.userId;
    if (!creatorId) {
      throw new UnauthorizedException('User context not found. Authentication required.');
    }
    return this.messagingService.createConversation(createConversationDto, creatorId);
  }

  @Get('conversations')
  getUserConversations(@Request() req) {
    // Extract request metadata for logging
    const requestId = req.headers['x-request-id'] || req.headers['x-trace-id'] || 'no-request-id';
    const route = req.route?.path || req.url;
    const contextUserId = req.context?.userId;
    const authSub = (req as any).user?.sub;
    const authAzp = (req as any).user?.azp;
    const userRole = req.context?.role;

    // Log request metadata
    this.logger.log({
      message: 'getUserConversations request',
      route,
      contextUserId: contextUserId || 'MISSING',
      authSub: authSub || 'not-set',
      authAzp: authAzp || 'not-set',
      userRole: userRole || 'not-set',
      requestId,
    });

    // Validate userId exists - throw error instead of silently returning empty
    if (!contextUserId) {
      this.logger.error({
        message: 'getUserConversations: req.context.userId is missing',
        route,
        hasContext: !!req.context,
        contextKeys: req.context ? Object.keys(req.context) : [],
        authSub,
        authAzp,
        requestId,
      });
      throw new UnauthorizedException('User context not found. Authentication required.');
    }

    // Use Clerk ID for getUserConversations (service handles lookup)
    return this.messagingService.getUserConversations(contextUserId, requestId);
  }

  @Get('conversations/:id')
  findConversationById(@Param('id') id: string, @Request() req) {
    const userId = req.context.userId;
    return this.messagingService.findConversationById(id, userId);
  }

  // Message Management
  @Post('messages')
  createMessage(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    const senderId = req.context.userId;
    return this.messagingService.createMessage(createMessageDto, senderId);
  }

  @Patch('messages/:id')
  async updateMessage(
    @Param('id') messageId: string,
    @Body('content') content: string,
    @Request() req,
  ) {
    const userId = req.context.userId;
    return await this.messagingService.updateMessage(messageId, content, userId);
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id') messageId: string, @Request() req) {
    const userId = req.context.userId;
    return await this.messagingService.deleteMessage(messageId, userId);
  }

  @Get('conversations/:id/messages')
  getConversationMessages(
    @Request() req,
    @Param('id') conversationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.context.userId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.messagingService.getConversationMessages(conversationId, userId, pageNum, limitNum);
  }

  @Post('conversations/:id/read')
  markMessagesAsRead(@Param('id') conversationId: string, @Request() req) {
    const userId = req.context.userId;
    return this.messagingService.markMessagesAsRead(conversationId, userId);
  }

  @Get('unread-count')
  getUnreadMessageCount(@Request() req) {
    const userId = req.context.userId;
    return this.messagingService.getUnreadMessageCount(userId);
  }

  // Direct Messaging (Legacy support)
  @Post('direct-messages')
  createDirectMessage(
    @Body('receiverId') receiverId: string,
    @Body('content') content: string,
    @Request() req,
  ) {
    const senderId = req.context.userId;
    return this.messagingService.createDirectMessage(senderId, receiverId, content);
  }

  // Group Messaging
  @Post('conversations/:id/participants')
  addParticipantToConversation(
    @Param('id') conversationId: string,
    @Body('userId') userId: string,
    @Request() req,
  ) {
    const addedBy = req.context.userId;
    return this.messagingService.addParticipantToConversation(conversationId, userId, addedBy);
  }

  @Delete('conversations/:id/participants/:userId')
  removeParticipantFromConversation(
    @Param('id') conversationId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    const removedBy = req.context.userId;
    return this.messagingService.removeParticipantFromConversation(conversationId, userId, removedBy);
  }

  // Search
  @Get('search')
  searchMessages(
    @Request() req,
    @Query('q') query: string,
    @Query('conversationId') conversationId?: string,
  ) {
    const userId = req.context.userId;
    return this.messagingService.searchMessages(userId, query, conversationId);
  }

  // Analytics
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getMessagingStats() {
    return this.messagingService.getMessagingStats();
  }

  // Recipients (for user picker)
  @Get('recipients')
  async getRecipients(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const requesterId = req.context?.userId;
    if (!requesterId) {
      throw new UnauthorizedException('User context not found. Authentication required.');
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.messagingService.getRecipients(requesterId, search, pageNum, limitNum);
  }
}