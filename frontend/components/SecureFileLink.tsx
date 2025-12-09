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
    
    try {
      // Convert to secure URL if needed
      const secureUrl = ensureSecureFileUrl(fileUrl);
      
      // Always open in preview modal with authentication
      onPreview(secureUrl, fileName, fileType);
    } catch (error) {
      console.error('Failed to open file preview:', error);
      // Consider adding user-facing error notification here
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Prevent right-click menu as a usability feature (not a security control)
    // Note: Actual security is enforced server-side with authentication
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

