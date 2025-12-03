


import React, { useState, useMemo, useEffect } from 'react';
// [FIX] Imported HR_CATEGORIES to use as a valid fallback.
import { HRDocument, UserRole, HRDocument as HRDocType, HR_CATEGORIES, HR_CATEGORY_LABELS, HRCategory } from '../types';
import { STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants';
import Card from '../components/ui/Card'; 
import Button from '../components/ui/Button';
import { DocumentTextIcon, MagnifyingGlassIcon, CalendarDaysIcon, ArrowDownTrayIcon, EyeIcon, StarIcon, DocumentDuplicateIcon, UserPlusIcon, BuildingLibraryIcon, AcademicCapIcon, HeartIcon, FolderIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import i18n from '../i18n';

interface HRDocumentCardProps {
  doc: HRDocument;
  onToggleFavorite: (id: string) => void;
  onPreview: (doc: HRDocument) => void;
  onDownload: (doc: HRDocument) => void;
}

const normalizeHrCategory = (value: unknown): HRCategory => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Try exact match first
    if (HR_CATEGORIES.includes(trimmed as HRCategory)) {
      return trimmed as HRCategory;
    }
    // Try case-insensitive match
    const found = HR_CATEGORIES.find(
      cat => cat.toLowerCase() === trimmed.toLowerCase()
    );
    if (found) {
      return found;
    }
  }
  return 'Other';
};

const HRDocumentCard: React.FC<HRDocumentCardProps> = ({ doc, onToggleFavorite, onPreview, onDownload }) => {
  const { t } = useTranslation(['content', 'common']);
  const fileTypeColors = {
    PDF: 'text-red-500',
    DOCX: 'text-blue-500',
    XLSX: 'text-green-500',
  };

  return (
    <Card className="flex flex-col group" hoverEffect>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center mb-3">
            <DocumentDuplicateIcon className={`w-10 h-10 ${fileTypeColors[doc.fileType] || 'text-gray-500'}`} />
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-swiss-charcoal group-hover:text-swiss-mint transition-colors">{doc.title}</h3>
              <p className="text-xs text-gray-500">{t('hrProcedures.documentCard.categoryLabel')}: {HR_CATEGORY_LABELS[doc.category as HRCategory] || doc.category}</p>
              {doc.language && <p className="text-xs text-gray-500">{t('hrProcedures.documentCard.languageLabel')}: {doc.language} {doc.version && `${t('hrProcedures.documentCard.versionLabel')}: ${doc.version}`}</p>}
            </div>
          </div>
          <button onClick={() => onToggleFavorite(doc.id)} className="text-gray-300 hover:text-yellow-400 focus:outline-none" aria-label={t('hrProcedures.documentCard.toggleFavoriteLabel')}>
            <StarIcon className={`w-6 h-6 transition-colors ${doc.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-300'}`} />
          </button>
        </div>
        {doc.contentPreview && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-3">{doc.contentPreview}</p>
        )}
        <p className="text-xs text-gray-500 mb-1">
          <CalendarDaysIcon className="w-4 h-4 inline mr-1" /> {t('hrProcedures.documentCard.lastUpdatedLabel')}: {new Date(doc.lastUpdated).toLocaleDateString()}
        </p>
        <div className="my-2">
          {doc.tags.map(tag => (
            <span key={tag} className={`text-xs px-2 py-0.5 rounded-full mr-1 mb-1 inline-block ${
              tag === 'Mandatory' ? 'bg-red-100 text-red-700' : 
              tag === 'New' ? 'bg-blue-100 text-blue-700' : 
              tag === 'Updated' ? 'bg-yellow-100 text-yellow-700' :
              tag === 'Critical' ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-700'}`}>{tag}</span>
          ))}
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3 mt-auto border-t flex justify-end items-center space-x-2">
        <Button variant="primary" size="sm" leftIcon={ArrowDownTrayIcon} onClick={() => onDownload(doc)}>{t('hrProcedures.documentCard.downloadButton')}</Button>
        <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={() => onPreview(doc)} className="p-2" aria-label={t('hrProcedures.documentCard.previewButtonLabel')} title={t('hrProcedures.documentCard.previewButtonLabel')}></Button>
      </div>
    </Card>
  );
};

