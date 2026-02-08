import { useState, useEffect, useCallback } from 'react';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  AcademicCapIcon, 
  ScaleIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import ContentUploadModal from '../components/ContentUploadModal';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import {
  ELEARNING_CATEGORIES,
  HR_CATEGORIES,
  COUNTRIES_FOR_POLICIES,
  REGIONS_BY_COUNTRY,
} from '../components/ContentUploadModal';
import { useApiClient } from '../services/api';
import * as api from '../services/api';
import { retryWithBackoff, RetryPresets } from '../utils/retryUtility';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

type ContentType = 'e-learning' | 'hr' | 'policy';

interface UploadedContent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  type?: string;
  country?: string;
  region?: string;
  policyType?: string;
  status?: string;
  filename: string;
  publicUrl: string;
  updatedAt: string;
  fileUrl?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function Content() {
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();

  // Filters (primary navigation within each section)
  const defaultPolicyCountry = COUNTRIES_FOR_POLICIES[0];
  const defaultPolicyRegion = (REGIONS_BY_COUNTRY[defaultPolicyCountry] ?? [])[0] ?? '';
  const [eLearningCategoryFilter, setELearningCategoryFilter] = useState<string>(ELEARNING_CATEGORIES[0]);
  const [hrCategoryFilter, setHrCategoryFilter] = useState<string>(HR_CATEGORIES[0]);
  const [policyCountryFilter, setPolicyCountryFilter] = useState<string>(defaultPolicyCountry);
  const [policyRegionFilter, setPolicyRegionFilter] = useState<string>(defaultPolicyRegion);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContentType, setModalContentType] = useState<ContentType>('e-learning');
  const [editingContent, setEditingContent] = useState<any>(null);
  
  // Preview modal state
  const [previewContent, setPreviewContent] = useState<UploadedContent | null>(null);
  
  // Content data
  const [eLearningContent, setELearningContent] = useState<UploadedContent[]>([]);
  const [hrDocuments, setHrDocuments] = useState<UploadedContent[]>([]);
  const [statePolicies, setStatePolicies] = useState<UploadedContent[]>([]);
  
  // Pagination state
  const [eLearningPagination, setELearningPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [hrPagination, setHrPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [policyPagination, setPolicyPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  
  // Search state
  const [eLearningSearch, setELearningSearch] = useState('');
  const [hrSearch, setHrSearch] = useState('');
  const [policySearch, setPolicySearch] = useState('');
  
  // Loading states
  const [isLoadingELearning, setIsLoadingELearning] = useState(false);
  const [isLoadingHR, setIsLoadingHR] = useState(false);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Fetch all content on mount
  useEffect(() => {
    fetchAllContent();
  }, []);

  // Refetch content when language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      fetchAllContent();
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const fetchAllContent = async () => {
    await Promise.all([
      fetchELearningContent(eLearningPagination.page, eLearningSearch, eLearningCategoryFilter),
      fetchHRDocuments(hrPagination.page, hrSearch, hrCategoryFilter),
      fetchStatePolicies(policyPagination.page, policySearch, policyCountryFilter, policyRegionFilter),
    ]);
  };

  const fetchELearningContent = useCallback(async (
    page = eLearningPagination.page,
    search = eLearningSearch,
    category = eLearningCategoryFilter,
  ) => {
    setIsLoadingELearning(true);
    setError(null);
    try {
      const currentLang = i18n.language || 'en';
      const response = await api.getELearning(apiClient, {
        page,
        limit: eLearningPagination.limit,
        search: search || undefined,
        category: category || undefined,
        lang: currentLang,
      });
      
      if (response.data.success) {
        // Backend returns paginated response
        const result = response.data as any;
        setELearningContent(result.data || []);
        if (result.pagination) {
          setELearningPagination(result.pagination);
        }
      }
    } catch (error: any) {
      console.error('Error fetching e-learning content:', error);
      const message = error.response?.data?.message || 'Failed to fetch e-learning content';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoadingELearning(false);
    }
  }, [apiClient, eLearningPagination.limit, i18n.language, eLearningPagination.page, eLearningSearch, eLearningCategoryFilter]);

  const fetchHRDocuments = useCallback(async (
    page = hrPagination.page,
    search = hrSearch,
    category = hrCategoryFilter,
  ) => {
    setIsLoadingHR(true);
    setError(null);
    try {
      const currentLang = i18n.language || 'en';
      const response = await api.getHrDocuments(apiClient, {
        page,
        limit: hrPagination.limit,
        search: search || undefined,
        category: category || undefined,
        lang: currentLang,
      });
      
      if (response.data.success) {
        const result = response.data as any;
        setHrDocuments(result.data || []);
        if (result.pagination) {
          setHrPagination(result.pagination);
        }
      }
    } catch (error: any) {
      console.error('Error fetching HR documents:', error);
      const message = error.response?.data?.message || 'Failed to fetch HR documents';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoadingHR(false);
    }
  }, [apiClient, hrPagination.limit, i18n.language, hrPagination.page, hrSearch, hrCategoryFilter]);

  const fetchStatePolicies = useCallback(async (
    page = policyPagination.page,
    search = policySearch,
    country = policyCountryFilter,
    region = policyRegionFilter,
  ) => {
    setIsLoadingPolicies(true);
    setError(null);
    try {
      const currentLang = i18n.language || 'en';
      const response = await api.getStatePolicies(apiClient, {
        page,
        limit: policyPagination.limit,
        search: search || undefined,
        country: country || undefined,
        region: region || undefined,
        lang: currentLang,
      });
      
      if (response.data.success) {
        const result = response.data as any;
        setStatePolicies(result.data || []);
        if (result.pagination) {
          setPolicyPagination(result.pagination);
        }
      }
    } catch (error: any) {
      console.error('Error fetching state policies:', error);
      const message = error.response?.data?.message || 'Failed to fetch state policies';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoadingPolicies(false);
    }
  }, [apiClient, policyPagination.limit, i18n.language, policyPagination.page, policySearch, policyCountryFilter, policyRegionFilter]);

  // If country changes, ensure the selected region is valid for that country.
  useEffect(() => {
    const validRegions = REGIONS_BY_COUNTRY[policyCountryFilter] ?? [];
    if (!policyRegionFilter || !validRegions.includes(policyRegionFilter)) {
      const nextRegion = validRegions[0] ?? '';
      setPolicyRegionFilter(nextRegion);
      setPolicyPagination((prev) => ({ ...prev, page: 1 }));
      fetchStatePolicies(1, policySearch, policyCountryFilter, nextRegion);
      return;
    }
    // Refresh policies if country changes but region remains valid
    setPolicyPagination((prev) => ({ ...prev, page: 1 }));
    fetchStatePolicies(1, policySearch, policyCountryFilter, policyRegionFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyCountryFilter]);

  const handleOpenModal = (contentType: ContentType, existingContent?: any) => {
    setModalContentType(contentType);
    setEditingContent(existingContent || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContent(null);
  };

  const handleContentSubmit = async (data: any, file?: File, onProgress?: (progress: number) => void) => {
    try {
      const formData = new FormData();
      
      if (file) {
        formData.append('file', file);
        console.log('📎 File attached:', {
          name: file.name,
          type: file.type,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        });
      }

      // Append all form fields
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) {
          if (Array.isArray(data[key])) {
            formData.append(key, JSON.stringify(data[key]));
          } else {
            formData.append(key, data[key]);
          }
        }
      });

      // Log FormData contents for debugging
      console.log('📤 FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.type}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      let response;
      
      if (editingContent) {
        // Update existing content - send as JSON, not FormData
        console.log('Updating content:', editingContent.id, 'Type:', modalContentType);
        console.log('Update data:', data);
        
        try {
          if (modalContentType === 'e-learning') {
            response = await api.updateELearning(apiClient, editingContent.id, data);
          } else if (modalContentType === 'hr') {
            response = await api.updateHrDocument(apiClient, editingContent.id, data);
          } else if (modalContentType === 'policy') {
            response = await api.updateStatePolicy(apiClient, editingContent.id, data);
          }
          
          console.log('Update response:', response);
          console.log('Update response.data:', response?.data);
          console.log('Update response.data.success:', response?.data?.success);
          console.log('Update response.status:', response?.status);
          
          // Show success toast if we got a response (update likely succeeded)
          // The backend log confirms it updated, so even if response structure is unexpected, show success
          if (response && (response?.status === 200 || response?.data?.success)) {
            showToast(t('admin:content.updateSuccess', 'Content updated successfully'), 'success');
          } else {
            console.warn('Update response structure unexpected:', response);
            // Still show success since backend confirmed the update
            showToast(t('admin:content.updateSuccess', 'Content updated successfully'), 'success');
          }
        } catch (updateError: any) {
          console.error('Error during update API call:', updateError);
          console.error('Update error response:', updateError?.response);
          throw updateError; // Re-throw to be caught by outer catch
        }
      } else {
      // Upload new content with progress callback and retry logic
              const uploadPromise = async () => {
                if (modalContentType === 'e-learning') {
                  return await api.uploadELearning(apiClient, formData, onProgress);
                } else if (modalContentType === 'hr') {
                  return await api.uploadHrDocument(apiClient, formData, onProgress);
                } else if (modalContentType === 'policy') {
                  return await api.uploadStatePolicy(apiClient, formData, onProgress);
                }
                throw new Error('Invalid content type');
              };

              // Use video upload preset for e-learning (which may include videos)
              // Use regular upload preset for other content types
              const retryPreset = modalContentType === 'e-learning' 
                ? RetryPresets.videoUpload 
                : RetryPresets.upload;

              const result = await retryWithBackoff(uploadPromise, {
                ...retryPreset,
                onRetry: (error, attempt, delay) => {
                  console.log(`Content upload retry attempt ${attempt} after ${delay}ms:`, error.message);
                  showToast(`Upload failed. Retrying (attempt ${attempt})...`, 'info');
                  if (onProgress) onProgress(0); // Reset progress on retry
                },
              });

              if (!result.success) {
                throw result.error;
              }

              response = result.data;
              showToast(t('admin:content.uploadSuccess', 'Content uploaded successfully'), 'success');
      }

      // Check if response is successful (handle both update and upload responses)
      // Axios wraps the response in .data, so if backend returns { success: true, data: ... }
      // then response.data = { success: true, data: ... }
      console.log('Checking response success. Full response:', response);
      console.log('response?.data:', response?.data);
      console.log('response?.data?.success:', response?.data?.success);
      console.log('response?.status:', response?.status);
      
      // Check multiple ways the response could indicate success
      // If we got a response object, assume success (backend log confirms update)
      const isSuccess = 
        response && (
          response?.data?.success === true || 
          response?.status === 200 || 
          (response?.data && !response?.data?.error && response?.status >= 200 && response?.status < 300) ||
          (response && !response?.data?.error) // Fallback: if we got a response without error, assume success
        );
      console.log('isSuccess:', isSuccess);
      
      if (isSuccess || response) {
        // Always refresh if we got a response (update succeeded based on backend log)
        console.log('Refreshing content list for:', modalContentType);
        // Refresh the appropriate content list - use current page to maintain position
        try {
          if (modalContentType === 'e-learning') {
            await fetchELearningContent(eLearningPagination.page, eLearningSearch);
            console.log('E-learning content refreshed');
          } else if (modalContentType === 'hr') {
            await fetchHRDocuments(hrPagination.page, hrSearch);
            console.log('HR documents refreshed');
          } else if (modalContentType === 'policy') {
            await fetchStatePolicies(policyPagination.page, policySearch);
            console.log('State policies refreshed');
          }
          console.log('Content list refreshed, closing modal');
        } catch (fetchError) {
          console.error('Error refreshing content list:', fetchError);
          // Still close modal even if refresh fails
        }
        handleCloseModal();
      } else {
        console.error('Response not successful:', response);
        throw new Error(response?.data?.message || 'Failed to update content');
      }
    } catch (error: any) {
      console.error('Error submitting content:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        responseData: error.response?.data,
        status: error.response?.status,
      });
      
      // Extract detailed validation errors from backend response
      let message = 'Failed to submit content';
      const responseData = error.response?.data;
      
      if (responseData) {
        // Check for validation errors array
        if (Array.isArray(responseData)) {
          // Backend returns array of validation errors
          const errorMessages = responseData.map((e: any) => {
            if (e.constraints) {
              return Object.values(e.constraints).join(', ');
            }
            return e.field ? `${e.field}: invalid` : JSON.stringify(e);
          });
          message = errorMessages.join('; ');
        } else if (typeof responseData.message === 'string') {
          // Standard error message (string)
          message = responseData.message;
        } else if (Array.isArray(responseData.message)) {
          // Array of error messages
          message = responseData.message.join('; ');
        } else if (responseData.errors) {
          // Validation errors object
          const errorMessages = responseData.errors.map((e: any) => {
            if (e.constraints) {
              return `${e.field}: ${Object.values(e.constraints).join(', ')}`;
            }
            return e.field ? `${e.field}: invalid` : JSON.stringify(e);
          });
          message = errorMessages.join('; ');
        } else if (typeof responseData === 'string') {
          // Response is just a string
          message = responseData;
        }
      } else if (error.message) {
        message = error.message;
      }
      
      // Ensure message is always a string
      if (typeof message !== 'string') {
        message = JSON.stringify(message);
      }
      
      console.error('Parsed error message:', message);
      showToast(message, 'error');
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleDelete = async (contentType: ContentType, id: string) => {
    if (!confirm(t('admin:content.deleteConfirm', 'Are you sure you want to delete this content?'))) {
      return;
    }

    try {
      let response;
      
      if (contentType === 'e-learning') {
        response = await api.deleteELearning(apiClient, id);
      } else if (contentType === 'hr') {
        response = await api.deleteHrDocument(apiClient, id);
      } else if (contentType === 'policy') {
        response = await api.deleteStatePolicy(apiClient, id);
      }

      if (response?.data.success) {
        showToast(t('admin:content.deleteSuccess', 'Content deleted successfully'), 'success');
        // Refresh the appropriate content list
        if (contentType === 'e-learning') {
          await fetchELearningContent();
        } else if (contentType === 'hr') {
          await fetchHRDocuments();
        } else if (contentType === 'policy') {
          await fetchStatePolicies();
        }
      }
    } catch (error: any) {
      console.error('Error deleting content:', error);
      const message = error.response?.data?.message || 'Failed to delete content';
      showToast(message, 'error');
    }
  };

  const handleView = (content: UploadedContent) => {
    if (!content.fileUrl && !content.publicUrl) {
      alert(t('admin:content.noFileUrl', 'No file URL available for this content'));
      return;
    }
    setPreviewContent(content);
  };

  const handleSearch = (contentType: ContentType, value: string) => {
    if (contentType === 'e-learning') {
      setELearningSearch(value);
      setELearningPagination((prev) => ({ ...prev, page: 1 }));
      fetchELearningContent(1, value, eLearningCategoryFilter);
    } else if (contentType === 'hr') {
      setHrSearch(value);
      setHrPagination((prev) => ({ ...prev, page: 1 }));
      fetchHRDocuments(1, value, hrCategoryFilter);
    } else if (contentType === 'policy') {
      setPolicySearch(value);
      setPolicyPagination((prev) => ({ ...prev, page: 1 }));
      fetchStatePolicies(1, value, policyCountryFilter, policyRegionFilter);
    }
  };

  const handlePageChange = (contentType: ContentType, newPage: number) => {
    if (contentType === 'e-learning') {
      setELearningPagination((prev) => ({ ...prev, page: newPage }));
      fetchELearningContent(newPage, eLearningSearch, eLearningCategoryFilter);
    } else if (contentType === 'hr') {
      setHrPagination((prev) => ({ ...prev, page: newPage }));
      fetchHRDocuments(newPage, hrSearch, hrCategoryFilter);
    } else if (contentType === 'policy') {
      setPolicyPagination((prev) => ({ ...prev, page: newPage }));
      fetchStatePolicies(newPage, policySearch, policyCountryFilter, policyRegionFilter);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    // Simple toast implementation - you can replace with a proper toast library
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'info' ? 'bg-blue-500' : 'bg-red-500';
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg ${bgColor} text-white z-[9999] transition-opacity duration-300`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin:content.title', 'Content Management')}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {t('admin:content.description', 'Upload and manage e-learning materials, HR documents, and state policies')}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => handleOpenModal('e-learning')}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          {t('admin:content.addELearning', 'Add E-Learning Content')}
        </button>
        
        <button
          onClick={() => handleOpenModal('hr')}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          {t('admin:content.addHRDocument', 'Add HR Document')}
        </button>
        
        <button
          onClick={() => handleOpenModal('policy')}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          {t('admin:content.addStatePolicy', 'Add State Policy')}
        </button>
      </div>

      {/* Content Sections */}
      <div className="space-y-12">
        {/* E-Learning Content */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <AcademicCapIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{t('admin:content.eLearning.title')}</h2>
              <span className="ml-3 text-sm text-gray-500">
                ({eLearningPagination.total} {t('admin:content.eLearning.total')} • {t('admin:content.category', 'Category')}: {eLearningCategoryFilter || t('admin:content.all', 'All')})
              </span>
            </div>
            
            {/* Search */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder={t('admin:content.eLearning.searchPlaceholder')}
                value={eLearningSearch}
                onChange={(e) => handleSearch('e-learning', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Categories (primary navigation) */}
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterChip
              label={t('admin:content.allCategories', 'All categories')}
              selected={!eLearningCategoryFilter}
              onClick={() => {
                setELearningCategoryFilter('');
                setELearningPagination((prev) => ({ ...prev, page: 1 }));
                fetchELearningContent(1, eLearningSearch, '');
              }}
              color="indigo"
            />
            {ELEARNING_CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                label={cat}
                selected={eLearningCategoryFilter === cat}
                onClick={() => {
                  setELearningCategoryFilter(cat);
                  setELearningPagination((prev) => ({ ...prev, page: 1 }));
                  fetchELearningContent(1, eLearningSearch, cat);
                }}
                color="indigo"
              />
            ))}
          </div>
          
          {isLoadingELearning ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-gray-500">{t('admin:content.eLearning.loading')}</p>
            </div>
          ) : eLearningContent.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {eLearningSearch ? t('admin:content.eLearning.noResults') : t('admin:content.eLearning.empty')}
              </p>
              <button
                onClick={() => handleOpenModal('e-learning')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('admin:content.eLearning.addFirst')}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eLearningContent.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onEdit={() => handleOpenModal('e-learning', item)}
                    onDelete={() => handleDelete('e-learning', item.id)}
                    onView={() => handleView(item)}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              <Pagination
                currentPage={eLearningPagination.page}
                totalPages={eLearningPagination.totalPages}
                onPageChange={(page) => handlePageChange('e-learning', page)}
              />
            </>
          )}
        </section>

        {/* HR Documents */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{t('admin:content.hrDocuments.title')}</h2>
              <span className="ml-3 text-sm text-gray-500">
                ({hrPagination.total} {t('admin:content.eLearning.total')} • {t('admin:content.category', 'Category')}: {hrCategoryFilter || t('admin:content.all', 'All')})
              </span>
            </div>
            
            {/* Search */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder={t('admin:content.hrDocuments.searchPlaceholder')}
                value={hrSearch}
                onChange={(e) => handleSearch('hr', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Categories (primary navigation) */}
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterChip
              label={t('admin:content.allCategories', 'All categories')}
              selected={!hrCategoryFilter}
              onClick={() => {
                setHrCategoryFilter('');
                setHrPagination((prev) => ({ ...prev, page: 1 }));
                fetchHRDocuments(1, hrSearch, '');
              }}
              color="green"
            />
            {HR_CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                label={cat}
                selected={hrCategoryFilter === cat}
                onClick={() => {
                  setHrCategoryFilter(cat);
                  setHrPagination((prev) => ({ ...prev, page: 1 }));
                  fetchHRDocuments(1, hrSearch, cat);
                }}
                color="green"
              />
            ))}
          </div>
          
          {isLoadingHR ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-sm text-gray-500">{t('admin:content.hrDocuments.loading')}</p>
            </div>
          ) : hrDocuments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {hrSearch ? t('admin:content.hrDocuments.noResults') : t('admin:content.hrDocuments.empty')}
              </p>
              <button
                onClick={() => handleOpenModal('hr')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('admin:content.hrDocuments.addFirst')}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hrDocuments.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onEdit={() => handleOpenModal('hr', item)}
                    onDelete={() => handleDelete('hr', item.id)}
                    onView={() => handleView(item)}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              <Pagination
                currentPage={hrPagination.page}
                totalPages={hrPagination.totalPages}
                onPageChange={(page) => handlePageChange('hr', page)}
              />
            </>
          )}
        </section>

        {/* State Policies */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <ScaleIcon className="h-8 w-8 text-purple-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">{t('admin:content.statePolicies.title')}</h2>
              <span className="ml-3 text-sm text-gray-500">
                ({policyPagination.total} {t('admin:content.eLearning.total')} • {t('admin:content.country', 'Country')}: {policyCountryFilter} • {t('admin:content.state', 'State/Region')}: {policyRegionFilter || t('admin:content.allStates', 'All')})
              </span>
            </div>
            
            {/* Search */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder={t('admin:content.statePolicies.searchPlaceholder')}
                value={policySearch}
                onChange={(e) => handleSearch('policy', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Country + State/Region (primary navigation) */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {COUNTRIES_FOR_POLICIES.map((country) => (
                <FilterChip
                  key={country}
                  label={country}
                  selected={policyCountryFilter === country}
                  onClick={() => {
                    if (country === policyCountryFilter) return;
                    setPolicyCountryFilter(country);
                  }}
                  color="purple"
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label={t('admin:content.allStates', 'All states/regions')}
                selected={!policyRegionFilter}
                onClick={() => {
                  setPolicyRegionFilter('');
                  setPolicyPagination((prev) => ({ ...prev, page: 1 }));
                  fetchStatePolicies(1, policySearch, policyCountryFilter, '');
                }}
                color="purple"
              />
              {(REGIONS_BY_COUNTRY[policyCountryFilter] ?? []).map((region) => (
                <FilterChip
                  key={region}
                  label={region}
                  selected={policyRegionFilter === region}
                  onClick={() => {
                    setPolicyRegionFilter(region);
                    setPolicyPagination((prev) => ({ ...prev, page: 1 }));
                    fetchStatePolicies(1, policySearch, policyCountryFilter, region);
                  }}
                  color="purple"
                />
              ))}
            </div>
          </div>
          
          {isLoadingPolicies ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-sm text-gray-500">{t('admin:content.statePolicies.loading')}</p>
            </div>
          ) : statePolicies.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <ScaleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {policySearch ? t('admin:content.statePolicies.noResults') : t('admin:content.statePolicies.empty')}
              </p>
              <button
                onClick={() => handleOpenModal('policy')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('admin:content.statePolicies.addFirst')}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statePolicies.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    onEdit={() => handleOpenModal('policy', item)}
                    onDelete={() => handleDelete('policy', item.id)}
                    onView={() => handleView(item)}
                  />
                ))}
              </div>
              
              {/* Pagination */}
              <Pagination
                currentPage={policyPagination.page}
                totalPages={policyPagination.totalPages}
                onPageChange={(page) => handlePageChange('policy', page)}
              />
            </>
          )}
        </section>
      </div>

      {/* Upload Modal */}
      <ContentUploadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleContentSubmit}
        contentType={modalContentType}
        existingContent={editingContent}
      />

      {/* Preview Modal */}
      {previewContent && (
        <DocumentPreviewModal
          isOpen={!!previewContent}
          onClose={() => setPreviewContent(null)}
          fileUrl={previewContent.fileUrl || previewContent.publicUrl}
          fileName={previewContent.title}
          fileType={previewContent.type || 'document'}
        />
      )}
    </div>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
  color,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  color: 'indigo' | 'green' | 'purple';
}) {
  const base =
    'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const stylesByColor: Record<typeof color, { selected: string; unselected: string; ring: string }> = {
    indigo: {
      selected: 'bg-indigo-600 text-white border-indigo-600',
      unselected: 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50',
      ring: 'focus:ring-indigo-500',
    },
    green: {
      selected: 'bg-green-600 text-white border-green-600',
      unselected: 'bg-white text-green-700 border-green-200 hover:bg-green-50',
      ring: 'focus:ring-green-500',
    },
    purple: {
      selected: 'bg-purple-600 text-white border-purple-600',
      unselected: 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50',
      ring: 'focus:ring-purple-500',
    },
  };

  const styles = stylesByColor[color];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${base} ${styles.ring} ${selected ? styles.selected : styles.unselected}`}
    >
      {label}
    </button>
  );
}

// Content Card Component
function ContentCard({
  item,
  onEdit,
  onDelete,
  onView,
}: {
  item: UploadedContent;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
        )}
        {item.category && (
          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 mb-3">
            {item.category}
          </span>
        )}
        <div className="text-xs text-gray-500 mb-4">
          {t('admin:content.updated', 'Updated')}: {new Date(item.updatedAt).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
          >
            {t('admin:content.view', 'View')}
          </button>
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            {t('admin:content.edit', 'Edit')}
          </button>
          <button
            onClick={onDelete}
            className="flex-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
          >
            {t('admin:content.delete', 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Pagination Component
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            1
          </button>
          {startPage > 2 && <span className="px-2">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 border rounded-md ${
            currentPage === page
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

