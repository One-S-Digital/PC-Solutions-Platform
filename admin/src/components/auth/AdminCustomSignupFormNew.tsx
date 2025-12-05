import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSignUp, useAuth, useUser } from '@clerk/clerk-react';
import { SquaresPlusIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Button from '../design-system/Button';
import Card from '../design-system/Card';
import { STANDARD_INPUT_FIELD } from '../../constants/design-system';
import { useSettings } from '../../hooks/useSettings';
import { getAdminLogo } from '../../utils/settings';

interface AdminSignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
  termsAccepted: boolean;
}

export default function AdminCustomSignupForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, isLoaded, setActive } = useSignUp();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const { settings } = useSettings();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [hasStartedSignup, setHasStartedSignup] = useState(false);
  const [formData, setFormData] = useState<AdminSignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    termsAccepted: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AdminSignupFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationStep, setShowVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');

  // Redirect if user is already logged in
  useEffect(() => {
    if (authLoaded && isSignedIn && user && !hasStartedSignup) {
      navigate('/dashboard');
    }
  }, [authLoaded, isSignedIn, user, navigate, hasStartedSignup]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
  
    setFormData(prev => {
      let processedValue: string | boolean = value;
      if (type === 'checkbox') {
        processedValue = checked;
      }
      return { ...prev, [name]: processedValue };
    });
  
    if (errors[name as keyof AdminSignupFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof AdminSignupFormData, string>> = {};

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.organizationName) newErrors.organizationName = 'Organization name is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<Record<keyof AdminSignupFormData, string>> = {};

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      setHasStartedSignup(true);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep2() || !isLoaded || !signUp) return;
    
    setIsLoading(true);
    setHasStartedSignup(true);
    
    try {
      const result = await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      if (result.status === 'complete') {
        try {
          await setActive({ session: result.createdSessionId });
          setCurrentStep(3);
        } catch (setActiveError: any) {
          console.error('Session activation failed:', setActiveError);
          setErrors({ email: 'Failed to activate session. Please try logging in.' });
        }
      } else if (result.status === 'missing_requirements') {
        // Email verification required
        try {
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setShowVerificationStep(true);
          setIsLoading(false);
          return;
        } catch (verifyError: any) {
          console.error('Failed to prepare email verification:', verifyError);
          setErrors({ email: 'Failed to send verification email. Please try again.' });
        }
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      let errorMessage = 'An error occurred during signup';
      
      if (err.errors && err.errors.length > 0) {
        const error = err.errors[0];
        switch (error.code) {
          case 'form_identifier_exists':
            errorMessage = 'An account with this email already exists';
            break;
          case 'form_password_pwned':
            errorMessage = 'This password has been found in a data breach. Please choose a different password';
            break;
          case 'form_password_not_strong_enough':
            errorMessage = 'Password is not strong enough';
            break;
          case 'form_identifier_invalid':
            errorMessage = 'Please enter a valid email address';
            break;
          default:
            errorMessage = error.message || 'Invalid email or password';
        }
      }
      
      setErrors({ email: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: FormEvent) => {
    e.preventDefault();
    if (!signUp || !verificationCode) return;
    
    setIsLoading(true);
    setVerificationError('');
    
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      
      if (result.status === 'complete') {
        try {
          await setActive({ session: result.createdSessionId });
          setCurrentStep(3);
        } catch (setActiveError: any) {
          console.error('Session activation failed:', setActiveError);
          setVerificationError('Failed to activate session. Please try logging in.');
        }
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      const errorMessage = err.errors?.[0]?.message || 'Invalid verification code';
      setVerificationError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (name: keyof AdminSignupFormData, label: string, type: string = 'text', required: boolean = true, placeholder?: string) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required ? <span className="text-swiss-coral">*</span> : ''}
      </label>
      {type === 'checkbox' ? (
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id={name} 
            name={name} 
            checked={formData[name] as boolean} 
            onChange={handleChange} 
            className={`h-4 w-4 text-swiss-mint border-gray-300 rounded focus:ring-swiss-mint ${errors[name] ? 'border-swiss-coral' : ''}`} 
          />
          <span className="ml-2 text-sm text-gray-600">
            I accept the{' '}
            <a href="#/terms" target="_blank" rel="noopener noreferrer" className="text-swiss-mint hover:underline">
              Terms and Conditions
            </a>
          </span>
        </div>
      ) : (
        <div className="relative">
          <input 
            type={(name === 'password' && !showPassword) || (name === 'confirmPassword' && !showConfirmPassword) ? 'password' : type}
            id={name} 
            name={name} 
            value={String(formData[name] ?? '')}
            onChange={handleChange}
            className={`${STANDARD_INPUT_FIELD} ${errors[name] ? 'border-swiss-coral' : ''}`}
            placeholder={placeholder || ''} 
          />
          {(name === 'password' || name === 'confirmPassword') && (
            <button 
              type="button" 
              onClick={() => name === 'password' ? setShowPassword(!showPassword) : setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
              aria-label={(name === 'password' && showPassword) || (name === 'confirmPassword' && showConfirmPassword) ? 'Hide password' : 'Show password'}
            >
              {(name === 'password' && showPassword) || (name === 'confirmPassword' && showConfirmPassword) ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
            </button>
          )}
        </div>
      )}
      {errors[name] && <p className="text-xs text-swiss-coral mt-1">{errors[name]}</p>}
    </div>
  );

  const progressText = currentStep === 1 ? 'Step 1 of 2: Basic Information' : 'Step 2 of 2: Account Details';
  const formTitle = currentStep === 1 ? 'Create Admin Account' : 'Set Up Your Account';

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-xl">
        {currentStep === 3 ? (
            <div className="text-center">
                <CheckCircleIcon className="w-16 h-16 text-swiss-mint mx-auto mb-4"/>
                <h1 className="text-2xl font-bold text-swiss-charcoal">Account Created Successfully!</h1>
                <p className="text-gray-600 mt-2 mb-6">Your admin account has been created. You can now access the admin dashboard.</p>
                <Button onClick={() => navigate('/dashboard')} variant="primary" size="lg">
                    Go to Dashboard
                </Button>
            </div>
        ) : (
        <>
            <div className="text-center mb-2">
                {getAdminLogo(settings) ? (
                  <img 
                    src={getAdminLogo(settings)!} 
                    alt="Admin Logo" 
                    className="h-[92px] w-auto mx-auto mb-3"
                  />
                ) : (
                  <SquaresPlusIcon className="h-16 w-16 text-swiss-mint mx-auto mb-3" />
                )}
                <h1 className="text-2xl font-bold text-swiss-charcoal">{formTitle}</h1>
                <p className="text-sm text-gray-500 mt-1">{progressText}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div className="bg-swiss-mint h-2 rounded-full transition-all duration-300 ease-in-out" style={{ width: currentStep === 1 ? '50%' : '100%' }}></div>
            </div>

            {currentStep === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderField('firstName', 'First Name', 'text', true, 'Enter your first name')}
                  {renderField('lastName', 'Last Name', 'text', true, 'Enter your last name')}
                </div>
                {renderField('organizationName', 'Organization Name', 'text', true, 'Enter your organization name')}
                
                <div className="flex justify-end pt-4">
                    <Button type="submit" variant="primary" size="lg">
                        Next Step
                    </Button>
                </div>
              </form>
            )}

            {currentStep === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {renderField('email', 'Email Address', 'email', true, 'admin@yourorganization.com')}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderField('password', 'Password', 'password', true, 'Enter a strong password')}
                  {renderField('confirmPassword', 'Confirm Password', 'password', true, 'Confirm your password')}
                </div>
                {renderField('termsAccepted', '', 'checkbox', true)}
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4">
                    <Button type="button" variant="light" onClick={handleBack} leftIcon={ArrowLeftIcon} className="w-full sm:w-auto">
                        Go Back
                    </Button>
                    <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto bg-swiss-mint hover:bg-opacity-90" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                </div>

                {showVerificationStep && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-swiss-charcoal mb-2">
                      Verify Your Email
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      We've sent a verification code to {formData.email}. Please enter it below.
                    </p>
                    <form onSubmit={handleVerification} className="space-y-4">
                      <div>
                        <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                          Verification Code
                        </label>
                        <input
                          type="text"
                          id="verificationCode"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className={STANDARD_INPUT_FIELD}
                          placeholder="000000"
                          maxLength={6}
                          required
                        />
                        {verificationError && (
                          <p className="text-xs text-swiss-coral mt-1">{verificationError}</p>
                        )}
                      </div>
                      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Verifying...' : 'Verify Email'}
                      </Button>
                    </form>
                  </div>
                )}
              </form>
            )}
             <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-swiss-mint hover:underline">
                Sign In
              </Link>
            </p>
        </>
        )}
      </Card>
    </div>
  );
}