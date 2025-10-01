import React, { useState } from 'react';
import { useMessaging } from '../../contexts/MessagingContext';
import { useAppContext } from '../../contexts/AppContext';
import { ALL_USERS_MOCK, STANDARD_INPUT_FIELD } from '../../constants';
import { User } from '../../types';
import Button from '../ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface CreateGroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateGroupChatModal: React.FC<CreateGroupChatModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { currentUser } = useAppContext();
  const { startConversation } = useMessaging();
  
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');

  const availableUsers = ALL_USERS_MOCK.filter(u => u.id !== currentUser?.id);

  const handleUserToggle = (user: User) => {
    setSelectedUsers(prev => 
      prev.some(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreateGroup = () => {
    if (selectedUsers.length < 2) {
      alert(t('createGroupChatModal.error.minParticipants'));
      return;
    }
    const participants = selectedUsers.map(u => ({ id: u.id, name: u.name, role: u.role }));
    startConversation(participants, groupName || undefined);
    onClose();
    setGroupName('');
    setSelectedUsers([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-lg">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-swiss-charcoal">{t('createGroupChatModal.title')}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">{t('createGroupChatModal.groupNameLabel')}</label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={STANDARD_INPUT_FIELD}
              placeholder={t('createGroupChatModal.groupNamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('createGroupChatModal.selectParticipantsLabel')}</label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
              {availableUsers.map(user => (
                <label key={user.id} className="flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUsers.some(u => u.id === user.id)}
                    onChange={() => handleUserToggle(user)}
                    className="h-4 w-4 text-swiss-mint border-gray-300 rounded focus:ring-swiss-mint"
                  />
                  <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full mx-2" />
                  <span className="text-sm text-gray-700">{user.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 text-right space-x-2">
          <Button variant="light" onClick={onClose}>{t('buttons.cancel')}</Button>
          <Button variant="primary" onClick={handleCreateGroup} disabled={selectedUsers.length < 2}>
            {t('createGroupChatModal.createButton')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupChatModal;
