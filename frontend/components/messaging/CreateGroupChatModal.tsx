import React, { useState, useEffect, useRef } from 'react';
import { useMessaging } from '../../contexts/MessagingContext';
import { useAppContext } from '../../contexts/AppContext';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { User } from '../../types';
import Button from '../ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import { messagingService } from '../../services/messagingService';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search query (400ms delay)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setDebouncedSearchQuery('');
      setSelectedUsers([]);
      setGroupName('');
      setAvailableUsers([]);
    } else {
      // Trigger initial load when modal opens (empty search)
      setDebouncedSearchQuery('');
    }
  }, [isOpen]);

  // Fetch recipients from API (initial load on open + search)
  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      const fetchRecipients = async () => {
        setIsLoadingUsers(true);
        try {
          const token = await getToken();
          if (!token) {
            if (isMounted) {
              setIsLoadingUsers(false);
            }
            return;
          }
          
          // Fetch recipients using the new messaging endpoint
          // Load initial list on open (empty search), or search when query is provided
          const searchTerm = debouncedSearchQuery.trim().length > 0 ? debouncedSearchQuery.trim() : undefined;
          const { recipients } = await messagingService.getRecipients(
            searchTerm,
            1,
            100,
            token
          );
          
          // Transform to User format for compatibility
          const transformedUsers: User[] = recipients.map(recipient => ({
            id: recipient.id,
            name: recipient.name,
            email: recipient.email,
            role: recipient.role as any,
            clerkId: '', // Not needed for messaging
            firstName: recipient.name.split(' ')[0] || '',
            lastName: recipient.name.split(' ').slice(1).join(' ') || '',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            orgName: recipient.organizationName || undefined,
          }));

          if (isMounted) {
            setAvailableUsers(transformedUsers);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to fetch recipients:', error);
          }
          if (isMounted) {
            setAvailableUsers([]);
          }
        } finally {
          if (isMounted) {
            setIsLoadingUsers(false);
          }
        }
      };
      
      fetchRecipients();
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, debouncedSearchQuery, getToken]);

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
    
    try {
      const participants = selectedUsers.map(u => ({ id: u.id, name: u.name, role: u.role }));
      const conversationId = await startConversation(participants, groupName || undefined);
      
      onClose();
      setGroupName('');
      setSelectedUsers([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('common:createGroupChatModal.error.createFailed', 'Failed to create conversation. Please try again.');
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
            <input
              type="text"
              placeholder={t('common:createGroupChatModal.searchPlaceholder', 'Search users by name or email...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${STANDARD_INPUT_FIELD} mb-2`}
            />
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
              {isLoadingUsers ? (
                <p className="text-sm text-gray-500 text-center py-4">{t('common:createGroupChatModal.loadingUsers', 'Loading users...')}</p>
              ) : availableUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {searchQuery.trim().length > 0
                    ? t('common:createGroupChatModal.noUsersFound', 'No users found')
                    : t('common:createGroupChatModal.noUsersAvailable', 'No users available')
                  }
                </p>
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
                    {user.orgName && (
                      <span className="text-xs text-gray-500 ml-2">({user.orgName})</span>
                    )}
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