const CategoryDisplayCard: React.FC<{title: string, icon: React.ElementType, count: number, colorClasses: string, onSelect: () => void}> = ({title, icon: Icon, count, colorClasses, onSelect}) => {
    const { t } = useTranslation(['content', 'common']);
    return (
    <div 
      className={`p-5 cursor-pointer rounded-card shadow-soft hover:shadow-lg transition-shadow duration-200 ease-in-out ${colorClasses}`} 
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      aria-label={t('hrProcedures.categoryDisplay.viewCategoryAria', { title })}
    >
        <Icon className="w-10 h-10 mb-3 text-current"/>
        <h3 className="text-xl font-semibold mb-1 text-current">{title}</h3>
        <p className="text-sm opacity-80 text-current">{t('hrProcedures.categoryDisplay.documentsCount', { count })}</p>
    </div>
    );
};


const HRProceduresPage: React.FC = () => {
  const { t } = useTranslation(['content', 'common']);
  const { currentUser } = useAppContext();
  const { authenticatedRequest, authenticatedUpload, authenticatedDownload } = useAuthenticatedApi();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HRCategory | null>(null);
  const [hrDocs, setHrDocs] = useState<HRDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<HRDocument | null>(null);


  const isAdminOrSuperAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  // Fetch HR documents from API
  useEffect(() => {
    const fetchHRDocuments = async () => {
      try {
        setIsLoading(true);
        const currentLang = i18n.language || 'en';
        const response = await authenticatedRequest<any[]>(`/content/hr-documents?limit=100&lang=${currentLang}`, {
          method: 'GET'
        });

        if (response.success && response.data) {
          // Transform API response to match HRDocument interface
          const documents = response.data.map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            category: normalizeHrCategory(doc.category),
            fileUrl: doc.publicUrl || doc.fileUrl || doc.url || '#',
            uploaderId: doc.uploaderId || doc.createdBy,
            lastUpdated: doc.updatedAt || doc.lastUpdated || new Date().toISOString(),
            fileType: doc.fileType || 'PDF',
            tags: doc.tags || [],
            language: doc.language,
            version: doc.versionNumber || 'v1.0',
            status: doc.status || 'Published',
            isFavorite: false, // TODO: Implement favorites
            contentPreview: doc.contentPreview || doc.description,
          }));
          setHrDocs(documents);
        }
      } catch (error) {
        console.error('Failed to fetch HR documents:', error);
        // Fall back to empty state if API fails
        setHrDocs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHRDocuments();
  }, [authenticatedRequest, i18n.language]);

  const toggleFavorite = (id: string) => {
    setHrDocs(prevDocs => prevDocs.map(doc => doc.id === id ? {...doc, isFavorite: !doc.isFavorite} : doc));
  };

  const categoriesWithCounts = useMemo(() => {
    const counts: Partial<Record<HRCategory, number>> = {};
    hrDocs
      .filter(doc => doc.status === 'Published' || isAdminOrSuperAdmin)
      .forEach(doc => {
        counts[doc.category] = (counts[doc.category] || 0) + 1;
      });
    return (Object.entries(counts) as [HRCategory, number][]) 
      .filter(([, count]) => count > 0)
      .map(([category, count]) => ({ category, count }));
  }, [hrDocs, isAdminOrSuperAdmin]);
  
  const categoryVisuals: Record<HRCategory, {icon: React.ElementType, colorClasses: string}> = {
    Onboarding: { icon: UserPlusIcon, colorClasses: 'bg-swiss-sand text-swiss-charcoal' },
    Policies: { icon: DocumentTextIcon, colorClasses: 'bg-swiss-coral text-white' },
    Benefits: { icon: HeartIcon, colorClasses: 'bg-pink-500 text-white' },
    Training: { icon: AcademicCapIcon, colorClasses: 'bg-purple-500 text-white' },
    Compliance: { icon: BuildingLibraryIcon, colorClasses: 'bg-swiss-teal text-white' },
    Performance: { icon: StarIcon, colorClasses: 'bg-yellow-400 text-swiss-charcoal' },
    Other: { icon: FolderIcon, colorClasses: 'bg-gray-500 text-white' },
  };

  const filteredDocs = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return hrDocs.filter(doc => {
      if (!(isAdminOrSuperAdmin || doc.status === 'Published')) {
        return false;
      }

      const categoryLabel = HR_CATEGORY_LABELS[doc.category] || doc.category;
      const matchesSearch =
        doc.title.toLowerCase().includes(searchLower) ||
        doc.category.toLowerCase().includes(searchLower) ||
        categoryLabel.toLowerCase().includes(searchLower) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchLower));

      const matchesCategory = selectedCategory === null || doc.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, hrDocs, isAdminOrSuperAdmin]);


  const handlePreview = (doc: HRDocument) => {
    setPreviewDoc(doc);
  };

  const handleDownload = async (doc: HRDocument) => {
    try {
      await authenticatedDownload(doc.fileUrl, `${doc.title}.${doc.fileType.toLowerCase()}`);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };
  
  const totalPublishedDocs = useMemo(() => hrDocs.filter(doc => doc.status === 'Published' || isAdminOrSuperAdmin).length, [hrDocs, isAdminOrSuperAdmin]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">{t('hrProcedures.title')}</h1>
        {isAdminOrSuperAdmin && (
          <span className="text-sm text-gray-500 italic">{t('hrProcedures.adminUploadNote', 'Use Admin Dashboard to add/edit documents')}</span>
        )}
      </div>
      
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <label htmlFor="hrSearch" className="sr-only">{t('hrProcedures.searchPlaceholder')}</label>
                <input
                id="hrSearch"
                type="text"
                placeholder={t('hrProcedures.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${ICON_INPUT_FIELD} w-full`} 
                />
            </div>
        </div>
      </Card>

      <h2 className="text-2xl font-semibold text-swiss-charcoal mt-6 mb-3">{t('hrProcedures.categoriesTitle')}</h2>
      
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500">{t('common:loading') || 'Loading documents...'}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <CategoryDisplayCard
          title={t('hrProcedures.allDocumentsCategory')}
          icon={FolderIcon}
          count={totalPublishedDocs}
          colorClasses="bg-gray-100 text-gray-700 hover:bg-gray-200"
          onSelect={() => setSelectedCategory(null)}
        />
        {categoriesWithCounts.map(({ category, count }) => {
          const visualConfig = categoryVisuals[category] || { icon: DocumentTextIcon, colorClasses: 'bg-gray-500 text-white' };
          const label = HR_CATEGORY_LABELS[category] || category;
          return (
            <CategoryDisplayCard 
              key={category} 
              title={label}
              icon={visualConfig.icon} 
              count={count} 
              colorClasses={visualConfig.colorClasses}
              onSelect={() => setSelectedCategory(category)}
            />
          );
        })}
        {categoriesWithCounts.length === 0 && totalPublishedDocs > 0 && (
            <p className="text-center text-gray-500 py-8 col-span-full">{t('hrProcedures.noDocumentsMatchSearch')}</p>
        )}
         {totalPublishedDocs === 0 && <p className="text-center text-gray-500 py-8 col-span-full">{t('hrProcedures.noDocumentsAvailable')}</p>}
      </div>
      
      <h2 className="text-2xl font-semibold text-swiss-charcoal mt-8 mb-4">
        {selectedCategory ? t('hrProcedures.documentsInCategoryTitle', { category: HR_CATEGORY_LABELS[selectedCategory] || selectedCategory }) : t('hrProcedures.allDocumentsCategory')}
        <span className="text-base font-normal text-gray-500 ml-2">{t('hrProcedures.allItemsCount', { count: filteredDocs.length })}</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map(doc => (
          <HRDocumentCard 
            key={doc.id} 
            doc={doc} 
            onToggleFavorite={toggleFavorite}
            onPreview={handlePreview}
            onDownload={handleDownload}
          />
        ))}
      </div>
      {filteredDocs.length === 0 && selectedCategory && <p className="text-center text-gray-500 py-8">{t('hrProcedures.noDocumentsInCategory', { category: HR_CATEGORY_LABELS[selectedCategory] || selectedCategory })}</p>}
      {filteredDocs.length === 0 && !selectedCategory && totalPublishedDocs > 0 && <p className="text-center text-gray-500 py-8">{t('hrProcedures.noDocumentsMatchSearch')}</p>}

      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          fileUrl={previewDoc.fileUrl}
          fileName={previewDoc.title}
          fileType={previewDoc.fileType}
        />
      )}
    </div>
  );
};

export default HRProceduresPage;