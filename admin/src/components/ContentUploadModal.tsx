import React, { useState, useEffect, FormEvent } from 'react';
import { XMarkIcon, PaperClipIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';

// Define the content types
export type UploadableContentType = 'e-learning' | 'hr' | 'policy';

// Define enums for content types
export enum ELearningContentType {
  COURSE = 'COURSE',
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  LINK = 'LINK'
}

export enum PolicyType {
  REGULATION = 'Regulation',
  GUIDELINE = 'Guideline',
  STANDARD = 'Standard',
  DIRECTIVE = 'Directive',
  LAW = 'Law'
}

// Define categories
export const ELEARNING_CATEGORIES = [
  'Child Development',
  'Health & Safety',
  'Educational Methods',
  'Special Needs',
  'Parental Engagement',
  'Administration',
  'Technology',
  'Other'
] as const;

export const HR_CATEGORIES = [
  'Onboarding',
  'Policies',
  'Benefits',
  'Training',
  'Compliance',
  'Performance',
  'Other'
] as const;

export const POLICY_BROAD_CATEGORIES = [
  'Education Policy',
  'Health & Safety',
  'Labor & Employment',
  'Child Protection',
  'Data Privacy',
  'Environmental',
  'Other'
] as const;

export const COUNTRIES_FOR_POLICIES = ['Switzerland', 'Germany', 'Austria', 'France'] as const;

export const SWISS_CANTONS = [
  'Aargau', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 'Basel-Landschaft', 'Basel-Stadt',
  'Bern', 'Fribourg', 'Geneva', 'Glarus', 'Graubünden', 'Jura', 'Lucerne', 'Neuchâtel',
  'Nidwalden', 'Obwalden', 'Schaffhausen', 'Schwyz', 'Solothurn', 'St. Gallen', 'Thurgau',
  'Ticino', 'Uri', 'Valais', 'Vaud', 'Zug', 'Zurich'
] as const;

export const REGIONS_BY_COUNTRY: Record<string, readonly string[]> = {
  'Switzerland': SWISS_CANTONS,
  'Germany': ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'] as const,
  'Austria': ['Burgenland', 'Carinthia', 'Lower Austria', 'Upper Austria', 'Salzburg', 'Styria', 'Tyrol', 'Vorarlberg', 'Vienna'] as const,
  'France': ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire', 'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'] as const
};

type LanguageCode = 'EN' | 'FR' | 'DE';
type UserRole = 'FOUNDATION' | 'EDUCATOR' | 'ADMIN' | 'PARENT';

interface ContentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, file?: File, onProgress?: (progress: number) => void) => void | Promise<void>;
  contentType: UploadableContentType;
  existingContent?: any | null;
}

type FormData = {
  title?: string;
  description?: string;
  contentPreview?: string;
  category?: string;
  type?: ELearningContentType;
  policyType?: PolicyType;
  language?: LanguageCode;
  accessRoles?: UserRole[];
  fileType?: 'PDF' | 'DOC' | 'DOCX' | 'XLS' | 'XLSX' | 'CSV' | 'ODS';
  country?: typeof COUNTRIES_FOR_POLICIES[number];
  region?: string;
  isCritical?: boolean;
  lessons?: number;
  duration?: string;
  fileUrl?: string;
  externalLink?: string;
  effectiveDate?: string;
  expirationDate?: string; // For State Policies
  reviewDate?: string; // For HR Documents
  status?: string;
  version?: string;
  tags?: string[];
};

