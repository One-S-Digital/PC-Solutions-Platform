import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, LinkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '@clerk/clerk-react';
import { apiService } from '../services/api';
import { isPublicStorageUrl, convertToSecureDownloadUrl } from '../utils/secureUrl';
import DOMPurify from 'dompurify';

function getFileExtension(type: string, url?: string, name?: string): string {
  const normalizedType = (type || '').toUpperCase();

  // Check filename extension first
  if (name) {
    const parts = name.split('.');
    if (parts.length > 1) {
      const ext = parts.pop()?.toUpperCase();
      if (ext && ext.length <= 5) return ext;
    }
  }

  // Check URL extension
  if (url) {
    const pathname = url.split('?')[0];
    const lastSegment = pathname.split('/').pop() || '';
    if (lastSegment.includes('.')) {
      const urlExt = lastSegment.split('.').pop()?.toUpperCase();
      if (urlExt && urlExt.length <= 5) return urlExt; // Valid file extension
    }
  }

  // Extract from MIME type (e.g., "application/pdf" -> "PDF")
  if (normalizedType.includes('/')) {
    const parts = normalizedType.split('/');
    if (parts.length === 2) {
      const mimeType = parts[1].toUpperCase();
      const mimeMap: Record<string, string> = {
        PDF: 'PDF',
        PNG: 'PNG',
        JPEG: 'JPG',
        JPG: 'JPG',
        GIF: 'GIF',
        WEBP: 'WEBP',
        'SVG+XML': 'SVG',
        SVG: 'SVG',
        MP4: 'MP4',
        WEBM: 'WEBM',
        OGG: 'OGG',
        QUICKTIME: 'MOV',
        'X-MSVIDEO': 'AVI',
        PLAIN: 'TXT',
        MARKDOWN: 'MD',
        JSON: 'JSON',
        XML: 'XML',
        CSV: 'CSV',
        'VND.MICROSOFT.WORD': 'DOC',
        MSWORD: 'DOC',
        'VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDPROCESSINGML.DOCUMENT': 'DOCX',
        'VND.MS-EXCEL': 'XLS',
        'VND.OPENXMLFORMATS-OFFICEDOCUMENT.SPREADSHEETML.SHEET': 'XLSX',
        'VND.MS-POWERPOINT': 'PPT',
        'VND.OPENXMLFORMATS-OFFICEDOCUMENT.PRESENTATIONML.PRESENTATION': 'PPTX',
      };
      if (mimeMap[mimeType]) return mimeMap[mimeType];
    }
  }

  // Fallback: best-effort mapping from type string
  return normalizedType;
}

