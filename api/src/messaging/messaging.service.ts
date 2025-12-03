import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { MessageType } from '@workspace/types';
import { MessagingGateway } from './messaging.gateway';
import { UserRole } from '@prisma/client';

@Injectable()
export class MessagingService {
  /**
   * Extract storage key from a full URL or return the key if it's already a key
   * Handles URLs like: https://assets.procrechesolutions.com/messages/... or /api/upload/download/...
   * Returns the storage key portion
   */
  private extractStorageKey(fileUrl: string | undefined): string | undefined {
    if (!fileUrl) return undefined;
    
    // If it's already a relative download URL, extract the key
    if (fileUrl.startsWith('/api/upload/download/')) {
      return fileUrl.replace('/api/upload/download/', '');
    }
    
    // If it's a full URL, extract the path after the domain
    try {
      const url = new URL(fileUrl);
      // Remove leading slash and return the path
      return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    } catch {
      // If it's not a valid URL, assume it's already a storage key
      return fileUrl;
    }
  }

  /**
   * Convert storage key to secure download URL
   * This ensures files are accessed through the authenticated download endpoint
   */
  private toSecureDownloadUrl(storageKey: string | undefined): string | undefined {
    if (!storageKey) return undefined;
    return `/api/upload/download/${storageKey}`;
  }

  /**
   * Transform message to convert storage keys to secure download URLs
   * This ensures file URLs are always secure and go through authentication
   */
  private transformMessageForResponse(message: any): any {
    if (!message) return message;
    
    // Convert storage key to secure download URL if fileUrl exists
    if (message.fileUrl && !message.fileUrl.startsWith('/api/upload/download/')) {
      // First extract the storage key from any URL format (full URL, relative URL, or already a key)
      const storageKey = this.extractStorageKey(message.fileUrl);
      // Then convert the storage key to a secure download URL
      const secureUrl = this.toSecureDownloadUrl(storageKey);
      return {
        ...message,
        fileUrl: secureUrl,
      };
    }
    
    return message;
  }

