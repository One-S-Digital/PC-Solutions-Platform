import React, { useState, useEffect, FormEvent } from 'react';
import { Service, ServiceCategory, SERVICE_CATEGORIES, ServiceDeliveryType, SERVICE_DELIVERY_TYPES } from '../../types';
import { STANDARD_INPUT_FIELD, SUGGESTED_SERVICE_CATEGORIES } from '../../constants';
import Button from '../ui/Button';
import ChipInput from '../ui/ChipInput';
import { XMarkIcon, PaperClipIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../hooks/useCategories';

interface ServiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Omit<Service, 'id' | 'providerId' | 'providerName' | 'providerLogo'>>, file?: File) => void;
  existingService?: Service | null;
}

type ServiceFormData = Partial<Omit<Service, 'id' | 'providerId' | 'providerName' | 'providerLogo'>>;

const ServiceUploadModal: React.FC<ServiceUploadModalProps> = ({ isOpen, onClose, onSubmit, existingService }) => {
    const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const { categories: serviceCategoryOptions, addCategory: addServiceCategory } = useCategories(
    'service',
    SUGGESTED_SERVICE_CATEGORIES,
  );
  const [customServiceCategory, setCustomServiceCategory] = useState('');

  const initialFormState: ServiceFormData = {
    title: '',
    description: '',
    category: SERVICE_CATEGORIES[0],
    categories: [],
    availability: '',
    tags: [],
    deliveryType: SERVICE_DELIVERY_TYPES[0],
    priceInfo: '',
    imageUrl: undefined,
  };

  const [formData, setFormData] = useState<ServiceFormData>(initialFormState);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingService) {
        // When editing, pre-fill the form
        setFormData({
          title: existingService.title || '',
          description: existingService.description || '',
          category: existingService.category || SERVICE_CATEGORIES[0],
          categories: existingService.categories || [],
          availability: existingService.availability || '',
          tags: existingService.tags || [],
          deliveryType: existingService.deliveryType || SERVICE_DELIVERY_TYPES[0],
          priceInfo: existingService.priceInfo || '',
          imageUrl: existingService.imageUrl,
          // NOTE: Intentionally do not include `id`, provider fields, timestamps, or nested provider object.
        });
      } else {
        setFormData(initialFormState);
      }
      setFile(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingService]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'tags') {
      setFormData(prev => ({ ...prev, [name]: value.split(',').map(tag => tag.trim()).filter(tag => tag) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.orgId) {
        alert("Current user or organization ID is missing.");
        return;
    }
    onSubmit(formData, file || undefined);
    // Don't close here; parent closes only after a successful save.
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300 opacity-100" role="dialog" aria-modal="true" aria-labelledby="serviceUploadModalTitle">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 id="serviceUploadModalTitle" className="text-xl font-semibold text-swiss-charcoal">
            {existingService ? t('common:serviceUploadModal.editTitle') : t('common:serviceUploadModal.addTitle')}
          </h2>
            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label={t('common:buttons.close')}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[calc(80vh-120px)] overflow-y-auto">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">{t('common:serviceUploadModal.labels.title')} <span className="text-red-500 ml-0.5">*</span></label>
              <input type="text" name="title" id="title" value={formData.title} onChange={handleInputChange} required className={STANDARD_INPUT_FIELD} maxLength={100} />
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">{t('common:serviceUploadModal.labels.description')} <span className="text-red-500 ml-0.5">*</span></label>
              <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} required rows={4} className={STANDARD_INPUT_FIELD} maxLength={500}></textarea>
              {formData.description && <p className="text-xs text-gray-400 text-right mt-0.5">{formData.description.length}/{500}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common:serviceUploadModal.labels.categories', 'Service Categories')} <span className="text-red-500 ml-0.5">*</span>
              </label>
              <ChipInput<string>
                selectedChips={formData.categories || []}
                availableOptions={[...serviceCategoryOptions]}
                onChange={(categories) => setFormData(prev => ({ ...prev, categories }))}
                placeholder={t('common:serviceUploadModal.placeholders.categories', 'Type or select categories...')}
                allowCustomValues={true}
              />
              {(formData.categories || []).includes('Other') && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={customServiceCategory}
                    onChange={(e) => setCustomServiceCategory(e.target.value)}
                    className={STANDARD_INPUT_FIELD}
                    placeholder={t('common:serviceUploadModal.placeholders.categories', 'Specify category...')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const name = customServiceCategory.trim().replace(/\s+/g, ' ');
                      if (!name) return;
                      const existingOption = serviceCategoryOptions.find(
                        (option) => option.toLowerCase() === name.toLowerCase(),
                      );
                      const resolvedName = existingOption ?? name;
                      try {
                        if (!existingOption) {
                          await addServiceCategory(name);
                        }
                        setFormData((prev) => ({
                          ...prev,
                          categories: (prev.categories || [])
                            .filter((c) => c !== 'Other')
                            .concat([resolvedName])
                            .filter(
                              (v, i, arr) =>
                                arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i,
                            ),
                        }));
                        setCustomServiceCategory('');
                      } catch (e: any) {
                        alert(e?.message || 'Failed to save category');
                      }
                    }}
                  >
                    {t('common:buttons.add', 'Add')}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="deliveryType" className="block text-sm font-medium text-gray-700 mb-1">{t('common:serviceUploadModal.labels.deliveryType')}</label>
              <select name="deliveryType" id="deliveryType" value={formData.deliveryType} onChange={handleInputChange} className={STANDARD_INPUT_FIELD}>
                {SERVICE_DELIVERY_TYPES.map(type => <option key={type} value={type}>{t(`common:serviceDeliveryTypes.${type}`, type)}</option>)}
              </select>
            </div>

            <div>
                <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">{t('common:serviceUploadModal.labels.availability')} <span className="text-red-500 ml-0.5">*</span></label>
                <input type="text" name="availability" id="availability" value={formData.availability} onChange={handleInputChange} required className={STANDARD_INPUT_FIELD} placeholder={t('common:serviceUploadModal.placeholders.availability')} />
            </div>

            <div>
                <label htmlFor="priceInfo" className="block text-sm font-medium text-gray-700 mb-1">{t('common:serviceUploadModal.labels.priceInfo')}</label>
                <input type="text" name="priceInfo" id="priceInfo" value={formData.priceInfo} onChange={handleInputChange} className={STANDARD_INPUT_FIELD} placeholder={t('common:serviceUploadModal.placeholders.priceInfo')} />
            </div>
            
            <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">{t('common:serviceUploadModal.labels.tags')}</label>
                <input type="text" name="tags" id="tags" value={(formData.tags || []).join(', ')} onChange={handleInputChange} className={STANDARD_INPUT_FIELD} placeholder={t('common:serviceUploadModal.placeholders.tags')} />
            </div>

            <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common:serviceUploadModal.labels.image')}</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-swiss-teal/60 border-dashed rounded-md bg-swiss-teal/5">
                <div className="space-y-1 text-center">
                  <ArrowUpTrayIcon className="mx-auto h-10 w-10 text-swiss-mint" />
                  <div className="flex text-sm text-gray-600">
                      <label htmlFor="service-file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-swiss-mint hover:text-swiss-teal focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-swiss-mint">
                        <span>{t('common:contentUploadModal.fileUpload.browse')}</span>
                      <input
                        id="service-file-upload"
                        name="service-file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        // Keep this aligned with backend upload allowlist.
                        // (HEIC/AVIF are commonly unsupported in server-side type detection/allowlists.)
                        accept="image/png,image/jpeg,image/webp"
                      />
                    </label>
                      <p className="pl-1 text-gray-500">{t('common:contentUploadModal.fileUpload.dragAndDrop')}</p>
                  </div>
                    <p className="text-xs text-gray-500">
                      {file
                        ? t('common:contentUploadModal.fileUpload.selected', { fileName: file.name })
                        : t('common:contentUploadModal.fileUpload.browseNoFileChosen')}
                    </p>
                    <p className="text-xs text-gray-500">{t('common:serviceUploadModal.imageHelpText')}</p>
                </div>
              </div>
                {file && <p className="mt-2 text-sm text-gray-500"><PaperClipIcon className="w-4 h-4 inline mr-1"/> {t('common:contentUploadModal.fileUpload.selected', { fileName: file.name })}</p>}
                {formData.imageUrl && !file && <p className="mt-2 text-sm text-gray-500">{t('common:serviceUploadModal.currentImage')}: <a href={formData.imageUrl} target="_blank" rel="noopener noreferrer" className="text-swiss-mint hover:underline">{t('common:buttons.view')}</a></p>}
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <Button type="button" variant="light" onClick={onClose}>{t('common:buttons.cancel')}</Button>
            <Button type="submit" variant="primary" className="bg-swiss-mint">
                {existingService ? t('common:buttons.saveChanges') : t('common:buttons.add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceUploadModal;