/**
 * Utility functions for converting public R2 URLs to secure authenticated download URLs
 */

/**
 * Extract storage key from public R2 URL
 * Converts: https://assets.procrechesolutions.com/elearning/path/file.mp4
 * To: elearning/path/file.mp4
 */
export function extractStorageKeyFromPublicUrl(publicUrl: string): string | null {
  try {
    // Handle R2 public domain URLs
    if (publicUrl.includes('assets.procrechesolutions.com')) {
      const url = new URL(publicUrl);
      // Remove leading slash and return the path as storage key
      return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    }

    // Handle other R2 public URLs (if you have custom domains)
    // Pattern: https://pub-xxxxx.r2.dev/path/to/file
    if (publicUrl.includes('.r2.dev')) {
      const url = new URL(publicUrl);
      return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    }

    return null;
  } catch (error) {
    console.error('Error extracting storage key from URL:', error);
    return null;
  }
}

/**
 * Check if URL is a public R2 storage URL that should be converted to secure endpoint
 */
export function isPublicStorageUrl(url: string): boolean {
  if (!url) return false;
  
  // Check for known R2 public domains
  return (
    url.includes('assets.procrechesolutions.com') ||
    url.includes('.r2.dev') ||
    url.includes('r2.cloudflarestorage.com')
  );
}

/**
 * Convert public R2 URL to secure authenticated download URL
 * 
 * @param publicUrl - The public R2 URL
 * @returns Secure download URL that requires authentication
 * 
 * Example:
 * Input: https://assets.procrechesolutions.com/elearning/course/video.mp4
 * Output: /api/upload/download/elearning/course/video.mp4
 */
export function convertToSecureDownloadUrl(publicUrl: string): string {
  // If already a secure download URL, return as-is
  if (publicUrl.startsWith('/api/upload/download/')) {
    return publicUrl;
  }

  // If it's a full secure download URL, extract the path
  if (publicUrl.includes('/api/upload/download/')) {
    try {
      const url = new URL(publicUrl);
      return url.pathname; // Returns /api/upload/download/...
    } catch {
      // If not a valid URL, check if it contains the pattern
      const match = publicUrl.match(/\/api\/upload\/download\/.+$/);
      if (match) {
        return match[0];
      }
    }
  }

  // Extract storage key from public R2 URL
  const storageKey = extractStorageKeyFromPublicUrl(publicUrl);
  
  if (storageKey) {
    // Return secure download URL
    return `/api/upload/download/${storageKey}`;
  }

  // If we can't convert it, return the original URL
  // (might be external YouTube, Vimeo, etc.)
  return publicUrl;
}

/**
 * Convert fileUrl to secure format if needed
 * Handles multiple URL formats and returns the most secure version
 */
export function ensureSecureFileUrl(fileUrl: string | undefined | null): string {
  if (!fileUrl) return '';

  // Skip external video platforms
  const isExternalVideo = 
    fileUrl.includes('youtube.com') ||
    fileUrl.includes('youtu.be') ||
    fileUrl.includes('vimeo.com');
  
  if (isExternalVideo) {
    return fileUrl;
  }

  // Convert public R2 URLs to secure download URLs
  if (isPublicStorageUrl(fileUrl)) {
    return convertToSecureDownloadUrl(fileUrl);
  }

  // If already a secure URL, return as-is
  if (fileUrl.startsWith('/api/upload/download/') || 
      fileUrl.includes('/api/upload/download/')) {
    return fileUrl;
  }

  // For relative paths or storage keys, assume they need secure endpoint
  if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
    return `/api/upload/download/${fileUrl}`;
  }

  // Return original for other cases
  return fileUrl;
}

