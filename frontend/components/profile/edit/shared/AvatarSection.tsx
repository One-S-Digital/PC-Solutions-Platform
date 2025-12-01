import React, { useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface AvatarSectionProps {
  avatarUrl: string | null;
  onAvatarChange: (file: File) => void;
  uploading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const AvatarSection: React.FC<AvatarSectionProps> = ({
  avatarUrl,
  onAvatarChange,
  uploading = false,
  size = 'lg',
}) => {
  const { t } = useTranslation(['common', 'settings']);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    onAvatarChange(file);
  };

  const displayUrl = previewUrl || avatarUrl || 
    'https://ui-avatars.com/api/?name=Profile&background=2DD4BF&color=ffffff&size=128&rounded=true';

  return (
    <div className="flex items-center space-x-6">
      <div className="relative">
        <img
          src={displayUrl}
          alt={t('common.avatar')}
          className={`${sizeClasses[size]} rounded-full border-4 border-white shadow-lg object-cover`}
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>
      <div className="flex-1">
        <label className="block">
          <span className="sr-only">{t('settings:educatorProfile.chooseAvatar', 'Choose avatar')}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-swiss-mint file:text-white hover:file:bg-swiss-teal disabled:opacity-50"
          />
        </label>
        <p className="mt-1 text-xs text-gray-500">
          {t('settings:educatorProfile.avatarHint', 'JPG, PNG or GIF. Max size 2MB')}
        </p>
      </div>
    </div>
  );
};

export default AvatarSection;
