import React, { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// Define types locally for now
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FOUNDATION = 'FOUNDATION',
  PRODUCT_SUPPLIER = 'PRODUCT_SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  EDUCATOR = 'EDUCATOR',
  PARENT = 'PARENT',
}

interface SignupFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
  // Organization fields
  organizationName?: string;
  contactPerson?: string;
  canton?: string;
  languages?: string[];
  capacity?: number;
  pedagogy?: string[];
  // Product Supplier fields
  productCategory?: string;
  minimumOrderQuantity?: number;
  directOrderLink?: string;
  catalogUrl?: string;
  // Service Provider fields
  serviceType?: string;
  serviceCategories?: string[];
  deliveryType?: string;
  bookingLink?: string;
  // Educator fields
  workExperience?: string;
  education?: string;
  certifications?: string[];
  skills?: string[];
  availability?: string;
  cvUrl?: string;
  // Parent fields
  childAge?: number;
  preferredLocation?: string;
  preferredLanguages?: string[];
  specialRequirements?: string;
}

const ROLE_OPTIONS = [
  {
    value: UserRole.FOUNDATION,
    labelKey: 'auth:signupPage.foundation.label',
    descriptionKey: 'auth:signupPage.foundation.description',
  },
  {
    value: UserRole.PRODUCT_SUPPLIER,
    labelKey: 'auth:signupPage.productSupplier.label',
    descriptionKey: 'auth:signupPage.productSupplier.description',
  },
  {
    value: UserRole.SERVICE_PROVIDER,
    labelKey: 'auth:signupPage.serviceProvider.label',
    descriptionKey: 'auth:signupPage.serviceProvider.description',
  },
  {
    value: UserRole.EDUCATOR,
    labelKey: 'auth:signupPage.educator.label',
    descriptionKey: 'auth:signupPage.educator.description',
  },
  {
    value: UserRole.PARENT,
    labelKey: 'auth:signupPage.parent.label',
    descriptionKey: 'auth:signupPage.parent.description',
  },
];

export default function CustomSignupForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, isLoaded, setActive } = useSignUp();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: UserRole.PARENT,
  });

  const updateFormData = (field: keyof SignupFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleSelection = (role: UserRole) => {
    updateFormData('role', role);
    setCurrentStep(2);
  };

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!isLoaded || !signUp) {
        throw new Error('Clerk not loaded');
      }

      // Create user with Clerk
      const result = await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        unsafeMetadata: {
          role: formData.role,
          phoneNumber: formData.phoneNumber,
          organizationName: formData.organizationName,
          contactPerson: formData.contactPerson,
          canton: formData.canton,
          languages: formData.languages,
          capacity: formData.capacity,
          pedagogy: formData.pedagogy,
          productCategory: formData.productCategory,
          minimumOrderQuantity: formData.minimumOrderQuantity,
          directOrderLink: formData.directOrderLink,
          catalogUrl: formData.catalogUrl,
          serviceType: formData.serviceType,
          serviceCategories: formData.serviceCategories,
          deliveryType: formData.deliveryType,
          bookingLink: formData.bookingLink,
          workExperience: formData.workExperience,
          education: formData.education,
          certifications: formData.certifications,
          skills: formData.skills,
          availability: formData.availability,
          cvUrl: formData.cvUrl,
          childAge: formData.childAge,
          preferredLocation: formData.preferredLocation,
          preferredLanguages: formData.preferredLanguages,
          specialRequirements: formData.specialRequirements,
        },
      });

      if (result.status === 'complete') {
        // User created successfully, activate session and redirect to dashboard
        await setActive({ session: result.createdSessionId });
        navigate('/dashboard');
      } else if (result.status === 'missing_requirements') {
        // Handle verification if needed
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setCurrentStep(3); // Verification step
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailVerification = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isLoaded || !signUp) {
        throw new Error('Clerk not loaded');
      }

      const result = await signUp.attemptEmailAddressVerification({ code });
      
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoleSelection = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t('auth:signupPage.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('auth:signupPage.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role.value}
              onClick={() => handleRoleSelection(role.value)}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 text-left shadow-sm hover:border-primary-500 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <div className="flex flex-col">
                <h3 className="text-lg font-medium text-gray-900">
                  {t(role.labelKey)}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {t(role.descriptionKey)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBasicInfoForm = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t('auth:signupPage.createAccountTitle')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('auth:signupPage.roleLabel')}: {t(ROLE_OPTIONS.find(r => r.value === formData.role)?.labelKey || '')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleBasicInfoSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  {t('auth:signupPage.firstName')}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  {t('auth:signupPage.lastName')}
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth:signupPage.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth:signupPage.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                {t('auth:signupPage.phoneNumber')}
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber || ''}
                onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Role-specific fields will be added in the next step */}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common:back')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isLoading ? t('common:loading') : t('common:next')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const renderEmailVerification = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t('auth:signupPage.verifyEmail')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('auth:signupPage.verifyEmailDescription')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const code = formData.get('code') as string;
            handleEmailVerification(code);
          }}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                {t('auth:signupPage.verificationCode')}
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isLoading ? t('common:loading') : t('auth:signupPage.verifyEmail')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  switch (currentStep) {
    case 1:
      return renderRoleSelection();
    case 2:
      return renderBasicInfoForm();
    case 3:
      return renderEmailVerification();
    default:
      return renderRoleSelection();
  }
}