  /**
   * Transform array of messages to convert storage keys to secure download URLs
   */
  private transformMessagesForResponse(messages: any[]): any[] {
    if (!Array.isArray(messages)) return messages;
    return messages.map(msg => this.transformMessageForResponse(msg));
  }
  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(MessagingGateway) private messagingGateway?: MessagingGateway,
  ) {}

  /**
   * Resolve rawUserId (Clerk ID or AppUser ID) to User.id
   * @returns User.id or null if not found
   */
  private async resolveUserId(rawUserId: string): Promise<string | null> {
    let userClerkId: string;
    let userAppUser;

    if (rawUserId.startsWith('user_')) {
      userAppUser = await this.prisma.appUser.findUnique({
        where: { clerkId: rawUserId },
        select: { id: true, clerkId: true },
      });
      userClerkId = rawUserId;
    } else {
      userAppUser = await this.prisma.appUser.findUnique({
        where: { id: rawUserId },
        select: { id: true, clerkId: true },
      });
      if (userAppUser) {
        userClerkId = userAppUser.clerkId;
      }
    }

    if (!userAppUser) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: userClerkId },
      select: { id: true },
    });

    return user?.id || null;
  }

  /**
   * Get allowed roles that a user can message based on their role
   * SUPER_ADMIN can message everyone (handled separately)
   */
  private getAllowedMessagingRoles(userRole: UserRole): UserRole[] {
    switch (userRole) {
      case UserRole.SUPER_ADMIN:
        // Handled separately - can message all
        return Object.values(UserRole);
      
      case UserRole.ADMIN:
        // Admin can message: ADMIN, EDUCATOR, PARENT, FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER
        return [
          UserRole.ADMIN,
          UserRole.EDUCATOR,
          UserRole.PARENT,
          UserRole.FOUNDATION,
          UserRole.PRODUCT_SUPPLIER,
          UserRole.SERVICE_PROVIDER,
        ];
      
      case UserRole.EDUCATOR:
        // Educator can message: EDUCATOR, ADMIN, PARENT
        return [
          UserRole.EDUCATOR,
          UserRole.ADMIN,
          UserRole.PARENT,
        ];
      
      case UserRole.PARENT:
        // Parent can message: PARENT, EDUCATOR, ADMIN
        return [
          UserRole.PARENT,
          UserRole.EDUCATOR,
          UserRole.ADMIN,
        ];
      
      case UserRole.FOUNDATION:
      case UserRole.PRODUCT_SUPPLIER:
      case UserRole.SERVICE_PROVIDER:
        // Foundation/Supplier/Service Provider can message each other + ADMIN
        return [
          UserRole.FOUNDATION,
          UserRole.PRODUCT_SUPPLIER,
          UserRole.SERVICE_PROVIDER,
          UserRole.ADMIN,
        ];
      
      default:
        // Default: can only message same role
        return [userRole];
    }
  }

  // Conversation Management
  async createConversation(createConversationDto: CreateConversationDto, creatorId: string) {
    const { type, title, participantIds } = createConversationDto;

    console.log('🔵 [createConversation] Starting conversation creation:', {
      type,
      title,
      participantIds,
      creatorId,
    });

    // The creatorId can be either AppUser.id or Clerk ID (user_xxx)
    // But conversation_participants.userId references User.id, not AppUser.id
    // We need to convert to User IDs by looking up by clerkId
    
    // First, determine if creatorId is a Clerk ID or AppUser ID
    // Clerk IDs start with "user_" while UUIDs are the AppUser.id format
    let creatorClerkId: string;
    let creatorAppUser;
    
    if (creatorId.startsWith('user_')) {
      // It's a Clerk ID, look up AppUser by clerkId
      creatorAppUser = await this.prisma.appUser.findUnique({
        where: { clerkId: creatorId },
        select: { id: true, clerkId: true },
      });
      creatorClerkId = creatorId;
    } else {
      // It's an AppUser ID, look up AppUser by id
      creatorAppUser = await this.prisma.appUser.findUnique({
        where: { id: creatorId },
        select: { id: true, clerkId: true },
      });
      if (creatorAppUser) {
        creatorClerkId = creatorAppUser.clerkId;
      }
    }
    
    if (!creatorAppUser) {
      throw new Error(`Creator with ID ${creatorId} not found in AppUser table`);
    }
    
    // Get the creator's User record and role
    const creatorUser = await this.prisma.user.findUnique({
      where: { clerkId: creatorClerkId },
      select: { id: true, role: true },
    });
    
    if (!creatorUser) {
      throw new Error(`User record not found for creator with clerkId ${creatorClerkId}`);
    }

    const creatorRole = creatorUser.role;
    
    // Get AppUsers for all participants to find their clerkIds
    // Filter out any invalid IDs first
    let participantAppUsers = await this.prisma.appUser.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, clerkId: true },
    });
    
    if (participantAppUsers.length !== participantIds.length) {
      const foundIds = new Set(participantAppUsers.map(u => u.id));
      const missingIds = participantIds.filter(id => !foundIds.has(id));
      
      // Log for debugging
      console.error('Invalid participant IDs:', {
        requested: participantIds,
        found: participantAppUsers.map(u => u.id),
        missing: missingIds,
      });
      
      // Try to find missing IDs in the User table (they might be User.id instead of AppUser.id)
      // If found, get their AppUser records via clerkId
      const missingUserRecords = await this.prisma.user.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, clerkId: true },
      });
      
      if (missingUserRecords.length > 0) {
        // These are User.id, need to find corresponding AppUser records
        const clerkIds = missingUserRecords.map(u => u.clerkId);
        const correspondingAppUsers = await this.prisma.appUser.findMany({
          where: { clerkId: { in: clerkIds } },
          select: { id: true, clerkId: true },
        });
        
        // Add found AppUsers to the list
        participantAppUsers.push(...correspondingAppUsers);
        
        // Update foundIds
        correspondingAppUsers.forEach(u => foundIds.add(u.id));
      }
      
      // Filter out any remaining invalid IDs (those not found in either AppUser or User table)
      const validParticipantIds = participantIds.filter(id => foundIds.has(id));
      const stillMissing = participantIds.filter(id => !foundIds.has(id));
      
      if (stillMissing.length > 0) {
        console.warn(`⚠️ Some participant IDs not found in either AppUser or User table and will be excluded: ${stillMissing.join(', ')}`);
      }
      
      if (validParticipantIds.length === 0) {
        throw new Error(`No valid participant IDs found. All requested IDs were invalid: ${participantIds.join(', ')}`);
      }
      
      // Update participantIds array to only include valid ones
      participantIds.length = 0;
      participantIds.push(...validParticipantIds);
      
      // Also filter participantAppUsers to only include those with valid IDs
      const validAppUserIds = new Set(validParticipantIds);
      participantAppUsers = participantAppUsers.filter(u => validAppUserIds.has(u.id));
    }
    
    // Get User records for all participants by clerkId (including roles for access control)
    const clerkIds = participantAppUsers.map(u => u.clerkId);
    const participantUsers = await this.prisma.user.findMany({
      where: { clerkId: { in: clerkIds } },
      select: { id: true, clerkId: true, role: true },
    });

    // Role-based access control: Check if creator can message each participant
    // SUPER_ADMIN can message anyone
    if (creatorRole !== UserRole.SUPER_ADMIN) {
      const allowedRoles = this.getAllowedMessagingRoles(creatorRole);
      const unauthorizedParticipants = participantUsers.filter(
        participant => !allowedRoles.includes(participant.role)
      );

      if (unauthorizedParticipants.length > 0) {
        const unauthorizedRoles = unauthorizedParticipants.map(p => p.role).join(', ');
        throw new Error(
          `You do not have permission to message users with the following roles: ${unauthorizedRoles}. ` +
          `Your role (${creatorRole}) can only message: ${allowedRoles.join(', ')}`
        );
      }
    }
    
    // Filter out participants that don't have User records (e.g., system accounts)
    // Only include participants that have both AppUser and User records
    const foundClerkIds = new Set(participantUsers.map(u => u.clerkId));
    const validParticipantAppUsers = participantAppUsers.filter(appUser => foundClerkIds.has(appUser.clerkId));
    
    if (validParticipantAppUsers.length === 0) {
      throw new Error('No valid participants found. All participants must have User records in the database.');
    }
    
    if (validParticipantAppUsers.length < participantAppUsers.length) {
      const missingClerkIds = clerkIds.filter(id => !foundClerkIds.has(id));
      console.warn(`⚠️ Some participants don't have User records and will be excluded: ${missingClerkIds.join(', ')}`);
    }
    
    // Map participant AppUser IDs to User IDs
    const clerkIdToUserId = new Map(participantUsers.map(u => [u.clerkId, u.id]));
    const participantUserIds = validParticipantAppUsers.map(appUser => {
      const userId = clerkIdToUserId.get(appUser.clerkId);
      if (!userId) {
        throw new Error(`User ID not found for participant with clerkId ${appUser.clerkId}`);
      }
      return userId;
    });

    // Ensure creator is in the participant list (avoid duplicates)
    const allParticipantIds = new Set([creatorUser.id, ...participantUserIds]);
    const uniqueParticipantIds = Array.from(allParticipantIds);
    
    console.log('🔵 [createConversation] Final participant User IDs:', uniqueParticipantIds);
    console.log('🔵 [createConversation] Creating conversation in database...');

    try {
      const conversation = await this.prisma.conversation.create({
      data: {
        type,
        title,
        participants: {
            create: uniqueParticipantIds.map(userId => ({ userId })),
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
      
      console.log('✅ [createConversation] Conversation created successfully:', {
        id: conversation.id,
        type: conversation.type,
        title: conversation.title,
        participantCount: conversation.participants.length,
      });
      
      // Transform messages to use secure download URLs
      return {
        ...conversation,
        messages: this.transformMessagesForResponse(conversation.messages || []),
      };
    } catch (error) {
      console.error('❌ [createConversation] Error creating conversation:', error);
      console.error('❌ [createConversation] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any)?.code,
        meta: (error as any)?.meta,
      });
      throw error;
    }
  }

  async getUserConversations(rawUserId: string) {
    console.log('🔵 [getUserConversations] Starting with rawUserId:', rawUserId);
    
    // Convert rawUserId (Clerk ID or AppUser ID) to User.id
    const finalUserId = await this.resolveUserId(rawUserId);
    
    if (!finalUserId) {
      console.warn('⚠️ [getUserConversations] User not found:', rawUserId);
      return [];
    }

    console.log('🔵 [getUserConversations] Final User ID:', finalUserId);

    // Get user's role for filtering
    const userWithRole = await this.prisma.user.findUnique({
      where: { id: finalUserId },
      select: { role: true },
    });

    const userRole = userWithRole?.role || UserRole.PARENT;
    const allowedRoles = userRole === UserRole.SUPER_ADMIN 
      ? Object.values(UserRole) 
      : this.getAllowedMessagingRoles(userRole);

    // For SUPER_ADMIN, show all conversations they're part of
    // For others, filter to only show conversations with allowed roles
    const whereClause = userRole === UserRole.SUPER_ADMIN
      ? {
          participants: {
            some: {
              userId: finalUserId,
              isActive: true,
            },
          },
        }
      : {
          AND: [
            {
              participants: {
                some: {
                  userId: finalUserId,
                  isActive: true,
                },
              },
            },
            {
              participants: {
                every: {
                  OR: [
                    { userId: finalUserId }, // Always include user's own participation
                    {
                      user: {
                        role: {
                          in: allowedRoles,
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        };

    const conversations = await this.prisma.conversation.findMany({
      where: whereClause,
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

    // Transform messages in conversations to use secure download URLs
    return conversations.map(conv => ({
      ...conv,
      messages: this.transformMessagesForResponse(conv.messages || []),
    }));
  }

  async findConversationById(id: string, rawUserId: string) {
    // Convert rawUserId (Clerk ID or AppUser ID) to User.id
    const finalUserId = await this.resolveUserId(rawUserId);
    
    if (!finalUserId) {
      return null;
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id,
        participants: {
          some: {
            userId: finalUserId,
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

    if (!conversation) return null;

    // Transform messages to use secure download URLs
    return {
      ...conversation,
      messages: this.transformMessagesForResponse(conversation.messages || []),
    };
  }

  // Message Management
  async createMessage(createMessageDto: CreateMessageDto, rawSenderId: string) {
    const { conversationId, receiverId, content, messageType, fileUrl, fileName, fileSize, mimeType } = createMessageDto;
    
    // Extract storage key from fileUrl to avoid storing full public URLs (security)
    // Store only the storage key, which will be converted to secure download URL when retrieved
    const storageKey = this.extractStorageKey(fileUrl);

    console.log('🔵 [createMessage] Starting message creation:', {
      conversationId,
      rawSenderId,
      content: content?.substring(0, 50),
    });

    // Convert senderId (Clerk ID or AppUser ID) to User.id
    // senderId can be either Clerk ID (user_xxx) or AppUser.id (UUID)
    let senderClerkId: string;
    let senderAppUser;

    if (rawSenderId.startsWith('user_')) {
      // It's a Clerk ID, look up AppUser by clerkId
      senderAppUser = await this.prisma.appUser.findUnique({
        where: { clerkId: rawSenderId },
        select: { id: true, clerkId: true },
      });
      senderClerkId = rawSenderId;
    } else {
      // It's an AppUser ID, look up AppUser by id
      senderAppUser = await this.prisma.appUser.findUnique({
        where: { id: rawSenderId },
        select: { id: true, clerkId: true },
      });
      if (senderAppUser) {
        senderClerkId = senderAppUser.clerkId;
      }
    }

    if (!senderAppUser) {
      throw new Error(`Sender with ID ${rawSenderId} not found in AppUser table`);
    }

    // Get the sender's User record
    const senderUser = await this.prisma.user.findUnique({
      where: { clerkId: senderClerkId },
      select: { id: true },
    });

    if (!senderUser) {
      throw new Error(`User record not found for sender with clerkId ${senderClerkId}`);
    }

    const finalSenderUserId = senderUser.id;
    console.log('🔵 [createMessage] Sender User ID:', finalSenderUserId);

    // Convert receiverId if provided (same logic)
    let finalReceiverUserId: string | null = null;
    if (receiverId) {
      let receiverClerkId: string;
      let receiverAppUser;

      if (receiverId.startsWith('user_')) {
        receiverAppUser = await this.prisma.appUser.findUnique({
          where: { clerkId: receiverId },
          select: { id: true, clerkId: true },
        });
        receiverClerkId = receiverId;
      } else {
        receiverAppUser = await this.prisma.appUser.findUnique({
          where: { id: receiverId },
          select: { id: true, clerkId: true },
        });
        if (receiverAppUser) {
          receiverClerkId = receiverAppUser.clerkId;
        }
      }

      if (receiverAppUser) {
        const receiverUser = await this.prisma.user.findUnique({
          where: { clerkId: receiverClerkId },
          select: { id: true },
        });
        if (receiverUser) {
          finalReceiverUserId = receiverUser.id;
        }
      }
    }

    // Update conversation's last message timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    console.log('🔵 [createMessage] Creating message in database...');
    try {
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          senderId: finalSenderUserId,
          receiverId: finalReceiverUserId,
          content,
          messageType,
          fileUrl: storageKey, // Store only the storage key, not the full URL
          fileName,
          fileSize,
          mimeType,
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
      
      console.log('✅ [createMessage] Message created successfully:', {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
      });
      
      // Transform message to use secure download URL
      const transformedMessage = this.transformMessageForResponse(message);
      
      // Broadcast new message via WebSocket
      if (message.conversationId && this.messagingGateway) {
        this.messagingGateway.broadcastNewMessage(message.conversationId, transformedMessage);
      }
      
      return transformedMessage;
    } catch (error) {
      console.error('❌ [createMessage] Error creating message:', error);
      throw error;
    }
  }

  async getConversationMessages(conversationId: string, rawUserId: string, page = 1, limit = 50) {
    // Convert rawUserId (Clerk ID or AppUser ID) to User.id
    const finalUserId = await this.resolveUserId(rawUserId);
    
    if (!finalUserId) {
      throw new Error('User not found');
    }

    // Verify user has access to conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: finalUserId,
            isActive: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const skip = (page - 1) * limit;

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: true,
        receiver: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Transform messages to use secure download URLs
    return this.transformMessagesForResponse(messages);
  }

  async markMessagesAsRead(conversationId: string, userId: string) {
    // Mark all unread messages in conversation as read for this user
    // Messages that are not from the current user should be marked as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId }, // All messages not sent by this user
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
    // Count unread messages in conversations where user is a participant
    const userConversations = await this.prisma.conversationParticipant.findMany({
      where: { userId, isActive: true },
      select: { conversationId: true },
    });

    const conversationIds = userConversations.map(cp => cp.conversationId);

    return this.prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        isRead: false,
      },
    });
  }

  async updateMessage(messageId: string, content: string, rawUserId: string) {
    // Convert userId to User.id
    const finalUserId = await this.resolveUserId(rawUserId);
    
    if (!finalUserId) {
      throw new Error('User not found');
    }

    // Verify message belongs to user
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: finalUserId,
      },
    });

    if (!message) {
      throw new Error('Message not found or you do not have permission to edit it');
    }

    // Update message
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { content },
      include: {
        sender: true,
        receiver: true,
        conversation: true,
      },
    });

    // Transform message to use secure download URL
    const transformedMessage = this.transformMessageForResponse(updatedMessage);

    // Broadcast message update via WebSocket
    if (updatedMessage.conversationId && this.messagingGateway) {
      this.messagingGateway.broadcastMessageUpdate(updatedMessage.conversationId, transformedMessage);
    }

    return transformedMessage;
  }

  async deleteMessage(messageId: string, rawUserId: string) {
    // Convert userId to User.id
    const finalUserId = await this.resolveUserId(rawUserId);
    
    if (!finalUserId) {
      throw new Error('User not found');
    }

    // Verify message belongs to user
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: finalUserId,
      },
    });

    if (!message) {
      throw new Error('Message not found or you do not have permission to delete it');
    }

    // Soft delete: Update content to indicate deletion
    // Or hard delete: await this.prisma.message.delete({ where: { id: messageId } });
    // Using soft delete to preserve message history
    const deletedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: '[Message deleted]',
        messageType: MessageType.SYSTEM,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
      },
      include: {
        sender: true,
        receiver: true,
        conversation: true,
      },
    });

    // Transform message to use secure download URL (if it had a file)
    const transformedMessage = this.transformMessageForResponse(deletedMessage);

    // Broadcast message deletion via WebSocket
    if (deletedMessage.conversationId && this.messagingGateway) {
      this.messagingGateway.broadcastMessageDelete(deletedMessage.conversationId, messageId);
    }

    return transformedMessage;
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
        participants: {
          include: {
            user: true,
          },
        },
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
          participants: {
            include: {
              user: true,
            },
          },
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

    const messages = await this.prisma.message.findMany({
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

    // Transform messages to use secure download URLs
    return this.transformMessagesForResponse(messages);
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