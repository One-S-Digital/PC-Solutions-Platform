import React, { useState, useRef } from 'react';
import { CameraIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';
import ImageCropperModal, { ImageCropPreset, IMAGE_CROP_PRESETS } from '../../../shared/ImageCropperModal';

interface AvatarSectionProps {
  avatarUrl: string | null;
  onAvatarChange: (url: string, assetId?: string) => void;
  uploading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'avatar' | 'logo';
  assetKind?: string;
  cropPreset?: ImageCropPreset;
}

const AvatarSection: React.FC<AvatarSectionProps> = ({
  avatarUrl,
  onAvatarChange,
  uploading: externalUploading = false,
  size = 'lg',
  variant = 'avatar',
  assetKind = 'AVATAR',
  cropPreset = 'AVATAR',
}) => {
  const { t } = useTranslation(['common', 'settings']);
  const { upload } = useAuthenticatedApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploading = externalUploading || isUploading;

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
  };

  const presetConfig = IMAGE_CROP_PRESETS[cropPreset];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setUploadError(null);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError(t('settings:avatarSection.invalidType', 'Please select an image file'));
      return;
    }

    // Validate file size (max 10MB for cropping, will be compressed after)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t('settings:avatarSection.tooLarge', 'Image must be less than 10MB'));
      return;
    }

    // Open cropper modal
    setSelectedFile(file);
    setShowCropper(true);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setShowCropper(false);
    setSelectedFile(null);
    setIsUploading(true);
    setUploadError(null);

    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(croppedFile);

      // Upload to server
      const response = await upload('/upload/file', croppedFile, { assetKind });
      
      if (response.success && response.asset) {
        const uploadedUrl = response.asset.publicUrl || response.asset.url;
        onAvatarChange(uploadedUrl, response.asset.id);
        setPreviewUrl(null); // Clear preview, use actual URL
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      setUploadError(error.message || t('settings:avatarSection.uploadFailed', 'Upload failed. Please try again.'));
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedFile(null);
  };

  const displayUrl = previewUrl || avatarUrl || 
    'https://ui-avatars.com/api/?name=Profile&background=2DD4BF&color=ffffff&size=128&rounded=true';

  const isCircular = variant === 'avatar' || cropPreset === 'AVATAR';

  return (
    <>
      <div className="flex items-center space-x-6">
        <div className="relative group">
          <img
            src={displayUrl}
            alt={variant === 'logo' ? 'Logo' : 'Avatar'}
            className={`${sizeClasses[size]} ${isCircular ? 'rounded-full' : 'rounded-lg'} border-4 border-white shadow-lg object-cover bg-gray-100`}
          />
          
          {/* Upload overlay on hover */}
          <label 
            className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 ${isCircular ? 'rounded-full' : 'rounded-lg'} cursor-pointer transition-all duration-200`}
          >
            {!uploading && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon className="w-8 h-8 text-white" />
                <span className="sr-only">
                  {variant === 'logo' 
                    ? t('settings:avatarSection.changeLogo', 'Change logo')
                    : t('settings:avatarSection.changeAvatar', 'Change avatar')
                  }
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="sr-only"
            />
          </label>
          
          {/* Loading spinner */}
          {uploading && (
            <div className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 ${isCircular ? 'rounded-full' : 'rounded-lg'}`}>
              <ArrowPathIcon className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              {variant === 'logo' 
                ? t('settings:avatarSection.uploadLogo', 'Upload Logo')
                : t('settings:avatarSection.uploadAvatar', 'Upload Photo')
              }
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-swiss-mint bg-swiss-mint/10 rounded-md hover:bg-swiss-mint/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CameraIcon className="w-4 h-4 mr-2" />
              {uploading 
                ? t('settings:avatarSection.uploading', 'Uploading...')
                : t('settings:avatarSection.chooseFile', 'Choose File')
              }
            </button>
          </label>
          <p className="mt-2 text-xs text-gray-500">
            {t('settings:avatarSection.hint', 'JPG, PNG or GIF. Image will be cropped to {{width}}×{{height}}px', {
              width: presetConfig.width,
              height: presetConfig.height,
            })}
          </p>
          {uploadError && (
            <p className="mt-2 text-xs text-red-600">
              {uploadError}
            </p>
          )}
        </div>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={showCropper}
        onClose={handleCropCancel}
        imageFile={selectedFile}
        preset={cropPreset}
        onCropComplete={handleCropComplete}
        circular={isCircular}
      />
    </>
  );
};

export default AvatarSection;
