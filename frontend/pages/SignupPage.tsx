import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSignUp, useAuth, useUser } from '@clerk/clerk-react';
import { SignupRole, SignupFormData, SwissCanton, SupportedLanguage, UserRole } from '../types';
import { APP_NAME, STANDARD_INPUT_FIELD, SWISS_CANTONS, HCAPTCHA_SITE_KEY, HCAPTCHA_THEME, HCAPTCHA_SIZE } from '../constants';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Captcha from '../components/ui/Captcha';
import { useWebhookStatus } from '../src/hooks/useWebhookStatus';
import VerificationProgress from '../src/components/verification/VerificationProgress';
import { BuildingOffice2Icon, UserIcon, CogIcon, UsersIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, SquaresPlusIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useFrontendSettings } from '../hooks/useFrontendSettings';
import { useAuthContext } from '../providers/AuthProvider';
import { apiService } from '../services/api';
import { API_ENDPOINTS } from '../services/api-endpoints';

const SIGNUP_ROLE_TO_USER_ROLE: Record<SignupRole, UserRole> = {
  [SignupRole.FOUNDATION]: UserRole.FOUNDATION,
  [SignupRole.SUPPLIER]: UserRole.PRODUCT_SUPPLIER,
  [SignupRole.SERVICE_PROVIDER]: UserRole.SERVICE_PROVIDER,
  [SignupRole.EDUCATOR]: UserRole.EDUCATOR,
  [SignupRole.PARENT]: UserRole.PARENT,
};

