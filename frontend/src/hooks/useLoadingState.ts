import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress?: number;
}

export interface UseLoadingStateOptions {
  initialLoading?: boolean;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  onComplete?: () => void;
}

export const useLoadingState = (options: UseLoadingStateOptions = {}) => {
  const { initialLoading = false, onError, onSuccess, onComplete } = options;
  
  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    error: null,
    progress: undefined,
  });

  const timeoutRef = useRef<NodeJS.Timeout>();

  const setLoading = useCallback((isLoading: boolean, progress?: number) => {
    setState(prev => ({
      ...prev,
      isLoading,
      progress,
      error: isLoading ? null : prev.error, // Clear error when starting to load
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false,
      progress: undefined,
    }));

    if (error && onError) {
      onError(error);
    }
  }, [onError]);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      progress,
    }));
  }, []);

  const setSuccess = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: null,
      progress: 100,
    }));

    if (onSuccess) {
      onSuccess();
    }

    if (onComplete) {
      onComplete();
    }

    // Reset progress after a delay
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        progress: undefined,
      }));
    }, 1000);
  }, [onSuccess, onComplete]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      progress: undefined,
    });
  }, []);

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: {
      onProgress?: (progress: number) => void;
      timeout?: number;
    } = {}
  ): Promise<T | null> => {
    const { onProgress, timeout = 30000 } = options;

    try {
      setLoading(true, 0);

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, timeout);
      });

      // Execute the async function
      const result = await Promise.race([
        asyncFn(),
        timeoutPromise,
      ]);

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setSuccess();
      return result;
    } catch (error) {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      return null;
    }
  }, [setLoading, setSuccess, setError]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    setLoading,
    setError,
    setProgress,
    setSuccess,
    reset,
    executeAsync,
  };
};

// Hook for managing multiple loading states
export const useMultipleLoadingStates = (keys: string[]) => {
  const [states, setStates] = useState<Record<string, LoadingState>>(
    keys.reduce((acc, key) => {
      acc[key] = { isLoading: false, error: null };
      return acc;
    }, {} as Record<string, LoadingState>)
  );

  const setLoading = useCallback((key: string, isLoading: boolean, progress?: number) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading,
        progress,
        error: isLoading ? null : prev[key].error,
      },
    }));
  }, []);

  const setError = useCallback((key: string, error: string | null) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        error,
        isLoading: false,
        progress: undefined,
      },
    }));
  }, []);

  const setSuccess = useCallback((key: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        error: null,
        progress: 100,
      },
    }));
  }, []);

  const reset = useCallback((key?: string) => {
    if (key) {
      setStates(prev => ({
        ...prev,
        [key]: { isLoading: false, error: null, progress: undefined },
      }));
    } else {
      setStates(
        keys.reduce((acc, key) => {
          acc[key] = { isLoading: false, error: null, progress: undefined };
          return acc;
        }, {} as Record<string, LoadingState>)
      );
    }
  }, [keys]);

  const isAnyLoading = Object.values(states).some(state => state.isLoading);
  const hasAnyError = Object.values(states).some(state => state.error);

  return {
    states,
    setLoading,
    setError,
    setSuccess,
    reset,
    isAnyLoading,
    hasAnyError,
  };
};

// Hook for debounced loading state
export const useDebouncedLoading = (delay: number = 300) => {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const setLoading = useCallback((loading: boolean) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (loading) {
      // Show loading immediately
      setIsLoading(true);
    } else {
      // Hide loading after delay
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
      }, delay);
    }
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isLoading, setLoading };
};

export default useLoadingState;