import React, { useState, useRef } from 'react';
import { CameraIcon, ArrowPathIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';
import ImageCropperModal, { ImageCropPreset, IMAGE_CROP_PRESETS } from '../../../shared/ImageCropperModal';

interface CoverImageSectionProps {
  coverImageUrl: string | null;
  onCoverChange: (url: string, assetId?: string) => void;
  uploading?: boolean;
  assetKind?: string;
  cropPreset?: ImageCropPreset;
  height?: 'sm' | 'md' | 'lg';
}

const CoverImageSection: React.FC<CoverImageSectionProps> = ({
  coverImageUrl,
  onCoverChange,
  uploading: externalUploading = false,
  assetKind = 'COVER_IMAGE',
  cropPreset = 'COVER',
  height = 'lg',
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

  const heightClasses = {
    sm: 'h-32 sm:h-40',
    md: 'h-48 sm:h-56 md:h-64',
    lg: 'h-64 sm:h-80 md:h-96',
  };

  const presetConfig = IMAGE_CROP_PRESETS[cropPreset];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setUploadError(null);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError(t('settings:coverSection.invalidType', 'Please select an image file'));
      return;
    }

    // Validate file size (max 15MB for cropping, will be compressed after)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError(t('settings:coverSection.tooLarge', 'Image must be less than 15MB'));
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
        onCoverChange(uploadedUrl, response.asset.id);
        setPreviewUrl(null); // Clear preview, use actual URL
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Cover image upload failed:', error);
      setUploadError(error.message || t('settings:coverSection.uploadFailed', 'Upload failed. Please try again.'));
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedFile(null);
  };

  const displayUrl = previewUrl || coverImageUrl || 
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80';

  return (
    <>
      <div className={`relative w-full ${heightClasses[height]} bg-gray-200 rounded-lg overflow-hidden group`}>
        <img
          src={displayUrl}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        
        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="flex flex-col items-center">
              <ArrowPathIcon className="h-12 w-12 text-white animate-spin" />
              <span className="mt-2 text-white text-sm font-medium">
                {t('settings:coverSection.uploading', 'Uploading...')}
              </span>
            </div>
          </div>
        )}
        
        {/* Hover overlay with upload button */}
        {!uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
            <label className="cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-95 group-hover:scale-100">
              <div className="flex items-center space-x-2 bg-white hover:bg-gray-100 px-5 py-3 rounded-lg shadow-lg transition-colors">
                <CameraIcon className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-medium text-gray-700">
                  {t('settings:coverSection.changeCover', 'Change Cover Photo')}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="sr-only"
              />
            </label>
          </div>
        )}
        
        {/* Info badge */}
        <div className="absolute bottom-4 right-4 flex items-center space-x-2 text-xs text-white bg-black bg-opacity-50 px-3 py-1.5 rounded-md">
          <PhotoIcon className="w-4 h-4" />
          <span>
            {t('settings:coverSection.sizeHint', 'Recommended: {{width}}×{{height}}px', {
              width: presetConfig.width,
              height: presetConfig.height,
            })}
          </span>
        </div>
        
        {/* Error message */}
        {uploadError && (
          <div className="absolute bottom-4 left-4 right-20 bg-red-500 text-white text-xs px-3 py-2 rounded-md">
            {uploadError}
          </div>
        )}
      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={showCropper}
        onClose={handleCropCancel}
        imageFile={selectedFile}
        preset={cropPreset}
        onCropComplete={handleCropComplete}
        circular={false}
      />
    </>
  );
};

export default CoverImageSection;
