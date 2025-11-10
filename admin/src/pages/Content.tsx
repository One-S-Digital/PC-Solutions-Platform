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
import { useApiClient } from '../services/api';
import * as api from '../services/api';
import { retryWithBackoff, RetryPresets } from '../utils/retryUtility';

type ContentType = 'e-learning' | 'hr' | 'policy';

interface UploadedContent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  type?: string;
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
  const apiClient = useApiClient();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContentType, setModalContentType] = useState<ContentType>('e-learning');
  const [editingContent, setEditingContent] = useState<any>(null);
  
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

  const fetchAllContent = async () => {
    await Promise.all([
      fetchELearningContent(),
      fetchHRDocuments(),
      fetchStatePolicies(),
    ]);
  };

  const fetchELearningContent = useCallback(async (page = eLearningPagination.page, search = eLearningSearch) => {
    setIsLoadingELearning(true);
    setError(null);
    try {
      const response = await api.getELearning(apiClient, {
        page,
        limit: eLearningPagination.limit,
        search: search || undefined,
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
  }, [apiClient, eLearningPagination.limit]);

  const fetchHRDocuments = useCallback(async (page = hrPagination.page, search = hrSearch) => {
    setIsLoadingHR(true);
    setError(null);
    try {
      const response = await api.getHrDocuments(apiClient, {
        page,
        limit: hrPagination.limit,
        search: search || undefined,
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
  }, [apiClient, hrPagination.limit]);

  const fetchStatePolicies = useCallback(async (page = policyPagination.page, search = policySearch) => {
    setIsLoadingPolicies(true);
    setError(null);
    try {
      const response = await api.getStatePolicies(apiClient, {
        page,
        limit: policyPagination.limit,
        search: search || undefined,
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
  }, [apiClient, policyPagination.limit]);

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

      let response;
      
      if (editingContent) {
        // Update existing content
        if (modalContentType === 'e-learning') {
          response = await api.updateELearning(apiClient, editingContent.id, data);
        } else if (modalContentType === 'hr') {
          response = await api.updateHrDocument(apiClient, editingContent.id, data);
        } else if (modalContentType === 'policy') {
          response = await api.updateStatePolicy(apiClient, editingContent.id, data);
        }
        showToast('Content updated successfully', 'success');
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

              const result = await retryWithBackoff(uploadPromise, {
                ...RetryPresets.upload,
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
              showToast('Content uploaded successfully', 'success');
      }

      if (response?.data.success) {
        // Refresh the appropriate content list
        if (modalContentType === 'e-learning') {
          await fetchELearningContent();
        } else if (modalContentType === 'hr') {
          await fetchHRDocuments();
        } else if (modalContentType === 'policy') {
          await fetchStatePolicies();
        }
        
        handleCloseModal();
      }
    } catch (error: any) {
      console.error('Error submitting content:', error);
      const message = error.response?.data?.message || 'Failed to submit content';
      showToast(message, 'error');
      throw error; // Re-throw to let modal handle it
    }
  };

  const handleDelete = async (contentType: ContentType, id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) {
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
        showToast('Content deleted successfully', 'success');
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

  const handleView = (url: string | undefined) => {
    if (!url || url.trim() === '') {
      alert('No file URL available for this content');
      return;
    }
    window.open(url, '_blank');
  };

  const handleSearch = (contentType: ContentType, value: string) => {
    if (contentType === 'e-learning') {
      setELearningSearch(value);
      setELearningPagination((prev) => ({ ...prev, page: 1 }));
      fetchELearningContent(1, value);
    } else if (contentType === 'hr') {
      setHrSearch(value);
      setHrPagination((prev) => ({ ...prev, page: 1 }));
      fetchHRDocuments(1, value);
    } else if (contentType === 'policy') {
      setPolicySearch(value);
      setPolicyPagination((prev) => ({ ...prev, page: 1 }));
      fetchStatePolicies(1, value);
    }
  };

  const handlePageChange = (contentType: ContentType, newPage: number) => {
    if (contentType === 'e-learning') {
      setELearningPagination((prev) => ({ ...prev, page: newPage }));
      fetchELearningContent(newPage);
    } else if (contentType === 'hr') {
      setHrPagination((prev) => ({ ...prev, page: newPage }));
      fetchHRDocuments(newPage);
    } else if (contentType === 'policy') {
      setPolicyPagination((prev) => ({ ...prev, page: newPage }));
      fetchStatePolicies(newPage);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    // Simple toast implementation - you can replace with a proper toast library
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white z-50 transition-opacity duration-300`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  // Group e-learning content by type
  const eLearningByType = {
    COURSE: eLearningContent.filter((c) => c.type === 'COURSE'),
    VIDEO: eLearningContent.filter((c) => c.type === 'VIDEO'),
    PDF: eLearningContent.filter((c) => c.type === 'PDF'),
    LINK: eLearningContent.filter((c) => c.type === 'LINK'),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload and manage e-learning materials, HR documents, and state policies
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
          Add E-Learning Content
        </button>
        
        <button
          onClick={() => handleOpenModal('hr')}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add HR Document
        </button>
        
        <button
          onClick={() => handleOpenModal('policy')}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add State Policy
        </button>
      </div>

      {/* Content Sections */}
      <div className="space-y-12">
        {/* E-Learning Content */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <AcademicCapIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">E-Learning Content</h2>
              <span className="ml-3 text-sm text-gray-500">
                ({eLearningPagination.total} total)
              </span>
            </div>
            
            {/* Search */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search e-learning..."
                value={eLearningSearch}
                onChange={(e) => handleSearch('e-learning', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          {isLoadingELearning ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading content...</p>
            </div>
          ) : eLearningContent.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {eLearningSearch ? 'No results found' : 'No e-learning content yet'}
              </p>
              <button
                onClick={() => handleOpenModal('e-learning')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Content
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
                    onView={() => handleView(item.fileUrl || item.publicUrl)}
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
              <h2 className="text-2xl font-bold text-gray-900">HR Documents</h2>
              <span className="ml-3 text-sm text-gray-500">
                ({hrPagination.total} total)
              </span>
            </div>
            
            {/* Search */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search HR documents..."
                value={hrSearch}
                onChange={(e) => handleSearch('hr', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          {isLoadingHR ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading documents...</p>
            </div>
          ) : hrDocuments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {hrSearch ? 'No results found' : 'No HR documents yet'}
              </p>
              <button
                onClick={() => handleOpenModal('hr')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Document
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
                    onView={() => handleView(item.publicUrl)}
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
              <h2 className="text-2xl font-bold text-gray-900">State Policies</h2>
              <span className="ml-3 text-sm text-gray-500">
                ({policyPagination.total} total)
              </span>
            </div>
            
            {/* Search */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search policies..."
                value={policySearch}
                onChange={(e) => handleSearch('policy', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          {isLoadingPolicies ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading policies...</p>
            </div>
          ) : statePolicies.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <ScaleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                {policySearch ? 'No results found' : 'No state policies yet'}
              </p>
              <button
                onClick={() => handleOpenModal('policy')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Policy
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
                    onView={() => handleView(item.publicUrl)}
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
    </div>
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
          Updated: {new Date(item.updatedAt).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
          >
            View
          </button>
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
          >
            Delete
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

