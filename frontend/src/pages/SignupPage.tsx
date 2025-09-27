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

// Define types locally for now
enum SignupRole {
  FOUNDATION = 'FOUNDATION',
  SUPPLIER = 'SUPPLIER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  PARENT = 'PARENT',
}

interface SignupFormData {
  organisationName: string;
  contactPerson: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  canton: string;
  languagesSpoken: string[];
  capacity?: number;
  category: string;
  serviceType: string;
  childAge?: number;
  childStartDate: string;
  termsAccepted: boolean;
}

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
      newErrors.organisationName = 'Organization name is required';
    if (!formData.contactPerson)
      newErrors.contactPerson = 'Contact person is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = 'Invalid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    if (selectedRole !== SignupRole.PARENT && !formData.phone)
      newErrors.phone = 'Phone number is required';
    if (selectedRole !== SignupRole.PARENT && !formData.canton)
      newErrors.canton = 'Canton is required';

    if (
      selectedRole === SignupRole.FOUNDATION &&
      (formData.capacity === undefined || formData.capacity <= 0)
    )
      newErrors.capacity = 'Capacity is required';
    if (selectedRole === SignupRole.SUPPLIER && !formData.category)
      newErrors.category = 'Category is required';
    if (selectedRole === SignupRole.SERVICE_PROVIDER && !formData.serviceType)
      newErrors.serviceType = 'Service type is required';

    if (selectedRole === SignupRole.PARENT) {
      if (formData.childAge === undefined || formData.childAge <= 0)
        newErrors.childAge = 'Child age is required';
      if (!formData.childStartDate)
        newErrors.childStartDate = 'Child start date is required';
    }

    if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms';

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
        publicMetadata: {
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
        alert('Account created successfully!');
        navigate('/dashboard');
      } else if (result.status === 'missing_requirements') {
        // Handle email verification
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        const code = window.prompt('Enter the verification code sent to your email:');
        if (!code) {
          alert('Verification code is required to complete signup.');
          return;
        }
        const verificationResult = await signUp.attemptEmailAddressVerification({
          strategy: 'email_code',
          code,
        });

        if (verificationResult.status === 'complete' && verificationResult.createdUserId) {
          await setActive({ session: verificationResult.createdSessionId });
          alert('Account created successfully!');
          navigate('/dashboard');
        } else {
          throw new Error('Email verification failed.');
        }
      }
    } catch (err: any) {
      console.error('Signup failed', err);
      alert('Signup failed. Please try again.');
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
          <option value="">Select...</option>
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
    currentStep === 1 ? 'Step 1: Choose your role' : 'Step 2: Complete your profile';
  const formTitle =
    currentStep === 1
      ? 'Join PC Solutions Platform'
      : `Create your ${selectedRole ? rolesConfig.find(rc => rc.role === selectedRole)!.nameKey : ''} account`;

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4">
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
                'Organization Name',
                'text',
                true,
                'Enter organization name'
              )}
            {renderField(
              'contactPerson',
              selectedRole === SignupRole.PARENT ? 'Your Name' : 'Contact Person',
              'text',
              true,
              'Enter full name'
            )}
            {renderField(
              'email',
              'Email Address',
              'email',
              true,
              'Enter email address'
            )}
            {renderField(
              'password',
              'Password',
              'password',
              true,
              'Enter password'
            )}
            {renderField(
              'confirmPassword',
              'Confirm Password',
              'password',
              true,
              'Confirm password'
            )}

            {selectedRole !== SignupRole.PARENT &&
              renderField(
                'phone',
                'Phone Number',
                'tel',
                true,
                'Enter phone number'
              )}
            {selectedRole !== SignupRole.PARENT &&
              renderField('canton', 'Canton', 'select', true, undefined, [
                ...SWISS_CANTONS,
              ])}

            {(selectedRole === SignupRole.FOUNDATION || selectedRole === SignupRole.SUPPLIER) &&
              renderField(
                'languagesSpoken',
                'Languages Spoken',
                'text',
                false,
                'Enter languages (e.g., French, English)'
              )}
            {selectedRole === SignupRole.FOUNDATION &&
              renderField('capacity', 'Capacity', 'number', true)}
            {selectedRole === SignupRole.SUPPLIER &&
              renderField(
                'category',
                'Product Category',
                'text',
                true,
                'Enter product category'
              )}
            {selectedRole === SignupRole.SERVICE_PROVIDER &&
              renderField(
                'serviceType',
                'Service Type',
                'text',
                true,
                'Enter service type'
              )}

            {selectedRole === SignupRole.PARENT && (
              <>
                {renderField('childAge', 'Child Age', 'number', true)}
                {renderField('childStartDate', 'Desired Start Date', 'date', true)}
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
                  I accept the{' '}
                  <a
                    href="#/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-swiss-mint hover:underline"
                  >
                    Terms of Service
                  </a>
                  .
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
                Go Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto bg-swiss-mint hover:bg-opacity-90"
              >
                Create Account
              </Button>
            </div>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-swiss-mint hover:underline">
            Sign In
          </Link>
        </p>
        
        {/* Language Switcher */}
        <div className="mt-8 flex justify-center">
          <LanguageSwitcher />
        </div>
      </Card>
    </div>
  );
};

export default SignupPage;