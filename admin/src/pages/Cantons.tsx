import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApiClient } from '../services/api';
import { MapPin, FileText, AlertTriangle } from 'lucide-react';

interface Canton {
  id: number;
  code: string;
  name: string;
  nameDe?: string;
  nameFr?: string;
  nameIt?: string;
  defaultLang: string;
  isActive: boolean;
  sourcesCount: number;
  documentsCount: number;
  pendingReview: number;
}

export default function CantonsPage() {
  const { t } = useTranslation(['admin']);
  const apiClient = useApiClient();
  const [cantons, setCantons] = useState<Canton[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCantons();
  }, []);

  const fetchCantons = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/admin/crawler/cantons');
      if (response.data) {
        setCantons(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('admin:cantons.error.fetchError'));
      console.error('Failed to fetch cantons:', err);
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchCantons}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {t('admin:cantons.error.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin:cantons.title')}</h1>
        <p className="text-gray-600 mt-1">{t('admin:cantons.subtitle')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cantons.map(canton => (
          <Link 
            key={canton.code}
            to={`/policy-crawler/cantons/${canton.code}`}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <h3 className="font-semibold text-gray-900">{canton.name}</h3>
                  <p className="text-sm text-gray-500">{t('admin:cantons.card.code')} {canton.code}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {t('admin:cantons.card.sources')}
                </span>
                <span className="font-medium">{canton.sourcesCount}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {t('admin:cantons.card.documents')}
                </span>
                <span className="font-medium">{canton.documentsCount}</span>
              </div>
              
              {canton.pendingReview > 0 && (
                <div className="flex items-center justify-between text-sm bg-yellow-50 p-2 rounded">
                  <span className="text-yellow-800 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {t('admin:cantons.card.pendingReview')}
                  </span>
                  <span className="font-medium text-yellow-800">{canton.pendingReview}</span>
                </div>
              )}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {t('admin:cantons.card.defaultLanguage')} <span className="font-medium">{canton.defaultLang.toUpperCase()}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
      
      {cantons.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('admin:cantons.emptyState.noCantons')}</p>
        </div>
      )}
    </div>
  );
}

