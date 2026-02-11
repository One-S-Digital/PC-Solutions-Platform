import React, { useState, useEffect, useRef } from 'react';
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
  maxSubpageDepth: number;
  maxCrawlPages: number;
  maxCrawlDurationSec: number;
  crawlDelayMs: number;
  lastCrawlAt?: string;
  lastCrawlStatus?: string;
  lastCrawlError?: string;
  nextCrawlAt?: string;
}

interface CandidateScanResult {
  url: string;
  title: string;
  anchorText: string;
  sectionHeading?: string;
  isPdf: boolean;
  whitelisted: boolean;
  whitelistError?: string;
  classification?: {
    isDaycareRelated: boolean;
    confidence: number;
    category: string;
    docType: string;
    language: 'fr' | 'de' | 'en';
    topics: string[];
  };
  classifierSkipReason?: string;
}

interface ScanResult {
  sourceId: number;
  sourceLabel: string;
  sourceUrl: string;
  discovered: number;
  whitelisted: number;
  nonWhitelisted: number;
  pdfCount: number;
  daycareRelated: number;
  classifierSkipped: number;
  candidates: CandidateScanResult[];
  // Subpage crawling stats
  maxSubpageDepth: number;
  pagesCrawled: number;
  subpagesDiscovered: number;
}

