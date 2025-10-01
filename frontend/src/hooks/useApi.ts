import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../services/api';

// API hook state interface
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

// API hook options
interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

// Generic API hook
export const useApi = <T = any>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
) => {
  const { immediate = true, onSuccess, onError } = options;
  
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      onSuccess?.(data);
      return data;
    } catch (error) {
      const apiError = error as ApiError;
      setState({ data: null, loading: false, error: apiError });
      onError?.(apiError);
      throw apiError;
    }
  }, [apiCall, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
};

// Hook for GET requests
export const useGet = <T = any>(
  url: string,
  options: UseApiOptions = {}
) => {
  const apiCall = useCallback(() => apiClient.get<T>(url), [url]);
  return useApi(apiCall, options);
};

// Hook for POST requests
export const usePost = <T = any>(
  url: string,
  data?: any,
  options: UseApiOptions = {}
) => {
  const apiCall = useCallback(() => apiClient.post<T>(url, data), [url, data]);
  return useApi(apiCall, { ...options, immediate: false });
};

// Hook for PUT requests
export const usePut = <T = any>(
  url: string,
  data?: any,
  options: UseApiOptions = {}
) => {
  const apiCall = useCallback(() => apiClient.put<T>(url, data), [url, data]);
  return useApi(apiCall, { ...options, immediate: false });
};

// Hook for PATCH requests
export const usePatch = <T = any>(
  url: string,
  data?: any,
  options: UseApiOptions = {}
) => {
  const apiCall = useCallback(() => apiClient.patch<T>(url, data), [url, data]);
  return useApi(apiCall, { ...options, immediate: false });
};

// Hook for DELETE requests
export const useDelete = <T = any>(
  url: string,
  options: UseApiOptions = {}
) => {
  const apiCall = useCallback(() => apiClient.delete<T>(url), [url]);
  return useApi(apiCall, { ...options, immediate: false });
};

// Hook for file uploads
export const useFileUpload = <T = any>(
  url: string,
  options: UseApiOptions = {}
) => {
  const [uploadState, setUploadState] = useState<ApiState<T> & { progress: number }>({
    data: null,
    loading: false,
    error: null,
    progress: 0,
  });

  const upload = useCallback(async (file: File) => {
    setUploadState(prev => ({ ...prev, loading: true, error: null, progress: 0 }));
    
    try {
      const data = await apiClient.uploadFile<T>(url, file, (progress) => {
        setUploadState(prev => ({ ...prev, progress }));
      });
      
      setUploadState({ data, loading: false, error: null, progress: 100 });
      options.onSuccess?.(data);
      return data;
    } catch (error) {
      const apiError = error as ApiError;
      setUploadState({ data: null, loading: false, error: apiError, progress: 0 });
      options.onError?.(apiError);
      throw apiError;
    }
  }, [url, options]);

  const reset = useCallback(() => {
    setUploadState({ data: null, loading: false, error: null, progress: 0 });
  }, []);

  return {
    ...uploadState,
    upload,
    reset,
  };
};

// Hook for paginated data
export const usePaginatedApi = <T = any>(
  url: string,
  options: UseApiOptions = {}
) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [allData, setAllData] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const apiCall = useCallback(async () => {
    const response = await apiClient.get<{ data: T[]; total: number; page: number; limit: number }>(
      `${url}?page=${page}&limit=${limit}`
    );
    return response;
  }, [url, page, limit]);

  const { data, loading, error, execute } = useApi(apiCall, options);

  useEffect(() => {
    if (data) {
      if (page === 1) {
        setAllData(data.data);
      } else {
        setAllData(prev => [...prev, ...data.data]);
      }
      setHasMore(data.data.length === limit);
    }
  }, [data, page, limit]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
    execute();
  }, [execute]);

  const reset = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
  }, []);

  return {
    data: allData,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    reset,
    page,
    limit,
    setLimit,
  };
};

export default useApi;