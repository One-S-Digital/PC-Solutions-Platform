
import React from 'react';
import { Message } from '../../types';
import { useAppContext } from '../../contexts/AppContext';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { currentUser } = useAppContext();
  const isCurrentUserSender = message.senderId === currentUser?.id;

  return (
    <div className={`flex mb-3 ${isCurrentUserSender ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-xl shadow-soft ${
        isCurrentUserSender 
          ? 'bg-swiss-mint text-white rounded-br-none' 
          : 'bg-gray-100 text-swiss-charcoal rounded-bl-none'
      }`}>
        {!isCurrentUserSender && (
          <p className="text-xs font-semibold mb-0.5 text-swiss-teal">{message.senderName}</p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isCurrentUserSender ? 'text-swiss-mint/70 text-right' : 'text-gray-400 text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
