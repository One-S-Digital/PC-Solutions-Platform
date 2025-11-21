

import React, { useState, useMemo, useEffect } from 'react';
// [FIX] Imported ELEARNING_CATEGORIES to use as a valid fallback.
import { Course, UserRole, Course as CourseType, ELearningContentType, ELearningCategory, ELEARNING_CATEGORIES, ELEARNING_CATEGORY_LABELS } from '../types';
import { MOCK_COURSES, STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AcademicCapIcon, VideoCameraIcon, DocumentTextIcon, EyeIcon, PlayIcon, ArrowDownTrayIcon, LinkIcon, MagnifyingGlassIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import i18n from '../i18n';

interface CourseMaterialCardProps {
  item: Course;
  onPreview?: (item: Course) => void;
}

const CourseMaterialCard: React.FC<CourseMaterialCardProps> = ({ item, onPreview }) => {
  const { t } = useTranslation(['content', 'common']);
  const typeSpecifics = {
    [ELearningContentType.COURSE]: { icon: AcademicCapIcon, actionText: t('eLearning.actions.viewCourse'), actionIcon: EyeIcon, color: 'text-swiss-mint' },
    [ELearningContentType.VIDEO]: { icon: VideoCameraIcon, actionText: t('eLearning.actions.watchVideo'), actionIcon: PlayIcon, color: 'text-swiss-teal' },
    [ELearningContentType.PDF]: { icon: DocumentTextIcon, actionText: t('eLearning.actions.viewPdf', 'View PDF'), actionIcon: EyeIcon, color: 'text-swiss-coral' },
    [ELearningContentType.LINK]: { icon: LinkIcon, actionText: t('eLearning.actions.viewLink', 'View Link'), actionIcon: EyeIcon, color: 'text-purple-600' },
  };
  
  const currentItemTypeKey = Object.values(ELearningContentType).find(v => v.toLowerCase() === item.type.toLowerCase()) || ELearningContentType.COURSE;
  const currentType = typeSpecifics[currentItemTypeKey];

  const IconElement = currentType.icon; 
  const ActionIconElement = currentType.actionIcon; 

  const handleActionClick = () => {
    // Use preview for all content types that have a fileUrl
    if (item.fileUrl && onPreview) {
      onPreview(item);
    } else {
      alert(`${t('eLearning.viewingAlert')} ${item.title}`); 
    }
  };

  return (
    <Card className="flex flex-col" hoverEffect>
      <img src={item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/300/180`} alt={item.title} className="w-full h-40 object-cover"/>
      <div className="p-4 flex-grow flex flex-col">
        <div className="flex items-center mb-2">
          <IconElement className={`w-6 h-6 mr-2 ${currentType.color}`} />
          <h3 className={`text-lg font-semibold ${currentType.color}`}>{item.title}</h3>
        </div>
        {item.category && (
          <p className="text-xs text-gray-500 mb-1">{t('eLearning.categoryLabel')}: {ELEARNING_CATEGORY_LABELS[item.category] || item.category}</p>
        )}
        {item.contentPreview && (
          <p className="text-sm text-gray-600 mb-2 flex-grow line-clamp-3">{item.contentPreview}</p>
        )}
        {!item.contentPreview && (
          <p className="text-sm text-gray-600 mb-1 flex-grow line-clamp-3">{item.description}</p>
        )}
        {item.type === ELearningContentType.COURSE && item.lessons && <p className="text-xs text-gray-500">{t('eLearning.lessonsCount', { count: item.lessons })}</p>}
        {(item.type === ELearningContentType.VIDEO || item.type === ELearningContentType.COURSE) && item.duration && <p className="text-xs text-gray-500">{t('eLearning.durationLabel')}: {item.duration}</p>}
        {item.language && <p className="text-xs text-gray-500">{t('eLearning.languageLabel')}: {item.language}</p>}
        <p className="text-xs text-gray-500 mt-1">{t('eLearning.updatedLabel')}: {new Date(item.updatedDate).toLocaleDateString()}</p>
         {item.tags && item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
                {item.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{tag}</span>
                ))}
            </div>
        )}
      </div>
      <div className="bg-gray-50 p-3 mt-auto border-t">
        {item.fileUrl && onPreview ? (
          <Button 
            variant="primary" 
            size="sm" 
            leftIcon={EyeIcon} 
            className="w-full"
            onClick={handleActionClick}
          >
            {currentType.actionText}
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            leftIcon={ActionIconElement} 
            className="w-full"
            onClick={handleActionClick}
            disabled={!item.fileUrl}
          >
            {currentType.actionText}
          </Button>
        )}
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
      <p className="text-sm opacity-80 text-current">{count} {count === 1 ? 'item' : 'items'}</p>
    </div>
  );
};

const ELearningPage: React.FC = () => {
  const { t } = useTranslation(['content', 'common']);
  const { currentUser } = useAppContext();
  const { authenticatedRequest, authenticatedUpload } = useAuthenticatedApi();
  const [eLearningItems, setELearningItems] = useState<Course[]>([]);
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
            fileUrl: item.publicUrl || item.fileUrl || item.url,
            tags: item.tags || [],
            contentPreview: item.contentPreview || item.description,
          }));
          setELearningItems(content);
        }
      } catch (error) {
        console.error('Failed to fetch E-Learning content:', error);
        // Fall back to mock data if API fails
        setELearningItems(MOCK_COURSES);
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
    [ELearningContentType.COURSE]: { icon: AcademicCapIcon, colorClasses: 'bg-blue-500 text-white', label: t('eLearning.coursesTitle') },
    [ELearningContentType.VIDEO]: { icon: VideoCameraIcon, colorClasses: 'bg-red-500 text-white', label: t('eLearning.videosTitle') },
    [ELearningContentType.PDF]: { icon: DocumentTextIcon, colorClasses: 'bg-orange-500 text-white', label: t('eLearning.pdfsTitle') },
    [ELearningContentType.LINK]: { icon: LinkIcon, colorClasses: 'bg-purple-500 text-white', label: t('eLearning.externalLinksTitle') },
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

  const renderSection = (title: string, items: Course[], itemTypeName: string, Icon: React.ElementType) => (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-swiss-charcoal flex items-center">
        <Icon className="w-7 h-7 mr-3 text-swiss-teal" />
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-8">{t('eLearning.noItemsFound', { itemType: itemTypeName.toLowerCase() })}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map(item => (
            <CourseMaterialCard 
                key={item.id} 
                item={item}
                onPreview={handlePreview}
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

      <h2 className="text-2xl font-semibold text-swiss-charcoal mt-6 mb-3">Content Types</h2>
      
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500">{t('common:loading') || 'Loading content...'}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <ELearningTypeDisplayCard
          title="All Content"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {globallyFilteredItems.map(item => (
            <CourseMaterialCard 
              key={item.id} 
              item={item}
              onPreview={handlePreview}
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
          fileType={previewItem.type}
        />
      )}
    </div>
  );
};

export default ELearningPage;