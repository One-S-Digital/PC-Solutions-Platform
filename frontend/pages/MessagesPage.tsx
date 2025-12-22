

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ConversationList from '../components/messaging/ConversationList';
import ChatWindow from '../components/messaging/ChatWindow';
import CreateGroupChatModal from '../components/messaging/CreateGroupChatModal';
import { useMessaging } from '../contexts/MessagingContext';
import { InboxIcon, ChatBubbleLeftEllipsisIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import { useNotifications } from '../contexts/NotificationContext';
import { useAppContext } from '../contexts/AppContext';
import { useMessagingSocket } from '../hooks/useMessagingSocket';

const MessagesPage: React.FC = () => {
  const { t } = useTranslation(['messages', 'common']);
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    loadUserConversations,
    messagesByConversation
  } = useMessaging();
  const { conversationId: paramConversationId } = useParams<{ conversationId: string }>();
  const { addNotification } = useNotifications();
  const { currentUser } = useAppContext();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // WebSocket connection for diagnostics
  const { isConnected: isSocketConnected } = useMessagingSocket({
    conversationId: activeConversationId,
    userId: currentUser?.id || '',
    userName: currentUser?.name || '',
  });

  // Diagnostic logs
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('📊 MessagesPage: Conversations loaded via REST', {
        conversationCount: conversations.length,
        conversationIds: conversations.map(c => c.id),
      });
    }
  }, [conversations]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('📊 MessagesPage: WebSocket state', {
        isSocketConnected,
        activeConversationId,
      });
    }
  }, [isSocketConnected, activeConversationId]);

  useEffect(() => {
    if (paramConversationId && paramConversationId !== activeConversationId) {
      setActiveConversationId(paramConversationId);
    }
  }, [paramConversationId, setActiveConversationId]);

  // Effect to watch for new messages and trigger notifications
  useEffect(() => {
    if (activeConversationId) {
      const messages = messagesByConversation[activeConversationId] || [];
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        // If the last message is not from the current user and is recent, show a notification
        const isRecent = (new Date().getTime() - new Date(lastMessage.timestamp).getTime()) < 3000; // within last 3 seconds
        if (lastMessage.senderId !== currentUser?.id && isRecent) {
          addNotification({
            title: t('notifications.newMessageFrom', { sender: lastMessage.senderName }),
            message: lastMessage.content,
            type: 'info',
            link: `/messages/${activeConversationId}`
          });
        }
      }
    }
  }, [messagesByConversation, activeConversationId, currentUser?.id, addNotification, t]);


  return (
    <div className="flex flex-col h-[calc(100vh-4rem-2rem)] sm:h-[calc(100vh-4.5rem-2rem)] lg:h-[calc(100vh-5rem-4rem)]">
      <div className="flex justify-between items-center mb-3 sm:mb-4 lg:mb-6">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-swiss-charcoal flex items-center">
            <ChatBubbleLeftEllipsisIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 mr-2 sm:mr-3 text-swiss-mint" />
            {t('dashboard:sidebar.messages')}
        </h1>
        {/* NOTE: Button opens CreateGroupChatModal which handles both individual and group chat creation */}
        <Button variant="primary" leftIcon={PlusIcon} onClick={() => setIsGroupModalOpen(true)} className="text-xs sm:text-sm">
            {t('messages:buttons.newChat', 'New Chat')}
        </Button>
      </div>
      
      <div className="flex-grow flex flex-col md:flex-row border border-gray-200 rounded-lg shadow-soft overflow-hidden bg-white">
        {/* Conversation List Sidebar - Full width on mobile, sidebar on tablet+ */}
        <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 bg-gray-50/50 flex-col`}>
          <ConversationList />
        </div>

        {/* Chat Window Main Area */}
        <div className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-grow flex-col`}>
          {activeConversationId ? (
            <ChatWindow />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4 sm:p-6 lg:p-10 bg-white">
              <InboxIcon className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-gray-300 mb-3 sm:mb-4" />
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-swiss-charcoal">{t('messages:emptyState.noConversationSelectedTitle')}</h2>
              <p className="text-xs sm:text-sm text-gray-500">{t('messages:emptyState.noConversationSelectedSubtitle')}</p>
              {conversations.length === 0 && (
                <p className="text-xs sm:text-sm text-gray-400 mt-2">{t('messages:emptyState.noConversationsYet')}</p>
              )}
            </div>
          )}
        </div>
      </div>
      <CreateGroupChatModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
    </div>
  );
};

export default MessagesPage;
