import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Message, Conversation, UserRole } from '../types';
import { useAppContext } from './AppContext';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

interface MessagingContextType {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  activeConversationId: string | null;
  loading: boolean;
  setActiveConversationId: (conversationId: string | null) => void;
  loadUserConversations: () => Promise<void>;
  loadMessagesForConversation: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  startOrGetConversation: (recipientId: string, recipientName: string, recipientRole: UserRole) => Promise<string>;
  startConversation: (participants: {id: string, name: string, role: UserRole}[], groupName?: string) => Promise<string>;
  getUnreadCountForConversation: (conversationId: string) => number;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const MessagingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAppContext();
  const { authenticatedRequest } = useAuthenticatedApi();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUserConversations = useCallback(async () => {
    if (!currentUser) {
      setConversations([]);
      setMessagesByConversation({});
      return;
    }

    setLoading(true);
    try {
      const response = await authenticatedRequest<Conversation[]>('/messaging/conversations');
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, authenticatedRequest]);

  useEffect(() => {
    loadUserConversations();
  }, [currentUser, loadUserConversations]);

  const loadMessagesForConversation = useCallback(async (conversationId: string) => {
    if (!currentUser) return;

    try {
      const response = await authenticatedRequest<Message[]>(`/messaging/conversations/${conversationId}/messages`);
      if (response.success && response.data) {
        setMessagesByConversation(prev => ({
          ...prev,
          [conversationId]: response.data!.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ),
        }));
      }
      
      setActiveConversationId(conversationId);
      
      // Mark conversation as read
      await markConversationAsRead(conversationId);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [currentUser, authenticatedRequest]);

  const getUnreadCountForConversation = useCallback((conversationId: string): number => {
    if (!currentUser) return 0;
    const convMessages = messagesByConversation[conversationId] || [];
    return convMessages.filter(msg => msg.senderId !== currentUser.id && !msg.isRead).length;
  }, [currentUser, messagesByConversation]);

  const markConversationAsRead = async (conversationId: string) => {
    if (!currentUser) return;
    
    try {
      await authenticatedRequest(`/messaging/conversations/${conversationId}/read`, {
        method: 'POST',
      });
      
      // Update local state
      setMessagesByConversation(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg => 
          msg.senderId !== currentUser.id ? { ...msg, isRead: true } : msg
        )
      }));
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
    }
  };

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!currentUser) return;

    try {
      const response = await authenticatedRequest<Message>('/messaging/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversationId,
          content,
        }),
      });

      if (response.success && response.data) {
        const newMessage = response.data;
        
        setMessagesByConversation(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), newMessage].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ),
        }));

        // Update conversation's last message
        setConversations(prev => prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                lastMessageSnippet: content,
                lastMessageTimestamp: newMessage.timestamp,
                lastMessageSenderId: currentUser.id,
              }
            : conv
        ));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [currentUser, authenticatedRequest]);

  const startOrGetConversation = useCallback(async (
    recipientId: string,
    recipientName: string,
    recipientRole: UserRole
  ): Promise<string> => {
    if (!currentUser) throw new Error('User not logged in');
    
    const participants = [
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      { id: recipientId, name: recipientName, role: recipientRole }
    ];
    return startConversation(participants);
  }, [currentUser]);

  const startConversation = useCallback(async (
    participants: { id: string; name: string; role: UserRole }[],
    groupName?: string
  ): Promise<string> => {
    if (!currentUser) throw new Error('User not logged in');

    // Ensure current user is part of the participants
    if (!participants.some(p => p.id === currentUser.id)) {
      participants.push({ id: currentUser.id, name: currentUser.name, role: currentUser.role });
    }

    const participantIds = participants.map(p => p.id).sort();

    // For 1-on-1 conversations, check if one already exists
    if (participantIds.length === 2) {
      const existingConv = conversations.find(
        conv => conv.participantIds.length === 2 &&
                conv.participantIds.every(pid => participantIds.includes(pid))
      );
      if (existingConv) {
        setActiveConversationId(existingConv.id);
        return existingConv.id;
      }
    }

    try {
      const response = await authenticatedRequest<Conversation>('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({
          participantIds,
          name: groupName,
          participants,
        }),
      });

      if (response.success && response.data) {
        const newConversation = response.data;
        setConversations(prev => [...prev, newConversation]);
        setMessagesByConversation(prev => ({ ...prev, [newConversation.id]: [] }));
        setActiveConversationId(newConversation.id);
        return newConversation.id;
      }
      throw new Error('Failed to create conversation');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      throw error;
    }
  }, [currentUser, conversations, authenticatedRequest]);

  return (
    <MessagingContext.Provider value={{ 
      conversations, 
      messagesByConversation, 
      activeConversationId,
      loading,
      setActiveConversationId: loadMessagesForConversation,
      loadUserConversations, 
      loadMessagesForConversation, 
      sendMessage,
      startOrGetConversation,
      startConversation,
      getUnreadCountForConversation
    }}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = (): MessagingContextType => {
  const { t } = useTranslation(['dashboard', 'common']);
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error(t('messagingContext.useMessagingError'));
  }
  return context;
};
