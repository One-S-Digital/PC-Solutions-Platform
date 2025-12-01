import React, { useState, FormEvent } from 'react';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CandidateFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface CandidateFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  skills?: string[];
  certifications?: string[];
  workExperience?: string;
  education?: string;
  availability?: string;
  shortBio?: string;
}

const AVAILABILITY_OPTIONS = [
  'Available Immediately',
  'Available in 2 weeks',
  'Available in 1 month',
  'Available in 3 months',
  'Not Currently Available',
];

const COMMON_SKILLS = [
  'Early Childhood Education',
  'Child Development',
  'Curriculum Planning',
  'Classroom Management',
  'First Aid/CPR',
  'Special Needs Education',
  'Bilingual (German/French)',
  'Parent Communication',
  'Arts & Crafts',
  'Music Education',
  'Outdoor Activities',
  'Montessori Method',
];

const AddCandidateModal: React.FC<AddCandidateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  
  const [formData, setFormData] = useState<CandidateFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    skills: [],
    certifications: [],
    workExperience: '',
    education: '',
    availability: AVAILABILITY_OPTIONS[0],
    shortBio: '',
  });
  
  const [newSkill, setNewSkill] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof CandidateFormData, string>>>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof CandidateFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAddSkill = (skill: string) => {
    if (skill.trim() && !formData.skills?.includes(skill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill.trim()],
      }));
    }
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.filter(s => s !== skillToRemove) || [],
    }));
  };

  const handleAddCertification = () => {
    if (newCertification.trim() && !formData.certifications?.includes(newCertification.trim())) {
      setFormData(prev => ({
        ...prev,
        certifications: [...(prev.certifications || []), newCertification.trim()],
      }));
      setNewCertification('');
    }
  };

  const handleRemoveCertification = (certToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications?.filter(c => c !== certToRemove) || [],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CandidateFormData, string>> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = t('admin:candidates.form.errors.firstNameRequired', 'First name is required');
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('admin:candidates.form.errors.lastNameRequired', 'Last name is required');
    }
    if (!formData.email.trim()) {
      newErrors.email = t('admin:candidates.form.errors.emailRequired', 'Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('admin:candidates.form.errors.emailInvalid', 'Please enter a valid email address');
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
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        skills: [],
        certifications: [],
        workExperience: '',
        education: '',
        availability: AVAILABILITY_OPTIONS[0],
        shortBio: '',
      });
    } catch (error) {
      console.error('Error submitting candidate:', error);
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
        className={`w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-500 to-teal-600">
          <div className="flex items-center space-x-3">
            <UserPlusIcon className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">
              {t('admin:candidates.addModal.title', 'Add New Candidate')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[calc(80vh-140px)] overflow-y-auto">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('admin:candidates.form.sections.basicInfo', 'Basic Information')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:candidates.form.firstName', 'First Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="John"
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>}
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:candidates.form.lastName', 'Last Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Doe"
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:candidates.form.email', 'Email')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin:candidates.form.phone', 'Phone Number')}
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="+41 XX XXX XX XX"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('admin:candidates.form.sections.professional', 'Professional Information')}
              </h3>
              
              <div>
                <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:candidates.form.availability', 'Availability')}
                </label>
                <select
                  id="availability"
                  name="availability"
                  value={formData.availability}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  {AVAILABILITY_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="workExperience" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:candidates.form.experience', 'Work Experience')}
                </label>
                <textarea
                  id="workExperience"
                  name="workExperience"
                  value={formData.workExperience}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Describe relevant work experience..."
                />
              </div>

              <div>
                <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:candidates.form.education', 'Education')}
                </label>
                <textarea
                  id="education"
                  name="education"
                  value={formData.education}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Educational background and qualifications..."
                />
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('admin:candidates.form.sections.skills', 'Skills')}
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {formData.skills?.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-2 text-teal-600 hover:text-teal-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill(newSkill))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Add a custom skill..."
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill(newSkill)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
                >
                  {t('common:add', 'Add')}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {COMMON_SKILLS.filter(s => !formData.skills?.includes(s)).slice(0, 6).map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleAddSkill(skill)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('admin:candidates.form.sections.certifications', 'Certifications')}
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {formData.certifications?.map((cert, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                  >
                    {cert}
                    <button
                      type="button"
                      onClick={() => handleRemoveCertification(cert)}
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
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCertification())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="e.g., Early Childhood Education Diploma, First Aid Certificate..."
                />
                <button
                  type="button"
                  onClick={handleAddCertification}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  {t('common:add', 'Add')}
                </button>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('admin:candidates.form.sections.bio', 'Short Bio')}
              </h3>
              
              <textarea
                id="shortBio"
                name="shortBio"
                value={formData.shortBio}
                onChange={handleInputChange}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="A brief introduction about the candidate..."
              />
              {formData.shortBio && (
                <p className="text-xs text-gray-400 text-right">{formData.shortBio.length}/500</p>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
            >
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 flex items-center"
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
                t('admin:candidates.addModal.submit', 'Add Candidate')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCandidateModal;
