
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { Message, Conversation, UserRole, User } from '../types';
import { messagingService } from '../services/messagingService';
import { useAppContext } from './AppContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import { useNotifications } from './NotificationContext';

interface MessagingContextType {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  activeConversationId: string | null;
  loading: boolean;
  setActiveConversationId: (conversationId: string | null) => void;
  loadUserConversations: () => void;
  loadMessagesForConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string, messageType?: 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM', fileMetadata?: { fileName?: string; fileSize?: number; mimeType?: string; fileUrl?: string }) => void;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  startOrGetConversation: (recipientId: string, recipientName: string, recipientRole: UserRole) => Promise<string>;
  startConversation: (participants: {id: string, name: string, role: UserRole}[], groupName?: string) => Promise<string>;
  getUnreadCountForConversation: (conversationId: string) => number;
  hasMoreMessages: Record<string, boolean>;
  loadMoreMessages: (conversationId: string) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const MessagingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAppContext();
  const { getToken } = useAuth();
  const { t } = useTranslation(['dashboard', 'common', 'messages']);
  const { addNotification } = useNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState<Record<string, boolean>>({});
  const [messagePages, setMessagePages] = useState<Record<string, number>>({});
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingConversationsRef = useRef<boolean>(false);
  const lastLoadTimeRef = useRef<number>(0);

  const loadUserConversations = useCallback(async () => {
    if (!currentUser) {
      setConversations([]);
      setMessagesByConversation({});
      return;
    }

    // Prevent concurrent calls - if already loading, skip
    if (loadingConversationsRef.current) {
      return;
    }

    // Debounce: don't load if called within last 500ms
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 500) {
      return;
    }
    lastLoadTimeRef.current = now;

    loadingConversationsRef.current = true;

    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        loadingConversationsRef.current = false;
        return;
      }
      
      const userConvs = await messagingService.getConversations(token);
      setConversations(userConvs);
      
