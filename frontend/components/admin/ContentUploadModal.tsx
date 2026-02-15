
import React, { useMemo, useRef, useState, useEffect, FormEvent } from 'react';
import { UserRole, UploadableContentType, LanguageCode, Course, HRDocument, PolicyDocument, ELearningContentType, ELEARNING_CATEGORIES, ELearningContentTypeLabels, ELEARNING_CATEGORY_LABELS, HR_CATEGORIES, HR_CATEGORY_LABELS, POLICY_CATEGORIES, POLICY_CATEGORY_LABELS, SWISS_CANTONS, PolicyType, POLICY_TYPES_ENUM } from '../../types';
import { COUNTRIES_FOR_POLICIES, CountryForPolicies, REGIONS_BY_COUNTRY, STANDARD_INPUT_FIELD } from '../../constants'; // Import STANDARD_INPUT_FIELD
import Button from '../ui/Button';
// import Card from '../ui/Card'; // Not used directly for modal
import { XMarkIcon, PaperClipIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { normalizeCategoryName, useCategories } from '../../hooks/useCategories';

interface ContentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Course | HRDocument | PolicyDocument>, file?: File) => Promise<void>;
  contentType: UploadableContentType;
  existingContent?: Course | HRDocument | PolicyDocument | null; // Added for editing
}

type FormData = {
  title?: string;
  description?: string; 
  contentPreview?: string; // For PolicyDocument specific preview if needed distinct from form's description
  category?: string;
  type?: ELearningContentType; 
  policyType?: PolicyType; 
  language?: LanguageCode;
  accessRoles?: UserRole[];
  fileType?: 'PDF' | 'DOC' | 'DOCX' | 'XLS' | 'XLSX' | 'CSV' | 'ODS'; // Document/spreadsheet type metadata
  country?: CountryForPolicies; 
  region?: string; 
  isCritical?: boolean; 
  lessons?: number; 
  duration?: string; 
  fileUrl?: string; 
  externalLink?: string; 
  effectiveDate?: string; 
  status?: PolicyDocument['status'] | Course['status'] | HRDocument['status'];
  version?: string; 
  tags?: string[]; 
  // Removed duplicate contentPreview here
};


