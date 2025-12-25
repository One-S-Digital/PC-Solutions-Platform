import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, LinkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}: DocumentPreviewModalProps) {
  const { getToken } = useAuth();
  const { t } = useTranslation(['common']);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const lastFileUrlRef = useRef<string | null>(null);
  
  // Fetch file with authentication and create blob URL for preview
  useEffect(() => {
    if (!isOpen || !fileUrl) {
      // Clean up blob URL when modal closes
      if (blobUrlRef.current) {
        window.URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
        setPreviewBlobUrl(null);
      }
      lastFileUrlRef.current = null;
      return;
    }

    // Skip if this is the same file URL we already processed
    if (lastFileUrlRef.current === fileUrl && blobUrlRef.current) {
      setIsLoading(false);
      return;
    }

    // Check if fileUrl is already a blob URL (from previous fetch or message)
    const isAlreadyBlobUrl = fileUrl?.startsWith('blob:');
    if (isAlreadyBlobUrl) {
      // Use the blob URL directly
      setPreviewBlobUrl(fileUrl);
      setIsLoading(false);
      lastFileUrlRef.current = fileUrl;
      return;
    }

    // Check if this is a secure download URL that needs authentication
    const isSecureDownloadUrl = fileUrl?.startsWith('/api/upload/download/') || 
                                (fileUrl?.startsWith('http') && fileUrl?.includes('/api/upload/download/'));
    
    // Skip blob URL creation for external URLs that don't need auth (YouTube, Vimeo, etc.)
    const isExternalVideo = fileUrl?.includes('youtube.com') || fileUrl?.includes('youtu.be') || fileUrl?.includes('vimeo.com');
    const needsAuthentication = isSecureDownloadUrl && !isExternalVideo;

    if (!needsAuthentication) {
      // For external URLs that don't need auth, use them directly
      setPreviewBlobUrl(fileUrl);
      setIsLoading(false);
      lastFileUrlRef.current = fileUrl;
      return;
    }

    // Prevent double-fetch
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setLoadError(false);

    const fetchAuthenticatedFile = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setLoadError(true);
          setIsLoading(false);
          isFetchingRef.current = false;
          return;
        }

        // Determine the download URL - handle both relative and absolute URLs
        // This matches the frontend implementation for consistency
        let downloadUrl: string;
        const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

        if (fileUrl.startsWith('/api/upload/download/')) {
          // Relative URL: /api/upload/download/storage-key
          const storageKey = fileUrl.replace('/api/upload/download/', '');
          downloadUrl = `${apiBaseUrl}/upload/download/${storageKey}`;
        } else if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
          // Absolute URL: extract the path
          try {
            const url = new URL(fileUrl);
            if (url.pathname.startsWith('/api/upload/download/')) {
              // Already has /api/upload/download/ in path
              const storageKey = url.pathname.replace('/api/upload/download/', '');
              downloadUrl = `${apiBaseUrl}/upload/download/${storageKey}`;
            } else if (fileUrl.includes('/api/upload/download/')) {
              // Extract from full URL
              const match = fileUrl.match(/\/api\/upload\/download\/(.+)$/);
              if (match) {
                downloadUrl = `${apiBaseUrl}/upload/download/${match[1]}`;
              } else {
                downloadUrl = fileUrl; // Fallback to original
              }
            } else {
              // Assume the pathname is the storage key
              const storageKey = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
              downloadUrl = `${apiBaseUrl}/upload/download/${storageKey}`;
            }
          } catch (e) {
            console.error('Error parsing fileUrl:', e);
            // Fallback: try to extract from the URL string
            const match = fileUrl.match(/\/api\/upload\/download\/(.+)$/);
            if (match) {
              downloadUrl = `${apiBaseUrl}/upload/download/${match[1]}`;
            } else {
              downloadUrl = fileUrl; // Use original as fallback
            }
          }
        } else {
          // Assume it's a storage key
          downloadUrl = `${apiBaseUrl}/upload/download/${fileUrl}`;
        }

        const response = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`);
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Clean up previous blob URL
        if (blobUrlRef.current) {
          window.URL.revokeObjectURL(blobUrlRef.current);
        }
        
        blobUrlRef.current = blobUrl;
        setPreviewBlobUrl(blobUrl);
        
        // Small delay to ensure content is ready to render (like frontend version)
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
        
        isFetchingRef.current = false;
        lastFileUrlRef.current = fileUrl; // Track that we've processed this fileUrl
      } catch (error) {
        console.error('Failed to load authenticated file:', error);
        setLoadError(true);
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchAuthenticatedFile();

    // Cleanup on unmount
    return () => {
      isFetchingRef.current = false;
      if (blobUrlRef.current) {
        window.URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isOpen, fileUrl, getToken]); // Removed previewBlobUrl from deps to prevent re-renders
  
  if (!isOpen) return null;

  // Debug logging (only once per fileUrl change)
  const loggedFileUrlRef = useRef<string | null>(null);
  if (import.meta.env.DEV && fileUrl && loggedFileUrlRef.current !== fileUrl) {
    console.log('DocumentPreviewModal:', { fileUrl, fileName, fileType });
    loggedFileUrlRef.current = fileUrl;
  }

  const handleDownload = async () => {
    try {
      console.log('🔽 Starting download:', { fileUrl, fileName });
      
      // Get authentication token
      const token = await getToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      // Check if this is already a backend proxy URL or external URL
      const isProxyUrl = fileUrl.includes('/api/upload/download/');
      const isExternalUrl = fileUrl.startsWith('http') && !fileUrl.includes('localhost');
      
      let downloadUrl = fileUrl;
      
      // If it's an external R2 URL, route through backend proxy
      if (isExternalUrl && !isProxyUrl) {
        // Extract the storage key from R2 URL
        // Example: https://assets.example.com/elearning/xxx/file.pdf -> elearning/xxx/file.pdf
        const urlObj = new URL(fileUrl);
        const storageKey = urlObj.pathname.substring(1); // Remove leading slash
        
        // Use backend proxy endpoint
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        downloadUrl = `${apiUrl}/upload/download/${storageKey}`;
        
        console.log('📡 Using backend proxy:', { original: fileUrl, proxy: downloadUrl });
      }
      
      // Fetch the file through proxy with authentication
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Convert to blob and download
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      console.log('✅ Download successful');
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}. Opening in new tab instead.`);
      // Fallback to opening in new tab if download fails
      window.open(fileUrl, '_blank');
    }
  };

  const renderPreview = () => {
    const normalizedFileType = fileType.toUpperCase();

    // Check if fileUrl is valid
    if (!fileUrl || fileUrl === '#') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
          <p className="text-lg mb-4">Invalid file URL</p>
          <p className="text-sm mb-2">URL: {fileUrl || 'Not provided'}</p>
          <p className="text-sm mb-6">The document may not have been uploaded correctly</p>
        </div>
      );
    }

    // Check if file needs authentication (secure download URL)
    const needsAuth = fileUrl?.startsWith('/api/upload/download/') || 
                      (fileUrl?.startsWith('http') && fileUrl?.includes('/api/upload/download/'));
    
    // Use blob URL if available, otherwise use original URL (only for external/public URLs)
    const previewUrl = (needsAuth && previewBlobUrl) ? previewBlobUrl : (previewBlobUrl || fileUrl);

    // Show loading state if we're fetching authenticated content
    if (isLoading && needsAuth) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint mb-4"></div>
          <p className="text-gray-600">{t('common:loading', 'Loading...')}</p>
        </div>
      );
    }

    // Show error state
    if (loadError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
          <p className="text-lg mb-4">Failed to load file</p>
          <p className="text-sm mb-6">Please try downloading the file instead</p>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded flex items-center space-x-2 hover:bg-blue-700"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>{t('common:download', 'Download')}</span>
          </button>
        </div>
      );
    }

    // Detect video sources early (before type checks)
    const isYouTube = fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be');
    const isVimeo = fileUrl.includes('vimeo.com');
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m4v'];
    const isVideoFile = videoExtensions.some(ext => fileUrl.toLowerCase().includes(ext));
    
    // Video Preview (uploaded files, direct video URLs, YouTube, Vimeo)
    if (normalizedFileType === 'VIDEO' || ['MP4', 'WEBM', 'OGG', 'MOV', 'AVI'].includes(normalizedFileType) || isVideoFile || isYouTube || isVimeo) {
      if (isYouTube || isVimeo) {
        // Embed external video in iframe
        let embedUrl = fileUrl;
        
        // Convert YouTube URLs to embed format
        if (isYouTube) {
          let videoId = null;
          
          if (fileUrl.includes('youtu.be/')) {
            videoId = fileUrl.split('youtu.be/')[1]?.split('?')[0]?.split('/')[0];
          } else if (fileUrl.includes('watch?v=')) {
            videoId = fileUrl.split('v=')[1]?.split('&')[0];
          } else if (fileUrl.includes('/embed/')) {
            videoId = fileUrl.split('/embed/')[1]?.split('?')[0];
          } else if (fileUrl.includes('/v/')) {
            videoId = fileUrl.split('/v/')[1]?.split('?')[0];
          }
          
          if (videoId) {
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
          }
        }
        
        // Convert Vimeo URLs to embed format
        if (isVimeo) {
          const videoId = fileUrl.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0];
          if (videoId) {
            embedUrl = `https://player.vimeo.com/video/${videoId}`;
          }
        }
        
        console.log('🎥 Video embed URL:', { original: fileUrl, embed: embedUrl });
        
        return (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title={fileName}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
      
      // Native video player for uploaded video files
      // Detect MIME type from URL extension
      let mimeType = 'video/mp4'; // default
      const urlToCheck = previewUrl || fileUrl;
      if (urlToCheck.includes('.webm')) mimeType = 'video/webm';
      else if (urlToCheck.includes('.ogg')) mimeType = 'video/ogg';
      else if (urlToCheck.includes('.mov')) mimeType = 'video/quicktime';
      else if (urlToCheck.includes('.avi')) mimeType = 'video/x-msvideo';
      
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <video
            controls
            className="max-w-full max-h-full"
            title={fileName}
            preload="metadata"
            onError={(e) => {
              console.error('❌ Video load error:', e, { previewUrl, mimeType });
            }}
            onLoadedMetadata={() => {
              console.log('✅ Video metadata loaded');
            }}
          >
            <source src={previewUrl} type={mimeType} />
            <source src={previewUrl} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // External Link Preview (iframe for websites)
    if (normalizedFileType === 'LINK' || normalizedFileType === 'URL' || (fileUrl.startsWith('http') && !isVideoFile)) {
      const isEmbeddableVideo = ['youtube.com', 'youtu.be', 'vimeo.com'].some(domain => fileUrl.includes(domain));
      const isPDF = fileUrl.toLowerCase().includes('.pdf');
      
      if (!isEmbeddableVideo && !isPDF) {
        return (
          <div className="w-full h-full flex flex-col">
            <div className="bg-blue-50 border-b border-blue-200 p-3 flex items-center justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <LinkIcon className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <p className="text-sm text-blue-800 truncate">
                  External Link: {fileUrl}
                </p>
              </div>
              <button
                onClick={() => window.open(fileUrl, '_blank')}
                className="ml-2 flex-shrink-0 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Open in New Tab
              </button>
            </div>
            <div className="flex-1 w-full relative">
              <iframe
                src={fileUrl}
                className="w-full h-full border-0"
                title={fileName}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onError={(e) => {
                  console.error('Iframe load error:', e);
                }}
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 text-center max-w-md">
                <InformationCircleIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-700 mb-2">
                  Some websites may not display in preview due to security policies.
                </p>
                <button
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Open in New Tab
                </button>
              </div>
            </div>
          </div>
        );
      }
    }

    // PDF Preview (check both fileType and URL extension)
    const isPDFFile = normalizedFileType === 'PDF' || 
                      fileType.toLowerCase().includes('pdf') ||
                      fileUrl.toLowerCase().includes('.pdf') ||
                      fileName?.toLowerCase().endsWith('.pdf');
    
    if (isPDFFile) {
      // Don't render PDF if we need auth but don't have blob URL yet
      if (needsAuth && !previewBlobUrl && isLoading) {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint mb-4"></div>
            <p className="text-gray-600">{t('common:loading', 'Loading...')}</p>
          </div>
        );
      }
      
      // Don't render PDF if we need auth but blob URL failed to load
      if (needsAuth && !previewBlobUrl && loadError) {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
            <p className="text-lg mb-4">Failed to load file</p>
            <p className="text-sm mb-6">Please try downloading the file instead</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded flex items-center space-x-2 hover:bg-blue-700"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>{t('common:download', 'Download')}</span>
            </button>
          </div>
        );
      }
      
      // Ensure we have a valid preview URL
      if (!previewUrl) {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
            <p className="text-lg mb-4">Failed to load file</p>
            <p className="text-sm mb-6">Please try downloading the file instead</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded flex items-center space-x-2 hover:bg-blue-700"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>{t('common:download', 'Download')}</span>
            </button>
          </div>
        );
      }
      
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title={fileName}
          onLoad={() => {
            // PDF loaded successfully
            if (import.meta.env.DEV) {
              console.log('✅ PDF loaded in iframe:', fileName);
            }
          }}
          onError={(e) => {
            console.error('❌ PDF iframe load error:', e, { previewUrl, fileName });
            setLoadError(true);
          }}
        />
      );
    }

    // Image Preview
    if (['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG'].includes(normalizedFileType)) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <img
            src={previewUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              console.error('Image load error:', e);
            }}
          />
        </div>
      );
    }

    // DOCX, XLSX, and other Office formats
    if (['DOCX', 'DOC', 'XLSX', 'XLS', 'PPTX', 'PPT'].includes(normalizedFileType)) {
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
      return (
        <iframe
          src={viewerUrl}
          className="w-full h-full border-0"
          title={fileName}
        />
      );
    }

    // Text files
    if (['TXT', 'MD', 'JSON', 'XML', 'CSV'].includes(normalizedFileType)) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full border-0 bg-white"
          title={fileName}
        />
      );
    }

    // Default fallback - show download message
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
        <p className="text-lg mb-4">Preview not available for this file type</p>
        <p className="text-sm mb-6">Please download the file to view it</p>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-blue-600 text-white rounded flex items-center space-x-2 hover:bg-blue-700"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span>{t('common:downloadfile')}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800 truncate">{fileName}</h2>
            <p className="text-sm text-gray-500">{fileType.toUpperCase()}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded flex items-center space-x-1 hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>{t('common:download')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={t('common:labels.close')}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}

