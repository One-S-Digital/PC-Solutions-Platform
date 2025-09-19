import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AssetKind } from '@repo/types';
import { UploadModal } from '@repo/ui';
import { useFileUpload, Asset } from '../hooks/useFileUpload';

interface FileUploadProps {
  assetKind: AssetKind;
  onUploadComplete: (asset: Asset) => void;
  onUploadError?: (error: string) => void;
  maxSize?: number;
  allowedTypes?: string[];
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function FileUpload({
  assetKind,
  onUploadComplete,
  onUploadError,
  maxSize,
  allowedTypes,
  title,
  description,
  className,
  children,
}: FileUploadProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { uploadFile } = useFileUpload();

  const handleUploadComplete = (asset: Asset) => {
    onUploadComplete(asset);
    setIsModalOpen(false);
  };

  const handleUploadError = (error: string) => {
    onUploadError?.(error);
  };

  const getDefaultAllowedTypes = (kind: AssetKind): string[] => {
    switch (kind) {
      case AssetKind.AVATAR:
      case AssetKind.LOGO:
      case AssetKind.COVER_IMAGE:
      case AssetKind.PRODUCT_IMAGE:
        return ['image/jpeg', 'image/png', 'image/webp'];
      case AssetKind.DOCUMENT:
        return ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      case AssetKind.CV:
        return ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      default:
        return ['image/jpeg', 'image/png', 'image/webp'];
    }
  };

  const getDefaultMaxSize = (kind: AssetKind): number => {
    switch (kind) {
      case AssetKind.AVATAR:
      case AssetKind.LOGO:
        return 5 * 1024 * 1024; // 5MB
      case AssetKind.COVER_IMAGE:
      case AssetKind.PRODUCT_IMAGE:
        return 10 * 1024 * 1024; // 10MB
      case AssetKind.DOCUMENT:
        return 50 * 1024 * 1024; // 50MB
      case AssetKind.CV:
        return 10 * 1024 * 1024; // 10MB
      default:
        return 10 * 1024 * 1024; // 10MB
    }
  };

  const getDefaultTitle = (kind: AssetKind): string => {
    switch (kind) {
      case AssetKind.AVATAR:
        return t('upload.avatarTitle', 'Upload Avatar');
      case AssetKind.LOGO:
        return t('upload.logoTitle', 'Upload Logo');
      case AssetKind.COVER_IMAGE:
        return t('upload.coverTitle', 'Upload Cover Image');
      case AssetKind.PRODUCT_IMAGE:
        return t('upload.productImageTitle', 'Upload Product Image');
      case AssetKind.DOCUMENT:
        return t('upload.documentTitle', 'Upload Document');
      case AssetKind.CV:
        return t('upload.cvTitle', 'Upload CV');
      default:
        return t('upload.fileTitle', 'Upload File');
    }
  };

  const getDefaultDescription = (kind: AssetKind): string => {
    switch (kind) {
      case AssetKind.AVATAR:
        return t('upload.avatarDescription', 'Upload a profile picture for your account');
      case AssetKind.LOGO:
        return t('upload.logoDescription', 'Upload a logo for your organization');
      case AssetKind.COVER_IMAGE:
        return t('upload.coverDescription', 'Upload a cover image for your organization');
      case AssetKind.PRODUCT_IMAGE:
        return t('upload.productImageDescription', 'Upload an image for your product');
      case AssetKind.DOCUMENT:
        return t('upload.documentDescription', 'Upload a document file');
      case AssetKind.CV:
        return t('upload.cvDescription', 'Upload your CV or resume');
      default:
        return t('upload.fileDescription', 'Upload a file');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        {children || t('upload.uploadFile', 'Upload File')}
      </button>

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        assetKind={assetKind}
        maxSize={maxSize || getDefaultMaxSize(assetKind)}
        allowedTypes={allowedTypes || getDefaultAllowedTypes(assetKind)}
        title={title || getDefaultTitle(assetKind)}
        description={description || getDefaultDescription(assetKind)}
      />
    </>
  );
}

// Specialized components for common use cases
export function AvatarUpload({ onUploadComplete, ...props }: Omit<FileUploadProps, 'assetKind'>) {
  return (
    <FileUpload
      {...props}
      assetKind={AssetKind.AVATAR}
      onUploadComplete={onUploadComplete}
    />
  );
}

export function LogoUpload({ onUploadComplete, ...props }: Omit<FileUploadProps, 'assetKind'>) {
  return (
    <FileUpload
      {...props}
      assetKind={AssetKind.LOGO}
      onUploadComplete={onUploadComplete}
    />
  );
}

export function CoverImageUpload({ onUploadComplete, ...props }: Omit<FileUploadProps, 'assetKind'>) {
  return (
    <FileUpload
      {...props}
      assetKind={AssetKind.COVER_IMAGE}
      onUploadComplete={onUploadComplete}
    />
  );
}

export function ProductImageUpload({ onUploadComplete, ...props }: Omit<FileUploadProps, 'assetKind'>) {
  return (
    <FileUpload
      {...props}
      assetKind={AssetKind.PRODUCT_IMAGE}
      onUploadComplete={onUploadComplete}
    />
  );
}

export function DocumentUpload({ onUploadComplete, ...props }: Omit<FileUploadProps, 'assetKind'>) {
  return (
    <FileUpload
      {...props}
      assetKind={AssetKind.DOCUMENT}
      onUploadComplete={onUploadComplete}
    />
  );
}

export function CVUpload({ onUploadComplete, ...props }: Omit<FileUploadProps, 'assetKind'>) {
  return (
    <FileUpload
      {...props}
      assetKind={AssetKind.CV}
      onUploadComplete={onUploadComplete}
    />
  );
}