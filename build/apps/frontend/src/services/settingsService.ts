import { useCallback, useState } from 'react';

export enum UserRole {
  FOUNDATION = 'FOUNDATION',
  EDUCATOR = 'EDUCATOR',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  PARENT = 'PARENT',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export type FoundationSettings = Record<string, any>;
export type EducatorSettings = Record<string, any>;
export type ProductSupplierSettings = Record<string, any>;
export type ServiceProviderSettings = Record<string, any>;
export type ParentSettings = Record<string, any>;

type SettingsUnion =
  | FoundationSettings
  | EducatorSettings
  | ProductSupplierSettings
  | ServiceProviderSettings
  | ParentSettings;

export function useRoleSettings(_role: UserRole) {
  const [settings, setSettings] = useState<SettingsUnion | null>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async (_userId: string) => {
    setLoading(true);
    setError(null);
    try {
      setSettings({});
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (_userId: string, updates: Partial<SettingsUnion>) => {
    setSaving(true);
    setError(null);
    try {
      setSettings(prev => ({ ...(prev || {}), ...(updates as object) }));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update settings');
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, loading, error, saving, loadSettings, updateSettings };
}