const ContentUploadModal: React.FC<ContentUploadModalProps> = ({ isOpen, onClose, onSubmit, contentType, existingContent }) => {
  const { t } = useTranslation(['dashboard', 'common']); // Initialize useTranslation

  const normalizeElearningType = (value: unknown): ELearningContentType => {
    if (typeof value === 'string') {
      const upper = value.toUpperCase();
      if ((Object.values(ELearningContentType) as string[]).includes(upper)) {
        return upper as ELearningContentType;
      }
    }
    return ELearningContentType.COURSE;
  };

  const normalizePolicyType = (value: unknown): PolicyType => {
    if (typeof value === 'string' && (POLICY_TYPES_ENUM as readonly string[]).includes(value)) {
      return value as PolicyType;
    }
    return PolicyType.REGULATION;
  };

  const categoryKind = useMemo(() => {
    if (contentType === 'e-learning') return 'content-elearning' as const;
    if (contentType === 'hr') return 'content-hr' as const;
    return 'content-policy' as const;
  }, [contentType]);

  const categoryFallback = useMemo(() => {
    if (contentType === 'e-learning') return ELEARNING_CATEGORIES;
    if (contentType === 'hr') return HR_CATEGORIES;
    return POLICY_CATEGORIES;
  }, [contentType]);

  const { categories: categoryOptions, addCategory: addCategoryOption } = useCategories(
    categoryKind,
    categoryFallback,
  );

  const getInitialFormState = (): FormData => ({
    title: '',
    description: '', 
    contentPreview: '',
    category: contentType === 'e-learning'
      ? ELEARNING_CATEGORIES[0]
      : contentType === 'hr'
        ? HR_CATEGORIES[0]
        : POLICY_CATEGORIES[0],
    type: contentType === 'e-learning' ? ELearningContentType.COURSE : undefined, 
    policyType: contentType === 'policy' ? PolicyType.REGULATION : undefined, 
    language: 'EN',
    accessRoles: contentType === 'e-learning' ? [UserRole.FOUNDATION] : undefined,
    fileType: contentType === 'hr' ? 'PDF' : contentType === 'policy' ? 'PDF' : undefined,
    country: contentType === 'policy' ? COUNTRIES_FOR_POLICIES[0] : undefined,
    region: contentType === 'policy' ? REGIONS_BY_COUNTRY[COUNTRIES_FOR_POLICIES[0]][0] : undefined,
    isCritical: false,
    tags: [],
    status: 'Draft', // Default status
  });

  const [formData, setFormData] = useState<FormData>(getInitialFormState());
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [videoSourceType, setVideoSourceType] = useState<'upload' | 'url'>('upload'); // For video upload vs URL
  const [customCategory, setCustomCategory] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingContent) {
        // Map existing content to FormData
        const mappedData: FormData = {
          title: existingContent.title,
          description: (existingContent as Course).description || (existingContent as PolicyDocument).contentPreview || '', // E-learning has description, Policy has contentPreview
          category: (existingContent as any).category,
          language: (existingContent as any).language || 'EN',
          tags: (existingContent as any).tags || [],
          status: (existingContent as any).status || 'Draft',
        };
        if (contentType === 'e-learning') {
          const ec = existingContent as Course;
          mappedData.type = normalizeElearningType(ec.type);
          mappedData.accessRoles = ec.accessRoles;
          mappedData.lessons = ec.lessons;
          mappedData.duration = ec.duration;
          mappedData.fileUrl = ec.fileUrl;
        } else if (contentType === 'hr') {
          const hr = existingContent as HRDocument;
          mappedData.fileType = hr.fileType;
          mappedData.version = hr.version;
        } else if (contentType === 'policy') {
          const pol = existingContent as PolicyDocument;
          mappedData.policyType = pol.policyType ? normalizePolicyType(pol.policyType) : PolicyType.REGULATION;
          mappedData.country = (pol.country as CountryForPolicies) || COUNTRIES_FOR_POLICIES[0];
          mappedData.region = pol.region;
          mappedData.isCritical = pol.isCritical;
          mappedData.fileType = pol.fileType;
          mappedData.externalLink = pol.externalLink;
          mappedData.effectiveDate = pol.effectiveDate ? new Date(pol.effectiveDate).toISOString().split('T')[0] : undefined;
          mappedData.contentPreview = pol.contentPreview; // Explicitly map contentPreview from existing data
        }
        setFormData(mappedData);
      } else {
        setFormData(getInitialFormState());
      }
      setFile(null);
      setFileError(null);
      setUploadProgress(0);
      setIsUploading(false);
      setCustomCategory('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contentType, existingContent]);
  
   useEffect(() => {
    if (formData.country && contentType === 'policy') {
      const validRegions = REGIONS_BY_COUNTRY[formData.country];
      const currentRegion = formData.region || '';
      // Allow sentinel value meaning "applies to all regions/cantons".
      if (currentRegion === 'All') {
        return;
      }
      if (!validRegions.includes(currentRegion)) {
        setFormData(prev => ({ ...prev, region: validRegions[0] }));
      }
    }
  }, [formData.country, contentType]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        if (name === "accessRoles") {
            const role = value as UserRole;
            setFormData(prev => ({
                ...prev,
                accessRoles: checked 
                    ? [...(prev.accessRoles || []), role]
                    : (prev.accessRoles || []).filter(r => r !== role)
            }));
        } else {
             setFormData(prev => ({ ...prev, [name]: checked }));
        }
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleButtonSelectChange = (name: keyof FormData, value: string | UserRole[] | boolean | undefined) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const selectFile = (selectedFile: File, resetInput?: () => void) => {
    const maxSizeMB = contentType === 'e-learning' ? 500 : 50;
    const allowedExtensions = contentType === 'e-learning'
      ? ['.pdf', '.mp4', '.docx']
      : ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ods'];
    const fileName = selectedFile.name.toLowerCase();
    if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      setFile(null);
      setFileError(
        t('common:contentUploadModal.fileUpload.invalidFileType', {
          defaultValue: `Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`,
        }),
      );
      resetInput?.();
      return;
    }
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setFile(null);
      setFileError(
        t('common:contentUploadModal.fileUpload.fileTooLarge', {
          defaultValue: `File size exceeds ${maxSizeMB}MB limit.`,
          max: maxSizeMB,
        }),
      );
      resetInput?.();
      return;
    }
    setFileError(null);
    setFile(selectedFile);
    setUploadProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    selectFile(selectedFile, () => {
      e.target.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const handleFileDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    setIsFileDragOver(true);
  };

  const handleFileDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    setIsFileDragOver(true);
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  const handleFileDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setIsFileDragOver(false);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    setIsFileDragOver(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (!droppedFile) return;
    selectFile(droppedFile);
  };

  const requiresFile = useMemo(() => {
    if (existingContent && !file) return false;
    if (contentType === 'e-learning' && formData.type === ELearningContentType.LINK) return false;
    if (contentType === 'policy' && (formData.externalLink || formData.description)) return false;
    return true;
  }, [
    contentType,
    existingContent,
    file,
    formData.type,
    formData.externalLink,
    formData.description,
  ]);

  const persistCustomCategory = async (): Promise<string | null> => {
    const name = normalizeCategoryName(customCategory);
    if (!name || name.length < 2 || name.toLowerCase() === 'other') {
      alert(t('common:contentUploadModal.error.invalidCategory', 'Please specify a category name'));
      return null;
    }

    const existing = categoryOptions.find((c) => c.toLowerCase() === name.toLowerCase());
    const resolved = existing ?? name;

    if (!existing) {
      setIsSavingCategory(true);
      try {
        await addCategoryOption(resolved);
      } catch (e: any) {
        alert(e?.message || t('common:contentUploadModal.error.saveCategoryFailed', 'Failed to save category'));
        return null;
      } finally {
        setIsSavingCategory(false);
      }
    }

    setFormData((prev) => ({ ...prev, category: resolved }));
    setCustomCategory('');
    return resolved;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (fileError && requiresFile) {
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);

    let resolvedCategory = formData.category || '';
    if (resolvedCategory === 'Other') {
      const saved = await persistCustomCategory();
      if (!saved) {
        setIsUploading(false);
        return;
      }
      resolvedCategory = saved;
    }

    const submissionData: any = { ...formData, category: resolvedCategory };

    if (contentType !== 'policy') {
      delete submissionData.isCritical;
    }

    if (contentType === 'policy' && formData.description) {
        submissionData.contentPreview = formData.description;
    }


    // Normalize submission data
    if (contentType === 'e-learning') {
        submissionData.type = normalizeElearningType(submissionData.type);
        if (submissionData.type !== ELearningContentType.COURSE) delete submissionData.lessons;
        if (submissionData.type !== ELearningContentType.VIDEO && submissionData.type !== ELearningContentType.COURSE) delete submissionData.duration;
        if (submissionData.type === ELearningContentType.LINK && file) { delete submissionData.fileName; }
        else if (submissionData.type !== ELearningContentType.LINK) { delete submissionData.fileUrl; }
    }
    if (contentType === 'policy') {
        submissionData.policyType = normalizePolicyType(submissionData.policyType);
    }

    // If updating existing content without a new file, submit immediately
    if (existingContent && !file) {
      try {
        await onSubmit(submissionData, undefined);
        setIsUploading(false);
        onClose();
      } catch (error) {
        setIsUploading(false);
        // Error handling is done in the parent component
      }
    } else if (file || (contentType === 'e-learning' && formData.type === ELearningContentType.LINK && formData.fileUrl)) { 
      // Only show progress for actual file uploads
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 20;
        setUploadProgress(currentProgress);
        if (currentProgress >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            try {
              await onSubmit(submissionData, file || undefined);
              setIsUploading(false);
              onClose();
            } catch (error) {
              setIsUploading(false);
              // Error handling is done in the parent component
            }
          }, 500);
        }
      }, 200);
    } else if (contentType === 'policy' && (formData.externalLink || formData.description)) { 
       try {
         await onSubmit(submissionData);
         setIsUploading(false);
         onClose();
       } catch (error) {
         setIsUploading(false);
       }
    } else if (contentType !== 'e-learning' || formData.type !== ELearningContentType.LINK) {
      alert(t('common:contentUploadModal.error.selectFileOrLink'));
      setIsUploading(false);
      return;
    } else { 
       try {
         await onSubmit(submissionData);
         setIsUploading(false);
         onClose();
       } catch (error) {
         setIsUploading(false);
       }
    }
  };

  if (!isOpen) return null;

  const titleText = existingContent 
    ? t('common:contentUploadModal.title.edit', { contentType: t(`contentUploadModal.contentType.${contentType}`)}) 
    : t(`common:contentUploadModal.title.add.${contentType}`);
  
  const descriptionLabel = contentType === 'policy' ? t('common:contentUploadModal.labels.descriptionPreview') : t('common:contentUploadModal.labels.description');
  const titleMaxLength = 100;
  const descriptionMaxLength = 1000;
  const policySpecificInputClass = `${STANDARD_INPUT_FIELD} mt-1`;


  const languageOptions: { value: LanguageCode; label: string }[] = [
    { value: 'EN', label: t('common:languageSwitcher.enShort') },
    { value: 'FR', label: t('common:languageSwitcher.frShort') },
    { value: 'DE', label: t('common:languageSwitcher.deShort') },
  ];
  
  const renderButtonSelect = (
    name: keyof FormData,
    currentValue: string | undefined,
    options: { value: string; label: string }[],
    label?: string,
    isRequired?: boolean
  ) => (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <div className="flex space-x-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleButtonSelectChange(name, opt.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors duration-150
              ${currentValue === opt.value
                ? 'bg-swiss-mint text-white border-swiss-mint'
                : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-teal hover:text-swiss-teal'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderELearningFields = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.title')} <span className="text-red-500 ml-0.5">*</span></label>
          <input type="text" name="title" id="title" value={formData.title} onChange={handleInputChange} required className={`${STANDARD_INPUT_FIELD} mt-1`} maxLength={titleMaxLength} />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.category')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="category" id="category" value={formData.category || ELEARNING_CATEGORIES[0]} onChange={handleInputChange} required className={`${STANDARD_INPUT_FIELD} mt-1`}>
            {categoryOptions.map(cat => <option key={cat} value={cat}>{(ELEARNING_CATEGORY_LABELS as any)[cat] || cat}</option>)}
          </select>
          {(formData.category || '') === 'Other' && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('common:contentUploadModal.placeholders.otherCategory', 'Specify category...')}
                disabled={isSavingCategory}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={persistCustomCategory}
                disabled={isSavingCategory}
              >
                {isSavingCategory ? t('common:saving', 'Saving...') : t('common:buttons.add', 'Add')}
              </Button>
            </div>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">{descriptionLabel}</label>
        <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={3} className={`${STANDARD_INPUT_FIELD} mt-1`} maxLength={descriptionMaxLength}></textarea>
        {formData.description && <p className="text-xs text-gray-400 text-right mt-0.5">{formData.description.length}/{descriptionMaxLength}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {renderButtonSelect('type', formData.type, Object.values(ELearningContentType).map(v => ({ value: v, label: ELearningContentTypeLabels[v] })), t('common:contentUploadModal.labels.contentType'), true)}
        {renderButtonSelect('language', formData.language, languageOptions, t('common:contentUploadModal.labels.language'), true)}
      </div>
      
      {/* Video Source Type Toggle - Only show for VIDEO type */}
      {formData.type === ELearningContentType.VIDEO && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Video Source</label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="videoSource"
                value="upload"
                checked={videoSourceType === 'upload'}
                onChange={() => setVideoSourceType('upload')}
                className="mr-2"
              />
              <span className="text-sm">Upload Video File</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="videoSource"
                value="url"
                checked={videoSourceType === 'url'}
                onChange={() => setVideoSourceType('url')}
                className="mr-2"
              />
              <span className="text-sm">External Video URL (YouTube, Vimeo, etc.)</span>
            </label>
          </div>
        </div>
      )}
      {(formData.type === ELearningContentType.COURSE || formData.type === ELearningContentType.VIDEO) && (
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.duration')}</label>
          <input type="text" name="duration" id="duration" value={formData.duration || ''} onChange={handleInputChange} className={`${STANDARD_INPUT_FIELD} mt-1`} placeholder={t('common:contentUploadModal.placeholders.duration')}/>
        </div>
      )}
      {formData.type === ELearningContentType.COURSE && (
        <div>
          <label htmlFor="lessons" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.lessons')}</label>
          <input type="number" name="lessons" id="lessons" value={formData.lessons || ''} onChange={handleInputChange} className={`${STANDARD_INPUT_FIELD} mt-1`} min="1"/>
        </div>
      )}
      {/* Show URL input for LINK type OR VIDEO with URL source */}
      {(formData.type === ELearningContentType.LINK || (formData.type === ELearningContentType.VIDEO && videoSourceType === 'url')) && (
        <div>
          <label htmlFor="fileUrl" className="block text-sm font-medium text-gray-700 mb-1">
            {formData.type === ELearningContentType.VIDEO ? 'Video URL' : t('common:contentUploadModal.labels.linkUrl')} 
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <input 
            type="url" 
            name="fileUrl" 
            id="fileUrl" 
            value={formData.fileUrl || ''} 
            onChange={handleInputChange} 
            required 
            className={`${STANDARD_INPUT_FIELD} mt-1`} 
            placeholder={formData.type === ELearningContentType.VIDEO ? "https://www.youtube.com/watch?v=..." : t('common:contentUploadModal.placeholders.linkUrl')}
          />
          {formData.type === ELearningContentType.VIDEO && (
            <p className="mt-1 text-xs text-gray-500">
              Supports YouTube, Vimeo, and direct video URLs
            </p>
          )}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.accessRoles')}</label>
        <div className="mt-1 space-y-1">
          {Object.values(UserRole).filter(r => [UserRole.FOUNDATION, UserRole.EDUCATOR, UserRole.ADMIN, UserRole.PARENT].includes(r)).map(role => (
            <label key={role} className="flex items-center">
              <input type="checkbox" name="accessRoles" value={role} checked={(formData.accessRoles || []).includes(role)} onChange={handleInputChange} className="h-4 w-4 text-swiss-mint border-gray-300 rounded focus:ring-swiss-mint" />
              <span className="ml-2 text-sm text-gray-600">{t(`common:userRoles.${role}`, role)}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.status')}</label>
        <select name="status" id="status" value={formData.status || 'Draft'} onChange={handleInputChange} className={`${STANDARD_INPUT_FIELD} mt-1`}>
            <option value="Draft">{t('common:contentUploadModal.statusOptions.draft')}</option>
            <option value="Published">{t('common:contentUploadModal.statusOptions.published')}</option>
            <option value="Archived">{t('common:contentUploadModal.statusOptions.archived')}</option>
        </select>
      </div>
    </>
  );

  const renderHRFields = () => (
    <>
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.documentTitle')} <span className="text-red-500 ml-0.5">*</span></label>
        <input type="text" name="title" id="title" value={formData.title} onChange={handleInputChange} required className={`${STANDARD_INPUT_FIELD} mt-1`} maxLength={titleMaxLength} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.category')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="category" id="category" value={formData.category || HR_CATEGORIES[0]} onChange={handleInputChange} required className={`${STANDARD_INPUT_FIELD} mt-1`}>
            {categoryOptions.map(cat => <option key={cat} value={cat}>{(HR_CATEGORY_LABELS as any)[cat] || cat}</option>)}
          </select>
          {(formData.category || '') === 'Other' && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('common:contentUploadModal.placeholders.otherCategory', 'Specify category...')}
                disabled={isSavingCategory}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={persistCustomCategory}
                disabled={isSavingCategory}
              >
                {isSavingCategory ? t('common:saving', 'Saving...') : t('common:buttons.add', 'Add')}
              </Button>
            </div>
          )}
        </div>
        {renderButtonSelect('language', formData.language, languageOptions, t('common:contentUploadModal.labels.language'), true)}
      </div>
      <div>
        <label htmlFor="fileType" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.fileType')} <span className="text-red-500 ml-0.5">*</span></label>
        <select name="fileType" id="fileType" value={formData.fileType as any} onChange={handleInputChange} required className={`${STANDARD_INPUT_FIELD} mt-1`}>
          <option value="PDF">PDF</option>
          <option value="DOC">DOC</option>
          <option value="DOCX">DOCX</option>
          <option value="XLS">XLS</option>
          <option value="XLSX">XLSX</option>
          <option value="CSV">CSV</option>
          <option value="ODS">ODS</option>
        </select>
      </div>
       <div>
        <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.version')}</label>
        <input type="text" name="version" id="version" value={formData.version || ''} onChange={handleInputChange} className={`${STANDARD_INPUT_FIELD} mt-1`} placeholder={t('common:contentUploadModal.placeholders.version')}/>
      </div>
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.status')}</label>
        <select name="status" id="status" value={formData.status || 'Draft'} onChange={handleInputChange} className={`${STANDARD_INPUT_FIELD} mt-1`}>
             <option value="Draft">{t('common:contentUploadModal.statusOptions.draft')}</option>
            <option value="Published">{t('common:contentUploadModal.statusOptions.published')}</option>
            <option value="Archived">{t('common:contentUploadModal.statusOptions.archived')}</option>
        </select>
      </div>
    </>
  );

  const renderPolicyFields = () => (
    <>
      <div>
        <label htmlFor="policyTitle" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.title')} <span className="text-red-500 ml-0.5">*</span></label>
        <input type="text" name="title" id="policyTitle" value={formData.title} onChange={handleInputChange} required className={policySpecificInputClass} maxLength={titleMaxLength} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="policyCategory" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.category')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="category" id="policyCategory" value={formData.category || POLICY_CATEGORIES[0]} onChange={handleInputChange} required className={policySpecificInputClass}>
            {categoryOptions.map(c => <option key={c} value={c}>{t(`content:policyCategories.${c.replace(/\s+/g, '')}`, { defaultValue: (POLICY_CATEGORY_LABELS as any)[c] || c })}</option>)}
          </select>
          {(formData.category || '') === 'Other' && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className={STANDARD_INPUT_FIELD}
                placeholder={t('common:contentUploadModal.placeholders.otherCategory', 'Specify category...')}
                disabled={isSavingCategory}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={persistCustomCategory}
                disabled={isSavingCategory}
              >
                {isSavingCategory ? t('common:saving', 'Saving...') : t('common:buttons.add', 'Add')}
              </Button>
            </div>
          )}
        </div>
         {renderButtonSelect('language', formData.language, languageOptions, t('common:contentUploadModal.labels.language'), true)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="policyCountry" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.country')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="country" id="policyCountry" value={formData.country} onChange={handleInputChange} required className={policySpecificInputClass}>
            {COUNTRIES_FOR_POLICIES.map(country => <option key={country} value={country}>{country}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="policyRegion" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.regionCanton')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="region" id="policyRegion" value={formData.region} onChange={handleInputChange} required className={policySpecificInputClass}>
            <option value="All">{t('common:filters.all', 'All')}</option>
            {(formData.country ? REGIONS_BY_COUNTRY[formData.country] : SWISS_CANTONS).map(region => <option key={region} value={region}>{region}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
        <div>
          <label htmlFor="policyPolicyType" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.policyType')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="policyType" id="policyPolicyType" value={formData.policyType} onChange={handleInputChange} required className={policySpecificInputClass}>
            {POLICY_TYPES_ENUM.map(pt => <option key={pt} value={pt}>{pt}</option>)}
          </select>
        </div>
        <div>
            <label htmlFor="isCritical" className="block text-sm font-medium text-gray-700 mb-1.5">{t('common:contentUploadModal.labels.criticality')}</label>
            <button
                type="button"
                onClick={() => handleButtonSelectChange('isCritical', !formData.isCritical)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none transition-colors duration-200 ease-in-out ${formData.isCritical ? 'bg-swiss-mint' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={!!formData.isCritical}
            >
                <span className="sr-only">{t('common:contentUploadModal.labels.markAsCritical')}</span>
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${formData.isCritical ? 'translate-x-6' : 'translate-x-1'}`}></span>
            </button>
            <span className="ml-2 text-sm text-gray-600">{formData.isCritical ? t('common:contentUploadModal.criticalityOptions.critical') : t('common:contentUploadModal.criticalityOptions.normal')}</span>
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="policyEffectiveDate" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.effectiveDate')}</label>
          <input type="date" name="effectiveDate" id="policyEffectiveDate" value={formData.effectiveDate} onChange={handleInputChange} className={policySpecificInputClass} />
        </div>
        <div>
          <label htmlFor="policyStatus" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.status')}</label>
           <select name="status" id="policyStatus" value={formData.status || 'Draft'} onChange={handleInputChange} className={policySpecificInputClass}>
            {['Draft', 'In Review', 'Approved', 'Published', 'Upcoming', 'Archived'].map(s => <option key={s} value={s}>{t(`contentUploadModal.policyStatusOptions.${s.toLowerCase().replace(' ', '')}`,s)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="policyExternalLink" className="block text-sm font-medium text-gray-700 mb-1">{t('common:contentUploadModal.labels.externalLink')}</label>
        <input type="url" name="externalLink" id="policyExternalLink" value={formData.externalLink || ''} onChange={handleInputChange} className={policySpecificInputClass} placeholder={t('common:contentUploadModal.placeholders.externalLink')}/>
      </div>
      <div>
        <label htmlFor="policyDescription" className="block text-sm font-medium text-gray-700 mb-1">{descriptionLabel}</label>
        <textarea name="description" id="policyDescription" value={formData.description} onChange={handleInputChange} rows={3} className={policySpecificInputClass} maxLength={descriptionMaxLength}></textarea>
        {formData.description && <p className="text-xs text-gray-400 text-right mt-0.5">{formData.description.length}/{descriptionMaxLength}</p>}
      </div>
    </>
  );

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} role="dialog" aria-modal="true" aria-labelledby="contentUploadModalTitle">
      <div className={`w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 id="contentUploadModalTitle" className="text-xl font-semibold text-swiss-charcoal">{titleText}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label={t('common:buttons.close')}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[calc(80vh-120px)] overflow-y-auto"> {/* Adjusted max-height */}
            {contentType === 'e-learning' && renderELearningFields()}
            {contentType === 'hr' && renderHRFields()}
            {contentType === 'policy' && renderPolicyFields()}

            {!(contentType === 'e-learning' && formData.type === ELearningContentType.LINK) && (
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {existingContent && (existingContent as any).fileUrl && !file ? t('common:contentUploadModal.labels.currentFile', { fileName: (existingContent as any).fileUrl}) : 
                   (contentType === 'e-learning' && (formData.type === ELearningContentType.PDF || formData.type === ELearningContentType.VIDEO) ? t('common:contentUploadModal.labels.uploadFileType', { fileType: formData.type}) : t('common:contentUploadModal.labels.uploadFile'))}
                  {(!existingContent && (contentType === 'hr' || (contentType === 'policy' && !formData.externalLink && !formData.description))) && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <div
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                    isFileDragOver ? 'border-swiss-teal bg-swiss-teal/15' : 'border-swiss-teal/60 bg-swiss-teal/5'
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onDragEnter={handleFileDragEnter}
                  onDragOver={handleFileDragOver}
                  onDragLeave={handleFileDragLeave}
                  onDrop={handleFileDrop}
                >
                  <div className="space-y-1 text-center">
                    <ArrowUpTrayIcon className="mx-auto h-10 w-10 text-swiss-mint" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-swiss-mint hover:text-swiss-teal focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-swiss-mint">
                        <span>{t('common:contentUploadModal.fileUpload.browse')}</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                          accept={contentType === 'e-learning' ? '.pdf,.mp4,.docx' : '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ods'}
                        />
                      </label>
                      <p className="pl-1 text-gray-500">{t('common:contentUploadModal.fileUpload.dragAndDrop')}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {contentType==='e-learning' ? t('common:contentUploadModal.fileUpload.eLearningAllowedTypes') : t('common:contentUploadModal.fileUpload.hrPolicyAllowedTypes')}
                    </p>
                  </div>
                </div>
                {file && <p className="mt-2 text-sm text-gray-500"><PaperClipIcon className="w-4 h-4 inline mr-1"/> {t('common:contentUploadModal.fileUpload.selected', { fileName: file.name })}</p>}
                {fileError && <p className="mt-2 text-sm text-swiss-coral">{fileError}</p>}
              </div>
            )}
            
            {isUploading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                <div className="bg-swiss-mint h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Button type="button" variant="light" onClick={onClose} disabled={isUploading}>{t('common:buttons.cancel')}</Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-swiss-mint"
              disabled={isUploading || (requiresFile && !!fileError)}
            >
              {isUploading ? t('common:contentUploadModal.buttons.uploading') : (existingContent ? t('common:buttons.saveChanges') : t('common:contentUploadModal.buttons.upload'))}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentUploadModal;
