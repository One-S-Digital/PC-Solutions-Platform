import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Edit,
  Check,
  X,
  Globe,
  Filter,
  Plus,
  RefreshCw,
  AlertCircle,
  Download,
  Upload,
  History,
  Package,
  Database,
} from 'lucide-react';
import { useApiClient, apiService } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Card from '../components/design-system/Card';
import Button from '../components/design-system/Button';

interface TranslationKey {
  namespace: string;
  key: string;
  translations: {
    [lang: string]: {
      value: string;
      updatedAt: string;
      updatedBy?: string;
      needsReview: boolean;
    };
  };
}

const LANGUAGES = ['en', 'fr', 'de'];

// Persist auto-fix state across dev-server reloads so Step 2 remains enabled
// even when Vite reloads the page after the script edits files.
const AUTO_FIX_STORAGE_KEY = 'translationAutoFixState';

export default function Translations() {
  const { t } = useTranslation(['admin', 'common']);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [autoFixJustRan, setAutoFixJustRan] = useState(false); // Track if auto-fix just ran
  const [newKeysToTranslate, setNewKeysToTranslate] = useState<Array<{namespace: string; key: string}>>([]);
  const [editing, setEditing] = useState<{
    namespace: string;
    key: string;
    lang: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [newReleaseVersion, setNewReleaseVersion] = useState('');
  const [newReleaseDescription, setNewReleaseDescription] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'translations' | 'audit' | 'releases'>('translations');
  const [forceRetranslate, setForceRetranslate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [includePlaceholders, setIncludePlaceholders] = useState(false);

  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  // Rehydrate auto-fix state from sessionStorage (survives Vite reloads)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AUTO_FIX_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        autoFixJustRan?: boolean;
        newKeysToTranslate?: Array<{ namespace: string; key: string }>;
      };

      if (parsed?.newKeysToTranslate && parsed.newKeysToTranslate.length > 0) {
        console.log('♻️ Restoring auto-fix state from sessionStorage:', parsed);
        setNewKeysToTranslate(parsed.newKeysToTranslate);
        setAutoFixJustRan(!!parsed.autoFixJustRan);
      }
    } catch (e) {
      console.warn('Failed to restore auto-fix state from sessionStorage', e);
    }
  }, []);

  // Fetch namespaces
  const { data: namespacesResponse } = useQuery({
    queryKey: ['translation-namespaces'],
    queryFn: () => apiService.getNamespaces(apiClient),
    enabled: !!apiClient,
  });

  useEffect(() => {
    if (namespacesResponse) {
      console.log('🔍 Namespaces Response:', {
        fullResponse: namespacesResponse,
        data: namespacesResponse.data,
        dataData: namespacesResponse.data?.data,
        isArray: Array.isArray(namespacesResponse.data?.data),
      });
    }
    if (namespacesResponse?.data?.data) {
      setNamespaces(namespacesResponse.data.data);
    }
  }, [namespacesResponse]);

  // Fetch translation keys with pagination and search
  const { data: keysResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['translation-keys', selectedNamespace, searchQuery, page, limit],
    queryFn: async () => {
      const response = await apiService.getTranslationKeys(apiClient, {
        namespace: selectedNamespace || undefined,
        search: searchQuery || undefined,
        page,
        limit,
      });
      return response;
    },
    enabled: !!apiClient,
    onError: (error) => {
      console.error('❌ Error fetching translation keys:', error);
    },
  });

  // Reset to page 1 when namespace or search changes
  useEffect(() => {
    setPage(1);
  }, [selectedNamespace, searchQuery]);

  const keys: TranslationKey[] = keysResponse?.data?.data || [];
  const pagination = keysResponse?.data?.pagination;

  // Update translation mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      namespace,
      key,
      lang,
      value,
    }: {
      namespace: string;
      key: string;
      lang: string;
      value: string;
    }) => {
      return apiService.updateTranslation(apiClient, namespace, key, lang, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      setEditing(null);
      setEditValue('');
    },
  });

  // Mark reviewed mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      namespace,
      key,
      lang,
    }: {
      namespace: string;
      key: string;
      lang: string;
    }) => {
      return apiService.markTranslationReviewed(apiClient, namespace, key, lang);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
    },
  });

  // Create release mutation
  const releaseMutation = useMutation({
    mutationFn: async ({ version, description }: { version: string; description?: string }) => {
      return apiService.createTranslationRelease(apiClient, version, description);
    },
    onSuccess: () => {
      setNewReleaseVersion('');
      setNewReleaseDescription('');
      alert('Translation release created successfully!');
    },
  });

  // Machine translation mutation
  const translateMutation = useMutation({
    mutationFn: async ({
      sourceLang,
      targetLang,
      namespace,
      force,
    }: {
      sourceLang: string;
      targetLang: string;
      namespace?: string;
      force?: boolean;
    }) => {
      return apiService.translateMissing(apiClient, sourceLang, targetLang, namespace, undefined, force);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      alert(`Successfully translated ${data.data.translated} ${data.data.translated === 1 ? 'translation' : 'translations'}!`);
    },
    onError: (error: any) => {
      alert(`Translation failed: ${error.response?.data?.message || error.message}`);
    },
  });

  // Cleanup prefixes mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      return apiService.cleanupPrefixes(apiClient);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      alert(`Successfully cleaned up ${data.data.cleaned} translations with prefixes!`);
    },
    onError: (error: any) => {
      alert(`Cleanup failed: ${error.response?.data?.message || error.message}`);
    },
  });

  // Cleanup English placeholders that look like raw keys (e.g. "supportPage.ticketForm.subjectLabel")
  const fixEnglishPlaceholdersMutation = useMutation({
    mutationFn: async () => {
      return apiService.fixEnglishPlaceholders(apiClient);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      alert(
        `✅ English cleanup complete!\n\n` +
          `📊 Updated ${data.data.cleaned} English translations that looked like raw keys,\n` +
          `out of ${data.data.affected} total English entries scanned.\n\n` +
          `🔄 Translation version updated - frontend will reload translations automatically.\n\n` +
          `💡 If you don't see changes immediately, refresh the page (Ctrl+R or F5) to clear the browser cache.`,
      );
    },
    onError: (error: any) => {
      alert(`Cleanup failed: ${error.response?.data?.message || error.message}`);
    },
  });

  // Import from JSON files mutation
  const importFromFilesMutation = useMutation({
    mutationFn: async () => {
      const result = await apiService.importFromJsonFiles(apiClient);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      queryClient.invalidateQueries({ queryKey: ['namespaces'] });
      
      const details = Object.entries(data.data.details || {})
        .map(([key, count]) => `  ${key}: ${count} keys`)
        .join('\n');
      
      alert(
        `✅ Successfully imported ${data.data.imported} translations from JSON files!\n\n` +
        `📊 Details:\n${details}\n\n` +
        `🔄 Translation cache cleared - you can now translate these keys.`
      );
    },
    onError: (error: any) => {
      alert(`Import failed: ${error.response?.data?.message || error.message}`);
    },
  });

  // Full Sync state
  const [fullSyncJobId, setFullSyncJobId] = useState<string | null>(null);
  const [fullSyncStatus, setFullSyncStatus] = useState<'idle' | 'polling' | 'done' | 'error'>('idle');

  // Full Sync mutation - starts async job and returns jobId
  const fullSyncMutation = useMutation({
    mutationFn: async () => {
      const result = await apiService.fullSync(apiClient);
      if (result.status === 202 && result.data?.jobId) {
        return result.data.jobId;
      }
      throw new Error('Failed to start full sync job');
    },
    onSuccess: (jobId) => {
      setFullSyncJobId(jobId);
      setFullSyncStatus('polling');
    },
    onError: (error: any) => {
      if (error.response?.status === 429) {
        alert(
          `⚠️ Rate limited: Please wait 5 minutes before running Full Sync again.\n\n` +
          `This limit prevents overloading the translation service.`
        );
      } else {
        alert(`Failed to start full sync: ${error.response?.data?.message || error.message}`);
      }
      setFullSyncStatus('error');
    },
  });

  // Poll job status with adaptive interval (10s base, backoff to 20s/30s on failure)
  useEffect(() => {
    if (fullSyncStatus !== 'polling' || !fullSyncJobId) return;

    let pollInterval = 10000; // Start with 10 seconds
    let consecutiveFailures = 0;
    let pollTimeout: NodeJS.Timeout;

    const poll = async () => {
      try {
        const result = await apiService.getFullSyncStatus(apiClient, fullSyncJobId);
        const job = result.data?.job;

        if (!job) {
          clearTimeout(pollTimeout);
          setFullSyncStatus('error');
          alert('Job not found');
          return;
        }

        // Reset interval on success
        consecutiveFailures = 0;
        pollInterval = 10000;

        if (job.status === 'done') {
          clearTimeout(pollTimeout);
          setFullSyncStatus('done');
          queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
          queryClient.invalidateQueries({ queryKey: ['namespaces'] });
          
          const duration = job.duration ? `${Math.round(job.duration / 1000)}s` : 'unknown';
          const resultData = job.result;
          
          alert(
            `🎉 Full Sync Complete!\n\n` +
            `⏱️ Duration: ${duration}\n\n` +
            `📥 Imported: ${resultData?.imported || 0} EN keys\n` +
            `🇫🇷 Translated FR: ${resultData?.translatedFr || 0} keys\n` +
            `🇩🇪 Translated DE: ${resultData?.translatedDe || 0} keys\n` +
            `📤 Exported: ${resultData?.exported || 0} keys to JSON files\n\n` +
            `✅ Now restart your frontend (pnpm dev) and refresh the page!`
          );
          
          // Reset after showing alert
          setTimeout(() => {
            setFullSyncJobId(null);
            setFullSyncStatus('idle');
          }, 1000);
          return;
        } else if (job.status === 'error') {
          clearTimeout(pollTimeout);
          setFullSyncStatus('error');
          alert(
            `❌ Full Sync Failed!\n\n` +
            `${job.error?.message || 'Unknown error'}\n\n` +
            `Try running individual steps from Advanced Options instead.`
          );
          setFullSyncJobId(null);
          setFullSyncStatus('idle');
          return;
        }
        // If status is 'queued' or 'running', continue polling
      } catch (error: any) {
        console.error('Error polling job status:', error);
        consecutiveFailures++;
        
        // Backoff: 10s → 20s → 30s (max)
        if (consecutiveFailures === 1) {
          pollInterval = 20000;
        } else if (consecutiveFailures >= 2) {
          pollInterval = 30000;
        }
      }

      // Schedule next poll
      pollTimeout = setTimeout(poll, pollInterval);
    };

    // Start polling
    pollTimeout = setTimeout(poll, pollInterval);

    return () => clearTimeout(pollTimeout);
  }, [fullSyncStatus, fullSyncJobId, apiClient, queryClient]);

  // Auto-fix hardcoded strings mutation
  const autoFixMutation = useMutation({
    mutationFn: async () => {
      console.log('🔵 autoFixMutation: mutationFn called!');
      const result = await apiService.autoFixHardcodedStrings(apiClient);
      console.log('🔵 autoFixMutation: API result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('🟢 autoFixMutation: onSuccess called!', data);
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      
      const totalNewItems = (data.data.fixed || 0) + (data.data.missingKeysCreated || 0);
      
      // Enable the auto-translate button if strings were fixed or missing keys were created
      if (totalNewItems > 0) {
        // Extract the new keys that were created from the details
        const newKeys: Array<{namespace: string; key: string}> = [];
        
        // Add keys from fixed hardcoded strings
        if (data.data.details?.fixed) {
          data.data.details.fixed.forEach((item: any) => {
            // Parse the translation key to get namespace and key
            // Format is "namespace:key.path.here"
            const [namespace, ...keyParts] = item.translationKey.split(':');
            if (namespace && keyParts.length > 0) {
              const key = keyParts.join(':').replace(/:/g, '.'); // Convert back to dot notation
              newKeys.push({ namespace, key });
            }
          });
        }
        
        // Add keys from missing translations
        if (data.data.details?.missingKeys) {
          data.data.details.missingKeys.forEach((item: any) => {
            newKeys.push({ namespace: item.namespace, key: item.keyPath });
          });
        }
        
        setNewKeysToTranslate(newKeys);
        setAutoFixJustRan(true);

        // Persist to sessionStorage so Step 2 stays enabled after a dev-server reload
        try {
          console.log('💾 Saving auto-fix state to sessionStorage:', {
            autoFixJustRan: true,
            newKeysToTranslate: newKeys,
          });
          sessionStorage.setItem(
            AUTO_FIX_STORAGE_KEY,
            JSON.stringify({
              autoFixJustRan: true,
              newKeysToTranslate: newKeys,
            }),
          );
        } catch (e) {
          console.warn('Failed to persist auto-fix state to sessionStorage', e);
        }
        alert(`✅ Successful translation check!\n\n📊 Results:\n• Fixed hardcoded strings: ${data.data.fixed || 0}\n• Missing keys created: ${data.data.missingKeysCreated || 0}\n• Skipped: ${data.data.skipped}\n• Errors: ${data.data.errors}\n\n${data.data.message}\n\n🌍 NEXT STEP: Click the "Auto-Translate FR/DE" button (Step 2, now enabled) to automatically translate the ${totalNewItems} new entries to French and German!`);
      } else {
        setNewKeysToTranslate([]);
        setAutoFixJustRan(false);
        try {
          sessionStorage.removeItem(AUTO_FIX_STORAGE_KEY);
        } catch (e) {
          console.warn('Failed to clear auto-fix state from sessionStorage', e);
        }
        alert(
          `✅ Translation check complete!\n\n📊 Results:\n• Fixed: ${data.data.fixed || 0}\n` +
            `• Missing keys created: ${data.data.missingKeysCreated || 0}\n` +
            `• Skipped: ${data.data.skipped}\n• Errors: ${data.data.errors}\n\n` +
            `${data.data.message}\n\n💡 Everything is up to date!`,
        );
      }
    },
    onError: (error: any) => {
      alert(`❌ Auto-fix failed: ${error.response?.data?.message || error.message}`);
    },
  });

  // Translate missing/prefixed strings (optionally forced)
  const translateMissingMutation = useMutation({
    mutationFn: async () => {
      const ns = selectedNamespace || undefined;
      const frResult = await apiService.translateMissing(
        apiClient,
        'en',
        'fr',
        ns,
        includePlaceholders ? undefined : [],
        forceRetranslate,
        includePlaceholders,
      );
      const deResult = await apiService.translateMissing(
        apiClient,
        'en',
        'de',
        ns,
        includePlaceholders ? undefined : [],
        forceRetranslate,
        includePlaceholders,
      );
      return { frResult, deResult };
    },
    onSuccess: ({ frResult, deResult }) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      const total = (frResult.data?.translated || 0) + (deResult.data?.translated || 0);
      alert(
        `✅ Translation complete!\n\n` +
          `Scope: ${selectedNamespace || 'all namespaces'}\n` +
          `Force re-translate: ${forceRetranslate ? 'Yes' : 'No'}\n` +
          `FR translated: ${frResult.data?.translated || 0}\n` +
          `DE translated: ${deResult.data?.translated || 0}\n` +
          `Total: ${total}`,
      );
    },
    onError: (error: any) => {
      alert(`❌ Translation failed: ${error.response?.data?.message || error.message}`);
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (keys: Array<{ namespace: string; key: string; lang: string }>) => {
      return apiService.bulkApproveTranslations(apiClient, keys);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      setSelectedKeys(new Set());
      alert(`Successfully approved ${data.data.approved} translations!`);
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async ({ format, namespace }: { format?: 'json' | 'csv'; namespace?: string }) => {
      const response = await apiService.exportTranslations(apiClient, { format, namespace });
      return { format, response, namespace };
    },
    onSuccess: ({ format, response, namespace }) => {
      try {
        if (format === 'csv') {
          // CSV is returned as plain text string (responseType: 'text')
          const csvData = typeof response.data === 'string' ? response.data : '';
          if (!csvData) {
            alert('Failed to export CSV: No data received');
            return;
          }
          const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `translations${namespace ? `-${namespace}` : ''}-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // JSON is wrapped in ApiResponse
          const jsonData = (response.data as any)?.data || response.data;
          if (!jsonData) {
            alert('Failed to export JSON: No data received');
            return;
          }
          const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `translations${namespace ? `-${namespace}` : ''}-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Export error:', error);
        alert(`Export failed: ${(error as Error).message}`);
      }
    },
    onError: (error: any) => {
      console.error('Export mutation error:', error);
      alert(`Export failed: ${error.response?.data?.message || error.message}`);
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (translations: Array<{ namespace: string; key: string; lang: string; value: string }>) => {
      return apiService.importTranslations(apiClient, translations);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      alert(`Successfully imported ${data.data.imported} translations!`);
    },
  });

  // Audit logs query
  const { data: auditLogsResponse } = useQuery({
    queryKey: ['audit-logs', 'static'],
    queryFn: () => apiService.getAuditLogs(apiClient, { type: 'static', limit: 100 }),
    enabled: !!apiClient && activeTab === 'audit',
  });

  // Releases query
  const { data: releasesResponse } = useQuery({
    queryKey: ['releases'],
    queryFn: () => apiService.listReleases(apiClient),
    enabled: !!apiClient && activeTab === 'releases',
  });

  const startEdit = (
    namespace: string,
    key: string,
    lang: string,
    currentValue: string,
  ) => {
    setEditing({ namespace, key, lang });
    setEditValue(currentValue);
  };

  const saveTranslation = () => {
    if (!editing) return;

    updateMutation.mutate({
      namespace: editing.namespace,
      key: editing.key,
      lang: editing.lang,
      value: editValue,
    });
  };

  // No client-side filtering needed - backend handles it
  const filteredKeys = keys;

  const handleCreateRelease = () => {
    if (!newReleaseVersion) {
      alert('Please enter a version number');
      return;
    }
    releaseMutation.mutate({
      version: newReleaseVersion,
      description: newReleaseDescription || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{t('admin:translations.error.loadFailed', 'Failed to load translations')}</div>
        <p className="text-gray-600">{t('admin:translations.error.description', 'Please check your connection and try again.')}</p>
      </div>
    );
  }

  const handleBulkApprove = () => {
    const keysToApprove: Array<{ namespace: string; key: string; lang: string }> = [];
    selectedKeys.forEach((key) => {
      const [namespace, translationKey, lang] = key.split('::');
      if (namespace && translationKey && lang) {
        keysToApprove.push({ namespace, key: translationKey, lang });
      }
    });
    if (keysToApprove.length === 0) {
      alert('Please select translations to approve');
      return;
    }
    bulkApproveMutation.mutate(keysToApprove);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be selected again
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        // Try to parse as JSON
        let translations: Array<{ namespace: string; key: string; lang: string; value: string }>;
        try {
          const parsed = JSON.parse(content);
          
          // Handle different JSON formats
          if (Array.isArray(parsed)) {
            translations = parsed;
          } else if (parsed.data && Array.isArray(parsed.data)) {
            // Handle ApiResponse format
            translations = parsed.data;
          } else {
            throw new Error('Invalid JSON format. Expected an array of translations.');
          }
          
          // Validate translation structure
          if (translations.length === 0) {
            alert('File is empty or contains no translations.');
            return;
          }
          
          // Validate each translation has required fields
          const invalid = translations.find(
            (t) => !t.namespace || !t.key || !t.lang || t.value === undefined
          );
          if (invalid) {
            alert(`Invalid translation format. Missing required fields: namespace, key, lang, or value.`);
            return;
          }
          
          // Confirm before importing
          if (!confirm(`Import ${translations.length} translation(s)? This will update existing translations.`)) {
            return;
          }
          
          importMutation.mutate(translations);
        } catch (parseError) {
          alert(`Failed to parse JSON file: ${(parseError as Error).message}`);
        }
      } catch (error) {
        alert('Failed to read file: ' + (error as Error).message);
      }
    };
    reader.onerror = () => {
      alert('Failed to read file');
    };
    reader.readAsText(file);
  };

  const toggleKeySelection = (namespace: string, key: string, lang: string) => {
    const keyId = `${namespace}::${key}::${lang}`;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const isKeySelected = (namespace: string, key: string, lang: string) => {
    return selectedKeys.has(`${namespace}::${key}::${lang}`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center gap-3">
            <Globe className="h-8 w-8 text-swiss-mint" />
            {t('admin:translations.title', 'Translation Management')}
          </h1>
          <p className="text-gray-600 mt-1">{t('admin:translations.subtitle', 'Manage static UI translations')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('translations')}
            className={`${
              activeTab === 'translations'
                ? 'border-swiss-mint text-swiss-mint'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            {t('admin:translations.tabs.translations', 'Translations')}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`${
              activeTab === 'audit'
                ? 'border-swiss-mint text-swiss-mint'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <History className="h-4 w-4" />
            {t('admin:translations.tabs.auditLogs', 'Audit Logs')}
          </button>
          <button
            onClick={() => setActiveTab('releases')}
            className={`${
              activeTab === 'releases'
                ? 'border-swiss-mint text-swiss-mint'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Package className="h-4 w-4" />
            {t('admin:translations.tabs.releases', 'Releases')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'translations' && (
        <>

      {/* Release Management */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">{t('admin:translations.releases.title', 'Translation Releases')}</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder={t('admin:translations.releases.versionPlaceholder', 'Version (e.g., v1.2.3)')}
            value={newReleaseVersion}
            onChange={(e) => setNewReleaseVersion(e.target.value)}
            className="border rounded px-3 py-2 flex-1"
          />
          <input
            type="text"
            placeholder={t('admin:translations.releases.descriptionPlaceholder', 'Description (optional)')}
            value={newReleaseDescription}
            onChange={(e) => setNewReleaseDescription(e.target.value)}
            className="border rounded px-3 py-2 flex-1"
          />
          <Button
            onClick={handleCreateRelease}
            disabled={releaseMutation.isPending || !newReleaseVersion}
          >
            {releaseMutation.isPending ? t('admin:translations.releases.creating', 'Creating...') : t('admin:translations.releases.createRelease', 'Create Release')}
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {t('admin:translations.releases.description', 'Creating a release will invalidate all caches and force clients to fetch fresh translations.')}
        </p>
      </Card>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:translations.filters.namespace', 'Namespace')}
            </label>
            <select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">{t('common:allnamespaces', 'All namespaces')}</option>
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:translations.filters.search', 'Search')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin:translations.searchPlaceholder', 'Search for keys or values...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded px-3 py-2 pl-10"
              />
            </div>
          </div>
        </div>
        {/* ONE-CLICK SYNC - The main action */}
        <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
                <Globe className="w-6 h-6" />
                {t('admin:translations.oneClickSync.title', 'One-Click Sync')}
              </h2>
              <p className="text-sm text-emerald-700 mt-1">
                {t('admin:translations.oneClickSync.description', 'Import English keys → Translate to French & German → Export to files.')}<br/>
                <span className="text-xs opacity-75">{t('admin:translations.oneClickSync.subDescription', 'This does everything in one step! Takes 5-10 minutes.')}</span>
              </p>
            </div>
            <Button
              onClick={() => {
                if (
                  confirm(
                    '🔄 Full Sync will:\n\n' +
                    '1. Import EN translations from JSON files\n' +
                    '2. Translate missing keys to French (FR)\n' +
                    '3. Translate missing keys to German (DE)\n' +
                    '4. Export everything back to JSON files\n\n' +
                    '⏱️ This takes 5-10 minutes. Continue?',
                  )
                ) {
                  fullSyncMutation.mutate();
                }
              }}
              disabled={fullSyncMutation.isPending || fullSyncStatus === 'polling'}
              variant="primary"
              className="text-lg px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg"
            >
              {fullSyncMutation.isPending || fullSyncStatus === 'polling' ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin inline" />
                  {fullSyncStatus === 'polling' 
                    ? t('admin:translations.oneClickSync.syncing', 'Syncing... (this takes a few minutes)')
                    : t('admin:translations.oneClickSync.starting', 'Starting sync...')}
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5 mr-2 inline" />
                  {t('admin:translations.oneClickSync.button', '🔄 Full Sync All Languages')}
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Advanced Options - Collapsed by default */}
        <Card className="p-4">
          <details className="group">
            <summary className="cursor-pointer flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <span className="text-sm font-medium">{t('admin:translations.advanced.title', '⚙️ Advanced Options (Individual Steps)')}</span>
              <span className="text-xs text-gray-400">{t('admin:translations.advanced.expand', 'Click to expand')}</span>
            </summary>
            
            <div className="mt-4 space-y-3 pt-4 border-t">
              {/* Step 0 - Import from JSON files */}
              <div className="p-3 rounded border border-blue-200 bg-blue-50/50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-sm font-medium text-blue-800">{t('admin:translations.advanced.importFromFiles', 'Import from JSON Files')}</div>
                    <div className="text-xs text-blue-600">{t('admin:translations.advanced.importFromFilesDesc', 'Load EN/FR/DE from packages/translations/locales into database')}</div>
                  </div>
                  <Button
                    onClick={() => importFromFilesMutation.mutate()}
                    disabled={importFromFilesMutation.isPending}
                    variant="ghost"
                    className="text-xs px-2 py-1 text-blue-700 hover:bg-blue-100"
                  >
                    {importFromFilesMutation.isPending ? t('admin:translations.advanced.importing', 'Importing...') : t('admin:translations.advanced.import', 'Import')}
                  </Button>
                </div>
              </div>

              {/* Step 1 - Scan & Fix */}
              <div className="p-3 rounded border border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{t('admin:translations.advanced.scanFix', 'Scan & Fix Hardcoded Strings')}</div>
                    <div className="text-xs text-gray-500">{t('admin:translations.advanced.scanFixDesc', 'Find hardcoded strings in code and create translation keys')}</div>
                  </div>
                  <Button
                    onClick={() => autoFixMutation.mutate()}
                    disabled={autoFixMutation.isPending}
                    variant="ghost"
                    className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100"
                  >
                    {autoFixMutation.isPending ? t('admin:translations.advanced.scanning', 'Scanning...') : t('admin:translations.advanced.scan', 'Scan')}
                  </Button>
                </div>
              </div>

              {/* Step 2 - Translate */}
              <div className="p-3 rounded border border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{t('admin:translations.advanced.translateMissing', 'Translate Missing (FR/DE)')}</div>
                    <div className="text-xs text-gray-500">{t('admin:translations.advanced.translateMissingDesc', 'Translate missing keys to French and German')}</div>
                  </div>
                  <Button
                    onClick={() => translateMissingMutation.mutate()}
                    disabled={translateMissingMutation.isPending}
                    variant="ghost"
                    className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100"
                  >
                    {translateMissingMutation.isPending ? t('admin:translations.advanced.translating', 'Translating...') : t('admin:translations.advanced.translate', 'Translate')}
                  </Button>
                </div>
              </div>

              {/* Step 3 - Clean Prefixes */}
              <div className="p-3 rounded border border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{t('admin:translations.advanced.cleanPrefixes', 'Clean Prefixes')}</div>
                    <div className="text-xs text-gray-500">{t('admin:translations.advanced.cleanPrefixesDesc', 'Remove [FR]/[DE]/[EN] prefixes from translations')}</div>
                  </div>
                  <Button
                    onClick={() => cleanupMutation.mutate()}
                    disabled={cleanupMutation.isPending}
                    variant="ghost"
                    className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100"
                  >
                    {cleanupMutation.isPending ? t('admin:translations.advanced.cleaning', 'Cleaning...') : t('admin:translations.advanced.clean', 'Clean')}
                  </Button>
                </div>
              </div>

              {/* Export to Files */}
              <div className="p-3 rounded border border-green-200 bg-green-50/50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-sm font-medium text-green-700">{t('admin:translations.advanced.exportToFiles', 'Export to JSON Files')}</div>
                    <div className="text-xs text-green-600">{t('admin:translations.advanced.exportToFilesDesc', 'Sync database translations back to JSON files (required for frontend)')}</div>
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        const result = await apiService.exportToJsonFiles(apiClient);
                        alert(`✅ Exported ${result.data.exported} translations to JSON files!\n\nNow restart your frontend (pnpm dev) and refresh.`);
                      } catch (err: any) {
                        alert(`Export failed: ${err.message}`);
                      }
                    }}
                    variant="ghost"
                    className="text-xs px-2 py-1 text-green-700 hover:bg-green-100"
                  >
                    {t('admin:translations.advanced.export', 'Export')}
                  </Button>
                </div>
              </div>
            </div>
          </details>
        </Card>

        {/* Additional Advanced Controls */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">{t('admin:translations.moreOptions.title', 'More Options')}</div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showAdvanced ? t('admin:translations.moreOptions.hide', 'Hide') : t('admin:translations.moreOptions.show', 'Show')}
            </button>
          </div>
          {showAdvanced && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center flex-wrap">
                <Button
                  onClick={() => refetch()}
                  variant="secondary"
                  className="flex items-center gap-2 text-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  {t('admin:translations.moreOptions.refresh', 'Refresh')}
                </Button>
                <Button
                  onClick={() => {
                    if (
                      confirm(
                        'This will scan English translations for values that look like raw keys and replace them with readable labels.\n\nContinue?',
                      )
                    ) {
                      fixEnglishPlaceholdersMutation.mutate();
                    }
                  }}
                  disabled={fixEnglishPlaceholdersMutation.isPending}
                  variant="secondary"
                  className="text-sm px-3 py-1.5 text-indigo-600 hover:text-indigo-700 border-indigo-200"
                >
                  {fixEnglishPlaceholdersMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin inline" />
                      {t('admin:translations.moreOptions.fixingEnLabels', 'Fixing EN Labels...')}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2 inline" />
                      {t('admin:translations.moreOptions.fixEnLabels', 'Fix EN Key Labels')}
                    </>
                  )}
                </Button>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                {selectedKeys.size > 0 && (
                  <Button
                    onClick={handleBulkApprove}
                    disabled={bulkApproveMutation.isPending}
                    variant="secondary"
                    className="text-sm px-3 py-1"
                  >
                    {bulkApproveMutation.isPending
                      ? t('admin:translations.moreOptions.approving', 'Approving...')
                      : t('admin:translations.moreOptions.approveSelected', 'Approve {{count}} Selected', { count: selectedKeys.size })}
                  </Button>
                )}
                <Button
                  onClick={() =>
                    exportMutation.mutate({ format: 'json', namespace: selectedNamespace || undefined })
                  }
                  disabled={exportMutation.isPending}
                  variant="secondary"
                  className="text-sm px-3 py-1 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('admin:translations.moreOptions.exportJson', 'Export JSON')}
                </Button>
                <Button
                  onClick={() =>
                    exportMutation.mutate({ format: 'csv', namespace: selectedNamespace || undefined })
                  }
                  disabled={exportMutation.isPending}
                  variant="secondary"
                  className="text-sm px-3 py-1 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('admin:translations.moreOptions.exportCsv', 'Export CSV')}
                </Button>
                <label className="text-sm px-3 py-1 border rounded cursor-pointer flex items-center gap-2 hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  {t('admin:translations.moreOptions.import', 'Import')}
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </Card>

      {/* End Filters / Actions card */}
      </Card>

      {/* Translation Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allKeys = new Set<string>();
                        keys.forEach((key) => {
                          LANGUAGES.forEach((lang) => {
                            if (key.translations[lang]?.needsReview) {
                              allKeys.add(`${key.namespace}::${key.key}::${lang}`);
                            }
                          });
                        });
                        setSelectedKeys(allKeys);
                      } else {
                        setSelectedKeys(new Set());
                      }
                    }}
                    checked={
                      keys.length > 0 &&
                      selectedKeys.size > 0 &&
                      keys.every((key) =>
                        LANGUAGES.every(
                          (lang) =>
                            !key.translations[lang]?.needsReview ||
                            selectedKeys.has(`${key.namespace}::${key.key}::${lang}`),
                        ),
                      )
                    }
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:translations.table.namespace', 'Namespace')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:translations.table.key', 'Key')}
                </th>
                {LANGUAGES.map((lang) => (
                  <th
                    key={lang}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t(`common:languageLabels.${lang}`, lang === 'en' ? 'English' : lang === 'fr' ? 'Français' : 'Deutsch')}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin:translations.table.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={LANGUAGES.length + 4} className="px-4 py-8 text-center text-gray-500">
                    {t('admin:translations.table.noTranslationsFound', 'No translations found')}
                  </td>
                </tr>
              ) : (
                filteredKeys.map((item) => {
                  const isEditing = editing?.namespace === item.namespace && editing?.key === item.key;
                  const hasReviewable = LANGUAGES.some((lang) => item.translations[lang]?.needsReview);

                  return (
                    <tr key={`${item.namespace}:${item.key}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {hasReviewable && (
                          <input
                            type="checkbox"
                            checked={LANGUAGES.every(
                              (lang) =>
                                !item.translations[lang]?.needsReview ||
                                isKeySelected(item.namespace, item.key, lang),
                            )}
                            onChange={(e) => {
                              LANGUAGES.forEach((lang) => {
                                if (item.translations[lang]?.needsReview) {
                                  toggleKeySelection(item.namespace, item.key, lang);
                                }
                              });
                            }}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.namespace}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
                        {item.key}
                      </td>
                      {LANGUAGES.map((lang) => {
                        const translation = item.translations[lang];
                        const isEditingThis = isEditing && editing?.lang === lang;
                        const needsReview = translation?.needsReview;

                        return (
                          <td key={lang} className="px-4 py-3 text-sm">
                            {isEditingThis ? (
                              <div className="flex gap-2">
                                <textarea
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="border rounded px-2 py-1 flex-1 text-sm"
                                  rows={2}
                                />
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={saveTranslation}
                                    disabled={updateMutation.isPending}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                    title={t('common:titles.save')}
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditing(null)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title={t('common:titles.cancel')}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div
                                  className={
                                    translation?.needsReview
                                      ? 'text-orange-600 font-medium'
                                      : ''
                                  }
                                >
                                  {translation?.value || (
                                    <span className="text-gray-400 italic">{t('admin:translations.missing', 'Missing')}</span>
                                  )}
                                </div>
                                {translation?.needsReview && (
                                  <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {t('admin:translations.stats.needsReview', 'Needs Review')}
                                  </div>
                                )}
                                {translation?.updatedAt && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {new Date(translation.updatedAt).toLocaleDateString()}
                                  </div>
                                )}
                                <button
                                  onClick={() =>
                                    startEdit(
                                      item.namespace,
                                      item.key,
                                      lang,
                                      translation?.value || '',
                                    )
                                  }
                                  className="text-blue-600 text-xs mt-1 hover:underline"
                                >
                                  {t('common:buttons.edit', 'Edit')}
                                </button>
                                {translation?.needsReview && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <input
                                      type="checkbox"
                                      checked={isKeySelected(item.namespace, item.key, lang)}
                                      onChange={() =>
                                        toggleKeySelection(item.namespace, item.key, lang)
                                      }
                                      className="mr-1"
                                    />
                                    <button
                                      onClick={() =>
                                        reviewMutation.mutate({
                                          namespace: item.namespace,
                                          key: item.key,
                                          lang,
                                        })
                                      }
                                      disabled={reviewMutation.isPending}
                                      className="text-green-600 text-xs hover:underline"
                                    >
                                      {t('admin:translations.moreOptions.approveSelected', 'Mark Reviewed', { count: 1 })}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {/* Additional actions can go here */}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {t('admin:translations.pagination.showingResults', 'Showing {{start}} to {{end}} of {{total}} results', {
                start: (pagination.page - 1) * pagination.limit + 1,
                end: Math.min(pagination.page * pagination.limit, pagination.total),
                total: pagination.total,
              })}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                variant="secondary"
                className="text-sm px-3 py-1"
              >
                {t('common:buttons.previous', 'Previous')}
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-700">
                {t('admin:translations.pagination.pageOfTotal', 'Page {{page}} of {{totalPages}}', {
                  page: pagination.page,
                  totalPages: pagination.totalPages,
                })}
              </span>
              <Button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasMore}
                variant="secondary"
                className="text-sm px-3 py-1"
              >
                {t('common:buttons.next', 'Next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Stats */}
      <Card className="p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-swiss-mint">
              {pagination?.total || keys.length}
            </div>
            <div className="text-sm text-gray-600">{t('admin:translations.stats.totalKeys', 'Total Keys')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-swiss-mint">
              {keys.reduce(
                (sum, k) =>
                  sum +
                  Object.values(k.translations).filter((t) => t.needsReview).length,
                0,
              )}
            </div>
            <div className="text-sm text-gray-600">{t('admin:translations.stats.needsReview', 'Needs Review')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-swiss-mint">
              {namespaces.length}
            </div>
            <div className="text-sm text-gray-600">{t('admin:translations.stats.namespaces', 'Namespaces')}</div>
          </div>
        </div>
      </Card>
        </>
      )}

      {activeTab === 'audit' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('admin:translations.audit.title', 'Audit Logs')}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:translations.audit.date', 'Date')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:translations.audit.action', 'Action')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:translations.audit.namespace', 'Namespace')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:translations.audit.key', 'Key')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:translations.audit.language', 'Language')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('admin:translations.audit.user', 'User')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogsResponse?.data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {t('admin:translations.audit.noLogsFound', 'No audit logs found')}
                    </td>
                  </tr>
                ) : (
                  auditLogsResponse?.data?.data?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {log.namespace || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
                        {log.key || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {log.lang}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {log.userId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'releases' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">{t('admin:translations.releasesList.title', 'Translation Releases')}</h2>
          <div className="space-y-4">
            {releasesResponse?.data?.data?.length === 0 ? (
              <p className="text-gray-500">{t('admin:translations.releasesList.noReleasesFound', 'No releases found')}</p>
            ) : (
              releasesResponse?.data?.data?.map((release: any) => (
                <div
                  key={release.id}
                  className={`border rounded p-4 ${
                    release.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{release.version}</span>
                        {release.isActive && (
                          <span className="px-2 py-1 text-xs bg-green-500 text-white rounded">
                            {t('admin:translations.releasesList.active', 'Active')}
                          </span>
                        )}
                      </div>
                      {release.description && (
                        <p className="text-sm text-gray-600 mt-1">{release.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {t('admin:translations.releasesList.created', 'Created:')} {new Date(release.createdAt).toLocaleString()}
                        {release.createdBy && ` ${t('admin:translations.releasesList.by', 'by')} ${release.createdBy}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

