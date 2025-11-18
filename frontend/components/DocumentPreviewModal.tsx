import React from 'react';
import { XMarkIcon, ArrowDownTrayIcon, LinkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}) => {
  const { t } = useTranslation(['content', 'common']);
  const { authenticatedDownload } = useAuthenticatedApi();

  if (!isOpen) return null;

  // Debug logging
  console.log('DocumentPreviewModal:', { fileUrl, fileName, fileType });

  const handleDownload = async () => {
    try {
      await authenticatedDownload(fileUrl, fileName);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const renderPreview = () => {
    const normalizedFileType = fileType.toUpperCase();

    // Check if fileUrl is valid
    if (!fileUrl || fileUrl === '#' || fileUrl.startsWith('/hr-procedures') || fileUrl.startsWith('/state-policies')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
          <p className="text-lg mb-4">{t('preview.invalidUrl', 'Invalid file URL')}</p>
          <p className="text-sm mb-2">URL: {fileUrl || 'Not provided'}</p>
          <p className="text-sm mb-6">{t('preview.uploadIssue', 'The document may not have been uploaded correctly')}</p>
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
      // Check if it's a YouTube, Vimeo, or other embedded video URL
      
      if (isYouTube || isVimeo) {
        // Embed external video in iframe
        let embedUrl = fileUrl;
        
        // Convert YouTube URLs to embed format
        if (isYouTube) {
          let videoId = null;
          
          // Handle youtu.be short URLs
          if (fileUrl.includes('youtu.be/')) {
            videoId = fileUrl.split('youtu.be/')[1]?.split('?')[0]?.split('/')[0];
          }
          // Handle youtube.com/watch?v= URLs
          else if (fileUrl.includes('watch?v=')) {
            videoId = fileUrl.split('v=')[1]?.split('&')[0];
          }
          // Handle youtube.com/embed/ URLs (already in embed format)
          else if (fileUrl.includes('/embed/')) {
            videoId = fileUrl.split('/embed/')[1]?.split('?')[0];
          }
          // Handle youtube.com/v/ URLs
          else if (fileUrl.includes('/v/')) {
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
            {/* Fallback without type attribute */}
            <source src={fileUrl} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // External Link Preview (iframe for websites)
    if (normalizedFileType === 'LINK' || normalizedFileType === 'URL' || (fileUrl.startsWith('http') && !isVideoFile)) {
      // Check if it's a general external link (not a video or embedded content)
      const isEmbeddableVideo = ['youtube.com', 'youtu.be', 'vimeo.com'].some(domain => fileUrl.includes(domain));
      const isPDF = fileUrl.toLowerCase().includes('.pdf');
      
      if (!isEmbeddableVideo && !isPDF) {
        return (
          <div className="w-full h-full flex flex-col">
            <div className="bg-blue-50 border-b border-blue-200 p-3 flex items-center justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <LinkIcon className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <p className="text-sm text-blue-800 truncate">
                  {t('preview.externalLink', 'External Link')}: {fileUrl}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(fileUrl, '_blank')}
                className="ml-2 flex-shrink-0"
              >
                {t('preview.openInNewTab', 'Open in New Tab')}
              </Button>
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
                  {t('preview.iframeNote', 'Some websites may not display in preview due to security policies.')}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.open(fileUrl, '_blank')}
                >
                  {t('preview.openInNewTab', 'Open in New Tab')}
                </Button>
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
      // Use Microsoft Office Online Viewer
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
        <p className="text-lg mb-4">{t('preview.noPreviewAvailable', 'Preview not available for this file type')}</p>
        <p className="text-sm mb-6">{t('preview.downloadToView', 'Please download the file to view it')}</p>
        <Button variant="primary" leftIcon={ArrowDownTrayIcon} onClick={handleDownload}>
          {t('preview.downloadButton', 'Download File')}
        </Button>
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
            <Button
              variant="outline"
              size="sm"
              leftIcon={ArrowDownTrayIcon}
              onClick={handleDownload}
            >
              {t('common:download', 'Download')}
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={t('common:close', 'Close')}
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
};

export default DocumentPreviewModal;

