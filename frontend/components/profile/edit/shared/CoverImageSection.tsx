import React, { useState } from 'react';
import { PhotoIcon, CameraIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface CoverImageSectionProps {
  coverImageUrl: string | null;
  onCoverChange: (file: File) => void;
  uploading?: boolean;
}

const CoverImageSection: React.FC<CoverImageSectionProps> = ({
  coverImageUrl,
  onCoverChange,
  uploading = false,
}) => {
  const { t } = useTranslation(['common', 'settings']);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    onCoverChange(file);
  };

  const displayUrl = previewUrl || coverImageUrl || 
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80';

  return (
    <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-200 rounded-lg overflow-hidden group">
      <img
        src={displayUrl}
        alt="Cover"
        className="w-full h-full object-cover"
      />
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
        <label className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="sr-only">{t('settings:companyProfile.changeCover', 'Change cover image')}</span>
          <div className="flex items-center space-x-2 bg-white bg-opacity-90 hover:bg-opacity-100 px-4 py-2 rounded-lg">
            <CameraIcon className="w-5 h-5 text-gray-700" />
            <span className="text-sm font-medium text-gray-700">
              {t('settings:companyProfile.changeCover', 'Change Cover Photo')}
            </span>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>
      <div className="absolute bottom-4 right-4 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
        {t('settings:companyProfile.coverHint', 'Recommended: 1600x400px')}
      </div>
    </div>
  );
};

export default CoverImageSection;
