import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSignUp, useAuth } from '@clerk/clerk-react';
import { SignupRole, SignupFormData, SwissCanton, SupportedLanguage } from '../types';
import { APP_NAME, STANDARD_INPUT_FIELD, SWISS_CANTONS } from '../constants';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { BuildingOffice2Icon, UserIcon, CogIcon, UsersIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, SquaresPlusIcon } from '@heroicons/react/24/outline';

const SignupPage: React.FC = () => {
  const { t } = useTranslation(['signup', 'common']);
  const navigate = useNavigate();
  const { signUp, isLoaded, setActive } = useSignUp();
  const { isSignedIn } = useAuth();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
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
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationStep, setShowVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');

  // Redirect if user is already logged in
  useEffect(() => {
    if (isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isSignedIn, navigate]);

  const rolesConfig: { role: SignupRole; nameKey: string; icon: React.ElementType }[] = [
    { role: SignupRole.FOUNDATION, nameKey: 'role.foundation', icon: BuildingOffice2Icon },
    { role: SignupRole.SUPPLIER, nameKey: 'role.supplier', icon: UserIcon },
    { role: SignupRole.SERVICE_PROVIDER, nameKey: 'role.serviceProvider', icon: CogIcon },
    { role: SignupRole.PARENT, nameKey: 'role.parent', icon: UsersIcon },
  ];

  const handleRoleSelect = (role: SignupRole) => {
    setSelectedRole(role);
    setErrors({});
    setCurrentStep(2);
  };

  const handleBackToRoleSelection = () => {
    setCurrentStep(1);
    setSelectedRole(null);
    setErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
  
    setFormData(prev => {
      let processedValue: string | number | boolean | undefined | SupportedLanguage[] | SwissCanton = value;
      if (name === 'capacity' || name === 'childAge') {
        processedValue = value === '' ? undefined : parseInt(value, 10);
        if (isNaN(processedValue as number)) processedValue = undefined;
      } else if (type === 'checkbox') {
        processedValue = checked;
      }
      return { ...prev, [name]: processedValue };
    });
  
    if (errors[name as keyof SignupFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<Record<keyof SignupFormData, string>> = {};
    if (!selectedRole) return false;

    if (selectedRole !== SignupRole.PARENT && !formData.organisationName) 
      newErrors.organisationName = t('errors.organisationNameRequired');
    if (!formData.contactPerson) 
      newErrors.contactPerson = t(selectedRole === SignupRole.PARENT ? 'errors.parentNameRequired' : 'errors.contactPersonRequired');
    if (!formData.email) 
      newErrors.email = t('errors.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(formData.email)) 
      newErrors.email = t('errors.emailInvalid');
    if (!formData.password) 
      newErrors.password = t('errors.passwordRequired');
    else if (formData.password.length < 8) 
      newErrors.password = t('errors.passwordTooShort');
    if (formData.password !== formData.confirmPassword) 
      newErrors.confirmPassword = t('errors.passwordsNoMatch');
    
    if (selectedRole !== SignupRole.PARENT && !formData.phone) 
      newErrors.phone = t('errors.phoneRequired');
    if (selectedRole !== SignupRole.PARENT && !formData.canton) 
      newErrors.canton = t('errors.cantonRequired');

    if (selectedRole === SignupRole.FOUNDATION && (formData.capacity === undefined || formData.capacity <= 0)) 
      newErrors.capacity = t('errors.capacityRequired');
    if (selectedRole === SignupRole.SUPPLIER && !formData.category) 
      newErrors.category = t('errors.categoryRequired');
    if (selectedRole === SignupRole.SERVICE_PROVIDER && !formData.serviceType) 
      newErrors.serviceType = t('errors.serviceTypeRequired');
    
    if (selectedRole === SignupRole.PARENT) {
      if (formData.childAge === undefined || formData.childAge <= 0) 
        newErrors.childAge = t('errors.childAgeRequired');
      if (!formData.childStartDate) 
        newErrors.childStartDate = t('errors.childStartDateRequired');
    }

    if (!formData.termsAccepted) 
      newErrors.termsAccepted = t('errors.termsRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep2() || !selectedRole || !isLoaded || !signUp) return;
    
    setIsLoading(true);

    try {
      // Split contact person into first and last name
      const nameParts = formData.contactPerson.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const result = await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        firstName: firstName,
        lastName: lastName,
        unsafeMetadata: {
          // Store signup intent for backend webhook to process
          // Backend will assign actual role via publicMetadata (secure)
          signupType: selectedRole,
          pendingRole: selectedRole, // For backend webhook processing
          organisationName: formData.organisationName,
          phone: formData.phone,
          canton: formData.canton,
        },
      });

      if (result.status === 'complete') {
        try {
          await setActive({ session: result.createdSessionId });
          
          // Redirect based on role
          if ([SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole)) {
            navigate('/pricing', { state: { fromSignup: true, role: selectedRole } });
          } else {
            setCurrentStep(3);
          }
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
        const clerkError = err.errors[0];
        switch (clerkError.code) {
          case 'form_identifier_exists':
            errorMessage = t('errors.accountExists', 'An account with this email already exists');
            break;
          case 'form_password_pwned':
            errorMessage = t('errors.passwordPwned', 'This password has been found in a data breach. Please choose a different password');
            break;
          case 'form_password_not_strong_enough':
            errorMessage = t('errors.passwordWeak', 'Password is not strong enough');
            break;
          case 'form_identifier_invalid':
            errorMessage = t('errors.emailInvalid', 'Please enter a valid email address');
            break;
          default:
            errorMessage = clerkError.message || 'Invalid email or password';
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
          
          // Redirect based on role
          if (selectedRole && [SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole)) {
            navigate('/pricing', { state: { fromSignup: true, role: selectedRole } });
          } else {
            setCurrentStep(3);
          }
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
  
  const renderField = (name: keyof SignupFormData, labelKey: string, type: string = 'text', required: boolean = true, placeholderKey?: string, options?: readonly string[]) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {t(labelKey)}{required ? <span className="text-swiss-coral">*</span> : ''}
      </label>
      {type === 'select' && options ? (
        <select 
          id={name} 
          name={name} 
          value={formData[name as keyof SignupFormData] as string || ''} 
          onChange={handleChange} 
          className={`${STANDARD_INPUT_FIELD} ${errors[name as keyof SignupFormData] ? 'border-swiss-coral' : ''}`}
        >
          <option value="">{t('placeholders.select')}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <div className="relative">
          <input 
            type={(name === 'password' && !showPassword) || (name === 'confirmPassword' && !showConfirmPassword) ? 'password' : type}
            id={name} 
            name={name} 
            value={String(formData[name as keyof SignupFormData] ?? '')}
            onChange={handleChange}
            className={`${STANDARD_INPUT_FIELD} ${errors[name as keyof SignupFormData] ? 'border-swiss-coral' : ''}`}
            placeholder={placeholderKey ? t(placeholderKey) : ''} 
          />
          {(name === 'password' || name === 'confirmPassword') && (
            <button 
              type="button" 
              onClick={() => name === 'password' ? setShowPassword(!showPassword) : setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
              aria-label={(name === 'password' && showPassword) || (name === 'confirmPassword' && showConfirmPassword) ? t('common:hidePassword') : t('common:showPassword')}
            >
              {(name === 'password' && showPassword) || (name === 'confirmPassword' && showConfirmPassword) ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
            </button>
          )}
        </div>
      )}
      {errors[name as keyof SignupFormData] && <p className="text-xs text-swiss-coral mt-1">{errors[name as keyof SignupFormData]}</p>}
    </div>
  );

  const progressText = currentStep === 1 ? t('progress.step1') : t('progress.step2');
  const formTitle = currentStep === 1 ? t('selectRoleTitle') : t('detailsTitle', { role: selectedRole ? t(rolesConfig.find(rc => rc.role === selectedRole)!.nameKey) : '' });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swiss-mint"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-xl">
        {currentStep === 3 ? (
          <div className="text-center">
            <CheckCircleIcon className="w-16 h-16 text-swiss-mint mx-auto mb-4"/>
            <h1 className="text-2xl font-bold text-swiss-charcoal">{t('submissionSuccessTitle')}</h1>
            <p className="text-gray-600 mt-2 mb-6">{t('submissionSuccessMessage')}</p>
            <Button onClick={() => navigate('/dashboard')} variant="primary" size="lg">
              {t('goToDashboardButton')}
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-2">
              <SquaresPlusIcon className="w-12 h-12 text-swiss-mint mx-auto mb-2" />
              <h1 className="text-2xl font-bold text-swiss-charcoal">{formTitle}</h1>
              <p className="text-sm text-gray-500 mt-1">{progressText}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div className="bg-swiss-mint h-2 rounded-full transition-all duration-300 ease-in-out" style={{ width: currentStep === 1 ? '50%' : '100%' }}></div>
            </div>

            {currentStep === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rolesConfig.map(({ role, nameKey, icon: Icon }) => (
                  <button 
                    key={role} 
                    onClick={() => handleRoleSelect(role)} 
                    aria-pressed={selectedRole === role}
                    className="p-6 border-2 rounded-lg text-center transition-all duration-200 ease-in-out hover:shadow-lg hover:border-swiss-mint hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint border-gray-300 bg-white"
                  >
                    <Icon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <span className="block font-semibold text-swiss-charcoal">{t(nameKey)}</span>
                  </button>
                ))}
              </div>
            )}

            {currentStep === 2 && selectedRole && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {selectedRole !== SignupRole.PARENT && renderField('organisationName', 'labels.organisationName', 'text', true, 'placeholders.organisationName')}
                {renderField('contactPerson', selectedRole === SignupRole.PARENT ? 'labels.parentName' : 'labels.contactPerson', 'text', true, selectedRole === SignupRole.PARENT ? 'placeholders.parentName' : 'placeholders.contactPerson')}
                {renderField('email', 'labels.email', 'email', true, 'placeholders.email')}
                {renderField('password', 'labels.password', 'password', true, 'placeholders.password')}
                {renderField('confirmPassword', 'labels.confirmPassword', 'password', true, 'placeholders.confirmPassword')}
                
                {selectedRole !== SignupRole.PARENT && renderField('phone', 'labels.phone', 'tel', true, 'placeholders.phone')}
                {selectedRole !== SignupRole.PARENT && renderField('canton', 'labels.canton', 'select', true, undefined, SWISS_CANTONS)}

                {selectedRole === SignupRole.FOUNDATION && renderField('capacity', 'labels.capacity', 'number', true)}
                {selectedRole === SignupRole.SUPPLIER && renderField('category', 'labels.category', 'text', true, 'placeholders.category')}
                {selectedRole === SignupRole.SERVICE_PROVIDER && renderField('serviceType', 'labels.serviceType', 'text', true, 'placeholders.serviceType')}
                
                {selectedRole === SignupRole.PARENT && (
                  <>
                    {renderField('childAge', 'labels.childAge', 'number', true)}
                    {renderField('childStartDate', 'labels.childStartDate', 'date', true)}
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
                      {t('termsLabel')}{' '}
                      <a href="#/terms" target="_blank" rel="noopener noreferrer" className="text-swiss-mint hover:underline">
                        {t('termsLink')}
                      </a>.
                    </span>
                  </label>
                  {errors.termsAccepted && <p className="text-xs text-swiss-coral mt-1">{errors.termsAccepted}</p>}
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4">
                  <Button type="button" variant="light" onClick={handleBackToRoleSelection} leftIcon={ArrowLeftIcon} className="w-full sm:w-auto">
                    {t('buttons.goBack')}
                  </Button>
                  <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto bg-swiss-mint hover:bg-opacity-90" disabled={isLoading}>
                    {isLoading ? t('creatingAccount') : t('buttons.createAccount')}
                  </Button>
                </div>

                {showVerificationStep && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-swiss-charcoal mb-2">
                      {t('common:verifyEmail', 'Verify Your Email')}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('common:verifyEmailMessage', `We've sent a verification code to ${formData.email}. Please enter it below.`)}
                    </p>
                    <form onSubmit={handleVerification} className="space-y-4">
                      <div>
                        <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('common:labels.verificationCode', 'Verification Code')}
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
                        {isLoading ? t('common:verifying', 'Verifying...') : t('common:buttons.verifyEmail', 'Verify Email')}
                      </Button>
                    </form>
                  </div>
                )}
              </form>
            )}
            
            <p className="mt-6 text-center text-sm text-gray-600">
              {t('common:loginPage.alreadyAccount')}{' '}
              <Link to="/login" className="font-medium text-swiss-mint hover:underline">
                {t('common:buttons.login')}
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
};

export default SignupPage;
