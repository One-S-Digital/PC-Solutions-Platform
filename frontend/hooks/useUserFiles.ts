import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { DocumentItem } from '../types';

export interface UserFile extends DocumentItem {
  mimeType?: string;
  storageKey?: string;
}

interface UseUserFilesOptions {
  kind?: string;
  limit?: number;
  autoFetch?: boolean;
}

interface UseUserFilesReturn {
  files: UserFile[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totalFiles: number;
}

/**
 * Hook to fetch and manage user's files from the API
 * Used primarily for the File Gallery page for educators
 */
export const useUserFiles = (options: UseUserFilesOptions = {}): UseUserFilesReturn => {
  const { kind, limit = 50, autoFetch = true } = options;
  const { request } = useAuthenticatedApi();
  
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalFiles, setTotalFiles] = useState(0);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (kind) params.append('kind', kind);
      if (limit) params.append('limit', limit.toString());

      const queryString = params.toString();
      const endpoint = `/upload/my-files${queryString ? `?${queryString}` : ''}`;

      const response = await request<UserFile[]>(endpoint);
      
      if (response.success && response.data) {
        setFiles(response.data);
        setTotalFiles(response.data.length);
      } else {
        // If no data but success, return empty array
        setFiles([]);
        setTotalFiles(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(errorMessage);
      console.error('Error fetching user files:', err);
      // Don't clear files on error to preserve any existing data
    } finally {
      setLoading(false);
    }
  }, [request, kind, limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchFiles();
    }
  }, [autoFetch, fetchFiles]);

  return {
    files,
    loading,
    error,
    refetch: fetchFiles,
    totalFiles,
  };
};

export default useUserFiles;
