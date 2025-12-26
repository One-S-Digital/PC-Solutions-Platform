import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiClient } from '../services/api';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { CANTON_CODES } from '@workspace/types';

interface StatePolicyAsset {
  id: string;
  title: string;
  contentCategory: string;
  policyType: string;
  tags?: string[];
  contentPreview?: string;
  officialUrl?: string;
  externalLink: string;
  region?: string;
  country?: string;
  language?: string;
  lastCrawledAt?: string;
  crawlStatus?: string;
  mimeType?: string;
  crawlSourceId?: number | null;
  category?: string;
}

interface PolicyReviewFormData {
  title: string;
  contentCategory: string;
  policyType: string;
  tags: string[];
  contentPreview: string;
}

const getPolicyCategories = (t: (key: string) => string) => [
  { value: 'EducationPolicy', label: t('content:policyCategories.EducationPolicy') },
  { value: 'Health&Safety', label: t('content:policyCategories.Health&Safety') },
  { value: 'Labor&Employment', label: t('content:policyCategories.Labor&Employment') },
  { value: 'ChildProtection', label: t('content:policyCategories.ChildProtection') },
  { value: 'Other', label: t('content:policyCategories.Other') },
];

const PolicyCard: React.FC<{
  policy: StatePolicyAsset;
  isSelected: boolean;
  onClick: () => void;
  t: (key: string) => string;
}> = ({ policy, isSelected, onClick, t }) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 border rounded-lg cursor-pointer transition ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <h3 className="font-semibold text-sm mb-2 line-clamp-2">{policy.title}</h3>
      <div className="flex flex-wrap gap-1 mb-2">
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
          {policy.region}
        </span>
        {policy.policyType && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            {policy.policyType}
          </span>
        )}
      </div>
      {policy.contentPreview && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{policy.contentPreview}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <ClockIcon className="h-3 w-3" />
        <span>{policy.lastCrawledAt ? new Date(policy.lastCrawledAt).toLocaleDateString() : t('admin:policyReview.policyCard.unknownDate')}</span>
      </div>
    </div>
  );
};

