import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

type CategoryKind =
  | 'product'
  | 'service'
  | 'content-elearning'
  | 'content-hr'
  | 'content-policy';

type CategoriesResponse = { success: boolean; data?: string[]; message?: string };

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ');

export function useCategories(kind: CategoryKind, fallback: readonly string[]) {
  const { authenticatedRequest } = useAuthenticatedApi();
  const [categories, setCategories] = useState<string[]>([...fallback]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authenticatedRequest<CategoriesResponse>(`/categories/${kind}`);
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch {
      // fallback stays
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedRequest, kind]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCategory = useCallback(
    async (rawName: string) => {
      const name = normalize(rawName);
      if (!name || name.toLowerCase() === 'other') {
        throw new Error('Please specify a category name');
      }
      const res = await authenticatedRequest<CategoriesResponse>(`/categories/${kind}`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (!res.success) {
        throw new Error(res.message || 'Failed to save category');
      }
      if (Array.isArray(res.data)) {
        setCategories(res.data);
        return res.data;
      }
      // If API didn’t return a list for some reason, refresh.
      await refresh();
      return [];
    },
    [authenticatedRequest, kind, refresh],
  );

  const normalizedCategories = useMemo(
    () => categories.map((c) => normalize(c)).filter(Boolean),
    [categories],
  );

  return { categories: normalizedCategories, isLoading, refresh, addCategory };
}

