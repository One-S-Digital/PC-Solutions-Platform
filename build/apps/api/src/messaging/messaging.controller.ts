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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@repo/types';

@Controller('messaging')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // Conversation Management
  @Post('conversations')
  createConversation(@Body() createConversationDto: CreateConversationDto, @Request() req) {
    const creatorId = req.user.id;
    return this.messagingService.createConversation(createConversationDto, creatorId);
  }

  @Get('conversations')
  getUserConversations(@Request() req) {
    const userId = req.user.id;
    return this.messagingService.getUserConversations(userId);
  }

  @Get('conversations/:id')
  findConversationById(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.messagingService.findConversationById(id, userId);
  }

  // Message Management
  @Post('messages')
  createMessage(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    const senderId = req.user.id;
    return this.messagingService.createMessage(createMessageDto, senderId);
  }

  @Get('conversations/:id/messages')
  getConversationMessages(
    @Request() req,
    @Param('id') conversationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.messagingService.getConversationMessages(conversationId, userId, pageNum, limitNum);
  }

  @Post('conversations/:id/read')
  markMessagesAsRead(@Param('id') conversationId: string, @Request() req) {
    const userId = req.user.id;
    return this.messagingService.markMessagesAsRead(conversationId, userId);
  }

  @Get('unread-count')
  getUnreadMessageCount(@Request() req) {
    const userId = req.user.id;
    return this.messagingService.getUnreadMessageCount(userId);
  }

  // Direct Messaging (Legacy support)
  @Post('direct-messages')
  createDirectMessage(
    @Body('receiverId') receiverId: string,
    @Body('content') content: string,
    @Request() req,
  ) {
    const senderId = req.user.id;
    return this.messagingService.createDirectMessage(senderId, receiverId, content);
  }

  // Group Messaging
  @Post('conversations/:id/participants')
  addParticipantToConversation(
    @Param('id') conversationId: string,
    @Body('userId') userId: string,
    @Request() req,
  ) {
    const addedBy = req.user.id;
    return this.messagingService.addParticipantToConversation(conversationId, userId, addedBy);
  }

  @Delete('conversations/:id/participants/:userId')
  removeParticipantFromConversation(
    @Param('id') conversationId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    const removedBy = req.user.id;
    return this.messagingService.removeParticipantFromConversation(conversationId, userId, removedBy);
  }

  // Search
  @Get('search')
  searchMessages(
    @Request() req,
    @Query('q') query: string,
    @Query('conversationId') conversationId?: string,
  ) {
    const userId = req.user.id;
    return this.messagingService.searchMessages(userId, query, conversationId);
  }

  // Analytics
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getMessagingStats() {
    return this.messagingService.getMessagingStats();
  }
}