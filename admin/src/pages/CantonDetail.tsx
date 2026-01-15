import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApiClient } from '../services/api';
import {
  ArrowLeft,
  Plus,
  Play,
  Pencil,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
} from 'lucide-react';

interface Canton {
  id: number;
  code: string;
  name: string;
  defaultLang: string;
}

interface CantonSource {
  id: number;
  label: string;
  url: string;
  sourceType: string;
  renderType: string;
  cssSelector?: string;
  isActive: boolean;
  crawlFrequencyDays: number;
  lastCrawlAt?: string;
  lastCrawlStatus?: string;
  lastCrawlError?: string;
  nextCrawlAt?: string;
}

interface AddSourceModalProps {
  cantonId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const AddSourceModal: React.FC<AddSourceModalProps> = ({ cantonId, onClose, onSuccess }) => {
  const { t } = useTranslation(['admin']);
  const apiClient = useApiClient();
  const [form, setForm] = useState({
    label: '',
    url: '',
    sourceType: 'landing',
    renderType: 'static',
    cssSelector: '',
    crawlFrequencyDays: 7,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.post('/admin/crawler/sources', {
        ...form,
        cantonId,
        cssSelector: form.cssSelector || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || t('admin:cantons.addSource.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{t('admin:cantons.addSource.title')}</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin:cantons.addSource.label')}</label>
            <input
              type="text"
              required
              value={form.label}
              onChange={e => setForm({...form, label: e.target.value})}
              className="w-full border rounded px-3 py-2"
              placeholder={t('admin:cantons.addSource.labelPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('admin:cantons.addSource.url')}</label>
            <input
              type="url"
              required
              value={form.url}
              onChange={e => setForm({...form, url: e.target.value})}
              className="w-full border rounded px-3 py-2"
              placeholder={t('admin:cantons.addSource.urlPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin:cantons.addSource.sourceType')}</label>
              <select
                value={form.sourceType}
                onChange={e => setForm({...form, sourceType: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="landing">Landing Page</option>
                <option value="directives">Directives</option>
                <option value="laws">Laws</option>
                <option value="federal">Federal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('admin:cantons.addSource.renderType')}</label>
              <select
                value={form.renderType}
                onChange={e => setForm({...form, renderType: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="static">Static HTML</option>
                <option value="dynamic">Dynamic (JS-heavy)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('admin:cantons.addSource.cssSelector')}</label>
            <input
              type="text"
              value={form.cssSelector}
              onChange={e => setForm({...form, cssSelector: e.target.value})}
              className="w-full border rounded px-3 py-2"
              placeholder={t('admin:cantons.addSource.cssSelectorPlaceholder')}
            />
            <p className="text-xs text-gray-500 mt-1">{t('admin:cantons.addSource.cssSelectorHelp')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('admin:cantons.addSource.crawlFrequency')}</label>
            <input
              type="number"
              min="1"
              max="365"
              value={form.crawlFrequencyDays}
              onChange={e => setForm({...form, crawlFrequencyDays: parseInt(e.target.value) || 7})}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              {t('admin:cantons.addSource.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('admin:cantons.addSource.createLoading') : t('admin:cantons.addSource.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status?: string; t: (key: string) => string }> = ({ status, t }) => {
  if (!status) return <span className="text-gray-400 text-xs">{t('admin:cantons.detail.status.never')}</span>;
  
  const statusMap: Record<string, string> = {
    success: t('admin:cantons.detail.status.success'),
    failed: t('admin:cantons.detail.status.error'),
    partial: t('admin:cantons.detail.status.pending'),
  };
  
  const colors: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusMap[status] || status}
    </span>
  );
};

interface EditSourceModalProps {
  source: CantonSource;
  onClose: () => void;
  onSuccess: () => void;
}

const EditSourceModal: React.FC<EditSourceModalProps> = ({ source, onClose, onSuccess }) => {
  const { t } = useTranslation(['admin']);
  const apiClient = useApiClient();
  const [form, setForm] = useState({
    label: source.label,
    url: source.url,
    sourceType: source.sourceType,
    renderType: source.renderType,
    cssSelector: source.cssSelector || '',
    crawlFrequencyDays: source.crawlFrequencyDays,
    isActive: source.isActive,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.patch(`/admin/crawler/sources/${source.id}`, {
        ...form,
        cssSelector: form.cssSelector || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || t('admin:cantons.editSource.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{t('admin:cantons.editSource.title')}</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <input
              type="text"
              required
              value={form.label}
              onChange={e => setForm({...form, label: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <input
              type="url"
              required
              value={form.url}
              onChange={e => setForm({...form, url: e.target.value})}
              className="w-full border rounded px-3 py-2"
              placeholder="https://www.vd.ch/themes/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Source Type</label>
            <select
              value={form.sourceType}
              onChange={e => setForm({...form, sourceType: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="landing">Landing</option>
              <option value="directives">Directives</option>
              <option value="laws">Laws</option>
              <option value="federal">Federal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Render Type</label>
            <select
              value={form.renderType}
              onChange={e => setForm({...form, renderType: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="static">Static</option>
              <option value="dynamic">Dynamic (Playwright)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CSS Selector (optional)</label>
            <input
              type="text"
              value={form.cssSelector}
              onChange={e => setForm({...form, cssSelector: e.target.value})}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., #main-content"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Crawl Frequency (days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={form.crawlFrequencyDays}
              onChange={e => setForm({...form, crawlFrequencyDays: parseInt(e.target.value) || 7})}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm({...form, isActive: e.target.checked})}
              className="mr-2"
            />
            <label className="text-sm font-medium">{t('admin:cantons.detail.status.active')}</label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? t('admin:cantons.editSource.updateLoading') : t('admin:cantons.editSource.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CantonDetailPage() {
  const { t } = useTranslation(['admin']);
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const apiClient = useApiClient();
  const [canton, setCanton] = useState<Canton | null>(null);
  const [sources, setSources] = useState<CantonSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSource, setShowAddSource] = useState(false);
  const [editingSource, setEditingSource] = useState<CantonSource | null>(null);
  const [triggeringCrawl, setTriggeringCrawl] = useState<number | null>(null);
  const [deletingSource, setDeletingSource] = useState<number | null>(null);

  useEffect(() => {
    if (code) {
      fetchData();
    }
  }, [code]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cantonsRes, sourcesRes] = await Promise.all([
        apiClient.get('/admin/crawler/cantons'),
        apiClient.get(`/admin/crawler/cantons/${code}/sources`),
      ]);

      const cantonData = cantonsRes.data?.find((c: Canton) => c.code === code);
      setCanton(cantonData || null);
      setSources(sourcesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCrawl = async (sourceId: number) => {
    if (!confirm(t('admin:cantons.detail.actions.crawlNow'))) return;
    
    setTriggeringCrawl(sourceId);
    try {
      const response = await apiClient.post(`/admin/crawler/trigger/${sourceId}`);
      const results = response.data?.data || response.data;
      
      // Show detailed results
      const message = results 
        ? `Crawl completed!\n\n` +
          `Discovered: ${results.discovered || 0} links\n` +
          `Created: ${results.created || 0} new documents\n` +
          `Updated: ${results.updated || 0} changed documents\n` +
          `Unchanged: ${results.unchanged || 0} documents\n` +
          `Skipped: ${results.skipped || 0} documents\n` +
          (results.errors?.length > 0 ? `\nErrors: ${results.errors.length}` : '')
        : t('admin:cantons.detail.crawlSuccess');
      
      alert(message);
      fetchData();
    } catch (err: any) {
      alert(`${t('admin:cantons.detail.crawlError')}: ${err.response?.data?.message || err.message}`);
    } finally {
      setTriggeringCrawl(null);
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    if (!confirm(t('admin:cantons.detail.deleteConfirm'))) return;
    
    setDeletingSource(sourceId);
    try {
      await apiClient.delete(`/admin/crawler/sources/${sourceId}`);
      alert(t('admin:cantons.detail.deleteSuccess'));
      fetchData();
    } catch (err: any) {
      alert(`${t('admin:cantons.detail.deleteError')}: ${err.response?.data?.message || err.message}`);
    } finally {
      setDeletingSource(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!canton) {
    return (
      <div className="p-6">
        <p className="text-red-600">Canton not found</p>
        <button onClick={() => navigate('/policy-crawler/cantons')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
          Back to Cantons
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/policy-crawler/cantons')}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{canton.name}</h1>
            <p className="text-gray-500">{t('admin:cantons.detail.code')} {canton.code} | {t('admin:cantons.detail.defaultLanguage')} {canton.defaultLang}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddSource(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          {t('admin:cantons.detail.addSourceButton')}
        </button>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin:cantons.detail.table.label')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin:cantons.detail.table.url')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin:cantons.detail.table.type')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin:cantons.detail.table.status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin:cantons.detail.table.lastCrawl')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin:cantons.detail.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sources.map(source => (
              <tr key={source.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{source.label}</td>
                <td className="px-4 py-3 text-sm">
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline text-sm truncate max-w-xs block"
                  >
                    {source.url}
                  </a>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {source.sourceType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <StatusBadge status={source.lastCrawlStatus} t={t} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {source.lastCrawlAt 
                    ? new Date(source.lastCrawlAt).toLocaleDateString()
                    : t('admin:cantons.detail.status.never')}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleTriggerCrawl(source.id)}
                      disabled={triggeringCrawl === source.id}
                      className="text-blue-600 hover:underline text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      <Play className="h-4 w-4" />
                      {triggeringCrawl === source.id ? t('admin:cantons.detail.status.crawling') : t('admin:cantons.detail.actions.crawlNow')}
                    </button>
                    <button 
                      onClick={() => setEditingSource(source)}
                      className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1"
                      title="Edit source"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSource(source.id)}
                      disabled={deletingSource === source.id}
                      className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50 flex items-center gap-1"
                      title="Delete source"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {sources.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('admin:cantons.detail.emptyState.noSources')}</p>
          </div>
        )}
      </div>

      {showAddSource && canton && (
        <AddSourceModal 
          cantonId={canton.id}
          onClose={() => setShowAddSource(false)}
          onSuccess={fetchData}
        />
      )}

      {editingSource && (
        <EditSourceModal 
          source={editingSource}
          onClose={() => setEditingSource(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

