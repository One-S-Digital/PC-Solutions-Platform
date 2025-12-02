import React from 'react';
import { ensureSecureFileUrl } from '../utils/secureUrl';

interface SecureFileLinkProps {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  onPreview: (fileUrl: string, fileName: string, fileType: string) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * SecureFileLink - Prevents direct navigation to public R2 URLs
 * Always opens files through authenticated preview modal
 */
export const SecureFileLink: React.FC<SecureFileLinkProps> = ({
  fileUrl,
  fileName,
  fileType = 'application/octet-stream',
  onPreview,
  children,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any navigation
    e.stopPropagation();
    
    // Convert to secure URL if needed
    const secureUrl = ensureSecureFileUrl(fileUrl);
    
    // Always open in preview modal with authentication
    onPreview(secureUrl, fileName, fileType);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Prevent right-click menu to avoid "Copy Link" or "Open in New Tab"
    e.preventDefault();
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={className}
      type="button"
      aria-label={`Preview ${fileName}`}
    >
      {children}
    </button>
  );
};

export default SecureFileLink;

