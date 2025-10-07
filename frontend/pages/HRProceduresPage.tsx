


import React, { useState, useMemo } from 'react';
// [FIX] Imported HR_CATEGORIES to use as a valid fallback.
import { HRDocument, UserRole, UploadableContentType, HRDocument as HRDocType, HR_CATEGORIES } from '../types';
import { MOCK_HR_DOCS, STANDARD_INPUT_FIELD, ICON_INPUT_FIELD } from '../constants';
import Card from '../components/ui/Card'; 
import Button from '../components/ui/Button';
import { DocumentTextIcon, MagnifyingGlassIcon, CalendarDaysIcon, ArrowDownTrayIcon, EyeIcon, StarIcon, PlusCircleIcon, DocumentDuplicateIcon, UserPlusIcon, UsersIcon, BuildingLibraryIcon, AcademicCapIcon, HeartIcon, FolderIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../contexts/AppContext';
import ContentUploadModal from '../components/admin/ContentUploadModal';
import { useTranslation } from '@workspace/translations'; // Import useTranslation

interface HRDocumentCardProps {
  doc: HRDocument;
  onToggleFavorite: (id: string) => void;
  onEdit: (doc: HRDocument) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

const HRDocumentCard: React.FC<HRDocumentCardProps> = ({ doc, onToggleFavorite, onEdit, onDelete, isAdmin }) => {
  const { t } = useTranslation(['dashboard', 'common']);
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
              <p className="text-xs text-gray-500">{t('hrDocumentCard.categoryLabel', { category: doc.category })}</p>
              {doc.language && <p className="text-xs text-gray-500">{t('hrDocumentCard.languageLabel', { language: doc.language })} {doc.version && t('hrDocumentCard.versionLabel', { version: doc.version })}</p>}
            </div>
          </div>
          <button onClick={() => onToggleFavorite(doc.id)} className="text-gray-300 hover:text-yellow-400 focus:outline-none" aria-label={t('hrDocumentCard.toggleFavoriteLabel')}>
            <StarIcon className={`w-6 h-6 transition-colors ${doc.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-yellow-300'}`} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-1">
          <CalendarDaysIcon className="w-4 h-4 inline mr-1" /> {t('hrDocumentCard.lastUpdatedLabel', { date: new Date(doc.lastUpdated).toLocaleDateString() })}
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
        <Button variant="primary" size="sm" leftIcon={ArrowDownTrayIcon} onClick={() => alert(t('hrDocumentCard.downloadingAlert', { title: doc.title }))}>{t('hrDocumentCard.downloadButton')}</Button>
        <Button variant="ghost" size="sm" leftIcon={EyeIcon} onClick={() => alert(t('hrDocumentCard.previewingAlert', { title: doc.title }))} className="p-2" aria-label={t('hrDocumentCard.previewButtonLabel')} title={t('hrDocumentCard.previewButtonLabel')}></Button>
        {isAdmin && (
          <>
            <Button variant="ghost" size="sm" leftIcon={PencilIcon} onClick={() => onEdit(doc)} className="text-blue-600 hover:text-blue-700 p-2" aria-label={t('hrDocumentCard.editButtonLabel')} title={t('hrDocumentCard.editButtonLabel')}></Button>
            <Button variant="ghost" size="sm" leftIcon={TrashIcon} onClick={() => onDelete(doc.id)} className="text-red-600 hover:text-red-700 p-2" aria-label={t('hrDocumentCard.deleteButtonLabel')} title={t('hrDocumentCard.deleteButtonLabel')}></Button>
          </>
        )}
      </div>
    </Card>
  );
};

const CategoryDisplayCard: React.FC<{title: string, icon: React.ElementType, count: number, colorClasses: string, onSelect: () => void}> = ({title, icon: Icon, count, colorClasses, onSelect}) => {
    const { t } = useTranslation(['dashboard', 'common']);
    return (
    <div 
      className={`p-5 cursor-pointer rounded-card shadow-soft hover:shadow-lg transition-shadow duration-200 ease-in-out ${colorClasses}`} 
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      aria-label={t('hrProceduresPage.categoryDisplay.viewCategoryAria', { title })}
    >
        <Icon className="w-10 h-10 mb-3 text-current"/>
        <h3 className="text-xl font-semibold mb-1 text-current">{title}</h3>
        <p className="text-sm opacity-80 text-current">{t('hrProceduresPage.categoryDisplay.documentsCount', { count })}</p>
    </div>
    );
};


const HRProceduresPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hrDocs, setHrDocs] = useState<HRDocument[]>(MOCK_HR_DOCS);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<HRDocument | null>(null);


  const isAdminOrSuperAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  const toggleFavorite = (id: string) => {
    setHrDocs(prevDocs => prevDocs.map(doc => doc.id === id ? {...doc, isFavorite: !doc.isFavorite} : doc));
  };

  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    hrDocs.filter(doc => doc.status === 'Published' || isAdminOrSuperAdmin).forEach(doc => {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).filter(cat => cat.count > 0);
  }, [hrDocs, isAdminOrSuperAdmin]);
  
  const categoryVisuals: Record<string, {icon: React.ElementType, colorClasses: string}> = {
    'Staff Management': { icon: UsersIcon, colorClasses: 'bg-swiss-mint text-white' },
    'Child & Family Onboarding': { icon: UserPlusIcon, colorClasses: 'bg-swiss-sand text-swiss-charcoal' },
    'Daily Operations & Compliance': { icon: BuildingLibraryIcon, colorClasses: 'bg-swiss-teal text-white' },
    'Policy & Legal Documents': { icon: DocumentTextIcon, colorClasses: 'bg-swiss-coral text-white' },
    'Training & Certification': { icon: AcademicCapIcon, colorClasses: 'bg-purple-500 text-white' },
    'Templates & Letters': { icon: HeartIcon, colorClasses: 'bg-pink-500 text-white' }
  };

  const filteredDocs = useMemo(() => {
    return hrDocs.filter(doc =>
      (isAdminOrSuperAdmin || doc.status === 'Published') &&
      (doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
       doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      ) &&
      (selectedCategory === null || doc.category === selectedCategory)
    );
  }, [searchTerm, selectedCategory, hrDocs, isAdminOrSuperAdmin]);

  const handleOpenUploadModal = (docToEdit: HRDocument | null = null) => {
    setEditingDoc(docToEdit);
    setIsUploadModalOpen(true);
  };

  const handleDocSubmit = (data: Partial<HRDocType>, file?: File) => {
    if (editingDoc) {
      setHrDocs(prevDocs => prevDocs.map(d => d.id === editingDoc.id ? { ...d, ...data, fileUrl: file ? file.name : d.fileUrl, lastUpdated: new Date().toISOString() } : d));
    } else {
      const newDoc: HRDocument = {
        id: `hr${Date.now()}`,
        title: data.title || 'Untitled Document',
        // [FIX] Used a valid HRCategory as a fallback.
        category: data.category || HR_CATEGORIES[0],
        fileUrl: file ? file.name : '#', // Mock
        uploaderId: currentUser?.id || 'admin000',
        lastUpdated: new Date().toISOString(),
        fileType: data.fileType || 'PDF',
        tags: data.tags || ['New'],
        language: data.language,
        version: data.version || 'v1.0',
        status: data.status || 'Draft',
      };
      setHrDocs(prev => [newDoc, ...prev]);
    }
  };

  const handleDeleteDoc = (id: string) => {
    if (window.confirm(t('hrProceduresPage.confirmDeleteDocument'))) {
      setHrDocs(prevDocs => prevDocs.filter(d => d.id !== id));
    }
  };
  
  const totalPublishedDocs = useMemo(() => hrDocs.filter(doc => doc.status === 'Published' || isAdminOrSuperAdmin).length, [hrDocs, isAdminOrSuperAdmin]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal mb-4 md:mb-0">{t('hrProceduresPage.title')}</h1>
        {isAdminOrSuperAdmin && (
          <Button variant="primary" leftIcon={PlusCircleIcon} onClick={() => handleOpenUploadModal()}>
            {t('hrProceduresPage.uploadButton')}
          </Button>
        )}
      </div>
      
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <label htmlFor="hrSearch" className="sr-only">{t('hrProceduresPage.searchPlaceholder')}</label>
                <input
                id="hrSearch"
                type="text"
                placeholder={t('hrProceduresPage.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${ICON_INPUT_FIELD} w-full`} 
                />
            </div>
        </div>
      </Card>

      <h2 className="text-2xl font-semibold text-swiss-charcoal mt-6 mb-3">{t('hrProceduresPage.categoriesTitle')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <CategoryDisplayCard
          title={t('hrProceduresPage.allDocumentsCategory')}
          icon={FolderIcon}
          count={totalPublishedDocs}
          colorClasses="bg-gray-100 text-gray-700 hover:bg-gray-200"
          onSelect={() => setSelectedCategory(null)}
        />
        {categoriesWithCounts.map(cat => {
          const visualConfig = categoryVisuals[cat.name] || {icon: DocumentTextIcon, colorClasses: 'bg-gray-500 text-white'};
          return (
            <CategoryDisplayCard 
              key={cat.name} 
              title={cat.name} // Category names are keys, can be translated if they are added to JSON
              icon={visualConfig.icon} 
              count={cat.count} 
              colorClasses={visualConfig.colorClasses}
              onSelect={() => setSelectedCategory(cat.name)}
            />
          );
        })}
        {categoriesWithCounts.length === 0 && totalPublishedDocs > 0 && (
            <p className="text-center text-gray-500 py-8 col-span-full">{t('hrProceduresPage.noDocumentsMatchSearch')}</p>
        )}
         {totalPublishedDocs === 0 && <p className="text-center text-gray-500 py-8 col-span-full">{t('hrProceduresPage.noDocumentsAvailable')}</p>}
      </div>
      
      {selectedCategory && (
        <div className="my-4">
        <Button variant="outline" onClick={() => setSelectedCategory(null)} className="text-sm">
          {t('hrProceduresPage.backToCategoriesButton')}
        </Button>
        </div>
      )}

      <h2 className="text-2xl font-semibold text-swiss-charcoal mt-8 mb-4">
        {selectedCategory ? t('hrProceduresPage.documentsInCategoryTitle', { category: selectedCategory }) : t('hrProceduresPage.allDocumentsCategory')}
        <span className="text-base font-normal text-gray-500 ml-2">{t('hrProceduresPage.allItemsCount', { count: filteredDocs.length })}</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map(doc => (
          <HRDocumentCard 
            key={doc.id} 
            doc={doc} 
            onToggleFavorite={toggleFavorite}
            onEdit={() => handleOpenUploadModal(doc)}
            onDelete={handleDeleteDoc}
            isAdmin={isAdminOrSuperAdmin}
          />
        ))}
      </div>
      {filteredDocs.length === 0 && selectedCategory && <p className="text-center text-gray-500 py-8">{t('hrProceduresPage.noDocumentsInCategory', { category: selectedCategory })}</p>}
      {filteredDocs.length === 0 && !selectedCategory && totalPublishedDocs > 0 && <p className="text-center text-gray-500 py-8">{t('hrProceduresPage.noDocumentsMatchSearch')}</p>}

      {isAdminOrSuperAdmin && (
        <ContentUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => { setIsUploadModalOpen(false); setEditingDoc(null); }}
            onSubmit={handleDocSubmit}
            contentType="hr"
            existingContent={editingDoc}
        />
      )}
    </div>
  );
};

export default HRProceduresPage;