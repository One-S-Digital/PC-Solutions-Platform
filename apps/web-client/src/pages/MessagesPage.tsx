import React, { useState } from 'react'
import { useCurrentUser } from '../hooks/useCurrentUser'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const MessagesPage: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  
  const { isLoading, error } = useCurrentUser()

  // Mock conversations data - in real implementation, this would come from API
  const conversations = [
    {
      id: '1',
      name: 'Sarah Johnson',
      lastMessage: 'Thank you for the update on Emma\'s progress!',
      timestamp: '2 hours ago',
      unread: 2,
      avatar: '/img/avatars/sarah.jpg'
    },
    {
      id: '2',
      name: 'Mike Chen',
      lastMessage: 'Can we schedule a meeting next week?',
      timestamp: '1 day ago',
      unread: 0,
      avatar: '/img/avatars/mike.jpg'
    },
    {
      id: '3',
      name: 'Lisa Rodriguez',
      lastMessage: 'The new curriculum looks great!',
      timestamp: '3 days ago',
      unread: 1,
      avatar: '/img/avatars/lisa.jpg'
    }
  ]

  const selectedConv = conversations.find(c => c.id === selectedConversation)

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // In real implementation, this would send via API
      console.log('Sending message:', newMessage)
      setNewMessage('')
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Failed to load messages</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          Messages
        </h1>
        <p className="text-gray-600">
          Stay connected with your team and partners.
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex h-[600px]">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Conversations</h3>
            </div>
            <div className="overflow-y-auto">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedConversation === conversation.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {conversation.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.name}
                        </p>
                        <span className="text-xs text-gray-500">
                          {conversation.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage}
                      </p>
                    </div>
                    {conversation.unread > 0 && (
                      <div className="w-5 h-5 bg-swiss-mint text-white text-xs rounded-full flex items-center justify-center">
                        {conversation.unread}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {selectedConv.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{selectedConv.name}</h4>
                      <p className="text-sm text-gray-500">Online</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {/* Mock messages */}
                  <div className="flex justify-end">
                    <div className="bg-swiss-mint text-white p-3 rounded-lg max-w-xs">
                      <p className="text-sm">Hi Sarah! Emma had a great day today.</p>
                      <span className="text-xs opacity-75">2:30 PM</span>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 p-3 rounded-lg max-w-xs">
                      <p className="text-sm">That's wonderful to hear! Thank you for the update.</p>
                      <span className="text-xs text-gray-500">2:32 PM</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-swiss-mint text-white p-3 rounded-lg max-w-xs">
                      <p className="text-sm">She's really enjoying the new activities we introduced.</p>
                      <span className="text-xs opacity-75">2:33 PM</span>
                    </div>
                  </div>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 input-field"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="btn btn-primary"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessagesPage