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

interface AdminSignupFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
  // Admin-specific fields
  department?: string;
  permissions?: string[];
  accessLevel?: string;
}

const ADMIN_ROLE_OPTIONS = [
  {
    value: UserRole.SUPER_ADMIN,
    labelKey: 'auth:signupPage.superAdmin.label',
    descriptionKey: 'auth:signupPage.superAdmin.description',
    icon: '👑',
  },
  {
    value: UserRole.ADMIN,
    labelKey: 'auth:signupPage.admin.label',
    descriptionKey: 'auth:signupPage.admin.description',
    icon: '🛡️',
  },
];

export default function AdminCustomSignupForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, isLoaded } = useSignUp();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AdminSignupFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: UserRole.ADMIN,
  });

  const updateFormData = (field: keyof AdminSignupFormData, value: any) => {
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
          department: formData.department,
          permissions: formData.permissions,
          accessLevel: formData.accessLevel,
        },
      });

      if (result.status === 'complete') {
        // User created successfully, redirect to admin dashboard
        navigate('/admin/dashboard');
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
        navigate('/admin/dashboard');
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
          Admin Portal Access
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose your administrative role
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ADMIN_ROLE_OPTIONS.map((role) => (
            <button
              key={role.value}
              onClick={() => handleRoleSelection(role.value)}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-8 text-left shadow-sm hover:border-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              <div className="flex flex-col items-center text-center">
                <span className="text-4xl mb-4">{role.icon}</span>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {t(role.labelKey)}
                </h3>
                <p className="text-sm text-gray-600">
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
          Create Admin Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Role: {t(ADMIN_ROLE_OPTIONS.find(r => r.value === formData.role)?.labelKey || '')}
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
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
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
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
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
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
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
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                id="department"
                name="department"
                value={formData.department || ''}
                onChange={(e) => updateFormData('department', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select Department</option>
                <option value="operations">Operations</option>
                <option value="support">Customer Support</option>
                <option value="technical">Technical</option>
                <option value="finance">Finance</option>
                <option value="marketing">Marketing</option>
                <option value="hr">Human Resources</option>
              </select>
            </div>

            {formData.role === UserRole.SUPER_ADMIN && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  System Permissions
                </label>
                <div className="space-y-2">
                  {[
                    'user_management',
                    'system_settings',
                    'subscription_management',
                    'log_access',
                    'monitoring_access',
                    'data_export',
                  ].map((permission) => (
                    <label key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-500 focus:ring-red-500"
                        checked={formData.permissions?.includes(permission) || false}
                        onChange={(e) => {
                          const permissions = formData.permissions || [];
                          if (e.target.checked) {
                            updateFormData('permissions', [...permissions, permission]);
                          } else {
                            updateFormData('permissions', permissions.filter(p => p !== permission));
                          }
                        }}
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {permission.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoading ? t('common:loading') : 'Create Admin Account'}
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
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isLoading ? t('common:loading') : 'Verify & Access Admin Portal'}
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
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