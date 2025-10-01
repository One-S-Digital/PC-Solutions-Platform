import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { apiService, useApiClient } from '../services/api';

import { SettingsHealth } from '../types/api';


const HealthCheck: React.FC = () => {
  const [healthData, setHealthData] = useState<SettingsHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const apiClient = useApiClient();

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getSettingsHealth(apiClient);
      
      if (response.data.success) {
        setHealthData(response.data.data);
      } else {
        setError(response.data.message || 'Health check failed');
      }


    } catch (error: unknown) {
      console.error('Health check error:', error);
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to run health check');

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const getStatusIcon = (status: 'PASS' | 'FAIL') => {
    return status === 'PASS' ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getCheckIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const assetLabels = {
    logo: 'Main Logo',
    adminLogo: 'Admin Logo',
    favicon: 'Favicon',
    adminFavicon: 'Admin Favicon',
    heroImage: 'Hero Image',
  };

  const checkLabels = {
    presence: 'Asset or URL Present',
    dbIntegrity: 'Database Integrity',
    reachability: 'File Reachable',
    contentType: 'Valid Content Type',
    rules: 'Validation Rules',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Asset Health Check</h3>
            <p className="text-sm text-gray-600">
              Verify all brand assets are properly configured and accessible
            </p>
          </div>
        </div>
        
        <button
          onClick={runHealthCheck}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking...' : 'Re-run Check'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {healthData && (
        <div className="space-y-6">
          {/* Overall Status */}
          <div className={`p-4 rounded-lg border ${
            healthData.overall === 'PASS' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              {getStatusIcon(healthData.overall)}
              <div className="ml-3">
                <p className={`font-medium ${
                  healthData.overall === 'PASS' ? 'text-green-800' : 'text-red-800'
                }`}>
                  Overall Status: {healthData.overall}
                </p>
                <p className={`text-sm ${
                  healthData.overall === 'PASS' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {healthData.message}
                </p>
              </div>
            </div>
          </div>

          {/* Individual Asset Checks */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-800">Asset Details</h4>
            
            {Object.entries(healthData.assets).map(([assetKey, assetData]) => (
              <div key={assetKey} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {getStatusIcon(assetData.status)}
                    <h5 className="ml-2 font-medium text-gray-900">
                      {assetLabels[assetKey as keyof typeof assetLabels] || assetKey}
                    </h5>
                  </div>
                  
                  {assetData.assetInfo && (
                    <div className="text-xs text-gray-500">
                      {assetData.assetInfo.filename || 'Fallback URL'}
                    </div>
                  )}
                </div>

                {/* Check Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
                  {Object.entries(assetData.checks).map(([checkKey, passed]) => (
                    <div key={checkKey} className="flex items-center text-sm">
                      {getCheckIcon(passed)}
                      <span className={`ml-2 ${passed ? 'text-gray-700' : 'text-red-600'}`}>
                        {checkLabels[checkKey as keyof typeof checkLabels] || checkKey}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Details */}
                {assetData.details.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    <div className="flex items-start">
                      <Info className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        {assetData.details.map((detail, index) => (
                          <p key={index} className={`${
                            assetData.status === 'FAIL' ? 'text-red-700' : 'text-gray-700'
                          } ${index > 0 ? 'mt-1' : ''}`}>
                            {detail}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Asset Info */}
                {assetData.assetInfo && (
                  <div className="mt-3 text-xs text-gray-500">
                    <div className="flex flex-wrap gap-4">
                      {assetData.assetInfo.size && (
                        <span>Size: {Math.round(assetData.assetInfo.size / 1024)}KB</span>
                      )}
                      {assetData.assetInfo.mimeType && (
                        <span>Type: {assetData.assetInfo.mimeType}</span>
                      )}
                      {assetData.assetInfo.width && assetData.assetInfo.height && (
                        <span>Dimensions: {assetData.assetInfo.width}×{assetData.assetInfo.height}</span>
                      )}
                      {assetData.assetInfo.url && (
                        <span className="break-all">URL: {assetData.assetInfo.url}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
            Last checked: {new Date(healthData.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {!healthData && !loading && !error && (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Click "Re-run Check" to start the health check</p>
        </div>
      )}
    </div>
  );
};

export default HealthCheck;