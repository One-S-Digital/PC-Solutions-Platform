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
  const { signUp, isLoaded, setActive } = useSignUp();
  
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
        // User created successfully, activate session and redirect to admin dashboard
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
    <div className="min-h-screen admin-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Swiss Modern Admin Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Swiss accent stripe - Admin version */}
          <div className="mx-auto h-1 w-16 bg-admin-mint rounded-full mb-6"></div>
          
          {/* Admin Logo */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-card bg-admin-light border border-admin-mint/20 mb-6">
            <span className="text-2xl">🛡️</span>
          </div>
          
          <h1 className="text-3xl font-bold text-admin-charcoal font-swiss">
            Admin Portal Access
          </h1>
          <p className="mt-3 text-admin-gray font-medium">
            Choose your administrative role
          </p>
        </div>
      </div>

      {/* Swiss Modern Admin Role Selection */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {ADMIN_ROLE_OPTIONS.map((role) => (
            <button
              key={role.value}
              onClick={() => handleRoleSelection(role.value)}
              className="card-swiss p-8 text-center hover:shadow-interactive hover:scale-[1.02] transition-all duration-200 group border-l-4 border-admin-mint"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-admin-mint-light rounded-card flex items-center justify-center mb-6 group-hover:bg-admin-mint group-hover:text-white transition-all duration-200">
                  <span className="text-3xl">{role.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-admin-charcoal mb-3">
                  {t(role.labelKey)}
                </h3>
                <p className="text-admin-gray mb-4">
                  {t(role.descriptionKey)}
                </p>
                <div className="flex items-center text-admin-teal font-medium text-sm group-hover:text-admin-mint transition-colors">
                  Select Role
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBasicInfoForm = () => (
    <div className="min-h-screen admin-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Swiss Modern Admin Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Swiss accent stripe - Admin version */}
          <div className="mx-auto h-1 w-16 bg-admin-mint rounded-full mb-6"></div>
          
          {/* Admin Logo */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-card bg-admin-light border border-admin-mint/20 mb-6">
            <span className="text-2xl">🛡️</span>
          </div>
          
          <h1 className="text-3xl font-bold text-admin-charcoal font-swiss">
            Create Admin Account
          </h1>
          <p className="mt-3 text-admin-gray font-medium">
            Role: {t(ADMIN_ROLE_OPTIONS.find(r => r.value === formData.role)?.labelKey || '')}
          </p>
        </div>
      </div>

      {/* Swiss Modern Admin Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-swiss py-8 px-6 sm:px-10 relative border-l-4 border-admin-mint">
          {/* Swiss corner notch - Admin version */}
          <div className="absolute top-0 right-0 w-3 h-3 bg-admin-mint rounded-bl-md"></div>
          
          <form className="space-y-6" onSubmit={handleBasicInfoSubmit}>
            {error && (
              <div className="rounded-card bg-red-50 border border-red-200 p-4">
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-admin-charcoal mb-2">
                  {t('auth:signupPage.firstName')}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  className="input-field"
                  placeholder="First name"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-admin-charcoal mb-2">
                  {t('auth:signupPage.lastName')}
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  className="input-field"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-admin-charcoal mb-2">
                {t('auth:signupPage.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="input-field"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-admin-charcoal mb-2">
                {t('auth:signupPage.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className="input-field"
                placeholder="Create a secure password"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-semibold text-admin-charcoal mb-2">
                {t('auth:signupPage.phoneNumber')}
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber || ''}
                onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                className="input-field"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-semibold text-admin-charcoal mb-2">
                Department
              </label>
              <select
                id="department"
                name="department"
                value={formData.department || ''}
                onChange={(e) => updateFormData('department', e.target.value)}
                className="input-field"
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
                <label className="block text-sm font-semibold text-admin-charcoal mb-3">
                  System Permissions
                </label>
                <div className="space-y-3">
                  {[
                    'user_management',
                    'system_settings',
                    'subscription_management',
                    'log_access',
                    'monitoring_access',
                    'data_export',
                  ].map((permission) => (
                    <label key={permission} className="flex items-center p-3 rounded-card bg-admin-light border border-gray-200 hover:border-admin-mint transition-colors">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-admin-mint shadow-sm focus:border-admin-mint focus:ring-admin-mint"
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
                      <span className="ml-3 text-sm text-admin-charcoal capitalize font-medium">
                        {permission.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn-outline px-6 py-2"
              >
                {t('common:back')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary px-6 py-2"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('common:loading')}
                  </div>
                ) : (
                  'Create Admin Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const renderEmailVerification = () => (
    <div className="min-h-screen admin-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Swiss Modern Admin Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Swiss accent stripe - Admin version */}
          <div className="mx-auto h-1 w-16 bg-admin-mint rounded-full mb-6"></div>
          
          {/* Admin Logo */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-card bg-admin-light border border-admin-mint/20 mb-6">
            <span className="text-2xl">🛡️</span>
          </div>
          
          <h1 className="text-3xl font-bold text-admin-charcoal font-swiss">
            {t('auth:signupPage.verifyEmail')}
          </h1>
          <p className="mt-3 text-admin-gray font-medium">
            {t('auth:signupPage.verifyEmailDescription')}
          </p>
        </div>
      </div>

      {/* Swiss Modern Admin Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-swiss py-8 px-6 sm:px-10 relative border-l-4 border-admin-mint">
          {/* Swiss corner notch - Admin version */}
          <div className="absolute top-0 right-0 w-3 h-3 bg-admin-mint rounded-bl-md"></div>
          
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const code = formData.get('code') as string;
            handleEmailVerification(code);
          }}>
            {error && (
              <div className="rounded-card bg-red-50 border border-red-200 p-4">
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-admin-charcoal mb-2">
                {t('auth:signupPage.verificationCode')}
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                className="input-field text-center text-lg tracking-widest"
                placeholder="Enter verification code"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('common:loading')}
                </div>
              ) : (
                'Verify & Access Admin Portal'
              )}
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