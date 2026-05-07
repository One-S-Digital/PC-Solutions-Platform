
import React, { useState, useEffect, FormEvent } from 'react';
import { JobListing, JobStatus, JobEmploymentType, JobWorkSchedule } from '../../types';
import { STANDARD_INPUT_FIELD } from '../../constants';
import Button from '../ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../contexts/AppContext';
import { JobListingInput } from '../../hooks/useRecruitmentApi';
import JobEmploymentTypeSelector from './JobEmploymentTypeSelector';
import WorkScheduleSelector from './WorkScheduleSelector';

interface JobPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobListingInput) => Promise<void> | void;
  existingJob?: JobListing | null;
  initialContractType?: string;
}

type JobFormData = JobListingInput;

const JobPostModal: React.FC<JobPostModalProps> = ({ isOpen, onClose, onSubmit, existingJob, initialContractType }) => {
  const { t } = useTranslation(['recruitment', 'common']);
  const { currentUser } = useAppContext();

  const initialFormState: JobFormData = {
    title: '',
    location: '',
    contractType: (initialContractType ?? 'FULL_TIME') as any,
    employmentType: 'FULL_TIME' as JobEmploymentType,
    workSchedule: {
      expectedHoursPerWeek: 40,
      preferredDays: [1, 2, 3, 4, 5], // Mon-Fri
      preferredTimeSlot: 'FULL_DAY',
    } as JobWorkSchedule,
    startDate: new Date().toISOString().split('T')[0],
    description: '',
    requirements: [''],
    responsibilities: [''],
    qualifications: [''],
    benefits: [''],
    salaryRange: '',
    salary: '',
    status: JobStatus.PUBLISHED,
  };

  const [formData, setFormData] = useState<JobFormData>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        if (existingJob) {
          setFormData({
            title: existingJob.title,
            description: existingJob.description ?? '',
            requirements: existingJob.requirements.length ? existingJob.requirements : [''],
            responsibilities: existingJob.responsibilities.length ? existingJob.responsibilities : [''],
            qualifications: existingJob.qualifications.length ? existingJob.qualifications : [''],
            benefits: existingJob.benefits.length ? existingJob.benefits : [''],
            location: existingJob.location ?? '',
            salary: existingJob.salary ?? '',
            salaryRange: existingJob.salaryRange ?? '',
            contractType: existingJob.contractType ?? 'FULL_TIME',
            employmentType: existingJob.employmentType ?? 'FULL_TIME',
            workSchedule: existingJob.workSchedule ?? initialFormState.workSchedule,
            startDate: existingJob.startDate ? existingJob.startDate.split('T')[0] : '',
            status: existingJob.status ?? JobStatus.DRAFT,
          });
          return;
        }
        setFormData({ ...initialFormState, contractType: (initialContractType ?? 'FULL_TIME') as any });
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
    setSubmitError(null);
    const sanitizedData: JobListingInput = {
      ...formData,
      requirements: formData.requirements.filter((item) => item.trim().length > 0),
      responsibilities: formData.responsibilities.filter((item) => item.trim().length > 0),
      qualifications: formData.qualifications.filter((item) => item.trim().length > 0),
      benefits: formData.benefits.filter((item) => item.trim().length > 0),
      startDate: formData.startDate || undefined,
      salary: formData.salary || undefined,
      salaryRange: formData.salaryRange || undefined,
      employmentType: formData.employmentType,
      workSchedule: (formData.employmentType === 'PART_TIME' || formData.employmentType === 'REPLACEMENT')
        ? formData.workSchedule
        : undefined,
      status: formData.status ?? JobStatus.PUBLISHED,
    };
    setSubmitting(true);
    Promise.resolve(onSubmit(sanitizedData))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : t('recruitment:errors.saveJobFailed', 'Unable to save job listing');
        setSubmitError(message);
      })
      .finally(() => setSubmitting(false));
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
            {existingJob ? t('recruitment:jobPostModal.editTitle') : t('recruitment:jobPostModal.addTitle')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600" aria-label={t('common:buttons.close')}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {submitError && (
              <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-100">
                {submitError}
              </div>
            )}
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitment:jobPostModal.jobTitle')} *</label>
                <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className={STANDARD_INPUT_FIELD} />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitment:jobPostModal.location')} *</label>
                <input type="text" name="location" id="location" value={formData.location} onChange={handleChange} required className={STANDARD_INPUT_FIELD} />
              </div>
              <div>
                <label htmlFor="contractType" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitment:jobPostModal.contractType')} *</label>
                <select name="contractType" id="contractType" value={formData.contractType} onChange={handleChange} required className={STANDARD_INPUT_FIELD}>
                  <option value="FULL_TIME">{t('recruitment:contractTypes.fullTime')}</option>
                  <option value="PART_TIME">{t('recruitment:contractTypes.partTime')}</option>
                  <option value="CDI">{t('recruitment:contractTypes.cdi')}</option>
                  <option value="CDD">{t('recruitment:contractTypes.cdd')}</option>
                  <option value="INTERNSHIP">{t('recruitment:contractTypes.internship')}</option>
                  <option value="REPLACEMENT">{t('recruitment:contractTypes.replacement')}</option>
                  <option value="TEMPORARY">{t('recruitment:contractTypes.temporary')}</option>
                  <option value="FREELANCE">{t('recruitment:contractTypes.freelance')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitment:jobPostModal.startDate')} *</label>
                <input type="date" name="startDate" id="startDate" value={formData.startDate} onChange={handleChange} required className={STANDARD_INPUT_FIELD} />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('recruitment:jobPostModal.status', 'Status')} *
                </label>
                <select
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className={STANDARD_INPUT_FIELD}
                >
                  <option value={JobStatus.DRAFT}>{t('recruitment:jobStatus.draft', 'Draft')}</option>
                  <option value={JobStatus.PUBLISHED}>{t('recruitment:jobStatus.published', 'Published')}</option>
                  <option value={JobStatus.CLOSED}>{t('recruitment:jobStatus.closed', 'Closed')}</option>
                </select>
              </div>
            </div>

            {/* Employment Type Selection - Aligned with Candidate Availability */}
            <JobEmploymentTypeSelector
              value={formData.employmentType || 'FULL_TIME'}
              onChange={(type) => setFormData(prev => ({ ...prev, employmentType: type }))}
            />

            {/* Work Schedule - Shown for Part-Time and Replacement positions */}
            {(formData.employmentType === 'PART_TIME' || formData.employmentType === 'REPLACEMENT') && (
              <WorkScheduleSelector
                value={formData.workSchedule || {}}
                onChange={(schedule) => setFormData(prev => ({ ...prev, workSchedule: schedule }))}
              />
            )}

            {/* Salary */}
            <div>
              <label htmlFor="salaryRange" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitment:jobPostModal.salaryRange')}</label>
              <input type="text" name="salaryRange" id="salaryRange" value={formData.salaryRange || ''} onChange={handleChange} className={STANDARD_INPUT_FIELD} placeholder={t('recruitment:jobPostModal.salaryRangePlaceholder')}/>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">{t('recruitment:jobPostModal.description')} *</label>
              <textarea name="description" id="description" value={formData.description} onChange={handleChange} required rows={5} className={STANDARD_INPUT_FIELD}></textarea>
            </div>
            
            {/* Dynamic Lists */}
            {renderDynamicList('responsibilities', 'recruitment:jobPostModal.responsibilities', 'recruitment:jobPostModal.responsibilityPlaceholder', 'recruitment:jobPostModal.addResponsibility')}
            {renderDynamicList('qualifications', 'recruitment:jobPostModal.qualifications', 'recruitment:jobPostModal.qualificationPlaceholder', 'recruitment:jobPostModal.addQualification')}
            {renderDynamicList('benefits', 'recruitment:jobPostModal.benefits', 'recruitment:jobPostModal.benefitPlaceholder', 'recruitment:jobPostModal.addBenefit')}
            {renderDynamicList('requirements', 'recruitment:jobPostModal.requirements', 'recruitment:jobPostModal.requirementPlaceholder', 'recruitment:jobPostModal.addRequirement')}

          </div>
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
            <Button type="button" variant="light" onClick={onClose} disabled={submitting}>{t('common:buttons.cancel')}</Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {existingJob ? t('common:buttons.saveChanges') : t('recruitment:jobPostModal.postJob')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobPostModal;
