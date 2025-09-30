

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

const MessagesPage: React.FC = () => {
  const { t } = useTranslation();
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

  useEffect(() => {
    loadUserConversations();
  }, [loadUserConversations]);

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
    <div className="flex flex-col h-[calc(100vh-5rem-4rem)]"> {/* Adjusted height assuming Navbar is ~5rem (h-20) & page p-8 -> approx 4rem bottom */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center">
            <ChatBubbleLeftEllipsisIcon className="w-8 h-8 mr-3 text-swiss-mint" />
            {t('sidebar.messages')}
        </h1>
        <Button variant="primary" leftIcon={PlusIcon} onClick={() => setIsGroupModalOpen(true)}>
            {t('messagesPage.newGroupButton')}
        </Button>
      </div>
      
      <div className="flex-grow flex border border-gray-200 rounded-lg shadow-soft overflow-hidden bg-white">
        {/* Conversation List Sidebar */}
        <div className="w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 bg-gray-50/50 flex flex-col">
          <ConversationList />
        </div>

        {/* Chat Window Main Area */}
        <div className="flex-grow flex flex-col">
          {activeConversationId ? (
            <ChatWindow />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-10 bg-white">
              <InboxIcon className="w-20 h-20 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-swiss-charcoal">{t('messagesPage.noConversationSelectedTitle')}</h2>
              <p className="text-gray-500">{t('messagesPage.noConversationSelectedSubtitle')}</p>
              {conversations.length === 0 && (
                <p className="text-sm text-gray-400 mt-2">{t('messagesPage.noConversationsYet')}</p>
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
