import React, { useState, useEffect, FormEvent } from 'react';
import { Service, ServiceCategory, SERVICE_CATEGORIES, ServiceDeliveryType, SERVICE_DELIVERY_TYPES } from '../../types';
import { STANDARD_INPUT_FIELD } from '../../constants';
import Button from '../ui/Button';
import { XMarkIcon, PaperClipIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';

interface ServiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Omit<Service, 'id' | 'providerId' | 'providerName' | 'providerLogo'>>, file?: File) => void;
  existingService?: Service | null;
}

type ServiceFormData = Partial<Omit<Service, 'id' | 'providerId' | 'providerName' | 'providerLogo'>>;

const ServiceUploadModal: React.FC<ServiceUploadModalProps> = ({ isOpen, onClose, onSubmit, existingService }) => {
  const { t } = useTranslation();
  const { currentUser } = useAppContext();

  const initialFormState: ServiceFormData = {
    title: '',
    description: '',
    category: SERVICE_CATEGORIES[0],
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
        // When editing, pre-fill the form. Tags need to be converted to string for input.
        setFormData({
          ...existingService,
          tags: existingService.tags || [], // Ensure tags is an array
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
    onClose(); // Close modal after submission
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300 opacity-100" role="dialog" aria-modal="true" aria-labelledby="serviceUploadModalTitle">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 id="serviceUploadModalTitle" className="text-xl font-semibold text-swiss-charcoal">
            {existingService ? t('serviceUploadModal.editTitle') : t('serviceUploadModal.addTitle')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label={t('buttons.close')}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[calc(80vh-120px)] overflow-y-auto">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">{t('serviceUploadModal.labels.title')} <span className="text-red-500 ml-0.5">*</span></label>
              <input type="text" name="title" id="title" value={formData.title} onChange={handleInputChange} required className={STANDARD_INPUT_FIELD} maxLength={100} />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">{t('serviceUploadModal.labels.description')} <span className="text-red-500 ml-0.5">*</span></label>
              <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} required rows={4} className={STANDARD_INPUT_FIELD} maxLength={500}></textarea>
              {formData.description && <p className="text-xs text-gray-400 text-right mt-0.5">{formData.description.length}/{500}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">{t('serviceUploadModal.labels.category')} <span className="text-red-500 ml-0.5">*</span></label>
                <select name="category" id="category" value={formData.category} onChange={handleInputChange} required className={STANDARD_INPUT_FIELD}>
                  {SERVICE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="deliveryType" className="block text-sm font-medium text-gray-700 mb-1">{t('serviceUploadModal.labels.deliveryType')}</label>
                <select name="deliveryType" id="deliveryType" value={formData.deliveryType} onChange={handleInputChange} className={STANDARD_INPUT_FIELD}>
                  {SERVICE_DELIVERY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">{t('serviceUploadModal.labels.availability')} <span className="text-red-500 ml-0.5">*</span></label>
              <input type="text" name="availability" id="availability" value={formData.availability} onChange={handleInputChange} required className={STANDARD_INPUT_FIELD} placeholder={t('serviceUploadModal.placeholders.availability')} />
            </div>

            <div>
              <label htmlFor="priceInfo" className="block text-sm font-medium text-gray-700 mb-1">{t('serviceUploadModal.labels.priceInfo')}</label>
              <input type="text" name="priceInfo" id="priceInfo" value={formData.priceInfo} onChange={handleInputChange} className={STANDARD_INPUT_FIELD} placeholder={t('serviceUploadModal.placeholders.priceInfo')} />
            </div>
            
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">{t('serviceUploadModal.labels.tags')}</label>
              <input type="text" name="tags" id="tags" value={(formData.tags || []).join(', ')} onChange={handleInputChange} className={STANDARD_INPUT_FIELD} placeholder={t('serviceUploadModal.placeholders.tags')} />
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceUploadModal.labels.image')}</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-swiss-teal/60 border-dashed rounded-md bg-swiss-teal/5">
                <div className="space-y-1 text-center">
                  <ArrowUpTrayIcon className="mx-auto h-10 w-10 text-swiss-mint" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="service-file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-swiss-mint hover:text-swiss-teal focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-swiss-mint">
                      <span>{t('contentUploadModal.fileUpload.browse')}</span>
                      <input id="service-file-upload" name="service-file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*"/>
                    </label>
                    <p className="pl-1 text-gray-500">{t('contentUploadModal.fileUpload.dragAndDrop')}</p>
                  </div>
                  <p className="text-xs text-gray-500">{t('serviceUploadModal.imageHelpText')}</p>
                </div>
              </div>
              {file && <p className="mt-2 text-sm text-gray-500"><PaperClipIcon className="w-4 h-4 inline mr-1"/> {t('contentUploadModal.fileUpload.selected', { fileName: file.name })}</p>}
              {formData.imageUrl && !file && <p className="mt-2 text-sm text-gray-500">{t('serviceUploadModal.currentImage')}: <a href={formData.imageUrl} target="_blank" rel="noopener noreferrer" className="text-swiss-mint hover:underline">{t('buttons.view')}</a></p>}
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Button type="button" variant="light" onClick={onClose}>{t('buttons.cancel')}</Button>
            <Button type="submit" variant="primary" className="bg-swiss-mint">
              {existingService ? t('buttons.saveChanges') : t('buttons.add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceUploadModal;