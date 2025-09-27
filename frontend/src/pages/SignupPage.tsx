import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSignUp, useClerk } from '@clerk/clerk-react';
import { APP_NAME, STANDARD_INPUT_FIELD, SWISS_CANTONS } from '../constants';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import {
  BuildingOffice2Icon,
  UserIcon,
  CogIcon,
  UsersIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

import { SignupRole, SignupFormData, SwissCanton, SupportedLanguage } from '../types';

const SignupPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { signUp, isLoaded } = useSignUp();
  const { setActive } = useClerk();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<SignupRole | null>(null);
  const [formData, setFormData] = useState<SignupFormData>({
    organisationName: '',
    contactPerson: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    canton: '',
    languagesSpoken: [],
    capacity: undefined,
    category: '',
    serviceType: '',
    childAge: undefined,
    childStartDate: '',
    termsAccepted: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [languagesSpokenInput, setLanguagesSpokenInput] = useState('');

  const rolesConfig: { role: SignupRole; nameKey: string; icon: React.ElementType }[] = [
    {
      role: SignupRole.FOUNDATION,
      nameKey: 'Foundation (Daycare)',
      icon: BuildingOffice2Icon,
    },
    { role: SignupRole.SUPPLIER, nameKey: 'Product Supplier', icon: UserIcon },
    {
      role: SignupRole.SERVICE_PROVIDER,
      nameKey: 'Service Provider',
      icon: CogIcon,
    },
    { role: SignupRole.PARENT, nameKey: 'Parent', icon: UsersIcon },
  ];

  const parseLanguages = (input: string): string[] =>
    input
      .split(/[\s,]+/)
      .map(v => v.trim())
      .filter(v => v);

  const handleRoleSelect = (role: SignupRole) => {
    setSelectedRole(role);
    setFormData({
      organisationName: '',
      contactPerson: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      canton: '',
      languagesSpoken: [],
      capacity: undefined,
      category: '',
      serviceType: '',
      childAge: undefined,
      childStartDate: '',
      termsAccepted: false,
    });
    setErrors({});
    setLanguagesSpokenInput('');
    setCurrentStep(2);
  };

  const handleBackToRoleSelection = () => {
    setCurrentStep(1);
    setSelectedRole(null);
    setErrors({});
    setLanguagesSpokenInput('');
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => {
      let processedValue: string | number | boolean | undefined = value;
      if (name === 'capacity' || name === 'childAge') {
        processedValue = value === '' ? undefined : parseInt(value, 10);
        if (isNaN(processedValue as number)) processedValue = undefined;
      } else if (type === 'checkbox') {
        processedValue = checked;
      }
      return {
        ...prev,
        [name]: processedValue,
      };
    });

    if (errors[name as keyof SignupFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<Record<keyof SignupFormData, string>> = {};
    const parsedLanguages = parseLanguages(languagesSpokenInput);
    setFormData(prev => ({ ...prev, languagesSpoken: parsedLanguages }));
    if (!selectedRole) return false;

    if (selectedRole !== SignupRole.PARENT && !formData.organisationName)
      newErrors.organisationName = t('auth:signupPage.organizationNameRequired');
    if (!formData.contactPerson)
      newErrors.contactPerson = t('auth:signupPage.contactPersonRequired');
    if (!formData.email) newErrors.email = t('auth:signupPage.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = t('auth:signupPage.emailInvalid');
    if (!formData.password) newErrors.password = t('auth:signupPage.passwordRequired');
    else if (formData.password.length < 6)
      newErrors.password = t('auth:signupPage.passwordTooShort');
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = t('auth:signupPage.passwordsDoNotMatch');

    if (selectedRole !== SignupRole.PARENT && !formData.phone)
      newErrors.phone = t('auth:signupPage.phoneRequired');
    if (selectedRole !== SignupRole.PARENT && !formData.canton)
      newErrors.canton = t('auth:signupPage.cantonRequired');

    if (
      selectedRole === SignupRole.FOUNDATION &&
      (formData.capacity === undefined || formData.capacity <= 0)
    )
      newErrors.capacity = t('auth:signupPage.capacityRequired');
    if (selectedRole === SignupRole.SUPPLIER && !formData.category)
      newErrors.category = t('auth:signupPage.categoryRequired');
    if (selectedRole === SignupRole.SERVICE_PROVIDER && !formData.serviceType)
      newErrors.serviceType = t('auth:signupPage.serviceTypeRequired');

    if (selectedRole === SignupRole.PARENT) {
      if (formData.childAge === undefined || formData.childAge <= 0)
        newErrors.childAge = t('auth:signupPage.childAgeRequired');
      if (!formData.childStartDate)
        newErrors.childStartDate = t('auth:signupPage.childStartDateRequired');
    }

    if (!formData.termsAccepted) newErrors.termsAccepted = t('auth:signupPage.termsRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateStep2() || !selectedRole || !isLoaded || !signUp) return;

    const parsedLanguages = parseLanguages(languagesSpokenInput);
    const updatedFormData = { ...formData, languagesSpoken: parsedLanguages };
    setFormData(updatedFormData);

    // Map frontend role to backend role
    const getBackendRole = (frontendRole: SignupRole): string => {
      switch (frontendRole) {
        case SignupRole.FOUNDATION:
          return 'FOUNDATION';
        case SignupRole.SUPPLIER:
          return 'PRODUCT_SUPPLIER';
        case SignupRole.SERVICE_PROVIDER:
          return 'SERVICE_PROVIDER';
        case SignupRole.PARENT:
          return 'PARENT';
        default:
          return 'PARENT';
      }
    };

    try {
      // Create user with Clerk
      const result = await signUp.create({
        emailAddress: updatedFormData.email,
        password: updatedFormData.password,
        unsafeMetadata: {
          firstName: updatedFormData.contactPerson.split(' ')[0] || updatedFormData.contactPerson,
          lastName: updatedFormData.contactPerson.split(' ').slice(1).join(' ') || '',
          role: getBackendRole(selectedRole),
          organisationName: updatedFormData.organisationName,
          phone: updatedFormData.phone,
          canton: updatedFormData.canton,
          languagesSpoken: updatedFormData.languagesSpoken,
          capacity: updatedFormData.capacity,
          category: updatedFormData.category,
          serviceType: updatedFormData.serviceType,
          childAge: updatedFormData.childAge,
          childStartDate: updatedFormData.childStartDate,
        },
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        alert(t('auth:signupPage.accountCreatedSuccessfully'));
        navigate('/dashboard');
      } else if (result.status === 'missing_requirements') {
        // Handle email verification
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        const code = window.prompt('Enter the verification code sent to your email:');
        if (!code) {
          alert(t('auth:signupPage.verificationCodeRequired'));
          return;
        }
        const verificationResult = await signUp.attemptEmailAddressVerification({
          code,
        });

        if (verificationResult.status === 'complete' && verificationResult.createdUserId) {
          await setActive({ session: verificationResult.createdSessionId });
          alert(t('auth:signupPage.accountCreatedSuccessfully'));
          navigate('/dashboard');
        } else {
          throw new Error('Email verification failed.');
        }
      }
    } catch (err: any) {
      console.error('Signup failed', err);
      alert(t('auth:signupPage.signupFailed'));
      return;
    }
  };

  const renderField = (
    name: keyof SignupFormData,
    label: string,
    type: string = 'text',
    required: boolean = true,
    placeholder?: string,
    options?: string[]
  ) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-swiss-coral">*</span>}
      </label>
      {type === 'select' && options ? (
        <select
          id={name}
          name={name}
          value={
            name === 'languagesSpoken'
              ? languagesSpokenInput
              : (formData[name as keyof SignupFormData] as string) || ''
          }
          onChange={
            name === 'languagesSpoken'
              ? e => {
                  setLanguagesSpokenInput(e.target.value);
                  if (errors.languagesSpoken)
                    setErrors(prev => ({ ...prev, languagesSpoken: undefined }));
                }
              : handleChange
          }
          className={`${STANDARD_INPUT_FIELD} ${errors[name as keyof SignupFormData] ? 'border-swiss-coral' : ''}`}
        >
          <option value="">{t('auth:signupPage.selectOption')}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          <input
            type={
              name === 'password' && showPassword
                ? 'text'
                : name === 'confirmPassword' && showConfirmPassword
                  ? 'text'
                  : name === 'password' || name === 'confirmPassword'
                    ? 'password'
                    : type
            }
            id={name}
            name={name}
            value={
              name === 'languagesSpoken'
                ? languagesSpokenInput
                : String(formData[name as keyof SignupFormData] ?? '')
            }
            onChange={
              name === 'languagesSpoken'
                ? e => {
                    setLanguagesSpokenInput(e.target.value);
                    if (errors.languagesSpoken)
                      setErrors(prev => ({ ...prev, languagesSpoken: undefined }));
                  }
                : handleChange
            }
            className={`${STANDARD_INPUT_FIELD} ${errors[name as keyof SignupFormData] ? 'border-swiss-coral' : ''}`}
            placeholder={placeholder}
          />
          {(name === 'password' || name === 'confirmPassword') && (
            <button
              type="button"
              onClick={() =>
                name === 'password'
                  ? setShowPassword(!showPassword)
                  : setShowConfirmPassword(!showConfirmPassword)
              }
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
            >
              {(name === 'password' && showPassword) ||
              (name === 'confirmPassword' && showConfirmPassword) ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      )}
      {errors[name as keyof SignupFormData] && (
        <p className="text-xs text-swiss-coral mt-1">{errors[name as keyof SignupFormData]}</p>
      )}
    </div>
  );

  const progressText =
    currentStep === 1 ? t('auth:signupPage.step1Title') : t('auth:signupPage.step2Title');
  const formTitle =
    currentStep === 1
      ? t('auth:signupPage.title', { appName: APP_NAME })
      : t('auth:signupPage.createAccountTitle', { role: selectedRole ? rolesConfig.find(rc => rc.role === selectedRole)!.nameKey : '' });

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <Card className="w-full max-w-2xl p-8 shadow-xl">
        <div className="text-center mb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-swiss-mint rounded-lg p-2 w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-swiss-charcoal">{formTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">{progressText}</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-swiss-mint h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: currentStep === 1 ? '50%' : '100%' }}
          ></div>
        </div>

        {currentStep === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rolesConfig.map(({ role, nameKey, icon: Icon }) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                aria-pressed={selectedRole === role}
                className={`p-6 border-2 rounded-lg text-center transition-all duration-200 ease-in-out
                            hover:shadow-lg hover:border-swiss-mint hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint
                            ${selectedRole === role ? 'border-swiss-mint bg-swiss-mint/5 shadow-md' : 'border-gray-300 bg-white'}`}
              >
                <Icon
                  className={`w-10 h-10 mx-auto mb-2 ${selectedRole === role ? 'text-swiss-mint' : 'text-gray-400'}`}
                />
                <span
                  className={`block font-semibold ${selectedRole === role ? 'text-swiss-mint' : 'text-swiss-charcoal'}`}
                >
                  {nameKey}
                </span>
              </button>
            ))}
          </div>
        )}

        {currentStep === 2 && selectedRole && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedRole !== SignupRole.PARENT &&
              renderField(
                'organisationName',
                t('auth:signupPage.organizationName'),
                'text',
                true,
                t('auth:signupPage.organizationNamePlaceholder')
              )}
            {renderField(
              'contactPerson',
              selectedRole === SignupRole.PARENT ? t('auth:signupPage.yourName') : t('auth:signupPage.contactPerson'),
              'text',
              true,
              t('auth:signupPage.contactPersonPlaceholder')
            )}
            {renderField(
              'email',
              t('auth:signupPage.emailAddress'),
              'email',
              true,
              t('auth:signupPage.emailAddressPlaceholder')
            )}
            {renderField(
              'password',
              t('auth:signupPage.password'),
              'password',
              true,
              t('auth:signupPage.passwordPlaceholder')
            )}
            {renderField(
              'confirmPassword',
              t('auth:signupPage.confirmPassword'),
              'password',
              true,
              t('auth:signupPage.confirmPasswordPlaceholder')
            )}

            {selectedRole !== SignupRole.PARENT &&
              renderField(
                'phone',
                t('auth:signupPage.phoneNumber'),
                'tel',
                true,
                t('auth:signupPage.phoneNumberPlaceholder')
              )}
            {selectedRole !== SignupRole.PARENT &&
              renderField('canton', t('auth:signupPage.canton'), 'select', true, undefined, [
                ...SWISS_CANTONS,
              ])}

            {(selectedRole === SignupRole.FOUNDATION || selectedRole === SignupRole.SUPPLIER) &&
              renderField(
                'languagesSpoken',
                t('auth:signupPage.languagesSpoken'),
                'text',
                false,
                t('auth:signupPage.languagesSpokenPlaceholder')
              )}
            {selectedRole === SignupRole.FOUNDATION &&
              renderField('capacity', t('auth:signupPage.capacity'), 'number', true)}
            {selectedRole === SignupRole.SUPPLIER &&
              renderField(
                'category',
                t('auth:signupPage.category'),
                'text',
                true,
                t('auth:signupPage.selectCategory')
              )}
            {selectedRole === SignupRole.SERVICE_PROVIDER &&
              renderField(
                'serviceType',
                t('auth:signupPage.serviceType'),
                'text',
                true,
                t('auth:signupPage.serviceTypePlaceholder')
              )}

            {selectedRole === SignupRole.PARENT && (
              <>
                {renderField('childAge', t('auth:signupPage.childAge'), 'number', true)}
                {renderField('childStartDate', t('auth:signupPage.childStartDate'), 'date', true)}
              </>
            )}

            <div className="pt-2">
              <label htmlFor="termsAccepted" className="flex items-center">
                <input
                  type="checkbox"
                  id="termsAccepted"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  className={`h-4 w-4 text-swiss-mint border-gray-300 rounded focus:ring-swiss-mint ${errors.termsAccepted ? 'border-swiss-coral' : ''}`}
                />
                <span className="ml-2 text-sm text-gray-600">
                  {t('auth:signupPage.termsAccepted')}
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="text-xs text-swiss-coral mt-1">{errors.termsAccepted}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4">
              <Button
                type="button"
                variant="light"
                onClick={handleBackToRoleSelection}
                leftIcon={ArrowLeftIcon}
                className="w-full sm:w-auto"
              >
                {t('auth:signupPage.back')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto bg-swiss-mint hover:bg-opacity-90"
              >
                {t('auth:signupPage.createAccount')}
              </Button>
            </div>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-gray-600">
          {t('auth:loginPage.noAccount')}{' '}
          <Link to="/login" className="font-medium text-swiss-mint hover:underline">
            {t('auth:loginPage.signIn')}
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default SignupPage;