import React, { useState, useEffect } from 'react';
import { useApiClient } from '../services/api';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ExternalLinkIcon,
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
}

interface PolicyReviewFormData {
  title: string;
  contentCategory: string;
  policyType: string;
  tags: string[];
  contentPreview: string;
}

const POLICY_CATEGORIES = [
  'Education Policy',
  'Health & Safety',
  'Labor & Employment',
  'Child Protection',
  'Other',
];

const PolicyCard: React.FC<{
  policy: StatePolicyAsset;
  isSelected: boolean;
  onClick: () => void;
}> = ({ policy, isSelected, onClick }) => {
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
        <span>{policy.lastCrawledAt ? new Date(policy.lastCrawledAt).toLocaleDateString() : 'Unknown'}</span>
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
  const [form, setForm] = useState<PolicyReviewFormData>({
    title: policy.title,
    contentCategory: policy.contentCategory || 'Other',
    policyType: policy.policyType || 'Guideline',
    tags: policy.tags || [],
    contentPreview: policy.contentPreview || '',
  });

  const handleApprove = () => {
    onApprove(policy.id, form);
  };

  const handleReject = () => {
    const reason = prompt('Reason for rejection:');
    if (reason) {
      onReject(policy.id, reason);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Review Policy</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
      </div>

      {/* Official URL - prominent display */}
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800 font-medium mb-1">Official Source:</p>
        <a 
          href={policy.officialUrl || policy.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all text-sm flex items-center gap-1"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          {policy.officialUrl || policy.externalLink}
        </a>
      </div>

      {/* Editable fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({...form, title: e.target.value})}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={form.contentCategory}
            onChange={e => setForm({...form, contentCategory: e.target.value})}
            className="w-full border rounded px-3 py-2"
          >
            {POLICY_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Document Type</label>
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
          <label className="block text-sm font-medium mb-1">Summary (for users)</label>
          <textarea
            value={form.contentPreview}
            onChange={e => setForm({...form, contentPreview: e.target.value})}
            rows={3}
            className="w-full border rounded px-3 py-2"
            placeholder="Brief description of this document..."
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex space-x-3 mt-6 pt-6 border-t">
        <button
          onClick={handleApprove}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <CheckCircleIcon className="h-5 w-5" />
          Approve & Publish
        </button>
        <button
          onClick={handleReject}
          className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center justify-center gap-2"
        >
          <XCircleIcon className="h-5 w-5" />
          Reject
        </button>
      </div>
    </div>
  );
};

export default function PolicyReviewPage() {
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
        params: filters,
      });
      setPolicies(response.data || []);
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
      alert('Policy approved and published');
      fetchPolicies();
      setSelectedPolicy(null);
    } catch (error: any) {
      alert(`Failed to approve policy: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleReject = async (assetId: string, reason: string) => {
    try {
      await apiClient.patch(`/content/state-policies/${assetId}`, {
        crawlStatus: 'rejected',
        status: 'Archived',
      });
      alert('Policy rejected');
      fetchPolicies();
      setSelectedPolicy(null);
    } catch (error: any) {
      alert(`Failed to reject policy: ${error.response?.data?.message || error.message}`);
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
          <h1 className="text-2xl font-bold">Policy Review Queue</h1>
          <p className="text-gray-600 mt-1">Review and approve crawled policy documents</p>
        </div>
        <div className="flex space-x-4">
          <select 
            value={filters.canton}
            onChange={e => setFilters({...filters, canton: e.target.value})}
            className="border rounded px-3 py-2"
          >
            <option value="">All Cantons</option>
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
            Changed only
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy List */}
        <div className="space-y-4">
          {policies.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No policies pending review</p>
            </div>
          ) : (
            policies.map(policy => (
              <PolicyCard 
                key={policy.id}
                policy={policy}
                isSelected={selectedPolicy?.id === policy.id}
                onClick={() => setSelectedPolicy(policy)}
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