const SignupPage: React.FC = () => {
  const { t } = useTranslation(['signup', 'common']);
  const navigate = useNavigate();
  const { signUp, isLoaded, setActive } = useSignUp();
  const { isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const { currentUser, refreshCurrentUser, logout, isLoading: isAuthLoading } = useAuthContext();
  const { settings, loading: settingsLoading, error: settingsError } = useFrontendSettings();

  // Detect if this is an OAuth user completing their profile (signed in but no backend user)
  // Important: Also check !isAuthLoading to avoid false positive while user data is being fetched
  const isOAuthCompletion = isSignedIn && !currentUser && !isAuthLoading;

  useEffect(() => {
    if (settingsError) {
      console.warn('Failed to load frontend settings:', settingsError);
    }
  }, [settingsError]);

  // Webhook status hook - no clerkId param needed, uses authenticated session
  const { error: webhookErrorFromHook, startPolling, checkWebhookStatus } = useWebhookStatus();

  // Wait for webhook processing to complete
  const waitForWebhookProcessing = async (_userId: string, _sessionId: string | null) => {
    let stopPollingCleanup: (() => void) | undefined;

    try {
      console.log('[Signup Debug] waitForWebhookProcessing: starting provisioning wait');
      stopPollingCleanup = startPolling();

      const maxWaitTime = 30000;
      const pollInterval = 1000;
      const startTime = Date.now();

      setWebhookError(null);

      while (Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const currentStatus = await checkWebhookStatus();
        setWebhookStatus(currentStatus);
        console.log('[Signup Debug] waitForWebhookProcessing: poll result', {
          currentStatus,
          elapsedMs: Date.now() - startTime,
        });

        if (currentStatus === 'ready') {
          setSuccessRedirect(getSuccessRedirectForRole(selectedRole));
          setCurrentStep(3);
          return;
        }

        if (currentStatus === 'error') {
          console.error('[Signup Debug] waitForWebhookProcessing: webhook status error', webhookErrorFromHook);
          throw new Error(webhookErrorFromHook || 'Webhook processing failed');
        }
      }

      console.error('[Signup Debug] waitForWebhookProcessing: timed out waiting for provisioning');
      throw new Error('Account setup timeout - please contact support');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account setup failed';
      setWebhookStatus('error');
      setWebhookError(message);
      setVerificationError(message);
    } finally {
      console.log('[Signup Debug] waitForWebhookProcessing: cleaning up polling');
      stopPollingCleanup?.();
    }
  };

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<SignupRole | null>(null);
  const [hasStartedSignup, setHasStartedSignup] = useState(false);
  const [successRedirect, setSuccessRedirect] = useState<{ path: string; state?: Record<string, unknown> }>({ path: '/dashboard' });
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'pending' | 'processing' | 'ready' | 'error'>('pending');
  const [webhookError, setWebhookError] = useState<string | null>(null);

  const roleRequiresPricing = (role: SignupRole | null) =>
    role !== null && [SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(role);

  const getSuccessRedirectForRole = (role: SignupRole | null) => {
    if (roleRequiresPricing(role) && role) {
      return { path: '/pricing', state: { fromSignup: true, role } };
    }
    return { path: '/dashboard' };
  };

  const successButtonLabel = roleRequiresPricing(selectedRole)
    ? t('goToPricingButton', 'Go to Pricing')
    : t('goToDashboardButton');

    const requiresOrganizationDetails =
      selectedRole !== null &&
      [SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole);

  // Redirect if user is already logged in AND has a backend profile (currentUser is set)
  // If currentUser is null, it means they need to complete their profile (e.g. after Google Sign Up)
  useEffect(() => {
    if (isSignedIn && currentUser && !hasStartedSignup) {
      navigate('/dashboard', { replace: true });
    }
  }, [isSignedIn, currentUser, hasStartedSignup, navigate]);

  // Handle successful verification - redirect if user becomes authenticated after showing success
  useEffect(() => {
    if (isSignedIn && currentStep === 3) {
      const timeoutId = setTimeout(() => {
        navigate(successRedirect.path, { replace: true, state: successRedirect.state });
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [isSignedIn, currentStep, navigate, successRedirect]);

  // Pre-fill form data for OAuth users (e.g., Google Sign Up)
  useEffect(() => {
    if (isOAuthCompletion && clerkUser) {
      setFormData(prev => ({
        ...prev,
        email: clerkUser.primaryEmailAddress?.emailAddress || prev.email,
        contactPerson: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || prev.contactPerson,
      }));
    }
  }, [isOAuthCompletion, clerkUser]);

  const rolesConfig: { role: SignupRole; nameKey: string; icon: React.ElementType; subtitleKey?: string }[] = [
    { role: SignupRole.FOUNDATION, nameKey: 'role.foundation', icon: BuildingOffice2Icon },
    { role: SignupRole.SUPPLIER, nameKey: 'role.supplier', icon: UserIcon },
    { role: SignupRole.SERVICE_PROVIDER, nameKey: 'role.serviceProvider', icon: CogIcon },
    { role: SignupRole.PARENT, nameKey: 'role.parent', icon: UsersIcon },
    { role: SignupRole.EDUCATOR, nameKey: 'role.educator', icon: UsersIcon, subtitleKey: 'roleSubtitle.educator' },
  ];

  const handleRoleSelect = (role: SignupRole) => {
    setSelectedRole(role);
    setErrors({});
    setCurrentStep(2);
    setHasStartedSignup(true);
    setSuccessRedirect(getSuccessRedirectForRole(role));
  };

  const handleBackToRoleSelection = () => {
    setCurrentStep(1);
    setSelectedRole(null);
    setErrors({});
    setSuccessRedirect({ path: '/dashboard' });
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

      const requiresOrganizationDetails = [SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole);

      if (requiresOrganizationDetails && !formData.organisationName) {
        newErrors.organisationName = t('errors.organisationNameRequired');
      }
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
    
      if (requiresOrganizationDetails && !formData.phone) {
        newErrors.phone = t('errors.phoneRequired');
      }
      if (requiresOrganizationDetails && !formData.canton) {
        newErrors.canton = t('errors.cantonRequired');
      }

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

    // CAPTCHA validation
    if (!captchaToken) {
      setCaptchaError(t('errors.captchaRequired'));
    } else {
      setCaptchaError('');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && captchaToken !== null;
  };

  // Validation for OAuth users (no password required, email already verified by OAuth provider)
  const validateOAuthProfile = (): boolean => {
    const newErrors: Partial<Record<keyof SignupFormData, string>> = {};
    if (!selectedRole) return false;

    const requiresOrganizationDetails = [SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole);

    if (requiresOrganizationDetails && !formData.organisationName) {
      newErrors.organisationName = t('errors.organisationNameRequired');
    }
    if (!formData.contactPerson) 
      newErrors.contactPerson = t(selectedRole === SignupRole.PARENT ? 'errors.parentNameRequired' : 'errors.contactPersonRequired');
    
    // OAuth users don't need email validation - it's pre-filled from OAuth provider
    // Password fields are not required for OAuth users

    if (requiresOrganizationDetails && !formData.phone) {
      newErrors.phone = t('errors.phoneRequired');
    }
    if (requiresOrganizationDetails && !formData.canton) {
      newErrors.canton = t('errors.cantonRequired');
    }

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

    // CAPTCHA validation - still required for OAuth users
    if (!captchaToken) {
      setCaptchaError(t('errors.captchaRequired'));
    } else {
      setCaptchaError('');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && captchaToken !== null;
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError('');
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
    setCaptchaError(t('errors.captchaExpired'));
  };

  const handleCaptchaError = (error: any) => {
    setCaptchaToken(null);
    setCaptchaError(t('errors.captchaError'));
    console.error('CAPTCHA error:', error);
  };

  // State to track if there's an email conflict (account exists with different auth method)
  const [emailConflictError, setEmailConflictError] = useState(false);

  const handleCompleteProfile = async () => {
    setIsLoading(true);
    setEmailConflictError(false);
    try {
       const token = await getToken();
       
       if (!token) {
           throw new Error('Authentication token not available');
       }

       const payload = {
           role: SIGNUP_ROLE_TO_USER_ROLE[selectedRole!],
           organisationName: formData.organisationName || undefined,
           contactPerson: formData.contactPerson || undefined,
           phone: formData.phone || undefined,
           canton: formData.canton || undefined,
           capacity: formData.capacity,
           category: formData.category || undefined,
           serviceType: formData.serviceType || undefined,
           childAge: formData.childAge,
           childStartDate: formData.childStartDate || undefined,
       };

       const response = await fetch(`${apiService.apiBaseUrl}${API_ENDPOINTS.users.completeProfile}`, {
           method: 'POST',
           headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json'
           },
           body: JSON.stringify(payload)
       });
       
       if (response.ok) {
           await refreshCurrentUser();
           setSuccessRedirect(getSuccessRedirectForRole(selectedRole));
           setCurrentStep(3);
       } else {
           const errorData = await response.json().catch(() => ({}));
           
           // Check for email conflict error (EMAIL_ALREADY_EXISTS)
           // This happens when user started Google SSO but an account was created
           // with email/password before they completed the Google signup
           if (response.status === 409 && errorData.code === 'EMAIL_ALREADY_EXISTS') {
               setEmailConflictError(true);
               return;
           }
           
           throw new Error(errorData.message || 'Failed to complete profile');
       }
    } catch (err: any) {
        console.error('Profile completion error:', err);
        setErrors({ email: err.message || 'An error occurred while completing your profile' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    
    // If user is already authenticated (e.g. via Google OAuth) but missing backend profile
    // we use OAuth-specific validation (no password required) and complete their profile
    if (isOAuthCompletion) {
        if (!validateOAuthProfile()) return;
        await handleCompleteProfile();
        return;
    }

    // Regular email/password signup - use full validation including password
    if (!validateStep2()) return;

    if (!isLoaded || !signUp) return;
    
    setIsLoading(true);
    setHasStartedSignup(true);

      try {
        const pendingUserRole = selectedRole ? SIGNUP_ROLE_TO_USER_ROLE[selectedRole] : undefined;

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
            pendingRole: pendingUserRole,
            organisationName: requiresOrganizationDetails ? formData.organisationName : undefined,
            phone: formData.phone || undefined,
            canton: formData.canton || undefined,
        },
      });

        if (result.status === 'complete') {
          try {
            await setActive({ session: result.createdSessionId });
            setSuccessRedirect(getSuccessRedirectForRole(selectedRole));
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
          setErrors({ email: 'Failed to send verification email. Please try again.' });
        }
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      const errorCode = err.errors?.[0]?.code || 'unknown';
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

    if (!signUp || !verificationCode) {
      setVerificationError('Please enter a verification code.');
      return;
    }

    if (isVerifying) {
      return;
    }

    setIsLoading(true);
    setIsVerifying(true);
    setVerificationError('');
    
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      console.log('[Signup Debug] handleVerification: attempt result', {
        status: result.status,
        createdSessionId: result.createdSessionId,
        createdUserId: result.createdUserId,
        errors: result.errors,
      });

      if (result.status === 'complete') {
        if (!result.createdSessionId) {
          console.error('Verification completed but no session was created.');
          setVerificationError('Verification completed but no session was created. Please try logging in.');
          return;
        }

        try {
          console.log('[Signup Debug] handleVerification: activating session');
          await setActive({ session: result.createdSessionId });
          console.log('[Signup Debug] handleVerification: session activated successfully');
        } catch (activationError: any) {
          console.error('Session activation failed after verification:', activationError);
          setVerificationError('Verification succeeded, but session activation failed. Please try logging in.');
          return;
        }

        if (!result.createdUserId) {
          setVerificationError('Verification completed but user provisioning is delayed. Please wait and try again.');
          return;
        }

        // Start webhook status polling now that the session is active
        setWebhookStatus('processing');
        console.log('[Signup Debug] handleVerification: starting webhook polling');
        await waitForWebhookProcessing(result.createdUserId, result.createdSessionId);
      } else {
        setVerificationError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      let errorMessage = 'Invalid verification code';

      if (err?.errors && err.errors.length > 0) {
        errorMessage = err.errors[0]?.message || errorMessage;
      } else if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }

      setVerificationError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsVerifying(false);
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

  const progressText = currentStep === 1 
    ? (isOAuthCompletion ? t('progress.oauthStep1', 'Step 1: Select your role') : t('progress.step1')) 
    : (isOAuthCompletion ? t('progress.oauthStep2', 'Step 2: Complete your profile') : t('progress.step2'));
  const formTitle = currentStep === 1 
    ? (isOAuthCompletion ? t('selectRoleTitle.oauth', 'Complete Your Registration') : t('selectRoleTitle')) 
    : t('detailsTitle', { role: selectedRole ? t(rolesConfig.find(rc => rc.role === selectedRole)!.nameKey) : '' });

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
            <div className="space-y-3">
              <Button
                onClick={() => navigate(successRedirect.path, { state: successRedirect.state })}
                variant="primary"
                size="lg"
                className="w-full"
              >
                {successButtonLabel}
              </Button>
              <p className="text-sm text-gray-500">
                {t('common:loginPage.alreadyAccount')}{' '}
                <Link to="/login" className="font-medium text-swiss-mint hover:underline">
                  {t('common:buttons.login')}
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-2">
              {settings?.logoAsset?.publicUrl ? (
                <img 
                  src={settings.logoAsset.publicUrl} 
                  alt={settings.siteName || APP_NAME} 
                  className="h-20 w-auto mx-auto mb-2" 
                />
              ) : (
                <SquaresPlusIcon className="w-14 h-14 text-swiss-mint mx-auto mb-2" />
              )}
              <h1 className="text-2xl font-bold text-swiss-charcoal">{formTitle}</h1>
              <p className="text-sm text-gray-500 mt-1">{progressText}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div className="bg-swiss-mint h-2 rounded-full transition-all duration-300 ease-in-out" style={{ width: currentStep === 1 ? '50%' : '100%' }}></div>
            </div>

            {currentStep === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rolesConfig.map(({ role, nameKey, icon: Icon, subtitleKey }, index) => (
                  <button 
                    key={role} 
                    onClick={() => handleRoleSelect(role)} 
                    aria-pressed={selectedRole === role}
                    className={`p-6 border-2 rounded-lg text-center transition-all duration-200 ease-in-out hover:shadow-lg hover:border-swiss-mint hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint border-gray-300 bg-white ${index === rolesConfig.length - 1 ? 'sm:col-span-2' : ''}`}
                  >
                    <Icon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <span className="block font-semibold text-swiss-charcoal">{t(nameKey)}</span>
                    {subtitleKey && <span className="block text-sm text-gray-500 mt-1">{t(subtitleKey)}</span>}
                  </button>
                ))}
              </div>
            )}

            {currentStep === 2 && selectedRole && (
              <>
                {/* Email conflict error - account already exists with different auth method */}
                {emailConflictError && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-semibold text-amber-800">
                          {t('signup:emailConflict.title', 'Account Already Exists')}
                        </h3>
                        <p className="text-sm text-amber-700 mt-1">
                          {t('signup:emailConflict.message', 'An account with this email address was already created. It looks like you may have previously signed up using a different method (email/password).')}
                        </p>
                        <p className="text-sm text-amber-700 mt-2">
                          {t('signup:emailConflict.instructions', 'Please sign out and log in with your existing account to continue.')}
                        </p>
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                          <Button 
                            type="button" 
                            variant="primary"
                            size="sm"
                            onClick={async () => {
                              await logout();
                              navigate('/login', { replace: true });
                            }}
                          >
                            {t('signup:emailConflict.signOutAndLogin', 'Sign Out & Log In')}
                          </Button>
                          <Button 
                            type="button" 
                            variant="light"
                            size="sm"
                            onClick={() => {
                              setEmailConflictError(false);
                              handleBackToRoleSelection();
                            }}
                          >
                            {t('signup:emailConflict.tryAgain', 'Start Over')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* OAuth completion notice */}
                {isOAuthCompletion && !emailConflictError && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>{t('signup:oauthCompletion.title', 'Almost there!')}</strong>
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {t('signup:oauthCompletion.message', 'You\'re signed in with Google. Just complete your profile details below to finish setting up your account.')}
                    </p>
                  </div>
                )}

                {!showVerificationStep && !emailConflictError && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                      {requiresOrganizationDetails && renderField('organisationName', 'labels.organisationName', 'text', true, 'placeholders.organisationName')}
                    {renderField('contactPerson', selectedRole === SignupRole.PARENT ? 'labels.parentName' : 'labels.contactPerson', 'text', true, selectedRole === SignupRole.PARENT ? 'placeholders.parentName' : 'placeholders.contactPerson')}
                    
                    {/* Email field - read-only for OAuth users */}
                    {isOAuthCompletion ? (
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('labels.email')}<span className="text-swiss-coral">*</span>
                        </label>
                        <input 
                          type="email"
                          id="email" 
                          name="email" 
                          value={formData.email}
                          readOnly
                          className={`${STANDARD_INPUT_FIELD} bg-gray-100 cursor-not-allowed`}
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('signup:oauthCompletion.emailFromProvider', 'Email provided by Google')}</p>
                      </div>
                    ) : (
                      renderField('email', 'labels.email', 'email', true, 'placeholders.email')
                    )}
                    
                    {/* Password fields - only for regular email/password signup, not OAuth */}
                    {!isOAuthCompletion && (
                      <>
                        {renderField('password', 'labels.password', 'password', true, 'placeholders.password')}
                        {renderField('confirmPassword', 'labels.confirmPassword', 'password', true, 'placeholders.confirmPassword')}
                      </>
                    )}
                    
                      {requiresOrganizationDetails && renderField('phone', 'labels.phone', 'tel', true, 'placeholders.phone')}
                      {requiresOrganizationDetails && renderField('canton', 'labels.canton', 'select', true, undefined, SWISS_CANTONS)}

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

                    {/* CAPTCHA Section */}
                    <div className="pt-4">
                      <Captcha
                        siteKey={HCAPTCHA_SITE_KEY}
                        theme={HCAPTCHA_THEME}
                        size={HCAPTCHA_SIZE}
                        onVerify={handleCaptchaVerify}
                        onExpire={handleCaptchaExpire}
                        onError={handleCaptchaError}
                        className="flex justify-center"
                      />
                      {captchaError && <p className="text-xs text-swiss-coral mt-2 text-center">{captchaError}</p>}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4">
                      <Button type="button" variant="light" onClick={handleBackToRoleSelection} leftIcon={ArrowLeftIcon} className="w-full sm:w-auto">
                        {t('common:buttons.goBack')}
                      </Button>
                      <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto bg-swiss-mint hover:bg-opacity-90" disabled={isLoading}>
                        {isLoading 
                          ? (isOAuthCompletion ? t('signup:completingProfile', 'Completing Profile...') : t('signup:creatingAccount', 'Creating Account...')) 
                          : (isOAuthCompletion ? t('signup:completeProfile', 'Complete Profile') : t('common:buttons.createAccount'))}
                      </Button>
                    </div>
                  </form>
                )}

                {showVerificationStep && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    {(() => {
                      
                      return null;
                    })()}
                    {webhookStatus === 'processing' ? (
                      <VerificationProgress 
                        status={webhookStatus} 
                        error={webhookError}
                        onRetry={() => {
                          setWebhookStatus('pending');
                          setWebhookError(null);
                        }}
                      />
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-swiss-charcoal mb-2">
                          {t('common:verifyEmail', 'Verify Your Email')}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          {t('common:verifyEmailMessage', `We've sent a verification code to ${formData.email}. Please enter it below.`)}
                        </p>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVerification(e);
                          }}
                          className="space-y-4"
                          noValidate
                        >
                          <div>
                            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                              {t('common:labels.verificationCode', 'Verification Code')}
                            </label>
                          <input
                            type="text"
                            id="verificationCode"
                            value={verificationCode}
                            onChange={(e) => {
                              setVerificationCode(e.target.value);
                            }}
                            className={STANDARD_INPUT_FIELD}
                            placeholder="000000"
                            maxLength={6}
                            required
                          />
                            {verificationError && (
                              <p className="text-xs text-swiss-coral mt-1">{verificationError}</p>
                            )}
                          </div>
                          <Button 
                            type="submit" 
                            variant="primary" 
                            size="lg" 
                            className="w-full" 
                            disabled={isLoading || isVerifying}
                          >
                            {(isLoading || isVerifying) ? t('common:verifying', 'Verifying...') : t('common:buttons.verifyEmail', 'Verify Email')}
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
            
            <p className="mt-6 text-center text-sm text-gray-600">
              {t('common:loginPage.alreadyAccount')}{' '}
              <Link to="/login" className="font-medium text-swiss-mint hover:underline">
                {t('common:buttons.login')}
              </Link>
            </p>

            {/* Sign out option for OAuth users who want to start fresh */}
            {isOAuthCompletion && (
              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500 mb-2">
                  {t('signup:oauthCompletion.wrongAccount', 'Wrong account? Sign out and try again.')}
                </p>
                <Button 
                  type="button" 
                  variant="light" 
                  size="sm"
                  leftIcon={ArrowRightOnRectangleIcon}
                  onClick={async () => {
                    await logout();
                    navigate('/login', { replace: true });
                  }}
                  className="text-gray-600 hover:text-gray-800"
                >
                  {t('common:loginPage.signOutButton', 'Sign Out')}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default SignupPage;
