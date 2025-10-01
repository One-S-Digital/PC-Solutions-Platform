import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/hooks/useAuth';
import { APP_NAME } from '../constants';
import { SquaresPlusIcon } from '@heroicons/react/24/outline';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { SignupRole } from '../types';

const SignupPage: React.FC = () => {
  const { t } = useTranslation();
  const { signup, isLoading, error } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'FOUNDATION' as SignupRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return;
    }
    
    const result = await signup(formData, formData.role);
    if (result.success) {
      navigate(result.redirectTo || '/dashboard');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md p-8 shadow-xl bg-white rounded-lg">
        <div className="text-center mb-8">
          <SquaresPlusIcon className="h-12 w-12 text-swiss-mint mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-swiss-charcoal">
            {t('signupPage.title', { appName: APP_NAME })}
          </h1>
          <p className="text-sm text-gray-500">{t('signupPage.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              {t('signupPage.role')}
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-swiss-mint focus:border-swiss-mint"
            >
              <option value="FOUNDATION">{t('signupPage.roles.foundation')}</option>
              <option value="PRODUCT_SUPPLIER">{t('signupPage.roles.productSupplier')}</option>
              <option value="SERVICE_PROVIDER">{t('signupPage.roles.serviceProvider')}</option>
              <option value="EDUCATOR">{t('signupPage.roles.educator')}</option>
              <option value="PARENT">{t('signupPage.roles.parent')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                {t('signupPage.firstName')}
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-swiss-mint focus:border-swiss-mint"
                placeholder={t('signupPage.firstNamePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                {t('signupPage.lastName')}
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-swiss-mint focus:border-swiss-mint"
                placeholder={t('signupPage.lastNamePlaceholder')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {t('signupPage.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-swiss-mint focus:border-swiss-mint"
              placeholder={t('signupPage.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t('signupPage.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-swiss-mint focus:border-swiss-mint"
              placeholder={t('signupPage.passwordPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              {t('signupPage.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-swiss-mint focus:border-swiss-mint"
              placeholder={t('signupPage.confirmPasswordPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-swiss-mint hover:bg-swiss-mint-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint disabled:opacity-50"
          >
            {isLoading ? t('common.loading') : t('signupPage.createAccount')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            {t('signupPage.alreadyHaveAccount')}{' '}
            <a href="/login" className="font-medium text-swiss-mint hover:text-swiss-blue">
              {t('signupPage.login')}
            </a>
          </p>
        </div>
        
        <div className="mt-6 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
};

export default SignupPage;