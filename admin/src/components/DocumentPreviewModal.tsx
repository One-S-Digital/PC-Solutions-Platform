import { XMarkIcon, ArrowDownTrayIcon, LinkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@clerk/clerk-react';

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
  
  if (!isOpen) return null;

  // Debug logging
  console.log('DocumentPreviewModal:', { fileUrl, fileName, fileType });

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
      console.log('🎬 Native video player:', { fileUrl, fileName, fileType: normalizedFileType });
      
      // Detect MIME type from URL extension
      let mimeType = 'video/mp4'; // default
      if (fileUrl.includes('.webm')) mimeType = 'video/webm';
      else if (fileUrl.includes('.ogg')) mimeType = 'video/ogg';
      else if (fileUrl.includes('.mov')) mimeType = 'video/quicktime';
      else if (fileUrl.includes('.avi')) mimeType = 'video/x-msvideo';
      
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <video
            controls
            className="max-w-full max-h-full"
            title={fileName}
            preload="metadata"
            onError={(e) => {
              console.error('❌ Video load error:', e, { fileUrl, mimeType });
            }}
            onLoadedMetadata={() => {
              console.log('✅ Video metadata loaded');
            }}
          >
            <source src={fileUrl} type={mimeType} />
            <source src={fileUrl} />
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
    const isPDFFile = fileUrl.toLowerCase().includes('.pdf');
    if (normalizedFileType === 'PDF' || isPDFFile) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          title={fileName}
        />
      );
    }

    // Image Preview
    if (['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG'].includes(normalizedFileType)) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
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
          <span>Download File</span>
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
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
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

