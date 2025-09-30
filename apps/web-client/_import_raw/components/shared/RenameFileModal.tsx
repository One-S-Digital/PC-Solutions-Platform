import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../../types';
import Button from '../ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { STANDARD_INPUT_FIELD } from '../../constants';
import { useTranslation } from 'react-i18next';

interface RenameFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (fileId: string, newName: string) => void;
  file: DocumentItem | null;
}

const RenameFileModal: React.FC<RenameFileModalProps> = ({ isOpen, onClose, onRename, file }) => {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (file) {
      setNewName(file.name);
    }
  }, [file]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && newName.trim()) {
      onRename(file.id, newName.trim());
      onClose();
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white shadow-xl rounded-lg">
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-swiss-charcoal">{t('renameFileModal.title')}</h2>
            <button type="button" onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600"><XMarkIcon className="w-6 h-6" /></button>
          </div>
          <div className="p-6">
            <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">{t('renameFileModal.label')}</label>
            <input
              type="text"
              id="fileName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={STANDARD_INPUT_FIELD}
              required
              autoFocus
            />
          </div>
          <div className="px-6 py-4 bg-gray-50 text-right space-x-2">
            <Button type="button" variant="light" onClick={onClose}>{t('buttons.cancel')}</Button>
            <Button type="submit" variant="primary">{t('buttons.save')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameFileModal;