const ContentUploadModal: React.FC<ContentUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contentType,
  existingContent
}) => {
  const { t } = useTranslation('dashboard');
  const { getToken } = useAuth();

  const defaultPolicyRegion =
    REGIONS_BY_COUNTRY[COUNTRIES_FOR_POLICIES[0]]?.[0] ?? SWISS_CANTONS[0];

  const [elearningCategories, setElearningCategories] = useState<string[]>([...ELEARNING_CATEGORIES]);
  const [hrCategories, setHrCategories] = useState<string[]>([...HR_CATEGORIES]);
  const [policyCategories, setPolicyCategories] = useState<string[]>([...POLICY_BROAD_CATEGORIES]);
  const [customCategory, setCustomCategory] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const getInitialFormState = (): FormData => ({
    title: '',
    description: '',
    contentPreview: '',
    category: (contentType === 'e-learning' ? ELEARNING_CATEGORIES[0] : contentType === 'hr' ? HR_CATEGORIES[0] : POLICY_BROAD_CATEGORIES[0]),
    type: contentType === 'e-learning' ? ELearningContentType.COURSE : undefined,
    policyType: contentType === 'policy' ? PolicyType.REGULATION : undefined,
    language: 'EN',
    accessRoles: ['FOUNDATION'], // Default access roles for all content types
    fileType: contentType === 'hr' ? 'PDF' : contentType === 'policy' ? 'PDF' : undefined,
    country: contentType === 'policy' ? COUNTRIES_FOR_POLICIES[0] : undefined,
    region: contentType === 'policy' ? defaultPolicyRegion : undefined,
    isCritical: false,
    tags: [],
    status: 'Draft',
  });

  const [formData, setFormData] = useState<FormData>(getInitialFormState());
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoSourceType, setVideoSourceType] = useState<'upload' | 'url'>('upload');

  const isOtherCategory = (value: unknown) =>
    typeof value === 'string' && value.trim().toLowerCase() === 'other';

  const categoryKind =
    contentType === 'e-learning'
      ? 'content-elearning'
      : contentType === 'hr'
        ? 'content-hr'
        : 'content-policy';

  const currentCategoryOptions =
    contentType === 'e-learning'
      ? elearningCategories
      : contentType === 'hr'
        ? hrCategories
        : policyCategories;

  const fetchCategories = async () => {
    try {
      const token = await getToken();
      const baseUrl = (import.meta as any).env?.VITE_API_URL || '/api';
      const url = `${String(baseUrl).replace(/\/+$/g, '')}/categories/${categoryKind}`;
      const response = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/json',
        },
      });
      if (!response.ok) return;
      const payload = await response.json().catch(() => null);
      const values = payload?.data;
      if (!Array.isArray(values)) return;
      const sanitized = values.filter((v: any) => typeof v === 'string');
      if (contentType === 'e-learning') setElearningCategories(sanitized);
      if (contentType === 'hr') setHrCategories(sanitized);
      if (contentType === 'policy') setPolicyCategories(sanitized);
    } catch {
      // keep defaults
    }
  };

  const persistCustomCategory = async (): Promise<string | null> => {
    const name = customCategory.trim().replace(/\s+/g, ' ');
    if (!name || name.length < 2 || name.toLowerCase() === 'other') {
      alert('Please specify a category name');
      return null;
    }
    setIsSavingCategory(true);
    try {
      const token = await getToken();
      const baseUrl = (import.meta as any).env?.VITE_API_URL || '/api';
      const url = `${String(baseUrl).replace(/\/+$/g, '')}/categories/${categoryKind}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || 'Failed to save category');
      }
      const values = Array.isArray(payload?.data) ? payload.data : null;
      if (values) {
        const sanitized = values.filter((v: any) => typeof v === 'string');
        if (contentType === 'e-learning') setElearningCategories(sanitized);
        if (contentType === 'hr') setHrCategories(sanitized);
        if (contentType === 'policy') setPolicyCategories(sanitized);
      }
      setFormData((prev) => ({ ...prev, category: name }));
      setCustomCategory('');
      return name;
    } catch (e: any) {
      alert(e?.message || 'Failed to save category');
      return null;
    } finally {
      setIsSavingCategory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (existingContent) {
        const mappedData: FormData = {
          title: existingContent.title,
          description: existingContent.description || existingContent.contentPreview || '',
          contentPreview: existingContent.contentPreview || existingContent.description || '',
          category: existingContent.category,
          language: existingContent.language || 'EN',
          tags: existingContent.tags || [],
          status: existingContent.status || 'Draft',
          accessRoles: existingContent.accessRoles || ['FOUNDATION'],
          version: existingContent.version,
        };
        if (contentType === 'e-learning') {
          mappedData.type = existingContent.type;
          mappedData.lessons = existingContent.lessons;
          mappedData.duration = existingContent.duration;
          // Check both fileUrl and publicUrl
          const url = existingContent.fileUrl || existingContent.publicUrl || existingContent.url;
          mappedData.fileUrl = url;
          
          // If it's a VIDEO type with a URL (YouTube, Vimeo, etc), set videoSourceType to 'url'
          if (existingContent.type === 'VIDEO' && url && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.includes('http'))) {
            setVideoSourceType('url');
          } else {
            setVideoSourceType('upload');
          }
        } else if (contentType === 'hr') {
          mappedData.fileType = existingContent.fileType;
          mappedData.effectiveDate = existingContent.effectiveDate ? new Date(existingContent.effectiveDate).toISOString().split('T')[0] : undefined;
          mappedData.reviewDate = existingContent.reviewDate ? new Date(existingContent.reviewDate).toISOString().split('T')[0] : undefined;
        } else if (contentType === 'policy') {
          mappedData.policyType = existingContent.policyType;
          mappedData.country = existingContent.country;
          mappedData.region = existingContent.region;
          mappedData.isCritical = existingContent.isCritical;
          mappedData.fileType = existingContent.fileType;
          mappedData.externalLink = existingContent.externalLink;
          mappedData.effectiveDate = existingContent.effectiveDate ? new Date(existingContent.effectiveDate).toISOString().split('T')[0] : undefined;
          mappedData.expirationDate = existingContent.expirationDate ? new Date(existingContent.expirationDate).toISOString().split('T')[0] : undefined;
        }
        setFormData(mappedData);
      } else {
        setFormData(getInitialFormState());
        setVideoSourceType('upload'); // Reset to default for new content
      }
      fetchCategories();
      setFile(null);
      setFileError(null);
      setUploadProgress(0);
      setIsUploading(false);
      setCustomCategory('');
    }
  }, [isOpen, contentType, existingContent]);

  useEffect(() => {
    if (formData.country && contentType === 'policy') {
      const validRegions = REGIONS_BY_COUNTRY[formData.country] ?? SWISS_CANTONS;
      const currentRegion = (formData.region ?? '') as string;
      if (!validRegions.includes(currentRegion)) {
        setFormData(prev => ({ ...prev, region: validRegions[0] as string }));
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const maxSizeMB = contentType === 'e-learning' ? 500 : 50;
      if (selectedFile.size > maxSizeMB * 1024 * 1024) {
        setFile(null);
        setFileError(
          t('admin:contentUpload.fileTooLarge', {
            defaultValue: `File size exceeds ${maxSizeMB}MB limit.`,
            max: maxSizeMB,
          }),
        );
        e.target.value = '';
        return;
      }
      setFileError(null);
      setFile(selectedFile);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (fileError) {
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);

    let resolvedCategory = formData.category || '';
    if (isOtherCategory(resolvedCategory)) {
      const saved = await persistCustomCategory();
      if (!saved) {
        setIsUploading(false);
        return;
      }
      resolvedCategory = saved;
    }

    const submissionData: any = { ...formData, category: resolvedCategory };
    if (contentType === 'policy' && formData.description) {
      submissionData.contentPreview = formData.description;
    }

    // Clean up submission data based on content type
    if (contentType === 'e-learning') {
      // Remove policy-specific fields
      delete submissionData.isCritical;
      delete submissionData.country;
      delete submissionData.region;
      delete submissionData.policyType;
      delete submissionData.externalLink;
      delete submissionData.effectiveDate;
      delete submissionData.expirationDate;
      delete submissionData.reviewDate;
      delete submissionData.fileType;
      
      // Clean up e-learning specific fields
      if (submissionData.type !== ELearningContentType.COURSE) delete submissionData.lessons;
      if (submissionData.type !== ELearningContentType.VIDEO && submissionData.type !== ELearningContentType.COURSE) {
        delete submissionData.duration;
      }
      
      // Handle fileUrl based on type and source
      if (submissionData.type === ELearningContentType.LINK) {
        // LINK type: keep fileUrl (external link), remove fileName if file was selected
        if (file) delete submissionData.fileName;
      } else if (submissionData.type === ELearningContentType.VIDEO && videoSourceType === 'url') {
        // VIDEO with URL source: keep fileUrl (YouTube, Vimeo, etc.)
        submissionData.videoSourceType = 'url';
      } else if (submissionData.type === ELearningContentType.VIDEO && videoSourceType === 'upload') {
        // VIDEO with file upload: remove fileUrl (will have uploaded file)
        delete submissionData.fileUrl;
        submissionData.videoSourceType = 'upload';
      } else {
        // PDF, COURSE with file upload: remove fileUrl
        delete submissionData.fileUrl;
      }
    } else if (contentType === 'hr') {
      // Remove policy-specific fields
      delete submissionData.isCritical;
      delete submissionData.country;
      delete submissionData.region;
      delete submissionData.policyType;
      delete submissionData.externalLink;
      delete submissionData.effectiveDate;
      delete submissionData.expirationDate;
      // Remove e-learning specific fields
      delete submissionData.type;
      delete submissionData.lessons;
      delete submissionData.duration;
      delete submissionData.videoSourceType;
    } else if (contentType === 'policy') {
      // Remove e-learning specific fields
      delete submissionData.type;
      delete submissionData.lessons;
      delete submissionData.duration;
      delete submissionData.accessRoles;
      delete submissionData.videoSourceType;
      // Remove HR specific fields
      delete submissionData.reviewDate;
    }
    
    // Log what we're about to submit (for debugging)
    console.log('📤 Submitting data:', {
      contentType,
      hasFile: !!file,
      videoSourceType,
      data: submissionData,
    });

    // Validate file requirements
    if (!existingContent) {
      const needsFile = contentType !== 'e-learning' || 
        (formData.type !== ELearningContentType.LINK && videoSourceType !== 'url');
      
      if (needsFile && !file && contentType !== 'policy') {
        alert('Please select a file');
        setIsUploading(false);
        return;
      }

      if (contentType === 'policy' && !file && !formData.externalLink && !formData.description) {
        alert('Please provide a file, external link, or description');
        setIsUploading(false);
        return;
      }
    }

    try {
      // Pass progress callback to onSubmit
      await onSubmit(submissionData, file || undefined, (progress: number) => {
        setUploadProgress(progress);
      });
      
      setIsUploading(false);
      setUploadProgress(100);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
      alert('Upload failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  const titleText = existingContent
    ? t('adminContentManagementDashboardPage.editContent', `Edit ${contentType === 'e-learning' ? 'E-Learning' : contentType === 'hr' ? 'HR Document' : 'Policy'} Content`)
    : t('adminContentManagementDashboardPage.addContent', `Add ${contentType === 'e-learning' ? 'E-Learning' : contentType === 'hr' ? 'HR Document' : 'Policy'} Content`);

  const descriptionLabel = contentType === 'policy' ? 'Description/Preview' : 'Description';
  const titleMaxLength = 100;
  const descriptionMaxLength = 1000;

  const languageOptions: { value: LanguageCode; label: string }[] = [
    { value: 'EN', label: 'EN' },
    { value: 'FR', label: 'FR' },
    { value: 'DE', label: 'DE' },
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
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-600'
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
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">{t('common.title','Title')} <span className="text-red-500 ml-0.5">*</span></label>
          <input type="text" name="title" id="title" value={formData.title || ''} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" maxLength={titleMaxLength} />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">{t('eLearningPage.categoryLabel','Category')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="category" id="category" value={formData.category || ELEARNING_CATEGORIES[0]} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            {currentCategoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          {isOtherCategory(formData.category) && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('content.customCategoryPlaceholder', 'Specify category...')}
                disabled={isSavingCategory}
              />
              <button
                type="button"
                onClick={persistCustomCategory}
                disabled={isSavingCategory}
                className="px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingCategory ? t('common.saving', 'Saving...') : t('common.add', 'Add')}
              </button>
            </div>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">{t('common.description', descriptionLabel)}</label>
        <textarea name="description" id="description" value={formData.description || ''} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" maxLength={descriptionMaxLength}></textarea>
        {formData.description && <p className="text-xs text-gray-400 text-right mt-0.5">{formData.description.length}/{descriptionMaxLength}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {renderButtonSelect('type', formData.type, Object.values(ELearningContentType).map(v => ({value: v, label: v})), t('content.type','Content Type'), true)}
        {renderButtonSelect('language', formData.language, languageOptions, t('eLearningPage.languageLabel','Language'), true)}
      </div>
      
      {/* Video Source Type Toggle - Only show for VIDEO type */}
      {formData.type === ELearningContentType.VIDEO && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('content.videoSource','Video Source')}</label>
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
              <span className="text-sm">{t('content.uploadVideo','Upload Video File')}</span>
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
              <span className="text-sm">{t('content.externalVideoUrl','External Video URL (YouTube, Vimeo, etc.)')}</span>
            </label>
          </div>
        </div>
      )}
      
      {(formData.type === ELearningContentType.COURSE || formData.type === ELearningContentType.VIDEO) && (
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">{t('eLearningPage.durationLabel','Duration')}</label>
          <input type="text" name="duration" id="duration" value={formData.duration || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., 2 hours, 30 minutes"/>
        </div>
      )}
      {formData.type === ELearningContentType.COURSE && (
        <div>
          <label htmlFor="lessons" className="block text-sm font-medium text-gray-700 mb-1">{t('content.numLessons','Number of Lessons')}</label>
          <input type="number" name="lessons" id="lessons" value={formData.lessons || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="1"/>
        </div>
      )}
      
      {/* Show URL input for LINK type OR VIDEO with URL source */}
      {(formData.type === ELearningContentType.LINK || (formData.type === ELearningContentType.VIDEO && videoSourceType === 'url')) && (
        <div>
          <label htmlFor="fileUrl" className="block text-sm font-medium text-gray-700 mb-1">
            {formData.type === ELearningContentType.VIDEO ? t('content.videoUrl','Video URL') : t('content.linkUrl','Link URL')}
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <input 
            type="url" 
            name="fileUrl" 
            id="fileUrl" 
            value={formData.fileUrl || ''} 
            onChange={handleInputChange} 
            required 
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
            placeholder={formData.type === ELearningContentType.VIDEO ? "https://www.youtube.com/watch?v=..." : "https://example.com"}
          />
          {formData.type === ELearningContentType.VIDEO && (
            <p className="mt-1 text-xs text-gray-500">
              {t('content.supportsVideoHelp','Supports YouTube, Vimeo, and direct video URLs')}
            </p>
          )}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.accessRoles','Access Roles')}</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(['ADMIN', 'EDUCATOR', 'FOUNDATION', 'PARENT'] as UserRole[]).map(role => (
            <label key={role} className="flex items-center">
              <input type="checkbox" name="accessRoles" value={role} checked={(formData.accessRoles || []).includes(role)} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <span className="ml-2 text-sm text-gray-600">{role === 'EDUCATOR' ? 'Educator / Candidate' : role === 'FOUNDATION' ? 'Foundation (Daycare)' : role}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">{t('common.status','Status')}</label>
        <select name="status" id="status" value={formData.status || 'Draft'} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
          <option value="Draft">{t('common:draft')}</option>
          <option value="Published">{t('common:published')}</option>
          <option value="Archived">{t('common:archived')}</option>
        </select>
      </div>
      <div>
        <label htmlFor="contentPreview" className="block text-sm font-medium text-gray-700 mb-1">{t('content.preview','Content Preview')}</label>
        <textarea name="contentPreview" id="contentPreview" value={formData.contentPreview || ''} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" maxLength={descriptionMaxLength} placeholder="Outline the key objectives or provide a brief summary"></textarea>
        {formData.contentPreview && <p className="text-xs text-gray-400 text-right mt-0.5">{formData.contentPreview.length}/{descriptionMaxLength}</p>}
      </div>
    </>
  );

  const renderHRFields = () => (
    <>
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">{t('content.documentTitle','Document Title')} <span className="text-red-500 ml-0.5">*</span></label>
        <input type="text" name="title" id="title" value={formData.title || ''} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" maxLength={titleMaxLength} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">{t('eLearningPage.categoryLabel','Category')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="category" id="category" value={formData.category || HR_CATEGORIES[0]} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            {currentCategoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          {isOtherCategory(formData.category) && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('content.customCategoryPlaceholder', 'Specify category...')}
                disabled={isSavingCategory}
              />
              <button
                type="button"
                onClick={persistCustomCategory}
                disabled={isSavingCategory}
                className="px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingCategory ? t('common.saving', 'Saving...') : t('common.add', 'Add')}
              </button>
            </div>
          )}
        </div>
        {renderButtonSelect('language', formData.language, languageOptions, t('eLearningPage.languageLabel','Language'), true)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="fileType" className="block text-sm font-medium text-gray-700 mb-1">{t('content.fileType','File Type')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="fileType" id="fileType" value={formData.fileType || 'PDF'} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
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
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">{t('common.status','Status')}</label>
          <select name="status" id="status" value={formData.status || 'Draft'} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            <option value="Draft">{t('common:draft')}</option>
            <option value="Published">{t('common:published')}</option>
            <option value="Archived">{t('common:archived')}</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">{t('content.version','Version')}</label>
        <input type="text" name="version" id="version" value={formData.version || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., 1.0, v2.1"/>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700 mb-1">{t('content.effectiveDate','Effective Date')}</label>
          <input type="date" name="effectiveDate" id="effectiveDate" value={formData.effectiveDate || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="reviewDate" className="block text-sm font-medium text-gray-700 mb-1">{t('content.reviewDate','Review Date')}</label>
          <input type="date" name="reviewDate" id="reviewDate" value={formData.reviewDate || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
      <div>
        <label htmlFor="contentPreview" className="block text-sm font-medium text-gray-700 mb-1">{t('content.preview','Description / Content Preview')}</label>
        <textarea name="contentPreview" id="contentPreview" value={formData.contentPreview || ''} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" maxLength={descriptionMaxLength} placeholder="Provide a short overview for employees"></textarea>
        {formData.contentPreview && <p className="text-xs text-gray-400 text-right mt-0.5">{formData.contentPreview.length}/{descriptionMaxLength}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.accessRoles','Access Roles')}</label>
        <div className="mt-1 space-y-1">
          {(['ADMIN', 'EDUCATOR', 'FOUNDATION', 'PARENT'] as UserRole[]).map(role => (
            <label key={role} className="flex items-center">
              <input type="checkbox" name="accessRoles" value={role} checked={(formData.accessRoles || []).includes(role)} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <span className="ml-2 text-sm text-gray-600">{role === 'EDUCATOR' ? 'Educator / Candidate' : role === 'FOUNDATION' ? 'Foundation (Daycare)' : role}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );

  const renderPolicyFields = () => (
    <>
      <div>
        <label htmlFor="policyTitle" className="block text-sm font-medium text-gray-700 mb-1">{t('common.title','Title')} <span className="text-red-500 ml-0.5">*</span></label>
        <input type="text" name="title" id="policyTitle" value={formData.title} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" maxLength={titleMaxLength} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="policyCategory" className="block text-sm font-medium text-gray-700 mb-1">{t('eLearningPage.categoryLabel','Category')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="category" id="policyCategory" value={formData.category || POLICY_BROAD_CATEGORIES[0]} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            {currentCategoryOptions.map(c => {
              const key = c.replace(/\s+/g, '').replace(/&/g, '&');
              return <option key={c} value={c}>{t(`content.policyCategory.${key}`, c)}</option>;
            })}
          </select>
          {isOtherCategory(formData.category) && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('content.customCategoryPlaceholder', 'Specify category...')}
                disabled={isSavingCategory}
              />
              <button
                type="button"
                onClick={persistCustomCategory}
                disabled={isSavingCategory}
                className="px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingCategory ? t('common.saving', 'Saving...') : t('common.add', 'Add')}
              </button>
            </div>
          )}
        </div>
        {renderButtonSelect('language', formData.language, languageOptions, t('eLearningPage.languageLabel','Language'), true)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="policyCountry" className="block text-sm font-medium text-gray-700 mb-1">{t('content.country','Country')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="country" id="policyCountry" value={formData.country || COUNTRIES_FOR_POLICIES[0]} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            {COUNTRIES_FOR_POLICIES.map(country => <option key={country} value={country}>{country}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="policyRegion" className="block text-sm font-medium text-gray-700 mb-1">{t('content.region','Region/Canton')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="region" id="policyRegion" value={formData.region || SWISS_CANTONS[0]} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            {(formData.country ? (REGIONS_BY_COUNTRY[formData.country] ?? SWISS_CANTONS) : SWISS_CANTONS).map(region => <option key={region} value={region}>{region}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
        <div>
          <label htmlFor="policyPolicyType" className="block text-sm font-medium text-gray-700 mb-1">{t('content.policyType','Policy Type')} <span className="text-red-500 ml-0.5">*</span></label>
          <select name="policyType" id="policyPolicyType" value={formData.policyType || PolicyType.REGULATION} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            {Object.values(PolicyType).map(pt => <option key={pt} value={pt}>{pt}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="isCritical" className="block text-sm font-medium text-gray-700 mb-1.5">{t('content.criticality','Criticality')}</label>
          <button
            type="button"
            onClick={() => handleButtonSelectChange('isCritical', !formData.isCritical)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none transition-colors duration-200 ease-in-out ${formData.isCritical ? 'bg-blue-600' : 'bg-gray-200'}`}
            role="switch"
            aria-checked={!!formData.isCritical}
          >
            <span className="sr-only">{t('content.markCritical','Mark as Critical')}</span>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${formData.isCritical ? 'translate-x-6' : 'translate-x-1'}`}></span>
          </button>
          <span className="ml-2 text-sm text-gray-600">{formData.isCritical ? t('content.critical','Critical') : t('content.normal','Normal')}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="policyEffectiveDate" className="block text-sm font-medium text-gray-700 mb-1">{t('content.effectiveDate','Effective Date')}</label>
          <input type="date" name="effectiveDate" id="policyEffectiveDate" value={formData.effectiveDate || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="policyExpirationDate" className="block text-sm font-medium text-gray-700 mb-1">{t('content.expirationDate','Expiration Date')}</label>
          <input type="date" name="expirationDate" id="policyExpirationDate" value={formData.expirationDate || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="policyStatus" className="block text-sm font-medium text-gray-700 mb-1">{t('common.status','Status')}</label>
          <select name="status" id="policyStatus" value={formData.status || 'Draft'} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            {['Draft', 'In Review', 'Approved', 'Published', 'Upcoming', 'Archived'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="policyVersion" className="block text-sm font-medium text-gray-700 mb-1">{t('content.version','Version')}</label>
          <input type="text" name="version" id="policyVersion" value={formData.version || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., 1.0"/>
        </div>
      </div>
      <div>
        <label htmlFor="policyExternalLink" className="block text-sm font-medium text-gray-700 mb-1">{t('content.policyLink','Link to Official Policy (optional)')}</label>
        <input type="url" name="externalLink" id="policyExternalLink" value={formData.externalLink || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://example.gov/policy-doc"/>
      </div>
      <div>
        <label htmlFor="policyDescription" className="block text-sm font-medium text-gray-700 mb-1">{t('content.preview','Description / Content Preview')}</label>
        <textarea name="description" id="policyDescription" value={formData.description} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" maxLength={descriptionMaxLength} placeholder="Add notes or an executive summary for this policy"></textarea>
        {formData.description && <p className="text-xs text-gray-400 text-right mt-0.5">{formData.description.length}/{descriptionMaxLength}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.accessRoles','Access Roles')}</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(['ADMIN', 'EDUCATOR', 'FOUNDATION', 'PARENT'] as UserRole[]).map(role => (
            <label key={role} className="flex items-center">
              <input type="checkbox" name="accessRoles" value={role} checked={(formData.accessRoles || []).includes(role)} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <span className="ml-2 text-sm text-gray-600">{role === 'EDUCATOR' ? 'Educator / Candidate' : role === 'FOUNDATION' ? 'Foundation (Daycare)' : role}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} role="dialog" aria-modal="true">
      <div className={`w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{titleText}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label="Close">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[calc(80vh-120px)] overflow-y-auto">
            {contentType === 'e-learning' && renderELearningFields()}
            {contentType === 'hr' && renderHRFields()}
            {contentType === 'policy' && renderPolicyFields()}

            {/* File upload section - Hide for LINK type, or VIDEO with URL source */}
            {!(contentType === 'e-learning' && formData.type === ELearningContentType.LINK) && 
             !(contentType === 'e-learning' && formData.type === ELearningContentType.VIDEO && videoSourceType === 'url') && (
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {existingContent && (existingContent as any).fileUrl && !file 
                    ? t('content.currentFile','Current File: {{url}}', { url: (existingContent as any).fileUrl })
                    : (contentType === 'e-learning' && (formData.type === ELearningContentType.PDF || formData.type === ELearningContentType.VIDEO) 
                      ? t('content.uploadTypeFile','Upload {{type}} File', { type: formData.type })
                      : t('content.uploadFile','Upload File'))}
                  {(!existingContent && (contentType === 'hr' || (contentType === 'policy' && !formData.externalLink && !formData.description))) && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-blue-300 border-dashed rounded-md bg-blue-50">
                  <div className="space-y-1 text-center">
                    <ArrowUpTrayIcon className="mx-auto h-10 w-10 text-blue-600" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>{t('content.browse','Browse')}</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          accept={contentType === 'e-learning' ? '.pdf,.mp4,.docx' : '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ods'}
                        />
                      </label>
                      <p className="pl-1 text-gray-500">{t('content.orDragDrop','or drag and drop')}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {contentType==='e-learning' ? t('content.allowedEl','PDF, MP4, DOCX files allowed') : t('content.allowedHr','PDF, DOC, DOCX, XLS, XLSX, CSV, ODS files allowed')}
                    </p>
                  </div>
                </div>
                {file && <p className="mt-2 text-sm text-gray-500"><PaperClipIcon className="w-4 h-4 inline mr-1"/> {t('content.selected','Selected:')} {file.name}</p>}
                {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}
              </div>
            )}
            
            {isUploading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {t('buttons.cancel','Cancel')}
            </button>
            <button 
              type="submit" 
              disabled={isUploading || !!fileError}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isUploading ? t('content.uploading','Uploading...') : (existingContent ? t('buttons.saveChanges','Save Changes') : t('content.upload','Upload'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentUploadModal;