function canUseOfficeOnlineViewer(url: string): boolean {
  // Microsoft Office Online viewer needs a publicly reachable HTTPS URL.
  // It cannot access blob: URLs and it cannot send auth headers to our API proxy.
  if (!url) return false;
  if (url.startsWith('blob:')) return false;
  // Office Online Viewer requires a public HTTPS URL
  if (!url.startsWith('https://')) return false;
  if (url.includes('/api/upload/download/')) return false;
  return true;
}

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
  const { getToken } = useAuth();
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isProcessingPreview, setIsProcessingPreview] = useState(false);
  const [officeHtml, setOfficeHtml] = useState<string | null>(null);
  const [contentReady, setContentReady] = useState(false); // Track when content is fully loaded
  const blobUrlRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false); // Prevent double-fetch in React Strict Mode

  // Prevent body scroll when modal is open - with zero-shift technique
  useEffect(() => {
    if (isOpen) {
      // Get scrollbar width before hiding it
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Apply styles that prevent shift
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = scrollbarWidth > 0 ? 'scroll' : 'auto';
      
      // Store scroll position for restoration
      document.body.dataset.scrollY = scrollY.toString();
    } else {
      // Restore scroll position
      const scrollY = document.body.dataset.scrollY;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
      }
    }

    return () => {
      // Cleanup
      const scrollY = document.body.dataset.scrollY;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
      }
    };
  }, [isOpen]);

  // Fetch file with authentication and create blob URL for preview
  useEffect(() => {
    if (!isOpen || !fileUrl) {
      // Clean up blob URL when modal closes
      if (blobUrlRef.current) {
        window.URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
        setPreviewBlobUrl(null);
      }
      setPreviewBlob(null);
      setOfficeHtml(null);
      setIsProcessingPreview(false);
      setContentReady(false);
      return;
    }
    
    // Reset content ready state when opening new file
    setContentReady(false);

    // Skip blob URL creation for external URLs (YouTube, Vimeo, external links)
    const isExternalVideo = fileUrl?.includes('youtube.com') || fileUrl?.includes('youtu.be') || fileUrl?.includes('vimeo.com');
    const isExternalLink = fileUrl?.startsWith('http://') || fileUrl?.startsWith('https://');
    
    // Check if this is a secure download URL (relative or absolute)
    const isSecureDownloadUrl = fileUrl?.startsWith('/api/upload/download/') || 
                                (isExternalLink && fileUrl?.includes('/api/upload/download/'));
    
    // Check if this is a public R2 storage URL that should be secured
    const isPublicR2Url = isPublicStorageUrl(fileUrl);
    
    // Don't authenticate for external videos or truly external public links
    // DO authenticate for public R2 URLs or secure download URLs
    const needsAuthentication = (isSecureDownloadUrl || isPublicR2Url) && !isExternalVideo;

    if (!needsAuthentication || !fileUrl) {
      // For external URLs that don't need auth, use them directly
      if (fileUrl) {
        setPreviewBlobUrl(fileUrl);
      }
      setIsLoading(false);
      // Mark content as ready after a brief delay for external content
      const timeoutId = setTimeout(() => setContentReady(true), 100);
      return () => clearTimeout(timeoutId);
    }

    // Skip if we already have a blob URL for this file
    if (blobUrlRef.current && previewBlobUrl) {
      setIsLoading(false);
      return;
    }

    // Prevent double-fetch in React Strict Mode
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

        // Convert public R2 URLs to secure download URLs (no logging)
        let secureFileUrl = fileUrl;
        if (isPublicR2Url) {
          secureFileUrl = convertToSecureDownloadUrl(fileUrl);
        }

        // Determine the download URL
        // secureFileUrl might be absolute (http://localhost:3000/api/upload/download/...) 
        // or relative (/api/upload/download/...)
        let downloadUrl: string;
        const apiBaseUrl = apiService.apiBaseUrl; // e.g., "http://localhost:3000/api"

        if (secureFileUrl.startsWith('/api/upload/download/')) {
          // Relative URL: /api/upload/download/storage-key
          const storageKey = secureFileUrl.replace('/api/upload/download/', '');
          downloadUrl = `${apiBaseUrl}/upload/download/${storageKey}`;
        } else if (secureFileUrl.startsWith('http://') || secureFileUrl.startsWith('https://')) {
          // Absolute URL: extract the path
          try {
            const url = new URL(secureFileUrl);
            if (url.pathname.startsWith('/api/upload/download/')) {
              // Already has /api/upload/download/ in path
              const storageKey = url.pathname.replace('/api/upload/download/', '');
              downloadUrl = `${apiBaseUrl}/upload/download/${storageKey}`;
            } else {
              // Assume the pathname is the storage key
              const storageKey = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
              downloadUrl = `${apiBaseUrl}/upload/download/${storageKey}`;
            }
          } catch (e) {
            console.error('Error parsing fileUrl:', e);
            // Fallback: try to extract from the URL string
            const match = secureFileUrl.match(/\/api\/upload\/download\/(.+)$/);
            if (match) {
              downloadUrl = `${apiBaseUrl}/upload/download/${match[1]}`;
            } else {
              throw new Error('Invalid file URL format');
            }
          }
        } else {
          // Assume it's a storage key
          downloadUrl = `${apiBaseUrl}/upload/download/${secureFileUrl}`;
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
        setPreviewBlob(blob);
        
        // Clean up previous blob URL
        if (blobUrlRef.current) {
          window.URL.revokeObjectURL(blobUrlRef.current);
        }
        
        blobUrlRef.current = blobUrl;
        setPreviewBlobUrl(blobUrl);
        
        // For Office formats, we will process the blob client-side before marking content ready
        const ext = getFileExtension(fileType, fileUrl, fileName);
        const needsOfficeProcessing = ['DOCX', 'XLSX'].includes(ext);

        setTimeout(() => {
          setIsLoading(false);
          if (!needsOfficeProcessing) {
            // Additional delay for smooth transition
            setTimeout(() => setContentReady(true), 50);
          }
        }, 100);
        
        isFetchingRef.current = false;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fileUrl]); // getToken is stable from Clerk, no need to include

  // Client-side Office preview for authenticated blobs (DOCX/XLSX)
  useEffect(() => {
    if (!isOpen) return;

    setOfficeHtml(null);
    setIsProcessingPreview(false);

    if (!previewBlob) return;
    if (loadError) return;

    const ext = getFileExtension(fileType, fileUrl, fileName);
    if (!['DOCX', 'XLSX'].includes(ext)) return;

    let cancelled = false;

    const run = async () => {
      try {
        setIsProcessingPreview(true);
        setContentReady(false);

        const arrayBuffer = await previewBlob.arrayBuffer();

        if (ext === 'DOCX') {
          const mammoth = await import('mammoth/mammoth.browser');
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const sanitized = DOMPurify.sanitize(result.value || '');
          if (cancelled) return;
          setOfficeHtml(sanitized);
        } else if (ext === 'XLSX') {
          const XLSX = await import('xlsx');
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheetName = wb.SheetNames?.[0];
          const ws = firstSheetName ? wb.Sheets[firstSheetName] : undefined;
          const html = ws ? XLSX.utils.sheet_to_html(ws) : '<div>No sheets found.</div>';
          const sanitized = DOMPurify.sanitize(html);
          if (cancelled) return;
          setOfficeHtml(sanitized);
        }

        if (cancelled) return;
        setIsProcessingPreview(false);
        setContentReady(true);
      } catch (e) {
        console.error('Failed to render Office preview:', e);
        if (cancelled) return;
        setIsProcessingPreview(false);
        setOfficeHtml(null);
        setContentReady(true); // Show fallback UI
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isOpen, previewBlob, fileType, fileUrl, fileName, loadError]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      await authenticatedDownload(fileUrl, fileName);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const renderPreview = () => {
    // Normalize file type - extract format from MIME types (e.g., "video/mp4" -> "MP4")
    let normalizedFileType = fileType.toUpperCase();
    if (normalizedFileType.includes('/')) {
      const parts = normalizedFileType.split('/');
      const format = parts[1]; // e.g., "video/mp4" -> "MP4"
      // Map common MIME type formats
      const mimeFormatMap: Record<string, string> = {
        'MP4': 'MP4', 'WEBM': 'WEBM', 'OGG': 'OGG',
        'QUICKTIME': 'MOV', 'X-MSVIDEO': 'AVI',
        'PDF': 'PDF', 'PNG': 'PNG', 'JPEG': 'JPG', 'JPG': 'JPG',
        'MSWORD': 'DOC', 'VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDPROCESSINGML.DOCUMENT': 'DOCX',
        'VND.MS-EXCEL': 'XLS',
        'VND.OPENXMLFORMATS-OFFICEDOCUMENT.SPREADSHEETML.SHEET': 'XLSX',
        'VND.MS-POWERPOINT': 'PPT',
        'VND.OPENXMLFORMATS-OFFICEDOCUMENT.PRESENTATIONML.PRESENTATION': 'PPTX',
      };
      normalizedFileType = mimeFormatMap[format] || format;
    }

    const fileExtension = getFileExtension(fileType, fileUrl, fileName);
    
    // Check if file needs authentication (secure download URL)
    const needsAuth = fileUrl?.startsWith('/api/upload/download/') || 
                      (fileUrl?.startsWith('http') && fileUrl?.includes('/api/upload/download/'));
    
    // Use blob URL if available, otherwise use original URL (only for external/public URLs)
    const previewUrl = (needsAuth && previewBlobUrl) ? previewBlobUrl : (previewBlobUrl || fileUrl);

    // Show loading state if we're fetching authenticated content
    if ((isLoading && needsAuth) || isProcessingPreview) {
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
          <p className="text-lg mb-4">{t('preview.loadError', 'Failed to load file')}</p>
          <p className="text-sm mb-6">{t('preview.loadErrorDescription', 'Please try downloading the file instead')}</p>
          <Button variant="primary" leftIcon={ArrowDownTrayIcon} onClick={handleDownload}>
            {t('preview.downloadButton', 'Download File')}
          </Button>
        </div>
      );
    }

    // Check if fileUrl is valid
    if (!fileUrl || fileUrl === '#' || fileUrl.startsWith('/hr-procedures') || fileUrl.startsWith('/state-policies')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
          <p className="text-lg mb-4">{t('preview.invalidUrl', 'Invalid file URL')}</p>
          <p className="text-sm mb-2">URL: {fileUrl || t('common:notProvided', 'Not provided')}</p>
          <p className="text-sm mb-6">{t('preview.uploadIssue', 'The document may not have been uploaded correctly')}</p>
        </div>
      );
    }

    // PDF Preview - Check FIRST before other types (check fileType, MIME type, URL extension, and filename)
    const isPDFFile = fileExtension === 'PDF' || 
                      normalizedFileType.includes('PDF') ||
                      fileType.toLowerCase().includes('pdf') ||
                      fileType.toLowerCase() === 'application/pdf' ||
                      previewUrl?.toLowerCase().includes('.pdf') ||
                      fileName?.toLowerCase().endsWith('.pdf') ||
                      fileName?.toLowerCase().includes('.pdf');
    
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
            <p className="text-lg mb-4">{t('preview.loadError', 'Failed to load file')}</p>
            <p className="text-sm mb-6">{t('preview.loadErrorDescription', 'Please try downloading the file instead')}</p>
            <Button variant="primary" leftIcon={ArrowDownTrayIcon} onClick={handleDownload}>
              {t('preview.downloadButton', 'Download File')}
            </Button>
          </div>
        );
      }
      
      // Don't render PDF if we need auth but don't have blob URL yet (wait for it)
      if (needsAuth && !previewBlobUrl && !previewUrl) {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint mb-4"></div>
            <p className="text-gray-600">{t('common:loading', 'Loading...')}</p>
          </div>
        );
      }
      
      // Ensure we have a valid preview URL
      if (!previewUrl) {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
            <p className="text-lg mb-4">{t('preview.loadError', 'Failed to load file')}</p>
            <p className="text-sm mb-6">{t('preview.loadErrorDescription', 'Please try downloading the file instead')}</p>
            <Button variant="primary" leftIcon={ArrowDownTrayIcon} onClick={handleDownload}>
              {t('preview.downloadButton', 'Download File')}
            </Button>
          </div>
        );
      }
      
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title={fileName}
          onError={(e) => {
            console.error('PDF iframe load error:', e);
          }}
        />
      );
    }

    // Detect video sources early (before type checks)
    const isYouTube = previewUrl.includes('youtube.com') || previewUrl.includes('youtu.be');
    const isVimeo = previewUrl.includes('vimeo.com');
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m4v'];
    const isVideoFile = videoExtensions.some(ext => previewUrl.toLowerCase().includes(ext));
    
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
          if (previewUrl.includes('youtu.be/')) {
            videoId = previewUrl.split('youtu.be/')[1]?.split('?')[0]?.split('/')[0];
          }
          // Handle youtube.com/watch?v= URLs
          else if (previewUrl.includes('watch?v=')) {
            videoId = previewUrl.split('v=')[1]?.split('&')[0];
          }
          // Handle youtube.com/embed/ URLs (already in embed format)
          else if (previewUrl.includes('/embed/')) {
            videoId = previewUrl.split('/embed/')[1]?.split('?')[0];
          }
          // Handle youtube.com/v/ URLs
          else if (previewUrl.includes('/v/')) {
            videoId = previewUrl.split('/v/')[1]?.split('?')[0];
          }
          
          if (videoId) {
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
          }
        }
        
        // Convert Vimeo URLs to embed format
        if (isVimeo) {
          const videoId = previewUrl.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0];
          if (videoId) {
            embedUrl = `https://player.vimeo.com/video/${videoId}`;
          }
        }
        
        // Video embed URL converted successfully
        
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
      // Removed excessive logging that caused console spam
      
      // Detect MIME type from URL extension or fileType
      let mimeType = 'video/mp4'; // default
      if (previewUrl.includes('.webm') || fileType.toLowerCase() === 'webm') mimeType = 'video/webm';
      else if (previewUrl.includes('.ogg') || fileType.toLowerCase() === 'ogg') mimeType = 'video/ogg';
      else if (previewUrl.includes('.mov') || fileType.toLowerCase() === 'mov') mimeType = 'video/quicktime';
      else if (previewUrl.includes('.avi') || fileType.toLowerCase() === 'avi') mimeType = 'video/x-msvideo';
      
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <video
            controls
            className="max-w-full max-h-full"
            title={fileName}
            preload="metadata"
            controlsList="nodownload"
            disablePictureInPicture={false}
            onContextMenu={(e) => {
              // Prevent right-click menu to avoid "Open in new tab"
              e.preventDefault();
            }}
            onError={(e) => {
              console.error('❌ Video load error:', e, { previewUrl, mimeType });
            }}
            onLoadedMetadata={() => {
              // Video loaded successfully
            }}
          >
            <source src={previewUrl} type={mimeType} />
            {/* Fallback without type attribute */}
            <source src={previewUrl} />
            Your browser does not support the video tag.
          </video>
        </div>
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
    const officeExtensions = ['DOCX', 'DOC', 'XLSX', 'XLS', 'PPTX', 'PPT'];
    if (officeExtensions.includes(normalizedFileType) || officeExtensions.includes(fileExtension)) {
      // Prefer Microsoft Office Online Viewer when we have a public HTTPS URL it can fetch.
      if (canUseOfficeOnlineViewer(previewUrl)) {
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`;
        return (
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={fileName}
          />
        );
      }

      // For authenticated/private blobs, render DOCX/XLSX client-side.
      if (['DOCX', 'XLSX'].includes(fileExtension) && officeHtml !== null) {
        return (
          <div className="w-full h-full overflow-auto bg-white p-6">
            <div
              className="max-w-none"
              // Sanitized via DOMPurify
              dangerouslySetInnerHTML={{ __html: officeHtml }}
            />
          </div>
        );
      }

      // Private Office format without a client-side renderer (DOC/PPT/PPTX/XLS)
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-600">
          <p className="text-lg mb-4">{t('preview.noPreviewAvailable', 'Preview not available for this file type')}</p>
          <p className="text-sm mb-6">{t('preview.downloadToView', 'Please download the file to view it')}</p>
          <Button variant="primary" leftIcon={ArrowDownTrayIcon} onClick={handleDownload}>
            {t('preview.downloadButton', 'Download File')}
          </Button>
        </div>
      );
    }

    // Text files
    if (['TXT', 'MD', 'JSON', 'XML', 'CSV'].includes(normalizedFileType)) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0 bg-white"
          title={fileName}
        />
      );
    }

    // External Link Preview (iframe for websites) - run after specific file handlers
    if (normalizedFileType === 'LINK' || normalizedFileType === 'URL') {
      return (
        <div className="w-full h-full flex flex-col">
          <div className="bg-blue-50 border-b border-blue-200 p-3 flex items-center justify-between">
            <div className="flex items-center flex-1 min-w-0">
              <LinkIcon className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-blue-800 truncate">
                {t('preview.externalLink', 'External Link')}: {previewUrl}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(previewUrl, '_blank')}
              className="ml-2 flex-shrink-0"
            >
              {t('preview.openInNewTab', 'Open in New Tab')}
            </Button>
          </div>
          <div className="flex-1 w-full relative">
            <iframe
              src={previewUrl}
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
              <Button variant="primary" size="sm" onClick={() => window.open(previewUrl, '_blank')}>
                {t('preview.openInNewTab', 'Open in New Tab')}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const isEmbeddableVideo = ['youtube.com', 'youtu.be', 'vimeo.com'].some(domain => previewUrl.includes(domain));
    const isProbablyWebPage = previewUrl.startsWith('http') && !isVideoFile && !isEmbeddableVideo && !officeExtensions.includes(fileExtension);
    if (isProbablyWebPage) {
      return (
        <div className="w-full h-full flex flex-col">
          <div className="bg-blue-50 border-b border-blue-200 p-3 flex items-center justify-between">
            <div className="flex items-center flex-1 min-w-0">
              <LinkIcon className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-blue-800 truncate">
                {t('preview.externalLink', 'External Link')}: {previewUrl}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(previewUrl, '_blank')}
              className="ml-2 flex-shrink-0"
            >
              {t('preview.openInNewTab', 'Open in New Tab')}
            </Button>
          </div>
          <div className="flex-1 w-full relative">
            <iframe
              src={previewUrl}
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
              <Button variant="primary" size="sm" onClick={() => window.open(previewUrl, '_blank')}>
                {t('preview.openInNewTab', 'Open in New Tab')}
              </Button>
            </div>
          </div>
        </div>
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

      {/* Modal - NO ANIMATIONS */}
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

        {/* Preview Content - with instant skeleton placeholder */}
        <div className="flex-1 overflow-hidden relative bg-gray-100">
          {/* Instant Skeleton Placeholder - shows while loading */}
          <div className={`absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center z-10 transition-opacity duration-500 ${!contentReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Skeleton content based on file type */}
            <div className="w-full h-full p-8 flex flex-col items-center justify-center space-y-4">
              {/* File icon placeholder */}
              <div className="w-24 h-24 bg-gray-300 rounded-lg animate-pulse"></div>
              
              {/* Loading text */}
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-swiss-mint"></div>
                <p className="text-gray-600 text-sm">{t('common:loading', 'Loading preview...')}</p>
              </div>
              
              {/* Fake content bars - skeleton loader */}
              <div className="w-full max-w-2xl space-y-3 mt-8">
                <div className="h-4 bg-gray-300 rounded animate-pulse" style={{ width: '100%' }}></div>
                <div className="h-4 bg-gray-300 rounded animate-pulse" style={{ width: '90%' }}></div>
                <div className="h-4 bg-gray-300 rounded animate-pulse" style={{ width: '95%' }}></div>
                <div className="h-4 bg-gray-300 rounded animate-pulse" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
          
          {/* Actual content - fades in smoothly */}
          <div className={`w-full h-full transition-opacity duration-500 ${contentReady ? 'opacity-100' : 'opacity-0'}`}>
            {renderPreview()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;