interface IngestResult {
  requested: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  errors: Array<{ url: string; error: string }>;
  results: Array<{ url: string; outcome: 'created' | 'updated' | 'unchanged' | 'skipped' | 'error' }>;
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
    maxSubpageDepth: 0,
    maxCrawlPages: 100,
    maxCrawlDurationSec: 300,
    crawlDelayMs: 200,
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

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('admin:cantons.addSource.maxSubpageDepth', 'Subpage Depth')}
            </label>
            <select
              value={form.maxSubpageDepth}
              onChange={e => setForm({...form, maxSubpageDepth: parseInt(e.target.value) || 0})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="0">0 - Source page only</option>
              <option value="1">1 - Source + direct links</option>
              <option value="2">2 - Two levels deep</option>
              <option value="3">3 - Three levels deep</option>
              <option value="4">4 - Four levels deep</option>
              <option value="5">5 - Five levels deep</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {t('admin:cantons.addSource.maxSubpageDepthHelp', 'How many levels of subpages to crawl for documents. Higher values find more documents but take longer.')}
            </p>
          </div>

          {/* Crawl Settings - only show when subpage depth > 0 */}
          {form.maxSubpageDepth > 0 && (
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Crawl Settings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max Pages</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={form.maxCrawlPages}
                    onChange={e => setForm({...form, maxCrawlPages: parseInt(e.target.value) || 100})}
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Limit pages per crawl</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Timeout (sec)</label>
                  <input
                    type="number"
                    min="60"
                    max="3600"
                    value={form.maxCrawlDurationSec}
                    onChange={e => setForm({...form, maxCrawlDurationSec: parseInt(e.target.value) || 300})}
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max crawl duration</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Delay (ms)</label>
                  <input
                    type="number"
                    min="50"
                    max="2000"
                    value={form.crawlDelayMs}
                    onChange={e => setForm({...form, crawlDelayMs: parseInt(e.target.value) || 200})}
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Between requests</p>
                </div>
              </div>
            </div>
          )}

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
    maxSubpageDepth: source.maxSubpageDepth ?? 0,
    maxCrawlPages: source.maxCrawlPages ?? 100,
    maxCrawlDurationSec: source.maxCrawlDurationSec ?? 300,
    crawlDelayMs: source.crawlDelayMs ?? 200,
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

          <div>
            <label className="block text-sm font-medium mb-1">Subpage Depth</label>
            <select
              value={form.maxSubpageDepth}
              onChange={e => setForm({...form, maxSubpageDepth: parseInt(e.target.value) || 0})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="0">0 - Source page only</option>
              <option value="1">1 - Source + direct links</option>
              <option value="2">2 - Two levels deep</option>
              <option value="3">3 - Three levels deep</option>
              <option value="4">4 - Four levels deep</option>
              <option value="5">5 - Five levels deep</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How many levels of subpages to crawl for documents.
            </p>
          </div>

          {/* Crawl Settings - only show when subpage depth > 0 */}
          {form.maxSubpageDepth > 0 && (
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Crawl Settings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Max Pages</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={form.maxCrawlPages}
                    onChange={e => setForm({...form, maxCrawlPages: parseInt(e.target.value) || 100})}
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Limit pages per crawl</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Timeout (sec)</label>
                  <input
                    type="number"
                    min="60"
                    max="3600"
                    value={form.maxCrawlDurationSec}
                    onChange={e => setForm({...form, maxCrawlDurationSec: parseInt(e.target.value) || 300})}
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max crawl duration</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Delay (ms)</label>
                  <input
                    type="number"
                    min="50"
                    max="2000"
                    value={form.crawlDelayMs}
                    onChange={e => setForm({...form, crawlDelayMs: parseInt(e.target.value) || 200})}
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Between requests</p>
                </div>
              </div>
            </div>
          )}

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

const CrawlResultsModal: React.FC<{
  source: CantonSource;
  cantonName: string;
  onClose: () => void;
  onAfterIngest: () => Promise<void>;
}> = ({ source, cantonName, onClose, onAfterIngest }) => {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [onlyPdf, setOnlyPdf] = useState(false);
  const [onlyWhitelisted, setOnlyWhitelisted] = useState(true);
  const [force, setForce] = useState(false);
  const [queueUnchanged, setQueueUnchanged] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setIngestResult(null);

        const resp = await apiClient.post(
          `/admin/crawler/scan/${source.id}`,
          undefined,
          { 
            signal: controller.signal,
            timeout: 600000, // 10 minutes - crawling can take a while with deep subpages
          } as any,
        );
        const data: ScanResult = resp.data?.data || resp.data;
        setScan(data);

        // Default-select all whitelisted links
        const initial: Record<string, boolean> = {};
        for (const c of data.candidates || []) {
          if (c.whitelisted) initial[c.url] = true;
        }
        setSelected(initial);
      } catch (e: any) {
        // Axios uses ERR_CANCELED for aborted requests
        if (controller.signal.aborted || e?.code === 'ERR_CANCELED') return;
        setError(e.response?.data?.message || e.message || 'Failed to scan source');
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [apiClient, source.id]);

  // Close on Escape for keyboard users
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const visibleCandidates = (scan?.candidates || []).filter(c => {
    if (onlyWhitelisted && !c.whitelisted) return false;
    if (onlyPdf && !c.isPdf) return false;
    return true;
  });

  useEffect(() => {
    if (!selectAllRef.current) return;
    const allSelected = visibleCandidates.length > 0 && visibleCandidates.every(c => selected[c.url]);
    const someSelected = visibleCandidates.some(c => selected[c.url]);
    selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [visibleCandidates, selected]);

  const selectedUrls = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const toggleAllVisible = (value: boolean) => {
    const next = { ...selected };
    for (const c of visibleCandidates) {
      next[c.url] = value;
    }
    setSelected(next);
  };

  const ingestSelected = async () => {
    if (selectedUrls.length === 0) {
      setError('Select at least one link to ingest.');
      return;
    }
    setIngesting(true);
    setError(null);
    try {
      const resp = await apiClient.post(
        `/admin/crawler/ingest/${source.id}`, 
        {
          urls: selectedUrls,
          force,
          queueUnchanged,
        },
        {
          timeout: 600000, // 10 minutes - ingesting many URLs can take a while
        },
      );
      const data: IngestResult = resp.data?.data || resp.data;
      setIngestResult(data);
      await onAfterIngest();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'Failed to ingest URLs');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crawl-results-title"
        className="bg-white rounded-lg p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="crawl-results-title" className="text-xl font-bold">Crawl results</h2>
            <p className="text-sm text-gray-600 mt-1">
              {source.label} — <span className="break-all">{source.url}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close crawl results"
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {error ? (
          <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : scan ? (
          <>
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <strong>Note:</strong> Scanning does not add anything to Policy Review. You must click <strong>Ingest selected</strong> to
              create review items.
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded border bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Pages Crawled</div>
                <div className="text-lg font-semibold">{scan.pagesCrawled || 1}</div>
              </div>
              <div className="rounded border bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Subpages Found</div>
                <div className="text-lg font-semibold">{scan.subpagesDiscovered || 0}</div>
              </div>
              <div className="rounded border bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Documents Found</div>
                <div className="text-lg font-semibold">{scan.discovered}</div>
              </div>
              <div className="rounded border bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Whitelisted</div>
                <div className="text-lg font-semibold">{scan.whitelisted}</div>
              </div>
              <div className="rounded border bg-gray-50 p-3">
                <div className="text-xs text-gray-500">PDFs</div>
                <div className="text-lg font-semibold">{scan.pdfCount}</div>
              </div>
              <div className="rounded border bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Classifier skipped</div>
                <div className="text-lg font-semibold">{scan.classifierSkipped}</div>
              </div>
            </div>
            
            {scan.maxSubpageDepth > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                Crawling with subpage depth: {scan.maxSubpageDepth} (crawled {scan.pagesCrawled || 1} page{(scan.pagesCrawled || 1) !== 1 ? 's' : ''})
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={onlyWhitelisted} onChange={e => setOnlyWhitelisted(e.target.checked)} />
                  Only whitelisted
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={onlyPdf} onChange={e => setOnlyPdf(e.target.checked)} />
                  Only PDFs
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => toggleAllVisible(true)}
                >
                  Select all visible
                </button>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => toggleAllVisible(false)}
                >
                  Clear visible
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} />
                  Force ingest (ignore classifier)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={queueUnchanged}
                    onChange={e => setQueueUnchanged(e.target.checked)}
                  />
                  Send unchanged/existing to review
                </label>
                <button
                  type="button"
                  disabled={ingesting || selectedUrls.length === 0}
                  onClick={ingestSelected}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {ingesting ? 'Ingesting…' : `Ingest selected (${selectedUrls.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!ingestResult) {
                      setError('Policy Review will be empty until you ingest at least one link.');
                      return;
                    }
                    navigate(`/policy-crawler/review?canton=${encodeURIComponent(cantonName)}`);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Open Policy Review
                </button>
              </div>
            </div>

            {ingestResult ? (
              <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                Ingest completed. Created: {ingestResult.created}, Updated: {ingestResult.updated}, Unchanged:{' '}
                {ingestResult.unchanged}, Skipped: {ingestResult.skipped}, Errors: {ingestResult.errors?.length || 0}.
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto border rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        ref={selectAllRef}
                        checked={visibleCandidates.length > 0 && visibleCandidates.every(c => selected[c.url])}
                        onChange={e => toggleAllVisible(e.target.checked)}
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Whitelisted</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Classifier</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleCandidates.map(c => (
                    <tr key={c.url} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected[c.url])}
                          onChange={e => setSelected(prev => ({ ...prev, [c.url]: e.target.checked }))}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`px-2 py-1 rounded ${c.isPdf ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                          {c.isPdf ? 'PDF' : 'HTML'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                          {c.url}
                        </a>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{c.anchorText}</div>
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {c.whitelisted ? (
                          <span className="text-green-700">Yes</span>
                        ) : (
                          <span className="text-red-700" title={c.whitelistError}>
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {c.classification ? (
                          c.classification.isDaycareRelated ? (
                            <span className="text-green-700">Match ({Math.round(c.classification.confidence * 100)}%)</span>
                          ) : (
                            <span className="text-amber-700">Skipped</span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {!c.whitelisted ? c.whitelistError : c.classifierSkipReason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleCandidates.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No links match the current filters.</div>
              ) : null}
            </div>
          </>
        ) : null}
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
  const [crawlModalSource, setCrawlModalSource] = useState<CantonSource | null>(null);
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

  const handleOpenCrawlResults = (source: CantonSource) => {
    setCrawlModalSource(source);
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Depth</th>
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
                  <span className={`px-2 py-1 text-xs rounded ${source.maxSubpageDepth > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                    {source.maxSubpageDepth || 0}
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
                      onClick={() => handleOpenCrawlResults(source)}
                      className="text-blue-600 hover:underline text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                      <Play className="h-4 w-4" />
                      {t('admin:cantons.detail.actions.crawlNow')}
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

      {crawlModalSource && canton ? (
        <CrawlResultsModal
          source={crawlModalSource}
          cantonName={canton.name}
          onClose={() => setCrawlModalSource(null)}
          onAfterIngest={fetchData}
        />
      ) : null}
    </div>
  );
}

