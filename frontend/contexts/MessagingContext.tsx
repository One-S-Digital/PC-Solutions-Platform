

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Message, Conversation, UserRole, User } from '../types';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, ALL_USERS_MOCK } from '../constants';
import { useAppContext } from './AppContext';
import { useConversations, useMessages, useRealTimeMessaging, useUnreadCount } from '../src/hooks/useMessaging';
import { MessageType, ConversationType } from '../src/services/types';

interface MessagingContextType {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  activeConversationId: string | null;
  setActiveConversationId: (conversationId: string | null) => void;
  loadUserConversations: () => void;
  loadMessagesForConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string) => void; // Recipient is implicit from conversation
  startOrGetConversation: (recipientId: string, recipientName: string, recipientRole: UserRole) => string; // Returns conversationId
  startConversation: (participants: {id: string, name: string, role: UserRole}[], groupName?: string) => string;
  getUnreadCountForConversation: (conversationId: string) => number;
  // API integration
  apiConversations: Conversation[];
  apiMessages: Message[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  isConnected: boolean;
  typingUsers: string[];
  sendTypingIndicator: (isTyping: boolean) => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const MessagingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAppContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // API hooks for messaging
  const { 
    conversations: apiConversations, 
    loading: conversationsLoading, 
    error: conversationsError,
    createConversation,
    updateConversation,
    deleteConversation 
  } = useConversations({
    page: 1,
    limit: 50,
  });

  const { 
    messages: apiMessages, 
    loading: messagesLoading, 
    error: messagesError,
    sendMessage: apiSendMessage,
    updateMessage,
    deleteMessage,
    markAsRead 
  } = useMessages(activeConversationId || '', {
    page: 1,
    limit: 100,
  });

  const { 
    unreadCount, 
    loading: unreadLoading, 
    error: unreadError 
  } = useUnreadCount();

  const { 
    isConnected, 
    newMessages, 
    typingUsers, 
    sendTypingIndicator 
  } = useRealTimeMessaging(activeConversationId || '');

  // Combine loading and error states
  const loading = conversationsLoading || messagesLoading || unreadLoading;
  const error = conversationsError || messagesError || unreadError;

  const loadUserConversations = useCallback(() => {
    if (currentUser) {
      // Use API conversations with fallback to mock data
      const userConvs = apiConversations.length > 0 ? apiConversations : MOCK_CONVERSATIONS.filter(conv => conv.participantIds.includes(currentUser.id));
      setConversations(userConvs);
      
      // Preload messages for these conversations
      userConvs.forEach(conv => {
        const convMessages = MOCK_MESSAGES.filter(msg => msg.conversationId === conv.id).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessagesByConversation(prev => ({ ...prev, [conv.id]: convMessages }));
      });
    } else {
      setConversations([]);
      setMessagesByConversation({});
    }
  }, [currentUser, apiConversations]);

  useEffect(() => {
    loadUserConversations();
  }, [currentUser, loadUserConversations]);

  const loadMessagesForConversation = (conversationId: string) => {
    if (!messagesByConversation[conversationId]) {
      // Use API messages with fallback to mock data
      const convMessages = apiMessages.length > 0 ? apiMessages : MOCK_MESSAGES.filter(msg => msg.conversationId === conversationId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessagesByConversation(prev => ({ ...prev, [conversationId]: convMessages }));
    }
    setActiveConversationId(conversationId);
    markConversationAsRead(conversationId);
  };
  
  const getUnreadCountForConversation = (conversationId: string): number => {
    if (!currentUser) return 0;
    const convMessages = messagesByConversation[conversationId] || MOCK_MESSAGES.filter(msg => msg.conversationId === conversationId);
    return convMessages.filter(msg => msg.senderId !== currentUser.id && !msg.isRead).length;
  };

  const markConversationAsRead = (conversationId: string) => {
     if (!currentUser) return;
    // Mock: Update local MOCK_MESSAGES and then state
    MOCK_MESSAGES.forEach(msg => {
      if (msg.conversationId === conversationId && msg.senderId !== currentUser.id) {
        msg.isRead = true;
      }
    });
    // Update state for UI
    setMessagesByConversation(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(msg => 
        msg.senderId !== currentUser.id ? { ...msg, isRead: true } : msg
      )
    }));
    // Update conversation list to reflect unread count change (optional for this mock, can be complex)
     setConversations(prevConvs => prevConvs.map(c => {
        if (c.id === conversationId) {
            // This is a simplification. A real unread count would be stored per user per conversation.
            // For now, we'll just assume it gets cleared for the active user.
            return {...c}; // No direct unreadCount field on Conversation mock currently
        }
        return c;
    }));
  };


  const sendMessage = async (conversationId: string, content: string) => {
    if (!currentUser) return;

    try {
      // Use API to send message
      const newMessage = await apiSendMessage({
        content,
        messageType: MessageType.TEXT,
      });

      // Update local state
      setMessagesByConversation(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMessage]
      }));

      // Update conversation last message time
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, lastMessageAt: newMessage.createdAt }
          : conv
      ));
    } catch (error) {
      console.error('Failed to send message:', error);
      // Fallback to mock implementation
      const newMessage: Message = {
        id: `msg${Date.now()}`,
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        content,
        timestamp: new Date().toISOString(),
        isRead: true, // Sent by current user, so "read" by them
      };

      MOCK_MESSAGES.push(newMessage);
      setMessagesByConversation(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMessage].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      }));

      // Update conversation's last message
      const updatedConversations = conversations.map(conv =>
        conv.id === conversationId
          ? { ...conv, lastMessageSnippet: content, lastMessageTimestamp: newMessage.timestamp, lastMessageSenderId: currentUser.id }
          : conv
      );
      const mockConvIndex = MOCK_CONVERSATIONS.findIndex(c => c.id === conversationId);
      if (mockConvIndex !== -1) {
        MOCK_CONVERSATIONS[mockConvIndex] = {
          ...MOCK_CONVERSATIONS[mockConvIndex],
          lastMessageSnippet: content,
          lastMessageTimestamp: newMessage.timestamp,
          lastMessageSenderId: currentUser.id,
        };
      }
      setConversations(updatedConversations);
    }
  };

  const startOrGetConversation = (recipientId: string, recipientName: string, recipientRole: UserRole): string => {
    if (!currentUser) throw new Error("User not logged in");
    const participants = [
        { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        { id: recipientId, name: recipientName, role: recipientRole }
    ];
    return startConversation(participants);
  };
  
  const startConversation = async (participants: {id: string, name: string, role: UserRole}[], groupName?: string): Promise<string> => {
    if (!currentUser) throw new Error("User not logged in");

    // Ensure current user is part of the participants
    if (!participants.some(p => p.id === currentUser.id)) {
        participants.push({ id: currentUser.id, name: currentUser.name, role: currentUser.role });
    }

    const participantIds = participants.map(p => p.id).sort();
    let conversation: Conversation | undefined;

    try {
      // Try to create conversation via API
      const newConversation = await createConversation({
        type: participantIds.length > 2 ? ConversationType.GROUP : ConversationType.DIRECT,
        title: groupName,
        participantIds,
      });

      setConversations(prev => [newConversation, ...prev]);
      setMessagesByConversation(prev => ({ ...prev, [newConversation.id]: [] }));
      setActiveConversationId(newConversation.id);
      return newConversation.id;
    } catch (error) {
      console.error('Failed to create conversation via API, falling back to mock:', error);
      
      // Fallback to mock implementation
      if (participantIds.length > 2) { // It's a group chat, create new one
        // Group chat creation logic
      } else { // It's a 1-on-1 chat, check if it exists
        conversation = MOCK_CONVERSATIONS.find(
          conv => conv.participantIds.length === 2 && 
                  conv.participantIds.every(pid => participantIds.includes(pid))
        );
      }

      if (!conversation) {
        const newConversationId = `conv${Date.now()}`;
        const participantNames = participants.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});
        const participantRoles = participants.reduce((acc, p) => ({ ...acc, [p.id]: p.role }), {});
        
        conversation = {
          id: newConversationId,
          name: groupName,
          participantIds,
          participantNames,
          participantRoles,
          lastMessageSnippet: 'Conversation started.',
          lastMessageTimestamp: new Date().toISOString(),
          lastMessageSenderId: currentUser.id,
        };
        MOCK_CONVERSATIONS.push(conversation);
        setConversations(prev => [...prev, conversation!]);
        setMessagesByConversation(prev => ({ ...prev, [newConversationId]: [] }));
      }
      
      setActiveConversationId(conversation.id);
      return conversation.id;
    }
  };


  return (
    <MessagingContext.Provider value={{ 
        conversations, 
        messagesByConversation, 
        activeConversationId, 
        setActiveConversationId: loadMessagesForConversation, // This sets active ID and loads messages
        loadUserConversations, 
        loadMessagesForConversation, 
        sendMessage,
        startOrGetConversation,
        startConversation,
        getUnreadCountForConversation,
        // API integration
        apiConversations,
        apiMessages,
        loading,
        error,
        unreadCount,
        isConnected,
        typingUsers,
        sendTypingIndicator
    }}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = (): MessagingContextType => {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};
