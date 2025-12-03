import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { XMarkIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useApiClient, apiService } from '../services/api';
import { Organization } from '../types/api';

interface AddJobListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: JobListingFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface JobListingFormData {
  title: string;
  description?: string;
  location?: string;
  salary?: string;
  contractType?: string;
  foundationId: string;
  requirements?: string[];
  responsibilities?: string[];
  qualifications?: string[];
  benefits?: string[];
  status?: string;
}

const CONTRACT_TYPES = [
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const JOB_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CLOSED', label: 'Closed' },
];

const COMMON_REQUIREMENTS = [
  'Early Childhood Education Degree',
  'Minimum 2 years experience',
  'Valid childcare certification',
  'First Aid/CPR certified',
  'Background check required',
  'Strong communication skills',
];

const COMMON_BENEFITS = [
  'Competitive salary',
  'Health insurance',
  'Paid time off',
  'Professional development',
  'Flexible schedule',
  'Staff meals provided',
];

const AddJobListingModal: React.FC<AddJobListingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  const apiClient = useApiClient();
  
  const [formData, setFormData] = useState<JobListingFormData>({
    title: '',
    description: '',
    location: '',
    salary: '',
    contractType: 'FULL_TIME',
    foundationId: '',
    requirements: [],
    responsibilities: [],
    qualifications: [],
    benefits: [],
    status: 'DRAFT',
  });
  
  const [newRequirement, setNewRequirement] = useState('');
  const [newResponsibility, setNewResponsibility] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof JobListingFormData, string>>>({});

  // Fetch organizations for the dropdown
  const { data: organizationsResponse } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiService.getOrganizations(apiClient),
    enabled: isOpen && !!apiClient,
  });

  const organizations: Organization[] = organizationsResponse?.data?.data || [];
  // Filter to only show FOUNDATION type organizations
  const foundations = organizations.filter(org => org.type === 'FOUNDATION');

  // Track if we've set the default foundation to avoid unnecessary re-renders
  const hasSetDefaultFoundation = useRef(false);

  // Set default organization when organizations load
  useEffect(() => {
    if (foundations.length > 0 && !hasSetDefaultFoundation.current) {
      hasSetDefaultFoundation.current = true;
      setFormData(prev => ({ ...prev, foundationId: foundations[0].id }));
    }
  }, [foundations]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof JobListingFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAddItem = (
    field: 'requirements' | 'responsibilities' | 'qualifications' | 'benefits',
    value: string,
    setValue: (v: string) => void
  ) => {
    if (value.trim() && !formData[field]?.includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), value.trim()],
      }));
    }
    setValue('');
  };

  const handleRemoveItem = (
    field: 'requirements' | 'responsibilities' | 'qualifications' | 'benefits',
    itemToRemove: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field]?.filter(item => item !== itemToRemove) || [],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobListingFormData, string>> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = t('admin:jobListings.form.errors.titleRequired', 'Job title is required');
    }
    if (!formData.foundationId) {
      newErrors.foundationId = t('admin:jobListings.form.errors.organizationRequired', 'Please select an organization');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await onSubmit(formData);
      // Reset form on success - parent mutation's onSuccess closes the modal
      setFormData({
        title: '',
        description: '',
        location: '',
        salary: '',
        contractType: 'FULL_TIME',
        foundationId: foundations.length > 0 ? foundations[0].id : '',
        requirements: [],
        responsibilities: [],
        qualifications: [],
        benefits: [],
        status: 'DRAFT',
      });
      // Reset the ref so default foundation can be set again on next open
      hasSetDefaultFoundation.current = false;
    } catch (error) {
      console.error('Error submitting job listing:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-3xl bg-white shadow-xl rounded-lg overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center space-x-3">
            <BriefcaseIcon className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">
              {t('admin:jobListings.addModal.title', 'Add New Job Listing')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-50"
            aria-label={t('common:labels.close')}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[calc(80vh-140px)] overflow-y-auto">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('admin:jobListings.form.sections.basicInfo', 'Job Details')}
              </h3>
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:jobListings.form.title', 'Job Title')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder={t('admin:forms.job.titlePlaceholder')}
                />
                {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
              </div>

              <div>
                <label htmlFor="foundationId" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:jobListings.form.organization', 'Organization')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="foundationId"
                  name="foundationId"
                  value={formData.foundationId}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.foundationId ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select an organization...</option>
                  {foundations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
                {errors.foundationId && <p className="mt-1 text-sm text-red-500">{errors.foundationId}</p>}
                {foundations.length === 0 && (
                  <p className="mt-1 text-sm text-amber-600">
                    No foundations available. Please create a foundation organization first.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:jobListings.form.description', 'Job Description')}
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('admin:forms.job.descriptionPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:jobListings.form.location', 'Location')}
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('admin:forms.job.locationPlaceholder')}
                  />
                </div>
                
                <div>
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:jobListings.form.salary', 'Salary Range')}
                  </label>
                  <input
                    type="text"
                    id="salary"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('admin:forms.job.salaryPlaceholder')}
                  />
                </div>
                
                <div>
                  <label htmlFor="contractType" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:jobListings.form.contractType', 'Contract Type')}
                  </label>
                  <select
                    id="contractType"
                    name="contractType"
                    value={formData.contractType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CONTRACT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:jobListings.form.status', 'Status')}
                </label>
                <div className="flex gap-2">
                  {JOB_STATUS_OPTIONS.map(status => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: status.value }))}
                      className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                        formData.status === status.value
                          ? status.value === 'PUBLISHED'
                            ? 'bg-green-600 text-white border-green-600'
                            : status.value === 'DRAFT'
                            ? 'bg-gray-600 text-white border-gray-600'
                            : status.value === 'PAUSED'
                            ? 'bg-yellow-500 text-white border-yellow-500'
                            : 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('admin:jobListings.form.sections.requirements', 'Requirements')}
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {formData.requirements?.map((req, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {req}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('requirements', req)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('requirements', newRequirement, setNewRequirement))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('admin:forms.job.requirementPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => handleAddItem('requirements', newRequirement, setNewRequirement)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {t('common:add', 'Add')}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {COMMON_REQUIREMENTS.filter(r => !formData.requirements?.includes(r)).slice(0, 4).map(req => (
                  <button
                    key={req}
                    type="button"
                    onClick={() => handleAddItem('requirements', req, () => {})}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    + {req}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsibilities */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('admin:jobListings.form.sections.responsibilities', 'Responsibilities')}
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {formData.responsibilities?.map((resp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                  >
                    {resp}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('responsibilities', resp)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newResponsibility}
                  onChange={(e) => setNewResponsibility(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('responsibilities', newResponsibility, setNewResponsibility))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('admin:forms.job.responsibilityPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => handleAddItem('responsibilities', newResponsibility, setNewResponsibility)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {t('common:add', 'Add')}
                </button>
              </div>
            </div>

            {/* Qualifications */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('admin:jobListings.form.sections.qualifications', 'Qualifications')}
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {formData.qualifications?.map((qual, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                  >
                    {qual}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('qualifications', qual)}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newQualification}
                  onChange={(e) => setNewQualification(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('qualifications', newQualification, setNewQualification))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('admin:forms.job.qualificationPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => handleAddItem('qualifications', newQualification, setNewQualification)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  {t('common:add', 'Add')}
                </button>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('admin:jobListings.form.sections.benefits', 'Benefits')}
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {formData.benefits?.map((benefit, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                  >
                    {benefit}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('benefits', benefit)}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('benefits', newBenefit, setNewBenefit))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('admin:forms.job.benefitPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => handleAddItem('benefits', newBenefit, setNewBenefit)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  {t('common:add', 'Add')}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {COMMON_BENEFITS.filter(b => !formData.benefits?.includes(b)).slice(0, 4).map(benefit => (
                  <button
                    key={benefit}
                    type="button"
                    onClick={() => handleAddItem('benefits', benefit, () => {})}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    + {benefit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || foundations.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('common:saving', 'Saving...')}
                </>
              ) : (
                t('admin:jobListings.addModal.submit', 'Create Job Listing')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddJobListingModal;
