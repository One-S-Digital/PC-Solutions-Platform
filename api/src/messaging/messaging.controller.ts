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
  constructor(private readonly messagingService: MessagingService) {}

  // Conversation Management
  @Post('conversations')
  async createConversation(@Body() createConversationDto: CreateConversationDto, @Request() req) {
    // req.context.userId is the Clerk ID
    // Use appUserId if available, otherwise use clerkId (userId)
    const creatorId = req.context.appUserId || req.context.userId;
    return this.messagingService.createConversation(createConversationDto, creatorId);
  }

  @Get('conversations')
  getUserConversations(@Request() req) {
    const userId = req.context.userId;
    return this.messagingService.getUserConversations(userId);
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
}