
import React, { useState, useEffect, FormEvent } from 'react';
import { JobListing } from '../../types';
import { STANDARD_INPUT_FIELD } from '../../constants';
import Button from '../ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';

interface JobPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<JobListing, 'id' | 'applicationsReceived' | 'status'>) => void;
  existingJob?: JobListing | null;
}

type JobFormData = Omit<JobListing, 'id' | 'applicationsReceived' | 'status' | 'foundationName'>;

const JobPostModal: React.FC<JobPostModalProps> = ({ isOpen, onClose, onSubmit, existingJob }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();

  const initialFormState: JobFormData = {
    title: '',
    location: '',
    contractType: 'Full-time',
    startDate: new Date().toISOString().split('T')[0],
    description: '',
    requirements: [''],
    responsibilities: [''],
    qualifications: [''],
    benefits: [''],
    salaryRange: '',
  };

  const [formData, setFormData] = useState<JobFormData>(initialFormState);

  useEffect(() => {
    if (isOpen) {
      if (existingJob) {
        setFormData({
          ...existingJob,
          startDate: existingJob.startDate ? new Date(existingJob.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          responsibilities: existingJob.responsibilities?.length ? existingJob.responsibilities : [''],
          qualifications: existingJob.qualifications?.length ? existingJob.qualifications : [''],
          benefits: existingJob.benefits?.length ? existingJob.benefits : [''],
        });
      } else {
        setFormData(initialFormState);
      }
    }
  }, [isOpen, existingJob]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDynamicListChange = (field: 'requirements' | 'responsibilities' | 'qualifications' | 'benefits', index: number, value: string) => {
    const list = [...(formData[field] || [])];
    list[index] = value;
    setFormData(prev => ({ ...prev, [field]: list }));
  };
  
  const addDynamicListItem = (field: 'requirements' | 'responsibilities' | 'qualifications' | 'benefits') => {
      setFormData(prev => ({...prev, [field]: [...(prev[field] || []), '']}));
  };
  
  const removeDynamicListItem = (field: 'requirements' | 'responsibilities' | 'qualifications' | 'benefits', index: number) => {
      setFormData(prev => ({...prev, [field]: (prev[field] || []).filter((_, i) => i !== index)}));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.orgName) {
        alert("Cannot post job. Foundation details are missing.");
        return;
    }
    const finalData = {
        ...formData,
        foundationName: currentUser.orgName
    };
    onSubmit(finalData);
    onClose();
  };

  if (!isOpen) return null;

  const renderDynamicList = (field: 'requirements' | 'responsibilities' | 'qualifications' | 'benefits', labelKey: string, placeholderKey: string, buttonKey: string) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t(labelKey)}</label>
        {(formData[field] || []).map((item, index) => (
        <div key={index} className="flex items-center gap-2 mb-2">
            <input
            type="text"
            value={item}
            onChange={(e) => handleDynamicListChange(field, index, e.target.value)}
            className={`${STANDARD_INPUT_FIELD} flex-grow`}
            placeholder={`${t(placeholderKey)} ${index + 1}`}
            />
            {(formData[field] || []).length > 1 && (
            <Button type="button" variant="ghost" onClick={() => removeDynamicListItem(field, index)} className="text-swiss-coral !p-2">
                <XMarkIcon className="w-5 h-5"/>
            </Button>
            )}
        </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addDynamicListItem(field)}>
        {t(buttonKey)}
        </Button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-swiss-charcoal">
            {existingJob ? t('recruitmentPage.jobPostModal.editTitle') : t('recruitmentPage.jobPostModal.addTitle')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600" aria-label={t('buttons.close')}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitmentPage.jobPostModal.jobTitle')} *</label>
                <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className={STANDARD_INPUT_FIELD} />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitmentPage.jobPostModal.location')} *</label>
                <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} required className={STANDARD_INPUT_FIELD} />
              </div>
              <div>
                <label htmlFor="contractType" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitmentPage.jobPostModal.contractType')} *</label>
                <select name="contractType" id="contractType" value={formData.contractType} onChange={handleChange} required className={STANDARD_INPUT_FIELD}>
                  {['Full-time', 'Part-time', 'CDI', 'CDD', 'Internship'].map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitmentPage.jobPostModal.startDate')} *</label>
                <input type="date" name="startDate" id="startDate" value={formData.startDate} onChange={handleChange} required className={STANDARD_INPUT_FIELD} />
              </div>
            </div>
            <div>
              <label htmlFor="salaryRange" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitmentPage.jobPostModal.salaryRange')}</label>
              <input type="text" name="salaryRange" id="salaryRange" value={formData.salaryRange || ''} onChange={handleChange} className={STANDARD_INPUT_FIELD} placeholder={t('recruitmentPage.jobPostModal.salaryRangePlaceholder')}/>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitmentPage.jobPostModal.description')} *</label>
              <textarea name="description" id="description" value={formData.description} onChange={handleChange} required rows={5} className={STANDARD_INPUT_FIELD}></textarea>
            </div>
            
            {renderDynamicList('responsibilities', 'recruitmentPage.jobPostModal.responsibilities', 'recruitmentPage.jobPostModal.responsibilityPlaceholder', 'recruitmentPage.jobPostModal.addResponsibility')}
            {renderDynamicList('qualifications', 'recruitmentPage.jobPostModal.qualifications', 'recruitmentPage.jobPostModal.qualificationPlaceholder', 'recruitmentPage.jobPostModal.addQualification')}
            {renderDynamicList('benefits', 'recruitmentPage.jobPostModal.benefits', 'recruitmentPage.jobPostModal.benefitPlaceholder', 'recruitmentPage.jobPostModal.addBenefit')}
            {renderDynamicList('requirements', 'recruitmentPage.jobPostModal.requirements', 'recruitmentPage.jobPostModal.requirementPlaceholder', 'recruitmentPage.jobPostModal.addRequirement')}

          </div>
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
            <Button type="button" variant="light" onClick={onClose}>{t('buttons.cancel')}</Button>
            <Button type="submit" variant="primary">{existingJob ? t('buttons.saveChanges') : t('recruitmentPage.jobPostModal.postJob')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobPostModal;
