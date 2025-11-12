

import React, { useState, useMemo } from 'react';
// [FIX] Imported ELEARNING_CATEGORIES to use as a valid fallback.
import { Course, UserRole, UploadableContentType, Course as CourseType, ELearningContentType, ELEARNING_CATEGORIES } from '../types';
import { MOCK_COURSES, STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AcademicCapIcon, VideoCameraIcon, DocumentTextIcon, EyeIcon, PlayIcon, ArrowDownTrayIcon, PlusCircleIcon, LinkIcon, MagnifyingGlassIcon, ArrowTopRightOnSquareIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import ContentUploadModal from '../components/admin/ContentUploadModal';
import { useTranslation } from 'react-i18next';

interface CourseMaterialCardProps {
  item: Course;
  onEdit: (item: Course) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

const CourseMaterialCard: React.FC<CourseMaterialCardProps> = ({ item, onEdit, onDelete, isAdmin }) => {
  const { t } = useTranslation(['content', 'common']);
  const typeSpecifics = {
    [ELearningContentType.COURSE]: { icon: AcademicCapIcon, actionText: t('eLearning.actions.viewCourse'), actionIcon: EyeIcon, color: 'text-swiss-mint' },
    [ELearningContentType.VIDEO]: { icon: VideoCameraIcon, actionText: t('eLearning.actions.watchVideo'), actionIcon: PlayIcon, color: 'text-swiss-teal' },
    [ELearningContentType.PDF]: { icon: DocumentTextIcon, actionText: t('eLearning.actions.downloadPdf'), actionIcon: ArrowDownTrayIcon, color: 'text-swiss-coral' },
    [ELearningContentType.LINK]: { icon: LinkIcon, actionText: t('eLearning.actions.openLink'), actionIcon: ArrowTopRightOnSquareIcon, color: 'text-purple-600' },
  };
  
  const currentItemTypeKey = Object.values(ELearningContentType).find(v => v.toLowerCase() === item.type.toLowerCase()) || ELearningContentType.COURSE;
  const currentType = typeSpecifics[currentItemTypeKey];

  const IconElement = currentType.icon; 
  const ActionIconElement = currentType.actionIcon; 

  const handleActionClick = () => {
    if (item.type === ELearningContentType.LINK && item.fileUrl) {
        window.open(item.fileUrl, '_blank');
    } else if (item.fileUrl && (item.type === ELearningContentType.PDF || item.type === ELearningContentType.VIDEO)) {
         window.open(item.fileUrl, '_blank'); 
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
        <p className="text-sm text-gray-600 mb-1 flex-grow line-clamp-3">{item.description}</p>
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
      <div className="bg-gray-50 p-3 mt-auto border-t flex flex-col space-y-2">
        <Button 
            variant={(item.type === ELearningContentType.PDF || item.type === ELearningContentType.LINK) ? 'primary' : 'outline'} 
            size="sm" 
            leftIcon={ActionIconElement} 
            className="w-full"
            onClick={handleActionClick}
        >
          {currentType.actionText}
        </Button>
        {isAdmin && (
          <div className="flex space-x-2">
            <Button variant="ghost" size="xs" leftIcon={PencilIcon} onClick={() => onEdit(item)} className="flex-1 text-blue-600 hover:text-blue-700">{t('common:buttons.edit')}</Button>
            <Button variant="ghost" size="xs" leftIcon={TrashIcon} onClick={() => onDelete(item.id)} className="flex-1 text-red-600 hover:text-red-700">{t('common:buttons.delete')}</Button>
          </div>
        )}
      </div>
    </Card>
  );
};

const ELearningPage: React.FC = () => {
  const { t } = useTranslation(['content', 'common', 'dashboard']);
  const { currentUser } = useAppContext();
  const [eLearningItems, setELearningItems] = useState<Course[]>(MOCK_COURSES);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const isAdminOrSuperAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  const categories = useMemo(() => ['All', ...new Set(eLearningItems.map(item => item.category))], [eLearningItems]);

  const globallyFilteredItems = useMemo(() => {
    return eLearningItems.filter(item =>
      (isAdminOrSuperAdmin || item.status !== 'Draft') &&
      (item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterCategory === 'All' || item.category === filterCategory) &&
      (item.accessRoles ? currentUser && (item.accessRoles.includes(currentUser.role) || isAdminOrSuperAdmin) : true)
    );
  }, [searchTerm, filterCategory, eLearningItems, currentUser, isAdminOrSuperAdmin]);

  const courseItems = useMemo(() => globallyFilteredItems.filter(item => item.type === ELearningContentType.COURSE), [globallyFilteredItems]);
  const videoItems = useMemo(() => globallyFilteredItems.filter(item => item.type === ELearningContentType.VIDEO), [globallyFilteredItems]);
  const pdfItems = useMemo(() => globallyFilteredItems.filter(item => item.type === ELearningContentType.PDF), [globallyFilteredItems]);
  const linkItems = useMemo(() => globallyFilteredItems.filter(item => item.type === ELearningContentType.LINK), [globallyFilteredItems]);


  const handleOpenUploadModal = (itemToEdit: Course | null = null) => {
    setEditingItem(itemToEdit);
    setIsUploadModalOpen(true);
  };

  const handleContentSubmit = (data: Partial<CourseType>, file?: File) => {
    if (editingItem) {
        setELearningItems(prevItems => prevItems.map(item => item.id === editingItem.id ? { ...item, ...data, fileUrl: file ? file.name : item.fileUrl, thumbnailUrl: file && (data.type === ELearningContentType.VIDEO || data.type === ELearningContentType.PDF) ? URL.createObjectURL(file) : item.thumbnailUrl, updatedDate: new Date().toISOString() } : item ));
    } else {
        const newContent: Course = {
        id: `crs${Date.now()}`,
        title: data.title || 'Untitled Course',
        description: data.description || '',
        type: data.type || ELearningContentType.COURSE,
        // [FIX] Used a valid ELearningCategory as a fallback.
        category: data.category || ELEARNING_CATEGORIES[0],
        updatedDate: new Date().toISOString(),
        thumbnailUrl: `https://picsum.photos/seed/new${Date.now()}/300/180`,
        language: data.language || 'EN',
        accessRoles: data.accessRoles || [UserRole.FOUNDATION, UserRole.EDUCATOR],
        status: data.status || 'Published',
        lessons: data.type === ELearningContentType.COURSE ? (data.lessons || 0) : undefined,
        duration: (data.type === ELearningContentType.COURSE || data.type === ELearningContentType.VIDEO) ? (data.duration || undefined) : undefined,
        fileUrl: file ? file.name : (data.type === ELearningContentType.LINK ? data.fileUrl : undefined),
        tags: data.tags || [],
        };
        setELearningItems(prev => [newContent, ...prev]);
    }
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm(t('eLearning.confirmDelete'))) {
        setELearningItems(prevItems => prevItems.filter(item => item.id !== id));
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
                onEdit={() => handleOpenUploadModal(item)}
                onDelete={handleDeleteItem}
                isAdmin={isAdminOrSuperAdmin}
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
          <Button variant="primary" leftIcon={PlusCircleIcon} onClick={() => handleOpenUploadModal()}>
            {t('eLearning.addNewContentButton')}
          </Button>
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
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className={`${STANDARD_INPUT_FIELD} w-full md:w-auto`}
                >
                    {categories.map(cat => <option key={cat} value={cat}>{cat === 'All' ? t('dashboard:filters.all') : cat}</option>)}
                </select>
            </div>
        </div>
      </Card>
      
      {globallyFilteredItems.length === 0 && (
          <p className="text-center text-gray-500 py-8 text-lg">{t('eLearning.noContentFound')}</p>
      )}

      {renderSection(t('eLearning.coursesTitle'), courseItems, t('eLearning.itemType.courses'), AcademicCapIcon)}
      {renderSection(t('eLearning.videosTitle'), videoItems, t('eLearning.itemType.videos'), VideoCameraIcon)}
      {renderSection(t('eLearning.pdfsTitle'), pdfItems, t('eLearning.itemType.pdfs'), DocumentTextIcon)}
      {renderSection(t('eLearning.externalLinksTitle'), linkItems, t('eLearning.itemType.links'), LinkIcon)}
      

      {isAdminOrSuperAdmin && (
        <ContentUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => { setIsUploadModalOpen(false); setEditingItem(null); }}
            onSubmit={handleContentSubmit}
            contentType="e-learning"
            existingContent={editingItem}
        />
      )}
    </div>
  );
};

export default ELearningPage;