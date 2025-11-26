import React, { useState, useEffect } from 'react';
import { useMessaging } from '../../contexts/MessagingContext';
import { useAppContext } from '../../contexts/AppContext';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { User } from '../../types';
import Button from '../ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import { userService } from '../../services/userService';

interface CreateGroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateGroupChatModal: React.FC<CreateGroupChatModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const { startConversation } = useMessaging();
  const { getToken } = useAuth();
  
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Fetch users from API
  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
          const token = await getToken();
          if (!token) {
            console.error('No auth token available');
            return;
          }
          // Use userService which handles the API call and transformation
          const { users } = await userService.getAllUsers(1, 100, token);
          console.log('👥 Fetched users:', { total: users.length });
          
          // Filter out current user and system accounts (they don't have User records for messaging)
          const otherUsers = users.filter(u => {
            // Exclude current user
            if (u.id === currentUser?.id) return false;
            // Exclude system accounts (they typically don't have User records)
            if (u.clerkId && (u.clerkId.startsWith('system-') || u.clerkId.startsWith('test-'))) return false;
            return true;
          });
          console.log('👥 Available users after filtering:', { 
            total: users.length, 
            filtered: otherUsers.length,
            excluded: users.length - otherUsers.length 
          });
          setAvailableUsers(otherUsers);
        } catch (error) {
          console.error('Failed to fetch users:', error);
        } finally {
          setIsLoadingUsers(false);
        }
      };
      fetchUsers();
    }
  }, [isOpen, currentUser, getToken]);

  const handleUserToggle = (user: User) => {
    setSelectedUsers(prev => 
      prev.some(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 1) {
      alert(t('common:createGroupChatModal.error.minParticipants') || 'Please select at least one other participant');
      return;
    }
    
    // Check if all selected users are valid (not system accounts and not current user)
    const validUsers = selectedUsers.filter(u => {
      // Exclude system accounts
      if (u.clerkId && (u.clerkId.startsWith('system-') || u.clerkId.startsWith('test-'))) {
        return false;
      }
      // Exclude current user (they're added automatically)
      if (u.id === currentUser?.id) {
        return false;
      }
      return true;
    });
    
    if (validUsers.length === 0) {
      if (selectedUsers.length > 0) {
        alert(t('common:createGroupChatModal.error.invalidParticipants', 'Please select valid participants. System accounts and yourself cannot be added to conversations.'));
      } else {
        alert(t('common:createGroupChatModal.error.minParticipants', 'Please select at least one participant to start a conversation. You will be automatically added as a participant.'));
      }
      return;
    }
    
    try {
      console.log('📝 Creating conversation with participants:', {
        selected: validUsers.map(u => ({ id: u.id, name: u.name, email: u.email, clerkId: u.clerkId })),
        currentUser: currentUser ? { id: currentUser.id, name: currentUser.name } : null,
        groupName: groupName || undefined
      });
      
      const participants = validUsers.map(u => ({ id: u.id, name: u.name, role: u.role }));
      const conversationId = await startConversation(participants, groupName || undefined);
      
      console.log('✅ Conversation created successfully:', conversationId);
      onClose();
      setGroupName('');
      setSelectedUsers([]);
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation. Please try again.';
      alert(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-lg">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-swiss-charcoal">
            {selectedUsers.length >= 2 
              ? t('common:createGroupChatModal.title', 'Create Group Chat')
              : t('common:createGroupChatModal.titleNewChat', 'Create Chat')
            }
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Only show group name input when 2+ participants are selected */}
          {selectedUsers.length >= 2 && (
            <div>
              <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">{t('common:createGroupChatModal.groupNameLabel')}</label>
              <input
                type="text"
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('common:createGroupChatModal.groupNamePlaceholder')}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common:createGroupChatModal.selectParticipantsLabel')}</label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
              {isLoadingUsers ? (
                <p className="text-sm text-gray-500 text-center py-4">{t('common:createGroupChatModal.loadingUsers', 'Loading users...')}</p>
              ) : availableUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">{t('common:createGroupChatModal.noUsersAvailable', 'No users available')}</p>
              ) : (
                availableUsers.map(user => (
                  <label key={user.id} className="flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.some(u => u.id === user.id)}
                      onChange={() => handleUserToggle(user)}
                      className="h-4 w-4 text-swiss-mint border-gray-300 rounded focus:ring-swiss-mint"
                    />
                    <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=48CFAE&color=ffffff`} alt={user.name} className="w-6 h-6 rounded-full mx-2" />
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 text-right space-x-2">
          <Button variant="light" onClick={onClose}>{t('common:buttons.cancel')}</Button>
                  <Button variant="primary" onClick={handleCreateGroup} disabled={selectedUsers.length < 1}>
            {t('common:createGroupChatModal.createButton')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupChatModal;