      // Only preload messages for the active conversation (if any)
      // Other conversations will load messages lazily when selected
      const currentActiveId = activeConversationId; // Capture current value
      if (currentActiveId && userConvs.some(conv => conv.id === currentActiveId)) {
        try {
          const { messages, hasMore } = await messagingService.getMessages(currentActiveId, 1, 50, token);
          setMessagesByConversation(prev => ({ 
            ...prev, 
            [currentActiveId]: messages.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          }));
          setMessagePages(prev => ({ ...prev, [currentActiveId]: 1 }));
          setHasMoreMessages(prev => ({ ...prev, [currentActiveId]: hasMore }));
        } catch (error) {
          console.error('Failed to load messages for active conversation');
          setMessagesByConversation(prev => ({ ...prev, [currentActiveId]: [] }));
        }
      }
    } catch (error) {
      console.error('Failed to load conversations');
      setConversations([]);
      setMessagesByConversation({});
    } finally {
      loadingConversationsRef.current = false;
    }
  }, [currentUser, getToken]); // Removed activeConversationId from dependencies

  useEffect(() => {
    loadUserConversations();
  }, [currentUser, loadUserConversations]);

  // Polling for real-time message updates (fallback when WebSocket is not available)
  // Note: With WebSocket, this polling is less critical but kept as a backup
  useEffect(() => {
    if (!currentUser || !activeConversationId) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Poll every 5 seconds for new messages (reduced frequency since WebSocket handles real-time)
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const token = await getToken();
        if (!token) return;

        // Check for new messages in active conversation only
        const { messages } = await messagingService.getMessages(activeConversationId, 1, 50, token);
        
        // Use functional update to get latest state without including it in dependencies
        setMessagesByConversation(prev => {
          const currentMessages = prev[activeConversationId] || [];
          
          // Create a Set of existing message IDs for fast lookup
          const existingIds = new Set(currentMessages.map(msg => msg.id));
          
          // Filter out messages that already exist and find truly new ones
          const newMessages = messages.filter(msg => !existingIds.has(msg.id));
          
          // Also check for messages that might be newer than the latest we have
          if (currentMessages.length > 0) {
            const latestTimestamp = new Date(currentMessages[currentMessages.length - 1].timestamp).getTime();
            const newerMessages = messages.filter(msg => {
              const msgTimestamp = new Date(msg.timestamp).getTime();
              return msgTimestamp > latestTimestamp && !existingIds.has(msg.id);
            });
            
            if (newerMessages.length > 0 || newMessages.length > 0) {
              // Merge and deduplicate: combine existing with new, remove duplicates by ID
              const allMessages = [...currentMessages, ...newMessages, ...newerMessages];
              const seen = new Set<string>();
              const uniqueMessages = allMessages.filter(msg => {
                if (seen.has(msg.id)) {
                  return false;
                }
                seen.add(msg.id);
                return true;
              });
              
              return {
                ...prev,
                [activeConversationId]: uniqueMessages.sort((a, b) =>
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                )
              };
            }
          } else if (newMessages.length > 0) {
            // No existing messages, just add new ones (already deduplicated)
            return {
              ...prev,
              [activeConversationId]: newMessages.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              )
            };
          }
          
          return prev;
        });
      } catch (error) {
        // Silently fail polling errors
        console.error('Polling error');
      }
    }, 5000); // Increased to 5 seconds to reduce load

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentUser, activeConversationId, getToken]); // Removed loadUserConversations and messagesByConversation from dependencies

  const loadMessagesForConversation = async (conversationId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      const { messages, hasMore } = await messagingService.getMessages(conversationId, 1, 50, token);
      
      // Deduplicate messages by ID before setting state
      const seen = new Set<string>();
      const uniqueMessages = messages.filter(msg => {
        if (seen.has(msg.id)) {
          return false;
        }
        seen.add(msg.id);
        return true;
      });
      
      setMessagesByConversation(prev => ({ 
        ...prev, 
        [conversationId]: uniqueMessages.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      }));
      setMessagePages(prev => ({ ...prev, [conversationId]: 1 }));
      setHasMoreMessages(prev => ({ ...prev, [conversationId]: hasMore }));
    } catch (error) {
      console.error('Failed to load messages for conversation');
      // Only show error notification for non-network errors (server might be down)
      if (error instanceof Error && !error.message.includes('Failed to fetch') && !error.message.includes('ERR_CONNECTION_REFUSED')) {
        addNotification({
          title: t('common:errors.loadMessagesFailed', 'Failed to load messages'),
          message: error.message,
          type: 'error',
        });
      }
      setMessagesByConversation(prev => ({ ...prev, [conversationId]: [] }));
    }
    setActiveConversationId(conversationId);
    markConversationAsRead(conversationId);
  };
  
  const getUnreadCountForConversation = (conversationId: string): number => {
    if (!currentUser) return 0;
    const convMessages = messagesByConversation[conversationId] || [];
    return convMessages.filter(msg => msg.senderId !== currentUser.id && !msg.isRead).length;
  };

  const markConversationAsRead = async (conversationId: string) => {
    if (!currentUser) return;
    
    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      await messagingService.markConversationAsRead(conversationId, token);
      // Update state for UI
      setMessagesByConversation(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg => 
          msg.senderId !== currentUser.id ? { ...msg, isRead: true } : msg
        )
      }));
    } catch (error) {
      console.error('Failed to mark conversation as read');
    }
  };


  const sendMessage = async (
    conversationId: string, 
    content: string, 
    messageType: 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM' = 'TEXT',
    fileMetadata?: { fileName?: string; fileSize?: number; mimeType?: string; fileUrl?: string }
  ) => {
    if (!currentUser) return;

    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      
      const newMessage = await messagingService.sendMessage({
        conversationId,
        content,
        messageType,
        ...(fileMetadata && {
          fileUrl: fileMetadata.fileUrl,
          fileName: fileMetadata.fileName,
          fileSize: fileMetadata.fileSize,
          mimeType: fileMetadata.mimeType,
        })
      }, token);

      // Add message to local state immediately for optimistic UI
      setMessagesByConversation(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMessage].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      }));

      // Update conversation's last message
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, lastMessageSnippet: content, lastMessageTimestamp: newMessage.timestamp, lastMessageSenderId: currentUser.id }
          : conv
      ));

      // Reload messages for the current conversation to ensure we have the latest from server
      // This is important for file messages to get the correct file metadata
      try {
        const { messages } = await messagingService.getMessages(conversationId, 1, 50, token);
        setMessagesByConversation(prev => ({
          ...prev,
          [conversationId]: messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        }));
      } catch (refreshError) {
        console.error('Failed to refresh messages after sending:', refreshError);
        // Continue anyway - optimistic update is already in place
      }

      // Reload conversations to get updated last message from server
      loadUserConversations();
    } catch (error) {
      console.error('Failed to send message');
      // Remove optimistic update on error
      setMessagesByConversation(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).slice(0, -1)
      }));
      // Show error notification to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message. Please try again.';
      addNotification({
        title: t('common:errors.sendMessageFailed', 'Failed to send message'),
        message: errorMessage,
        type: 'error',
      });
    }
  };

  const updateMessage = async (messageId: string, content: string) => {
    if (!currentUser) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const updatedMessage = await messagingService.updateMessage(messageId, content, token);
      
      // Update message in local state
      const conversationId = updatedMessage.conversationId;
      setMessagesByConversation(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg =>
          msg.id === messageId ? updatedMessage : msg
        )
      }));

      addNotification({
        title: t('common:success', 'Success'),
        message: t('messages:messageUpdated', 'Message updated successfully'),
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to update message');
      addNotification({
        title: t('common:errors.updateMessageFailed', 'Failed to update message'),
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        type: 'error',
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!currentUser) return;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // Find conversation ID before deletion
      const messages = Object.values(messagesByConversation).flat();
      const messageToDelete = messages.find(msg => msg.id === messageId);
      const conversationId = messageToDelete?.conversationId;

      await messagingService.deleteMessage(messageId, token);
      
      // Remove message from local state or mark as deleted
      if (conversationId) {
        setMessagesByConversation(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).filter(msg => msg.id !== messageId)
        }));
      }

      addNotification({
        title: t('common:success', 'Success'),
        message: t('messages:messageDeleted', 'Message deleted successfully'),
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to delete message');
      addNotification({
        title: t('common:errors.deleteMessageFailed', 'Failed to delete message'),
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        type: 'error',
      });
    }
  };

  const loadMoreMessages = async (conversationId: string) => {
    if (!currentUser || !hasMoreMessages[conversationId]) return;

    try {
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const currentPage = messagePages[conversationId] || 1;
      const nextPage = currentPage + 1;
      const { messages, hasMore } = await messagingService.getMessages(conversationId, nextPage, 50, token);
      
      setMessagesByConversation(prev => {
        const existingMessages = prev[conversationId] || [];
        const newMessages = [...messages, ...existingMessages].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        return {
          ...prev,
          [conversationId]: newMessages
        };
      });

      setMessagePages(prev => ({ ...prev, [conversationId]: nextPage }));
      setHasMoreMessages(prev => ({ ...prev, [conversationId]: hasMore }));
    } catch (error) {
      console.error('Failed to load more messages for conversation');
    }
  };

  const startOrGetConversation = async (recipientId: string, recipientName: string, recipientRole: UserRole): Promise<string> => {
    if (!currentUser) throw new Error(t("messagingContext.userNotLoggedIn") || "User not logged in");
    const participants = [
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      { id: recipientId, name: recipientName, role: recipientRole }
    ];
    return await startConversation(participants);
  };
  
  const startConversation = async (participants: {id: string, name: string, role: UserRole}[], groupName?: string): Promise<string> => {
    if (!currentUser) throw new Error(t("messagingContext.userNotLoggedIn") || "User not logged in");

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // Don't add current user - backend will add the creator automatically
      // Just use the participant IDs from the selected users
      const participantIds = participants.map(p => p.id);
      let conversation: Conversation | undefined;

      // Check if conversation already exists (for 1-on-1 chats)
      if (participantIds.length === 2) {
        try {
          const existingConvs = await messagingService.getConversations(token);
          conversation = existingConvs.find(
            conv => conv.participantIds.length === 2 && 
                    conv.participantIds.every(pid => participantIds.includes(pid))
          );
        } catch (error) {
          console.error('Failed to check existing conversations');
          // Continue to create new conversation
        }
      }

      if (!conversation) {
        // Create new conversation
        console.log('Creating new conversation:', { 
          participantIds, 
          participantDetails: participants.map(p => ({ id: p.id, name: p.name })),
          currentUserId: currentUser.id,
          groupName, 
          type: participantIds.length > 2 ? 'GROUP' : 'DIRECT' 
        });
        const newConversation = await messagingService.createConversation({
          type: participantIds.length > 2 ? 'GROUP' : 'DIRECT',
          title: groupName,
          participantIds
        }, token);
        
        console.log('Created conversation:', newConversation);
        conversation = newConversation;
        setConversations(prev => [...prev, conversation!]);
        setMessagesByConversation(prev => ({ ...prev, [conversation!.id]: [] }));
      }
      
      setActiveConversationId(conversation.id);
      return conversation.id;
    } catch (error) {
      console.error('Failed to start conversation');
      throw error;
    }
  };

  const handleSetActiveConversation = (conversationId: string | null) => {
    if (conversationId === null) {
      setActiveConversationId(null);
      return;
    }
    loadMessagesForConversation(conversationId);
  };

  return (
    <MessagingContext.Provider value={{ 
        conversations, 
        messagesByConversation, 
        activeConversationId, 
        setActiveConversationId: handleSetActiveConversation,
        loadUserConversations, 
        loadMessagesForConversation, 
        sendMessage,
        updateMessage,
        deleteMessage,
        startOrGetConversation,
        startConversation,
        getUnreadCountForConversation,
        hasMoreMessages,
        loadMoreMessages
    }}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = (): MessagingContextType => {
  const { t } = useTranslation(['dashboard', 'common', 'messages']);
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error(t('messagingContext.useMessagingError'));
  }
  return context;
};
