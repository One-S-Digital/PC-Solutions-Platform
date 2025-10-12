import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { MessageType } from '@workspace/types';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  // Conversation Management
  async createConversation(createConversationDto: CreateConversationDto, creatorId: string) {
    const { type, title, participantIds } = createConversationDto;

    return this.prisma.conversation.create({
      data: {
        type,
        title,
        participants: {
          create: [
            { userId: creatorId },
            ...participantIds.map(id => ({ userId: id })),
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          include: {
            sender: true,
            receiver: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          include: {
            sender: true,
            receiver: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findConversationById(id: string, userId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        id,
        participants: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          include: {
            sender: true,
            receiver: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  // Message Management
  async createMessage(createMessageDto: CreateMessageDto, senderId: string) {
    const { conversationId, receiverId, content, messageType } = createMessageDto;

    // Update conversation's last message timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        receiverId,
        content,
        messageType,
      },
      include: {
        sender: true,
        receiver: true,
        conversation: {
          include: {
            participants: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }

  async getConversationMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    // Verify user has access to conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId,
            isActive: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const skip = (page - 1) * limit;

    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
  }

  async markMessagesAsRead(conversationId: string, userId: string) {
    // Mark all messages in conversation as read for this user
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    // Update user's last read timestamp for this conversation
    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: { lastReadAt: new Date() },
    });
  }

  async getUnreadMessageCount(userId: string) {
    return this.prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });
  }

  // Direct Messaging (Legacy support)
  async createDirectMessage(senderId: string, receiverId: string, content: string) {
    // Find or create conversation between these two users
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        participants: {
          every: {
            userId: { in: [senderId, receiverId] },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          type: 'DIRECT',
          participants: {
            create: [
              { userId: senderId },
              { userId: receiverId },
            ],
          },
        },
        include: {
          participants: true,
        },
      });
    }

    return this.createMessage({
      conversationId: conversation.id,
      receiverId,
      content,
      messageType: MessageType.TEXT,
    }, senderId);
  }

  // Group Messaging
  async addParticipantToConversation(conversationId: string, userId: string, addedBy: string) {
    // Verify the user adding has access to the conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: addedBy,
            isActive: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return this.prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId,
      },
      include: {
        user: true,
        conversation: true,
      },
    });
  }

  async removeParticipantFromConversation(conversationId: string, userId: string, removedBy: string) {
    // Verify the user removing has access to the conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: removedBy,
            isActive: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: { isActive: false },
    });
  }

  // Search and Filter
  async searchMessages(userId: string, query: string, conversationId?: string) {
    const where: any = {
      content: { contains: query, mode: 'insensitive' },
    };

    if (conversationId) {
      where.conversationId = conversationId;
    } else {
      // Only search in conversations the user has access to
      where.conversation = {
        participants: {
          some: {
            userId,
            isActive: true,
          },
        },
      };
    }

    return this.prisma.message.findMany({
      where,
      include: {
        sender: true,
        receiver: true,
        conversation: {
          include: {
            participants: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Analytics
  async getMessagingStats() {
    const [
      totalConversations,
      totalMessages,
      activeConversations,
      totalUsers,
    ] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.conversation.count({
        where: {
          lastMessageAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      totalConversations,
      totalMessages,
      activeConversations,
      totalUsers,
    };
  }
}