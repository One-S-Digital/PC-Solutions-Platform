import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApiClient } from '../services/api';
import { 
  MapPinIcon, 
  DocumentTextIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

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
      setError(err.response?.data?.message || 'Failed to fetch cantons');
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
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Canton Policy Sources</h1>
        <p className="text-gray-600 mt-1">Manage policy document sources for each Swiss canton</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cantons.map(canton => (
          <Link 
            key={canton.code}
            to={`/cantons/${canton.code}`}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <h3 className="font-semibold text-gray-900">{canton.name}</h3>
                  <p className="text-sm text-gray-500">Code: {canton.code}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <DocumentTextIcon className="h-4 w-4" />
                  Sources
                </span>
                <span className="font-medium">{canton.sourcesCount}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <DocumentTextIcon className="h-4 w-4" />
                  Documents
                </span>
                <span className="font-medium">{canton.documentsCount}</span>
              </div>
              
              {canton.pendingReview > 0 && (
                <div className="flex items-center justify-between text-sm bg-yellow-50 p-2 rounded">
                  <span className="text-yellow-800 flex items-center gap-1">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    Pending Review
                  </span>
                  <span className="font-medium text-yellow-800">{canton.pendingReview}</span>
                </div>
              )}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Default language: <span className="font-medium">{canton.defaultLang.toUpperCase()}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
      
      {cantons.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No cantons found. Run the seed script to populate canton data.</p>
        </div>
      )}
    </div>
  );
}