const PolicyReviewPanel: React.FC<{
  policy: StatePolicyAsset;
  onApprove: (id: string, updates: PolicyReviewFormData) => void;
  onReject: (id: string, reason: string) => void;
  onClose: () => void;
}> = ({ policy, onApprove, onReject, onClose }) => {
  const { t } = useTranslation(['content', 'admin']);
  const apiClient = useApiClient();
  const [form, setForm] = useState<PolicyReviewFormData>({
    title: policy.title,
    contentCategory: policy.contentCategory || 'Other',
    policyType: policy.policyType || 'Guideline',
    tags: policy.tags || [],
    contentPreview: policy.contentPreview || '',
  });
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);

  // Check if Extract text button should be shown
  const canExtractText = 
    policy.category === 'STATE_POLICY' &&
    policy.mimeType === 'application/pdf' &&
    policy.crawlSourceId !== null &&
    policy.crawlSourceId !== undefined;

  const handleApprove = () => {
    onApprove(policy.id, form);
  };

  const handleReject = () => {
    const reason = prompt(t('admin:policyReview.panel.rejectPrompt'));
    if (reason) {
      onReject(policy.id, reason);
    }
  };

  const handleExtractText = async () => {
    try {
      setExtracting(true);
      const response = await apiClient.post(`/admin/crawler/extract-text/${policy.id}`);
      if (response.data?.success) {
        setExtracted(true);
        // Show success toast (using alert for now, can be replaced with toast library)
        alert(t('admin:policyReview.panel.extractSuccess'));
        // Refresh the policy data to show updated preview
        window.location.reload();
      }
    } catch (error: any) {
      alert(`${t('admin:policyReview.panel.extractError')}: ${error.response?.data?.message || error.message}`);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('admin:policyReview.panel.title')}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
      </div>

      {/* Official URL - prominent display */}
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800 font-medium mb-1">{t('admin:policyReview.panel.officialSource')}</p>
        <a 
          href={policy.officialUrl || policy.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all text-sm flex items-center gap-1"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          {policy.officialUrl || policy.externalLink}
        </a>
      </div>

      {/* Editable fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('admin:policyReview.panel.titleLabel')}</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({...form, title: e.target.value})}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('admin:policyReview.panel.categoryLabel')}</label>
          <select
            value={form.contentCategory}
            onChange={e => setForm({...form, contentCategory: e.target.value})}
            className="w-full border rounded px-3 py-2"
          >
            {getPolicyCategories(t).map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('admin:policyReview.panel.documentTypeLabel')}</label>
          <select
            value={form.policyType}
            onChange={e => setForm({...form, policyType: e.target.value})}
            className="w-full border rounded px-3 py-2"
          >
            {['Law', 'Regulation', 'Directive', 'Guideline', 'Standard'].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('admin:policyReview.panel.summaryLabel')}</label>
          <textarea
            value={form.contentPreview}
            onChange={e => setForm({...form, contentPreview: e.target.value})}
            rows={3}
            className="w-full border rounded px-3 py-2"
            placeholder={t('admin:policyReview.panel.summaryPlaceholder')}
          />
        </div>
      </div>

      {/* Extract text button (only for PDFs from crawler) */}
      {canExtractText && (
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={handleExtractText}
            disabled={extracting || extracted}
            className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {extracting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                {t('admin:policyReview.panel.extracting')}
              </>
            ) : extracted ? (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                {t('admin:policyReview.panel.extracted')}
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-5 w-5" />
                {t('admin:policyReview.panel.extractButton')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex space-x-3 mt-6 pt-6 border-t">
        <button
          onClick={handleApprove}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <CheckCircleIcon className="h-5 w-5" />
          {t('admin:policyReview.panel.approveButton')}
        </button>
        <button
          onClick={handleReject}
          className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center justify-center gap-2"
        >
          <XCircleIcon className="h-5 w-5" />
          {t('admin:policyReview.panel.rejectButton')}
        </button>
      </div>
    </div>
  );
};

export default function PolicyReviewPage() {
  const { t } = useTranslation(['admin', 'content']);
  const apiClient = useApiClient();
  const [policies, setPolicies] = useState<StatePolicyAsset[]>([]);
  const [filters, setFilters] = useState({
    canton: '',
    hasChanges: false,
  });
  const [selectedPolicy, setSelectedPolicy] = useState<StatePolicyAsset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicies();
  }, [filters]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/crawler/review-queue', {
        params: {
          ...filters,
          limit: 200, // Request more documents to see all pending reviews
        },
      });
      // Handle both old format (array) and new format (object with data property)
      const policiesData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data || [];
      setPolicies(policiesData);
    } catch (err) {
      console.error('Failed to fetch policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (assetId: string, updates: PolicyReviewFormData) => {
    try {
      await apiClient.patch(`/content/state-policies/${assetId}`, {
        ...updates,
        status: 'Published',
        crawlStatus: 'approved',
      });
      alert(t('admin:policyReview.panel.approveSuccess'));
      fetchPolicies();
      setSelectedPolicy(null);
    } catch (error: any) {
      alert(`${t('admin:policyReview.panel.approveError')}: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleReject = async (assetId: string, reason: string) => {
    try {
      await apiClient.patch(`/content/state-policies/${assetId}`, {
        crawlStatus: 'rejected',
        status: 'Archived',
      });
      alert(t('admin:policyReview.panel.rejectSuccess'));
      fetchPolicies();
      setSelectedPolicy(null);
    } catch (error: any) {
      alert(`${t('admin:policyReview.panel.rejectError')}: ${error.response?.data?.message || error.message}`);
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admin:policyReview.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admin:policyReview.subtitle')}</p>
        </div>
        <div className="flex space-x-4">
          <select 
            value={filters.canton}
            onChange={e => setFilters({...filters, canton: e.target.value})}
            className="border rounded px-3 py-2"
          >
            <option value="">{t('admin:policyReview.filters.allCantons')}</option>
            {Object.entries(CANTON_CODES).map(([code, name]) => (
              <option key={code} value={name}>{name} ({code})</option>
            ))}
          </select>
          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={filters.hasChanges}
              onChange={e => setFilters({...filters, hasChanges: e.target.checked})}
              className="mr-2"
            />
            {t('admin:policyReview.filters.changedOnly')}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy List */}
        <div className="space-y-4">
          {policies.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{t('admin:policyReview.emptyState.noPolicies')}</p>
            </div>
          ) : (
            policies.map(policy => (
              <PolicyCard 
                key={policy.id}
                policy={policy}
                isSelected={selectedPolicy?.id === policy.id}
                onClick={() => setSelectedPolicy(policy)}
                t={t}
              />
            ))
          )}
        </div>

        {/* Review Panel */}
        {selectedPolicy && (
          <PolicyReviewPanel
            policy={selectedPolicy}
            onApprove={handleApprove}
            onReject={handleReject}
            onClose={() => setSelectedPolicy(null)}
          />
        )}
      </div>
    </div>
  );
}

