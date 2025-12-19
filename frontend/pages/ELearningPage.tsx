

import React, { useState, useMemo, useEffect } from 'react';
// [FIX] Imported ELEARNING_CATEGORIES to use as a valid fallback.
import { Course, UserRole, Course as CourseType, ELearningContentType, ELearningCategory, ELEARNING_CATEGORIES, ELEARNING_CATEGORY_LABELS } from '../types';
import { STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AcademicCapIcon, VideoCameraIcon, DocumentTextIcon, EyeIcon, PlayIcon, ArrowDownTrayIcon, LinkIcon, MagnifyingGlassIcon, ArrowTopRightOnSquareIcon, StarIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import { ensureSecureFileUrl } from '../utils/secureUrl';
import i18n from '../i18n';

interface CourseMaterialCardProps {
  item: Course;
  onPreview?: (item: Course) => void;
  onDownload?: (item: Course) => void;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

const CourseMaterialCard: React.FC<CourseMaterialCardProps> = ({ item, onPreview, onDownload, onToggleFavorite, isFavorite = false }) => {
  const { t } = useTranslation(['content', 'common']);
  const typeSpecifics = {
    [ELearningContentType.COURSE]: { icon: AcademicCapIcon, actionText: t('eLearning.actions.viewCourse'), actionIcon: EyeIcon, color: 'text-purple-500' },
    [ELearningContentType.VIDEO]: { icon: VideoCameraIcon, actionText: t('eLearning.actions.watchVideo'), actionIcon: PlayIcon, color: 'text-red-500' },
    [ELearningContentType.PDF]: { icon: DocumentTextIcon, actionText: t('eLearning.actions.viewPdf', 'View PDF'), actionIcon: EyeIcon, color: 'text-orange-500' },
    [ELearningContentType.LINK]: { icon: LinkIcon, actionText: t('eLearning.actions.viewLink', 'View Link'), actionIcon: EyeIcon, color: 'text-purple-600' },
  };
  
  const currentItemTypeKey = Object.values(ELearningContentType).find(v => v.toLowerCase() === item.type.toLowerCase()) || ELearningContentType.COURSE;
  const currentType = typeSpecifics[currentItemTypeKey];

  const IconElement = currentType.icon; 

  const handlePreview = () => {
    if (item.fileUrl && onPreview) {
      onPreview(item);
    } else {
      alert(`${t('eLearning.viewingAlert')} ${item.title}`); 
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(item);
    }
  };

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(item.id);
    }
  };

  return (
    <Card className="flex flex-col group" hoverEffect>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center mb-3">
            <IconElement className={`w-10 h-10 ${currentType.color}`} />
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-swiss-charcoal group-hover:text-swiss-mint transition-colors">{item.title}</h3>
              {item.category && (
                <p className="text-xs text-gray-500">{t('eLearning.categoryLabel')}: {ELEARNING_CATEGORY_LABELS[item.category] || item.category}</p>
              )}
              {item.language && (
                <p className="text-xs text-gray-500">{t('eLearning.languageLabel')}: {item.language} {item.type === ELearningContentType.COURSE && item.lessons && ` • ${t('eLearning.lessonsCount', { count: item.lessons })}`}</p>
              )}
            </div>
          </div>
          {onToggleFavorite && (
            <button onClick={handleToggleFavorite} className="text-gray-300 hover:text-yellow-400 focus:outline-none" aria-label={t('eLearning.toggleFavoriteLabel', 'Toggle favorite')}>
              <StarIcon className={`w-6 h-6 transition-colors ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-300'}`} />
            </button>
          )}
        </div>
        {item.contentPreview && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-3">{item.contentPreview}</p>
        )}
        {!item.contentPreview && item.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-3">{item.description}</p>
        )}
        <p className="text-xs text-gray-500 mb-1">
          <CalendarDaysIcon className="w-4 h-4 inline mr-1" /> {t('eLearning.updatedLabel')}: {new Date(item.updatedDate).toLocaleDateString()}
        </p>
        {item.tags && item.tags.length > 0 && (
          <div className="my-2">
            {item.tags.map(tag => {
              const tagKey = tag.toLowerCase() as 'mandatory' | 'new' | 'updated' | 'critical';
              const tagColor = tag === 'Mandatory' ? 'bg-red-100 text-red-700' : 
                tag === 'New' ? 'bg-blue-100 text-blue-700' : 
                tag === 'Updated' ? 'bg-yellow-100 text-yellow-700' :
                tag === 'Critical' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700';
              return (
                <span key={tag} className={`text-xs px-2 py-0.5 rounded-full mr-1 mb-1 inline-block ${tagColor}`}>
                  {t(`eLearning.tags.${tagKey}`, tag)}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="bg-gray-50 px-5 py-3 mt-auto border-t flex justify-end items-center space-x-2">
        {onDownload && item.fileUrl && (
          <Button variant="primary" size="sm" leftIcon={ArrowDownTrayIcon} onClick={handleDownload}>
            {t('eLearning.downloadButton', 'Download')}
          </Button>
        )}
        <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={handlePreview} className="p-2" aria-label={t('eLearning.previewButtonLabel', 'Preview')} title={t('eLearning.previewButtonLabel', 'Preview')}></Button>
      </div>
    </Card>
  );
};

const ELearningTypeDisplayCard: React.FC<{title: string, icon: React.ElementType, count: number, colorClasses: string, onSelect: () => void}> = ({title, icon: Icon, count, colorClasses, onSelect}) => {
  const { t } = useTranslation(['content', 'common']);
  return (
    <div 
      className={`p-5 cursor-pointer rounded-card shadow-soft hover:shadow-lg transition-shadow duration-200 ease-in-out ${colorClasses}`} 
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      aria-label={`View ${title}`}
    >
      <Icon className="w-10 h-10 mb-3 text-current"/>
      <h3 className="text-xl font-semibold mb-1 text-current">{title}</h3>
      <p className="text-sm opacity-80 text-current">{count} {t('eLearning.items', { count })}</p>
    </div>
  );
};

// Move outside component - mapping constants
const EXTENSION_TO_MIME: Record<string, string> = {
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'ogg': 'video/ogg',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
};

const TYPE_TO_MIME: Record<string, string> = {
  'VIDEO': 'video/mp4',
  'PDF': 'application/pdf',
  'COURSE': 'application/octet-stream', // Courses may vary - use generic fallback
  'LINK': 'text/html',
};

// Move outside component - helper function
const getMimeType = (item: Course): string => {
  const fileUrl = item.fileUrl || '';
  
  // Extract extension, removing query params and fragments
  const urlPath = fileUrl.split('?')[0].split('#')[0];
  const extension = urlPath.split('.').pop()?.toLowerCase();
  
  if (extension && EXTENSION_TO_MIME[extension]) {
    return EXTENSION_TO_MIME[extension];
  }
  
  return TYPE_TO_MIME[item.type] || 'application/octet-stream';
};

const ELearningPage: React.FC = () => {
  const { t } = useTranslation(['content', 'common']);
  const { currentUser } = useAppContext();
  const { authenticatedRequest, authenticatedUpload, authenticatedDownload } = useAuthenticatedApi();
  const [eLearningItems, setELearningItems] = useState<Course[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'All' | ELearningCategory>('All');
  const [filterType, setFilterType] = useState<'All' | ELearningContentType>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<Course | null>(null);

  const isAdminOrSuperAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  const normalizeElearningType = (value: unknown): ELearningContentType => {
    if (typeof value === 'string') {
      const upper = value.toUpperCase();
      if ((Object.values(ELearningContentType) as string[]).includes(upper)) {
        return upper as ELearningContentType;
      }
    }
    return ELearningContentType.COURSE;
  };

  const normalizeElearningCategory = (value: unknown): ELearningCategory => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Try exact match first
      if ((ELEARNING_CATEGORIES as readonly string[]).includes(trimmed)) {
        return trimmed as ELearningCategory;
      }
      // Try case-insensitive match
      const found = ELEARNING_CATEGORIES.find(
        cat => cat.toLowerCase() === trimmed.toLowerCase()
      );
      if (found) {
        return found;
      }
    }
    return 'Other';
  };

  // Fetch E-Learning content from API
  useEffect(() => {
    const fetchELearningContent = async () => {
      try {
        setIsLoading(true);
        const currentLang = i18n.language || 'en';
        const response = await authenticatedRequest<any[]>(`/content/elearning?limit=100&lang=${currentLang}`, {
          method: 'GET'
        });

        if (response.success && response.data) {
          // Transform API response to match Course interface
          const content = response.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            type: normalizeElearningType(item.contentType || item.type),
            category: normalizeElearningCategory(item.category),
            updatedDate: item.updatedAt || item.lastUpdated || new Date().toISOString(),
            thumbnailUrl: item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/300/180`,
            language: item.language || 'EN',
            accessRoles: item.accessRoles || [],
            status: item.status || 'Published',
            lessons: item.lessons,
            duration: item.duration,
            // Convert public R2 URLs to secure download URLs
            fileUrl: ensureSecureFileUrl(item.publicUrl || item.fileUrl || item.url),
            tags: item.tags || [],
            contentPreview: item.contentPreview || item.description,
          }));
          setELearningItems(content);
        }
      } catch (error) {
        console.error('Failed to fetch E-Learning content:', error);
        // Fall back to empty state if API fails
        setELearningItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchELearningContent();
  }, [authenticatedRequest, i18n.language]);

  const categories = useMemo(() => ['All', ...ELEARNING_CATEGORIES] as Array<'All' | ELearningCategory>, []);

  // Filter by category and search (but not by type) for calculating type counts
  const categoryAndSearchFilteredItems = useMemo(() => {
    return eLearningItems.filter(item =>
      (isAdminOrSuperAdmin || item.status !== 'Draft') &&
      (item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterCategory === 'All' || item.category === filterCategory) &&
      (item.accessRoles ? currentUser && (item.accessRoles.includes(currentUser.role) || isAdminOrSuperAdmin) : true)
    );
  }, [searchTerm, filterCategory, eLearningItems, currentUser, isAdminOrSuperAdmin]);

  // Filter by category, search, AND type for displaying content
  const globallyFilteredItems = useMemo(() => {
    return categoryAndSearchFilteredItems.filter(item =>
      (filterType === 'All' || item.type === filterType)
    );
  }, [categoryAndSearchFilteredItems, filterType]);

  // Calculate type counts from items filtered by category/search (not by type)
  const courseItems = useMemo(() => categoryAndSearchFilteredItems.filter(item => item.type === ELearningContentType.COURSE), [categoryAndSearchFilteredItems]);
  const videoItems = useMemo(() => categoryAndSearchFilteredItems.filter(item => item.type === ELearningContentType.VIDEO), [categoryAndSearchFilteredItems]);
  const pdfItems = useMemo(() => categoryAndSearchFilteredItems.filter(item => item.type === ELearningContentType.PDF), [categoryAndSearchFilteredItems]);
  const linkItems = useMemo(() => categoryAndSearchFilteredItems.filter(item => item.type === ELearningContentType.LINK), [categoryAndSearchFilteredItems]);

  const typeVisuals: Record<ELearningContentType, {icon: React.ElementType, colorClasses: string, label: string}> = {
    COURSE: { icon: AcademicCapIcon, colorClasses: 'bg-blue-500 text-white', label: t('eLearning.coursesTitle') },
    VIDEO: { icon: VideoCameraIcon, colorClasses: 'bg-red-500 text-white', label: t('eLearning.videosTitle') },
    PDF: { icon: DocumentTextIcon, colorClasses: 'bg-orange-500 text-white', label: t('eLearning.pdfsTitle') },
    LINK: { icon: LinkIcon, colorClasses: 'bg-purple-500 text-white', label: t('eLearning.externalLinksTitle') },
  };

  const typeCounts = useMemo(() => {
    const counts = {
      [ELearningContentType.COURSE]: courseItems.length,
      [ELearningContentType.VIDEO]: videoItems.length,
      [ELearningContentType.PDF]: pdfItems.length,
      [ELearningContentType.LINK]: linkItems.length,
    };
    return counts;
  }, [courseItems.length, videoItems.length, pdfItems.length, linkItems.length]);

  const totalItems = useMemo(() => categoryAndSearchFilteredItems.length, [categoryAndSearchFilteredItems]);



  const handlePreview = (item: Course) => {
    if (item.fileUrl) {
      setPreviewItem(item);
    }
  };

  const handleDownload = async (item: Course) => {
    try {
      if (item.fileUrl) {
        const fileExtension = item.fileUrl.split('.').pop() || 'pdf';
        await authenticatedDownload(item.fileUrl, `${item.title}.${fileExtension}`);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert(t('eLearning.downloadFailed', 'Failed to download file. Please try again.'));
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  const renderSection = (title: string, items: Course[], itemTypeName: string, Icon: React.ElementType) => (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-swiss-charcoal flex items-center">
        <Icon className="w-7 h-7 mr-3 text-swiss-teal" />
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-8">{t('eLearning.noItemsFound', { itemType: itemTypeName.toLowerCase() })}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <CourseMaterialCard 
                key={item.id} 
                item={item}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onToggleFavorite={toggleFavorite}
                isFavorite={favorites.has(item.id)}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-8"> {/* Increased spacing between major page elements */}
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">{t('eLearning.title')}</h1>
        {isAdminOrSuperAdmin && (
          <span className="text-sm text-gray-500 italic">{t('eLearning.adminUploadNote', 'Use Admin Dashboard to add/edit content')}</span>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <label htmlFor="eLearningSearch" className="sr-only">{t('eLearning.searchPlaceholder')}</label>
                <input
                id="eLearningSearch"
                type="text"
                placeholder={t('eLearning.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${ICON_INPUT_FIELD} w-full`}
                />
            </div>
            <div>
                <label htmlFor="eLearningCategory" className="block text-xs font-medium text-gray-500 mb-1">{t('eLearning.categoryLabel')}</label>
                <select
                    id="eLearningCategory"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as 'All' | ELearningCategory)}
                    className={`${STANDARD_INPUT_FIELD} w-full md:w-auto`}
                >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? t('eLearning.allCategoriesLabel', { defaultValue: 'All Categories' }) : (ELEARNING_CATEGORY_LABELS[cat] || cat)}
                      </option>
                    ))}
                </select>
            </div>
        </div>
      </Card>

      <h2 className="text-2xl font-semibold text-swiss-charcoal mt-6 mb-3">{t('eLearning.contentTypesTitle')}</h2>
      
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500">{t('common:loading') || 'Loading content...'}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <ELearningTypeDisplayCard
          title={t('eLearning.allContentTitle')}
          icon={AcademicCapIcon}
          count={totalItems}
          colorClasses="bg-gray-100 text-gray-700 hover:bg-gray-200"
          onSelect={() => setFilterType('All')}
        />
        {Object.entries(typeVisuals).map(([type, visual]) => (
          <ELearningTypeDisplayCard
            key={type}
            title={visual.label}
            icon={visual.icon}
            count={typeCounts[type as ELearningContentType]}
            colorClasses={visual.colorClasses}
            onSelect={() => setFilterType(type as ELearningContentType)}
          />
        ))}
      </div>

      {globallyFilteredItems.length === 0 ? (
        <p className="text-center text-gray-500 py-8 text-lg">{t('eLearning.noContentFound')}</p>
      ) : filterType === 'All' ? (
        <div className="space-y-8">
          {courseItems.length > 0 && renderSection(t('eLearning.coursesTitle'), courseItems, t('eLearning.itemType.courses'), AcademicCapIcon)}
          {videoItems.length > 0 && renderSection(t('eLearning.videosTitle'), videoItems, t('eLearning.itemType.videos'), VideoCameraIcon)}
          {pdfItems.length > 0 && renderSection(t('eLearning.pdfsTitle'), pdfItems, t('eLearning.itemType.pdfs'), DocumentTextIcon)}
          {linkItems.length > 0 && renderSection(t('eLearning.externalLinksTitle'), linkItems, t('eLearning.itemType.links'), LinkIcon)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {globallyFilteredItems.map(item => (
            <CourseMaterialCard 
              key={item.id} 
              item={item}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onToggleFavorite={toggleFavorite}
              isFavorite={favorites.has(item.id)}
            />
          ))}
        </div>
      )}

      {previewItem && previewItem.fileUrl && (
        <DocumentPreviewModal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          fileUrl={previewItem.fileUrl}
          fileName={previewItem.title}
          fileType={getMimeType(previewItem)}
        />
      )}
    </div>
  );
};

export default ELearningPage;