import { Injectable, Inject, Optional, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { MessageType } from '@workspace/types';
import { MessagingGateway } from './messaging.gateway';
import { UserRole } from '@prisma/client';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger('MessagingService');
  /**
   * Extract storage key from a full URL or return the key if it's already a key
   * Handles URLs like: https://assets.procrechesolutions.com/messages/... or /api/upload/download/...
   * Returns the storage key portion, or null if fileUrl is invalid/missing
   */
  /**
   * Extract storage key from a full URL or return the key if it's already a key
   * Handles URLs like: https://assets.procrechesolutions.com/messages/... or /api/upload/download/...
   * Returns the storage key portion, or null if fileUrl is invalid/missing
   * Tolerant of both storage keys and full URLs - never throws on parsing errors
   */
  private extractStorageKey(fileUrl: string | undefined | null): string | null {
    // Return null for missing/invalid values - let validation handle it
    if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.trim().length === 0) {
      return null;
    }
    
    const trimmed = fileUrl.trim();
    
    // If it's already a relative download URL, extract the key
    if (trimmed.startsWith('/api/upload/download/')) {
      const key = trimmed.replace('/api/upload/download/', '').trim();
      return key.length > 0 ? key : null;
    }
    
    // If it's a full URL, extract the path after the domain
    try {
      const url = new URL(trimmed);
      // Extract path and remove leading slash
      const path = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
      // Return path if it's not empty, otherwise return null
      return path.length > 0 ? path : null;
    } catch {
      // If it's not a valid URL, check if it looks like a storage key
      // Storage keys typically don't contain :// or start with http
      if (!trimmed.includes('://') && !trimmed.startsWith('http')) {
        // Check if it matches expected storage key patterns (e.g., uploads/..., messages/..., elearning/...)
        const storageKeyPattern = /^(uploads|messages|elearning|documents|avatars|logos)\/.+/;
        if (storageKeyPattern.test(trimmed)) {
          // Assume it's already a storage key
          return trimmed;
        }
        // If it doesn't match pattern but looks like a key (no protocol), still accept it
        // This allows for flexibility in storage key formats
        if (trimmed.length > 0 && !trimmed.includes('://')) {
          return trimmed;
        }
      }
      // Invalid format - return null (validation will handle the error)
      return null;
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
  private async resolveUserId(rawUserId: string, requestId?: string): Promise<string | null> {
    const logContext = { rawUserId, requestId: requestId || 'no-request-id' };
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
      this.logger.warn({
        message: 'resolveUserId: AppUser not found',
        ...logContext,
      });
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: userClerkId },
      select: { id: true },
    });

    if (!user) {
      this.logger.warn({
        message: 'resolveUserId: User not found in User table',
        ...logContext,
        appUserId: userAppUser.id,
        clerkId: userClerkId,
      });
      return null;
    }

    return user.id;
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
        // Admin can message anyone (handled separately in getRecipients and createConversation)
        return Object.values(UserRole);
      
      case UserRole.EDUCATOR:
        // Educator can message: EDUCATOR, ADMIN, PARENT, FOUNDATION
        return [
          UserRole.EDUCATOR,
          UserRole.ADMIN,
          UserRole.PARENT,
          UserRole.FOUNDATION,
        ];
      
      case UserRole.PARENT:
        // Parent can message: PARENT, EDUCATOR, ADMIN
        return [
          UserRole.PARENT,
          UserRole.EDUCATOR,
          UserRole.ADMIN,
        ];
      
      case UserRole.FOUNDATION:
        // Foundation can message: FOUNDATION, PRODUCT_SUPPLIER, SERVICE_PROVIDER, ADMIN, EDUCATOR
        return [
          UserRole.FOUNDATION,
          UserRole.PRODUCT_SUPPLIER,
          UserRole.SERVICE_PROVIDER,
          UserRole.ADMIN,
          UserRole.EDUCATOR,
        ];
      
      case UserRole.PRODUCT_SUPPLIER:
        // Product Supplier can message: PRODUCT_SUPPLIER, FOUNDATION, ADMIN
        return [
          UserRole.PRODUCT_SUPPLIER,
          UserRole.FOUNDATION,
          UserRole.ADMIN,
        ];
      
      case UserRole.SERVICE_PROVIDER:
        // Service Provider can message: SERVICE_PROVIDER, FOUNDATION, ADMIN
        return [
          UserRole.SERVICE_PROVIDER,
          UserRole.FOUNDATION,
          UserRole.ADMIN,
        ];
      
      default:
        // Default: can only message same role
        return [userRole];
    }
  }

  // Conversation Management
  /**
   * Get available recipients for messaging (for user picker)
   * ADMIN/SUPER_ADMIN can see all users, others see only allowed roles
   */
  async getRecipients(requesterId: string, search?: string, page: number = 1, limit: number = 50) {
    const logContext = { requesterId, search, page, limit };
    
    try {
      // Resolve requester to User.id
      const requesterUserId = await this.resolveUserId(requesterId);
      if (!requesterUserId) {
        this.logger.warn({
          message: 'getRecipients: Requester lookup failed',
          ...logContext,
        });
        throw new Error('Requester not found');
      }

      // Get requester's role
      const requesterUser = await this.prisma.user.findUnique({
        where: { id: requesterUserId },
        select: { id: true, role: true },
      });

      if (!requesterUser) {
        throw new Error('Requester user record not found');
      }

      const requesterRole = requesterUser.role;
      const skip = (page - 1) * limit;

      // Build base query
      const where: any = {
        isActive: true, // Only active users
      };

      // Apply role-based filtering (unless ADMIN/SUPER_ADMIN)
      if (requesterRole !== UserRole.SUPER_ADMIN && requesterRole !== UserRole.ADMIN) {
        const allowedRoles = this.getAllowedMessagingRoles(requesterRole);
        where.role = { in: allowedRoles };
      }

      // Apply search filter (after role filtering)
      if (search && search.trim().length > 0) {
        const searchTerm = search.trim();
        where.OR = [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      // Exclude requester from results
      where.id = { not: requesterUserId };

      // Fetch users with organization info
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' },
          ],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            organizations: {
              take: 1,
              include: {
                organization: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      // Transform to minimal response format
      const recipients = users.map(user => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User',
        email: user.email || '',
        role: user.role,
        organizationName: user.organizations?.[0]?.organization?.name || null,
      }));

      return {
        recipients,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error({
        message: 'getRecipients: Error fetching recipients',
        error: error instanceof Error ? error.message : String(error),
        ...logContext,
      });
      throw error;
    }
  }

  async createConversation(createConversationDto: CreateConversationDto, creatorId: string) {
    const { type, title, participantIds } = createConversationDto;

    this.logger.log({
      message: 'createConversation: Starting',
      type,
      creatorId,
      participantCount: participantIds.length,
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
    // Participant IDs can be: AppUser.id, User.id (profile), or Clerk ID
    // First, try to find by AppUser.id
    const participantAppUsers = await this.prisma.appUser.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, clerkId: true },
    });
    
    const foundAppUserIds = new Set(participantAppUsers.map(u => u.id));
    const missingIds = participantIds.filter(id => !foundAppUserIds.has(id));
    
    if (missingIds.length > 0) {
      this.logger.log({
        message: 'createConversation: Some IDs not found in AppUser table, checking User table',
        missingIds,
      });
      
      // Try to find missing IDs in the User table (they might be User.id instead of AppUser.id)
      const userRecordsById = await this.prisma.user.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, clerkId: true },
      });
      
      // Create a map of User.id -> clerkId for found records
      const userIdToClerkId = new Map(userRecordsById.map(u => [u.id, u.clerkId]));
      const foundClerkIdsFromUserTable = userRecordsById.map(u => u.clerkId);
      
      if (foundClerkIdsFromUserTable.length > 0) {
        // Get corresponding AppUser records via clerkId
        const correspondingAppUsers = await this.prisma.appUser.findMany({
          where: { clerkId: { in: foundClerkIdsFromUserTable } },
          select: { id: true, clerkId: true },
        });
        
        // Add found AppUsers to the list
        participantAppUsers.push(...correspondingAppUsers);
        
        // Track which User.id values have been resolved
        correspondingAppUsers.forEach(appUser => {
          // Find the User.id that corresponds to this clerkId
          userRecordsById.forEach(userRecord => {
            if (userRecord.clerkId === appUser.clerkId) {
              foundAppUserIds.add(userRecord.id); // Mark the User.id as found
            }
          });
          foundAppUserIds.add(appUser.id);
        });
      }
      
      // Check for any remaining IDs that might be Clerk IDs
      const stillMissingIds = missingIds.filter(id => !foundAppUserIds.has(id) && !userIdToClerkId.has(id));
      const potentialClerkIds = stillMissingIds.filter(id => id.startsWith('user_'));
      
      if (potentialClerkIds.length > 0) {
        const clerkIdAppUsers = await this.prisma.appUser.findMany({
          where: { clerkId: { in: potentialClerkIds } },
          select: { id: true, clerkId: true },
        });
        participantAppUsers.push(...clerkIdAppUsers);
        clerkIdAppUsers.forEach(u => foundAppUserIds.add(u.clerkId));
      }
      
      // Final check for remaining invalid IDs
      const finalMissingIds = participantIds.filter(id => {
        // Check if it's found as AppUser.id, User.id (resolved to AppUser), or Clerk ID
        if (foundAppUserIds.has(id)) return false;
        if (userIdToClerkId.has(id)) return false;
        return true;
      });
      
      if (finalMissingIds.length > 0) {
        this.logger.warn({
          message: 'createConversation: Some participant IDs not found and will be excluded',
          missingIds: finalMissingIds,
        });
      }
      
      if (participantAppUsers.length === 0) {
        throw new Error(`No valid participant IDs found. All requested IDs were invalid: ${participantIds.join(', ')}`);
      }
    }
    
    // Get User records for all participants by clerkId (including roles for access control)
    const clerkIds = participantAppUsers.map(u => u.clerkId);
    const participantUsers = await this.prisma.user.findMany({
      where: { clerkId: { in: clerkIds } },
      select: { id: true, clerkId: true, role: true },
    });

    // Role-based access control: Check if creator can message each participant
    // ADMIN and SUPER_ADMIN can message anyone
    if (creatorRole !== UserRole.SUPER_ADMIN && creatorRole !== UserRole.ADMIN) {
      const allowedRoles = this.getAllowedMessagingRoles(creatorRole);
      const unauthorizedParticipants = participantUsers.filter(
        participant => !allowedRoles.includes(participant.role)
      );

      if (unauthorizedParticipants.length > 0) {
        const unauthorizedRoles = unauthorizedParticipants.map(p => p.role).join(', ');
        throw new ForbiddenException(
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
      this.logger.warn({
        message: 'createConversation: Some participants do not have User records and will be excluded',
        missingClerkIds,
      });
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
      
      this.logger.log({
        message: 'createConversation: Conversation created successfully',
        conversationId: conversation.id,
        type: conversation.type,
        participantCount: conversation.participants.length,
      });
      
      // Transform messages to use secure download URLs
      return {
        ...conversation,
        messages: this.transformMessagesForResponse(conversation.messages || []),
      };
    } catch (error) {
      this.logger.error({
        message: 'createConversation: Error creating conversation',
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
      });
      throw error;
    }
  }

  async getUserConversations(rawUserId: string, requestId?: string) {
    const logContext = { rawUserId, requestId: requestId || 'no-request-id' };
    
    try {
      // Convert rawUserId (Clerk ID or AppUser ID) to User.id
      const finalUserId = await this.resolveUserId(rawUserId, requestId);
      
      if (!finalUserId) {
        this.logger.warn({
          message: 'getUserConversations: User lookup failed',
          ...logContext,
        });
        return [];
      }

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

      this.logger.log({
        message: 'getUserConversations: Query completed',
        ...logContext,
        finalUserId,
        conversationCount: conversations.length,
      });

      // Transform messages in conversations to use secure download URLs
      return conversations.map(conv => ({
        ...conv,
        messages: this.transformMessagesForResponse(conv.messages || []),
      }));
    } catch (error: unknown) {
      // Handle case where conversations table doesn't exist (P2021)
      if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2021') {
        this.logger.warn({
          message: 'getUserConversations: Conversations table does not exist',
          ...logContext,
          errorCode: 'P2021',
        });
        return [];
      }
      this.logger.error({
        message: 'getUserConversations: Unexpected error',
        ...logContext,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
    
    // DEV-only logging
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug({
        message: 'createMessage: Received DTO',
        conversationId,
        content: content ? `${content.substring(0, 50)}...` : undefined,
        messageType,
        hasFileUrl: !!fileUrl,
        fileUrl: fileUrl ? `${fileUrl.substring(0, 50)}...` : undefined,
      });
    }
    
    // Validate message content and file requirements based on messageType
    const finalMessageType = messageType || 'TEXT';
    const trimmedContent = content ? content.trim() : '';
    const hasContent = trimmedContent.length > 0;
    const hasFile = fileUrl && fileUrl.trim().length > 0;
    
    // DEV-only logging
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug({
        message: 'createMessage: Validation state',
        finalMessageType,
        hasContent,
        hasFile,
      });
    }
    
    // Validation rules
    if (finalMessageType === 'TEXT') {
      // TEXT messages: content must be non-empty, no file fields allowed
      if (!hasContent) {
        throw new BadRequestException('TEXT messages must have non-empty content');
      }
      // Ignore file fields for TEXT messages
    } else if (finalMessageType === 'IMAGE' || finalMessageType === 'FILE') {
      // IMAGE/FILE messages: fileUrl is required, content is optional (caption)
      if (!hasFile) {
        throw new BadRequestException(`${finalMessageType} messages must have a file attachment (fileUrl is required)`);
      }
    } else {
      throw new BadRequestException(`Invalid messageType: ${finalMessageType}`);
    }
    
    // If neither content nor file is present, reject
    if (!hasContent && !hasFile) {
      throw new BadRequestException('Message must have content or an attachment');
    }
    
    // Extract storage key from fileUrl to avoid storing full public URLs (security)
    // Store only the storage key, which will be converted to secure download URL when retrieved
    // Only extract if fileUrl is provided (for IMAGE/FILE messages)
    let storageKey: string | null = null;
    if (hasFile && fileUrl) {
      storageKey = this.extractStorageKey(fileUrl);
      if (!storageKey) {
        throw new BadRequestException('Invalid fileUrl format. Expected storage key or valid URL.');
      }
    }

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

    try {
      // Prepare message data - ensure file fields are null for TEXT messages
      const messageData: any = {
        conversationId,
        senderId: finalSenderUserId,
        receiverId: finalReceiverUserId,
        content: trimmedContent || '', // Use trimmed content or empty string
        messageType: finalMessageType,
      };
      
      // Only include file fields for IMAGE/FILE messages
      if (finalMessageType === 'IMAGE' || finalMessageType === 'FILE') {
        messageData.fileUrl = storageKey || null;
        messageData.fileName = fileName || null;
        messageData.fileSize = fileSize || null;
        messageData.mimeType = mimeType || null;
      } else {
        // TEXT messages should have null file fields
        messageData.fileUrl = null;
        messageData.fileName = null;
        messageData.fileSize = null;
        messageData.mimeType = null;
      }
      
      const message = await this.prisma.message.create({
        data: messageData,
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
      
      this.logger.log({
        message: 'createMessage: Message created successfully',
        messageId: message.id,
        conversationId: message.conversationId,
      });
      
      // Transform message to use secure download URL
      const transformedMessage = this.transformMessageForResponse(message);
      
      // Broadcast new message via WebSocket
      if (message.conversationId && this.messagingGateway) {
        this.messagingGateway.broadcastNewMessage(message.conversationId, transformedMessage);
      }
      
      return transformedMessage;
    } catch (error) {
      this.logger.error({
        message: 'createMessage: Error creating message',
        error: error instanceof Error ? error.message : String(error),
      });
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