import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XMarkIcon, ArrowsPointingOutIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';

// Standard image sizes for profile elements
// Note: Labels are translated via settings:imageCropper.presets.* keys
export const IMAGE_CROP_PRESETS = {
  AVATAR: {
    width: 256,
    height: 256,
    aspectRatio: 1,
    useAspectRatio: false,
    labelKey: 'settings:imageCropper.presets.profilePhoto',
  },
  LOGO: {
    width: 256,
    height: 256,
    aspectRatio: 1,
    useAspectRatio: false,
    labelKey: 'settings:imageCropper.presets.logo',
  },
  COVER: {
    width: 1600,
    height: 400,
    aspectRatio: 4,
    useAspectRatio: true,
    labelKey: 'settings:imageCropper.presets.coverImage',
  },
  BANNER: {
    width: 1200,
    height: 400,
    aspectRatio: 3,
    useAspectRatio: true,
    labelKey: 'settings:imageCropper.presets.banner',
  },
} as const;

export type ImageCropPreset = keyof typeof IMAGE_CROP_PRESETS;

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  preset: ImageCropPreset;
  onCropComplete: (croppedFile: File) => void;
  circular?: boolean;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  preset,
  onCropComplete,
  circular = false,
}) => {
  const { t } = useTranslation(['common', 'settings']);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const presetConfig = IMAGE_CROP_PRESETS[preset];
  const aspectRatio = presetConfig.aspectRatio;

  // Load image when file changes
  useEffect(() => {
    if (!imageFile) return;

    const img = new Image();
    img.onload = () => {
      setImage(img);
      
      // Calculate initial crop area centered on the image
      const containerWidth = containerRef.current?.clientWidth || 600;
      const containerHeight = containerRef.current?.clientHeight || 400;
      
      // Fit image within container
      const imgRatio = img.width / img.height;
      const containerRatio = containerWidth / containerHeight;
      
      let displayWidth: number;
      let displayHeight: number;
      
      if (imgRatio > containerRatio) {
        displayWidth = containerWidth;
        displayHeight = containerWidth / imgRatio;
      } else {
        displayHeight = containerHeight;
        displayWidth = containerHeight * imgRatio;
      }
      
      const imgScale = displayWidth / img.width;
      setScale(imgScale);
      
      // Center image
      setImageOffset({
        x: (containerWidth - displayWidth) / 2,
        y: (containerHeight - displayHeight) / 2,
      });
      
      // Initial crop area - centered, fitting within the displayed image
      const maxCropWidth = displayWidth * 0.8;
      const maxCropHeight = displayHeight * 0.8;
      
      let cropWidth: number;
      let cropHeight: number;
      
      if (maxCropWidth / aspectRatio <= maxCropHeight) {
        cropWidth = maxCropWidth;
        cropHeight = maxCropWidth / aspectRatio;
      } else {
        cropHeight = maxCropHeight;
        cropWidth = maxCropHeight * aspectRatio;
      }
      
      setCropArea({
        x: (containerWidth - cropWidth) / 2,
        y: (containerHeight - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      });
    };
    
    img.src = URL.createObjectURL(imageFile);
    
    return () => {
      if (img.src) URL.revokeObjectURL(img.src);
    };
  }, [imageFile, aspectRatio]);

  // Draw the cropping interface
  useEffect(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = containerRef.current?.clientWidth || 600;
    const containerHeight = containerRef.current?.clientHeight || 400;
    
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    const displayWidth = image.width * scale;
    const displayHeight = image.height * scale;
    
    ctx.drawImage(
      image,
      imageOffset.x,
      imageOffset.y,
      displayWidth,
      displayHeight
    );
    
    // Draw dark overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    
    // Top
    ctx.fillRect(0, 0, canvas.width, cropArea.y);
    // Bottom
    ctx.fillRect(0, cropArea.y + cropArea.height, canvas.width, canvas.height - cropArea.y - cropArea.height);
    // Left
    ctx.fillRect(0, cropArea.y, cropArea.x, cropArea.height);
    // Right
    ctx.fillRect(cropArea.x + cropArea.width, cropArea.y, canvas.width - cropArea.x - cropArea.width, cropArea.height);
    
    // Draw crop area border
    ctx.strokeStyle = '#48CFAE';
    ctx.lineWidth = 2;
    
    if (circular) {
      // Draw circular crop guide
      const centerX = cropArea.x + cropArea.width / 2;
      const centerY = cropArea.y + cropArea.height / 2;
      const radius = cropArea.width / 2;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add corner handles as reference points
      ctx.fillStyle = '#48CFAE';
      const handleSize = 10;
      
      // Top-left
      ctx.fillRect(cropArea.x - handleSize/2, cropArea.y - handleSize/2, handleSize, handleSize);
      // Top-right
      ctx.fillRect(cropArea.x + cropArea.width - handleSize/2, cropArea.y - handleSize/2, handleSize, handleSize);
      // Bottom-left
      ctx.fillRect(cropArea.x - handleSize/2, cropArea.y + cropArea.height - handleSize/2, handleSize, handleSize);
      // Bottom-right
      ctx.fillRect(cropArea.x + cropArea.width - handleSize/2, cropArea.y + cropArea.height - handleSize/2, handleSize, handleSize);
    } else {
      ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      
      // Draw corner resize handles
      ctx.fillStyle = '#48CFAE';
      const handleSize = 10;
      
      // Top-left
      ctx.fillRect(cropArea.x - handleSize/2, cropArea.y - handleSize/2, handleSize, handleSize);
      // Top-right
      ctx.fillRect(cropArea.x + cropArea.width - handleSize/2, cropArea.y - handleSize/2, handleSize, handleSize);
      // Bottom-left
      ctx.fillRect(cropArea.x - handleSize/2, cropArea.y + cropArea.height - handleSize/2, handleSize, handleSize);
      // Bottom-right
      ctx.fillRect(cropArea.x + cropArea.width - handleSize/2, cropArea.y + cropArea.height - handleSize/2, handleSize, handleSize);
    }
    
    // Draw grid lines (rule of thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(cropArea.x + cropArea.width / 3, cropArea.y);
    ctx.lineTo(cropArea.x + cropArea.width / 3, cropArea.y + cropArea.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(cropArea.x + (cropArea.width * 2) / 3, cropArea.y);
    ctx.lineTo(cropArea.x + (cropArea.width * 2) / 3, cropArea.y + cropArea.height);
    ctx.stroke();
    
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(cropArea.x, cropArea.y + cropArea.height / 3);
    ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + cropArea.height / 3);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(cropArea.x, cropArea.y + (cropArea.height * 2) / 3);
    ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + (cropArea.height * 2) / 3);
    ctx.stroke();
    
  }, [image, cropArea, scale, imageOffset, circular]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const handleSize = 15;
    
    // Check if clicking on resize handle (only SE corner is functional for resize)
    const corners = [
      { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height, cursor: 'se-resize', type: 'se' },
    ];
    
    for (const corner of corners) {
      if (Math.abs(x - corner.x) < handleSize && Math.abs(y - corner.y) < handleSize) {
        setIsResizing(true);
        setDragStart({ x, y });
        return;
      }
    }
    
    // Check if clicking inside crop area for dragging
    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    }
  }, [cropArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDragging) {
      const containerWidth = containerRef.current?.clientWidth || 600;
      const containerHeight = containerRef.current?.clientHeight || 400;
      
      let newX = x - dragStart.x;
      let newY = y - dragStart.y;
      
      // Constrain to canvas bounds
      newX = Math.max(0, Math.min(newX, containerWidth - cropArea.width));
      newY = Math.max(0, Math.min(newY, containerHeight - cropArea.height));
      
      setCropArea(prev => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    } else if (isResizing) {
      const containerWidth = containerRef.current?.clientWidth || 600;
      const containerHeight = containerRef.current?.clientHeight || 400;
      
      // Calculate new size based on bottom-right corner drag
      let newWidth = x - cropArea.x;
      let newHeight = y - cropArea.y;
      
      // Enforce minimum size
      const minSize = 50;
      newWidth = Math.max(minSize, newWidth);
      newHeight = Math.max(minSize, newHeight);
      
      // Maintain aspect ratio
      if (newWidth / aspectRatio > newHeight) {
        newWidth = newHeight * aspectRatio;
      } else {
        newHeight = newWidth / aspectRatio;
      }
      
      // Constrain to canvas bounds
      newWidth = Math.min(newWidth, containerWidth - cropArea.x);
      newHeight = Math.min(newHeight, containerHeight - cropArea.y);
      
      // Re-apply aspect ratio after constraining
      if (newWidth / aspectRatio > newHeight) {
        newWidth = newHeight * aspectRatio;
      } else {
        newHeight = newWidth / aspectRatio;
      }
      
      setCropArea(prev => ({
        ...prev,
        width: newWidth,
        height: newHeight,
      }));
    }
  }, [isDragging, isResizing, dragStart, cropArea, aspectRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleCrop = async () => {
    if (!image || !canvasRef.current) return;
    
    setProcessing(true);
    
    try {
      // Create output canvas at target resolution
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = presetConfig.width;
      outputCanvas.height = presetConfig.height;
      const ctx = outputCanvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Calculate the source crop coordinates on the original image
      const sourceX = (cropArea.x - imageOffset.x) / scale;
      const sourceY = (cropArea.y - imageOffset.y) / scale;
      const sourceWidth = cropArea.width / scale;
      const sourceHeight = cropArea.height / scale;
      
      // Draw cropped and resized image
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        presetConfig.width,
        presetConfig.height
      );
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        outputCanvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.9
        );
      });
      
      // Create file from blob
      const fileName = (imageFile?.name?.replace(/\.[^.]+$/, '') || 'image') + '_cropped.jpg';
      const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
      
      onCropComplete(croppedFile);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-swiss-mint/10 rounded-lg">
              <PhotoIcon className="w-5 h-5 text-swiss-mint" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('settings:imageCropper.title', 'Crop Your Image')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('settings:imageCropper.subtitle', 'Adjust the selection to fit your {{type}}', { 
                  type: t(presetConfig.labelKey)
                })}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={processing}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Cropping Area */}
        <div className="p-6 bg-gray-900">
          <div 
            ref={containerRef}
            className="relative w-full h-96 rounded-lg overflow-hidden bg-gray-800"
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            
            {!image && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-swiss-mint border-t-transparent" />
              </div>
            )}
          </div>
          
          {/* Size indicator */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <ArrowsPointingOutIcon className="w-4 h-4" />
              <span>
                {t('settings:imageCropper.targetSize', 'Output: {{width}}×{{height}}px', {
                  width: presetConfig.width,
                  height: presetConfig.height,
                })}
              </span>
            </div>
            <span>
              {t('settings:imageCropper.dragHint', 'Drag to move, corners to resize')}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            {t('settings:imageCropper.qualityNote', 'Image will be saved as high-quality JPEG')}
          </p>
          <div className="flex space-x-3">
            <Button 
              variant="light" 
              onClick={onClose}
              disabled={processing}
            >
              {t('common:buttons.cancel', 'Cancel')}
            </Button>
            <Button 
              variant="primary" 
              onClick={handleCrop}
              disabled={!image || processing}
            >
              {processing 
                ? t('settings:imageCropper.processing', 'Processing...') 
                : t('settings:imageCropper.apply', 'Apply Crop')
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
