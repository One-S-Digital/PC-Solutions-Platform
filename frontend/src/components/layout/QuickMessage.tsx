import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { PaperAirplaneIcon, PencilIcon } from '@heroicons/react/24/outline';

interface QuickMessageProps {
  onSendMessage?: (message: string) => void;
  placeholder?: string;
  className?: string;
}

export function QuickMessage({ 
  onSendMessage, 
  placeholder,
  className = '' 
}: QuickMessageProps) {
  const { user } = useUser();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    setIsSending(true);
    
    try {
      if (onSendMessage) {
        await onSendMessage(message.trim());
      } else {
        // Default behavior - send to admin
        await sendMessageToAdmin(message.trim());
      }
      
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const sendMessageToAdmin = async (messageText: string) => {
    // This would integrate with your messaging system
    const messageData = {
      to: 'admin',
      from: user?.id,
      message: messageText,
      timestamp: new Date().toISOString(),
      type: 'quick_message'
    };

    // Simulate API call
    console.log('Sending message to admin:', messageData);
    
    // Here you would make an actual API call to your messaging service
    // await apiCall('/api/messages', {
    //   method: 'POST',
    //   body: JSON.stringify(messageData)
    // });
  };

  return (
    <div className={`bg-teal-50 border border-teal-200 rounded-lg p-4 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder || t('dashboard.quick_message_placeholder')}
            className="w-full px-3 py-2 pr-10 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={500}
          />
          <PencilIcon className="absolute bottom-2 right-2 h-4 w-4 text-teal-400" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-teal-600">
            {message.length}/500 characters
          </div>
          
          <button
            type="submit"
            disabled={!message.trim() || isSending}
            className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isSending ? t('common.sending') : t('common.send_message')}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}