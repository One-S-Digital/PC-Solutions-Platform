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
const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
};

export default function Translations() {
  const { t } = useTranslation(['admin', 'common']);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [autoFixJustRan, setAutoFixJustRan] = useState(false); // Track if auto-fix just ran
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
  const [targetLang, setTargetLang] = useState<'fr' | 'de'>('fr');
  const [forceRetranslate, setForceRetranslate] = useState(false);

  const apiClient = useApiClient();
  const queryClient = useQueryClient();

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

  // Auto-fix hardcoded strings mutation
  const autoFixMutation = useMutation({
    mutationFn: async () => {
      return apiService.autoFixHardcodedStrings(apiClient);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      
      // Enable the auto-translate button if strings were fixed
      if (data.data.fixed > 0) {
        setAutoFixJustRan(true);
        alert(`✅ Successful translation of static UI strings!\n\nFixed: ${data.data.fixed}\nSkipped: ${data.data.skipped}\nErrors: ${data.data.errors}\n\n${data.data.message}\n\n🌍 NEXT STEP: Click the "Auto-Translate FR/DE" button (now enabled) to automatically translate all new entries to French and German!`);
      } else {
        alert(`✅ Successful translation of static UI strings!\n\nFixed: ${data.data.fixed}\nSkipped: ${data.data.skipped}\nErrors: ${data.data.errors}\n\n${data.data.message}`);
      }
    },
    onError: (error: any) => {
      alert(`❌ Auto-fix failed: ${error.response?.data?.message || error.message}`);
    },
  });

  // Auto-translate all new keys mutation (translates [FR] and [DE] prefixed entries)
  const autoTranslateNewKeysMutation = useMutation({
    mutationFn: async () => {
      // Translate to French first
      const frResult = await apiService.translateMissing(apiClient, 'en', 'fr', undefined, undefined, false);
      // Then translate to German
      const deResult = await apiService.translateMissing(apiClient, 'en', 'de', undefined, undefined, false);
      return { frResult, deResult };
    },
    onSuccess: ({ frResult, deResult }) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      const totalTranslated = frResult.data.translated + deResult.data.translated;
      
      // Reset the flag after successful translation
      setAutoFixJustRan(false);
      
      alert(`✅ Auto-translation complete!\n\nFrench: ${frResult.data.translated} translations\nGerman: ${deResult.data.translated} translations\n\nTotal: ${totalTranslated} entries translated\n\n💡 All translations are now available in the app!\n\n✅ Your multi-language support is complete!`);
    },
    onError: (error: any) => {
      alert(`❌ Auto-translation failed: ${error.response?.data?.message || error.message}`);
      setAutoFixJustRan(false); // Reset on error too
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
        <div className="text-red-500 mb-4">Failed to load translations</div>
        <p className="text-gray-600">Please check your connection and try again.</p>
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
            Translation Management
          </h1>
          <p className="text-gray-600 mt-1">Manage static UI translations</p>
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
            Translations
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
            Audit Logs
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
            Releases
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'translations' && (
        <>

      {/* Release Management */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Translation Releases</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder={t('admin:translations.versionPlaceholder')}
            value={newReleaseVersion}
            onChange={(e) => setNewReleaseVersion(e.target.value)}
            className="border rounded px-3 py-2 flex-1"
          />
          <input
            type="text"
            placeholder={t('admin:translations.descriptionPlaceholder')}
            value={newReleaseDescription}
            onChange={(e) => setNewReleaseDescription(e.target.value)}
            className="border rounded px-3 py-2 flex-1"
          />
          <Button
            onClick={handleCreateRelease}
            disabled={releaseMutation.isPending || !newReleaseVersion}
          >
            {releaseMutation.isPending ? 'Creating...' : 'Create Release'}
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Creating a release will invalidate all caches and force clients to fetch fresh translations.
        </p>
      </Card>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Namespace
            </label>
            <select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">{t('common:allnamespaces')}</option>
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin:translations.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded px-3 py-2 pl-10"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex gap-2 items-center flex-wrap">
            <label className="text-sm font-medium text-gray-700">
              Machine Translation:
            </label>
            <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-white">
              <span className="text-sm text-gray-600">Translate to:</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as 'fr' | 'de')}
                className="text-sm border-0 focus:ring-0 focus:outline-none cursor-pointer bg-transparent"
                disabled={translateMutation.isPending}
              >
                <option value="fr">Français (FR)</option>
                <option value="de">{t('common:deutschde')}</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={forceRetranslate}
                onChange={(e) => setForceRetranslate(e.target.checked)}
                disabled={translateMutation.isPending}
                className="w-4 h-4"
              />
              <span className="text-gray-700">Force re-translate</span>
            </label>
            <Button
              onClick={() => {
                if (forceRetranslate) {
                  if (!confirm(`This will re-translate ALL ${targetLang.toUpperCase()} translations, overwriting existing ones. Continue?`)) {
                    return;
                  }
                }
                translateMutation.mutate({
                  sourceLang: 'en',
                  targetLang,
                  namespace: selectedNamespace || undefined,
                  force: forceRetranslate,
                });
              }}
              disabled={translateMutation.isPending}
              variant="primary"
              className="text-sm px-4 py-1.5"
            >
              {translateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin inline" />
                  Translating...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2 inline" />
                  Translate EN→{targetLang.toUpperCase()}
                </>
              )}
            </Button>
            <div className="border-l border-gray-300 h-6 mx-1" />
            <Button
              onClick={() => {
                if (confirm('This will automatically find and fix hardcoded strings in the frontend code. This will:\n\n1. Scan all frontend files for hardcoded English strings\n2. Replace them with translation keys\n3. Add the keys to translation files\n\nContinue?')) {
                  autoFixMutation.mutate();
                }
              }}
              disabled={autoFixMutation.isPending}
              variant="primary"
              className="text-sm px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white"
            >
              {autoFixMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin inline" />
                  Fixing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2 inline" />
                  Auto-Fix Hardcoded Strings
                </>
              )}
            </Button>
            <div className="border-l border-gray-300 h-6 mx-1" />
            <Button
              onClick={() => {
                if (confirm('This will automatically translate all new [FR] and [DE] prefixed entries using machine translation. This will:\n\n1. Translate all [FR] entries to French\n2. Translate all [DE] entries to German\n3. Make translations immediately available\n\nNote: Machine translation is used. Review for accuracy.\n\nContinue?')) {
                  autoTranslateNewKeysMutation.mutate();
                }
              }}
              disabled={autoTranslateNewKeysMutation.isPending || !autoFixJustRan}
              variant="primary"
              className={`text-sm px-3 py-1.5 ${autoFixJustRan ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' : 'bg-gray-400 cursor-not-allowed'} text-white`}
              title={!autoFixJustRan ? 'Run "Auto-Fix Hardcoded Strings" first to enable this button' : 'Click to translate all new entries to French and German'}
            >
              {autoTranslateNewKeysMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin inline" />
                  Translating...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2 inline" />
                  {autoFixJustRan ? '👉 Auto-Translate FR/DE (Step 2)' : 'Auto-Translate FR/DE'}
                </>
              )}
            </Button>
            <div className="border-l border-gray-300 h-6 mx-1" />
            <Button
              onClick={() => {
                if (confirm('This will remove [FR], [DE], and [EN] prefixes from all existing translations. Continue?')) {
                  cleanupMutation.mutate();
                }
              }}
              disabled={cleanupMutation.isPending}
              variant="secondary"
              className="text-sm px-3 py-1.5 text-orange-600 hover:text-orange-700 border-orange-200"
            >
              {cleanupMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin inline" />
                  Cleaning...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2 inline" />
                  Clean Prefixes
                </>
              )}
            </Button>
          </div>
          <div className="flex gap-2 items-center ml-auto">
            {selectedKeys.size > 0 && (
              <Button
                onClick={handleBulkApprove}
                disabled={bulkApproveMutation.isPending}
                variant="secondary"
                className="text-sm px-3 py-1"
              >
                {bulkApproveMutation.isPending
                  ? 'Approving...'
                  : `Approve ${selectedKeys.size} Selected`}
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
              Export JSON
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
              Export CSV
            </Button>
            <label className="text-sm px-3 py-1 border rounded cursor-pointer flex items-center gap-2 hover:bg-gray-50">
              <Upload className="h-4 w-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
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
                  Namespace
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                {LANGUAGES.map((lang) => (
                  <th
                    key={lang}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {LANGUAGE_LABELS[lang]}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={LANGUAGES.length + 4} className="px-4 py-8 text-center text-gray-500">
                    No translations found
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
                                    <span className="text-gray-400 italic">Missing</span>
                                  )}
                                </div>
                                {translation?.needsReview && (
                                  <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Needs Review
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
                                  Edit
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
                                      Mark Reviewed
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
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                variant="secondary"
                className="text-sm px-3 py-1"
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasMore}
                variant="secondary"
                className="text-sm px-3 py-1"
              >
                Next
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
            <div className="text-sm text-gray-600">Total Keys</div>
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
            <div className="text-sm text-gray-600">Needs Review</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-swiss-mint">
              {namespaces.length}
            </div>
            <div className="text-sm text-gray-600">Namespaces</div>
          </div>
        </div>
      </Card>
        </>
      )}

      {activeTab === 'audit' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Namespace
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Language
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogsResponse?.data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No audit logs found
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
          <h2 className="text-xl font-semibold mb-4">Translation Releases</h2>
          <div className="space-y-4">
            {releasesResponse?.data?.data?.length === 0 ? (
              <p className="text-gray-500">No releases found</p>
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
                            Active
                          </span>
                        )}
                      </div>
                      {release.description && (
                        <p className="text-sm text-gray-600 mt-1">{release.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(release.createdAt).toLocaleString()}
                        {release.createdBy && ` by ${release.createdBy}`}
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

