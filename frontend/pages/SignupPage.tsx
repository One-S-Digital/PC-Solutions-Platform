import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSignUp, useAuth } from '@clerk/clerk-react';
import { SignupRole, SignupFormData, SwissCanton, SupportedLanguage } from '../types';
import { APP_NAME, STANDARD_INPUT_FIELD, SWISS_CANTONS, HCAPTCHA_SITE_KEY, HCAPTCHA_THEME, HCAPTCHA_SIZE } from '../constants';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Captcha from '../components/ui/Captcha';
import { debugLogger } from '../src/utils/debugLogger';
import { useDebugLogger } from '../src/hooks/useDebugLogger';
import { useWebhookStatus } from '../src/hooks/useWebhookStatus';
import VerificationProgress from '../src/components/verification/VerificationProgress';
import { authDebugger } from '../src/utils/authDebugger';
import { BuildingOffice2Icon, UserIcon, CogIcon, UsersIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, SquaresPlusIcon } from '@heroicons/react/24/outline';

const SignupPage: React.FC = () => {
  const { t } = useTranslation(['signup', 'common']);
  const navigate = useNavigate();
  const { signUp, isLoaded, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  
  // Enable debug logging for this component
  useDebugLogger();

  // Log SIGNUP opened (only once when component mounts)
  useEffect(() => {
    try {
      authDebugger.log('SIGNUP', 'opened', 'INFO', { 
        roleDetected: !!selectedRole,
        captchaLoaded: true  // hCaptcha loads on mount
      });
    } catch (err) {
      console.error('Debug logging error:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Webhook status hook - no clerkId param needed, uses authenticated session
  const { status: webhookStatusFromHook, error: webhookErrorFromHook, startPolling, stopPolling, checkWebhookStatus } = useWebhookStatus();

  // Wait for webhook processing to complete
  const waitForWebhookProcessing = async (userId: string, sessionId: string | null) => {
    console.log('🎯 [WAIT-WEBHOOK] Starting wait for webhook processing...', { userId, sessionId });
    console.log('🎯 [WAIT-WEBHOOK] Current webhookStatusFromHook:', webhookStatusFromHook);
    debugLogger.info('VERIFICATION', 'Starting webhook processing wait...', { userId, sessionId });
    
    try {
      console.log('📞 [WAIT-WEBHOOK] Calling startPolling()...');
      // Start polling for webhook status
      startPolling();
      
      console.log('⏰ [WAIT-WEBHOOK] Starting 30-second wait loop...');
      // Wait for webhook to complete (max 30 seconds)
      const maxWaitTime = 30000;
      const pollInterval = 1000;
      const startTime = Date.now();
      
      let loopCount = 0;
      let currentStatus: string = 'pending';
      
      while (Date.now() - startTime < maxWaitTime) {
        loopCount++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        // Manually check status and get fresh result (avoids React stale closure)
        currentStatus = await checkWebhookStatus();
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`⏳ [WAIT-WEBHOOK] Loop ${loopCount} (${elapsed}s elapsed) - Status: ${currentStatus}`);
        
        if (currentStatus === 'ready') {
          console.log('✅ [WAIT-WEBHOOK] Status is READY! Breaking loop...');
          debugLogger.info('VERIFICATION', 'Webhook processing complete, activating session...');
          
              // Activate session now that user is ready
              if (sessionId) {
                console.log('🔐 [SESSION] Activating session...', { sessionId });
                authDebugger.log('CLERK', 'set_active', 'INFO', 'After verification');
                await setActive({ session: sessionId });
                authDebugger.log('CLERK', 'set_active', 'OK', '');
                debugLogger.info('VERIFICATION', 'Session activated successfully!');
                
                // Redirect based on role
                const redirectTo = [SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole) 
                  ? '/pricing' 
                  : '/dashboard';
                console.log('🚀 [NAVIGATION] Redirecting to:', redirectTo);
                authDebugger.log('SIGNUP', 'redirect_after', 'INFO', { to: redirectTo });
            
                if ([SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole)) {
                  console.log('🧭 [NAVIGATE] Going to /pricing');
                  navigate('/pricing', { state: { fromSignup: true, role: selectedRole } });
                } else {
                  console.log('🧭 [NAVIGATE] Setting currentStep to 3');
                  setCurrentStep(3);
                }
                return;
          }
        } else if (currentStatus === 'error') {
          console.log('❌ [WAIT-WEBHOOK] Status is ERROR!');
          throw new Error(webhookErrorFromHook || 'Webhook processing failed');
        }
      }
      
      // Timeout
      console.log('⏱️ [WAIT-WEBHOOK] 30-second timeout reached!');
      console.log('💀 [WAIT-WEBHOOK] Final status:', currentStatus);
      console.log('💀 [WAIT-WEBHOOK] Hook status (may be stale):', webhookStatusFromHook);
      console.log('💀 [WAIT-WEBHOOK] User was created but polling never detected it');
      throw new Error('Account setup timeout - please contact support');
      
    } catch (error) {
      console.log('🔴 [WAIT-WEBHOOK] Error in waitForWebhookProcessing:', error);
      debugLogger.error('VERIFICATION', 'Webhook processing failed:', error);
      setWebhookStatus('error');
      setWebhookError(error instanceof Error ? error.message : 'Account setup failed');
    } finally {
      console.log('🛑 [WAIT-WEBHOOK] Finally block - calling stopPolling()');
      stopPolling();
    }
  };

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

  // Log verification step changes
  useEffect(() => {
    if (showVerificationStep) {
      console.log('🔔 [STATE] showVerificationStep changed to TRUE');
      try {
        authDebugger.log('CLERK', 'verify_step_shown', 'INFO', { 
          showVerificationStep: true,
          hasSignUp: !!signUp,
          signUpStatus: signUp?.status
        });
      } catch (err) {
        console.error('Debug logging error:', err);
      }
    }
  }, [showVerificationStep, signUp]);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'pending' | 'processing' | 'ready' | 'error'>('pending');
  const [webhookError, setWebhookError] = useState<string | null>(null);

  // Component mount logging
  useEffect(() => {
    console.log('🟣 [LIFECYCLE] SignupPage mounted', {
      isLoaded,
      isSignedIn,
      currentStep,
      selectedRole,
      showVerificationStep
    });
    
    return () => {
      console.log('🟣 [LIFECYCLE] SignupPage unmounting');
    };
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isSignedIn, navigate]);

  // Handle successful verification - redirect if user becomes authenticated
  useEffect(() => {
    if (isSignedIn && currentStep === 3) {
      debugLogger.info('VERIFICATION', 'User became authenticated after verification, redirecting...');
      // Small delay to ensure the success message is visible
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    }
  }, [isSignedIn, currentStep, navigate]);

  // Global error handler to catch unhandled errors
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('🚀 [GLOBAL ERROR] Unhandled error caught:', {
        message: error.message,
        filename: error.filename,
        lineno: error.lineno,
        colno: error.colno,
        error: error.error
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚀 [GLOBAL ERROR] Unhandled promise rejection:', {
        reason: event.reason,
        promise: event.promise
      });
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('🚀 [GLOBAL ERROR] Page is about to reload/unload!', {
        type: event.type,
        returnValue: event.returnValue
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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

    // CAPTCHA validation
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep2() || !selectedRole || !isLoaded || !signUp) return;
    
    setIsLoading(true);

    // Log signup submit
    try {
      authDebugger.log('SIGNUP', 'submit', 'INFO', { 
        valid: true, 
        captchaSolved: !!captchaToken,
        role: selectedRole
      });
    } catch (err) {
      console.error('Debug logging error:', err);
    }

    try {
      // Split contact person into first and last name
      const nameParts = formData.contactPerson.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      debugLogger.info('SIGNUP', 'Starting signup process...', {
        email: formData.email,
        role: selectedRole,
        firstName,
        lastName
      });

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

      debugLogger.info('SIGNUP', 'Signup result:', {
        status: result.status,
        userId: result.createdUserId,
        sessionId: result.createdSessionId,
        hasErrors: result.errors?.length > 0,
        errors: result.errors
      });

      // Log Clerk signup_create
      authDebugger.log('CLERK', 'signup_create', 'OK', { status: result.status });

      if (result.status === 'complete') {
        try {
          authDebugger.log('CLERK', 'set_active', 'INFO', 'Attempting to set active session');
          await setActive({ session: result.createdSessionId });
          authDebugger.log('CLERK', 'set_active', 'OK', '');
          
          // Redirect based on role
          const redirectTo = [SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole) 
            ? '/pricing' 
            : '/dashboard';
          authDebugger.log('SIGNUP', 'redirect_after', 'INFO', { to: redirectTo });
          
          if ([SignupRole.FOUNDATION, SignupRole.SUPPLIER, SignupRole.SERVICE_PROVIDER].includes(selectedRole)) {
            navigate('/pricing', { state: { fromSignup: true, role: selectedRole } });
          } else {
            setCurrentStep(3);
          }
        } catch (setActiveError: any) {
          console.error('Session activation failed:', setActiveError);
          authDebugger.log('CLERK', 'set_active', 'ERROR', { error: setActiveError.message });
          setErrors({ email: 'Failed to activate session. Please try logging in.' });
        }
      } else if (result.status === 'missing_requirements') {
        // Email verification required
        debugLogger.info('SIGNUP', 'Email verification required, preparing verification...');
        authDebugger.log('CLERK', 'verify_start', 'INFO', '');
        try {
          console.log('📧 [VERIFICATION] Preparing email verification...');
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          debugLogger.info('SIGNUP', 'Email verification prepared successfully');
          
          console.log('🔄 [STATE] Setting showVerificationStep = true');
          setShowVerificationStep(true);
          
          console.log('🔄 [STATE] Setting isLoading = false');
          setIsLoading(false);
          
          console.log('✅ [FLOW] Email verification setup complete, waiting for user input');
          return;
        } catch (verifyError: any) {
          debugLogger.error('SIGNUP', 'Failed to prepare email verification:', verifyError);
          authDebugger.log('CLERK', 'verify_start', 'ERROR', { error: String(verifyError) });
          setErrors({ email: 'Failed to send verification email. Please try again.' });
        }
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      const errorCode = err.errors?.[0]?.code || 'unknown';
      authDebugger.log('CLERK', 'signup_create', 'ERROR', { code: errorCode, message: err.message });
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
    console.log('🎯 [HANDLER] handleVerification CALLED', {
      hasSignUp: !!signUp,
      verificationCode,
      isVerifying,
      isLoading
    });
    
    e.preventDefault();
    
    // Log verification attempt
    try {
      authDebugger.log('CLERK', 'verify_attempt', 'INFO', { 
        hasCode: !!verificationCode,
        codeLength: verificationCode.length
      });
    } catch (err) {
      console.error('Debug logging error:', err);
    }
    
    debugLogger.info('VERIFICATION', 'handleVerification called', {
      hasSignUp: !!signUp,
      verificationCode,
      signUpStatus: signUp?.status,
      signUpCreatedUserId: signUp?.createdUserId,
      isSignedIn,
      currentStep
    });
    
    if (!signUp || !verificationCode) {
      console.log('❌ [VALIDATION] Verification failed: missing data', { hasSignUp: !!signUp, hasCode: !!verificationCode });
      debugLogger.warn('VERIFICATION', 'Early return - missing signUp or verificationCode');
      try {
        authDebugger.log('CLERK', 'verify_attempt', 'ERROR', { reason: 'missing_code_or_signup' });
      } catch (err) {
        console.error('Debug logging error:', err);
      }
      setVerificationError('Please enter a verification code.');
      return;
    }

    if (isVerifying) {
      console.log('⏸️  [STATE] Already verifying, ignoring duplicate request');
      debugLogger.warn('VERIFICATION', 'Verification already in progress, ignoring duplicate request');
      return;
    }
    
    debugLogger.info('VERIFICATION', 'Starting email verification...', {
      code: verificationCode,
      userId: signUp.createdUserId,
      signUpStatus: signUp.status
    });
    
    console.log('🔄 [STATE] Setting verification state: isLoading=true, isVerifying=true');
    setIsLoading(true);
    setIsVerifying(true);
    setVerificationError('');
    
    try {
      console.log('📞 [API] Calling Clerk attemptEmailAddressVerification...');
      debugLogger.info('VERIFICATION', 'Calling attemptEmailAddressVerification...');
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      console.log('✅ [API] Clerk verification API returned:', { status: result.status, userId: result.createdUserId });
      
      debugLogger.info('VERIFICATION', 'Verification result:', {
        status: result.status,
        userId: result.createdUserId,
        sessionId: result.createdSessionId,
        hasErrors: result.errors?.length > 0,
        errors: result.errors,
        fullResult: result
      });
      
      // Log verification result
      try {
        authDebugger.log('CLERK', 'verify_done', result.status === 'complete' ? 'OK' : 'ERROR', { 
          status: result.status 
        });
      } catch (err) {
        console.error('Debug logging error:', err);
      }

      if (result.status === 'complete') {
        console.log('🎉 [SUCCESS] Email verification complete!');
        console.log('🆔 [SUCCESS] ClerkId (createdUserId):', result.createdUserId);
        console.log('🔑 [SUCCESS] SessionId:', result.createdSessionId);
        debugLogger.info('VERIFICATION', 'Email verification complete, waiting for webhook processing...');
        
        if (result.createdUserId) {
          console.log('🔄 [WEBHOOK] Starting webhook polling...', { userId: result.createdUserId });
          
          // Log to auth debugger
          try {
            authDebugger.log('CLERK', 'webhook_poll_start', 'INFO', { 
              clerkId: result.createdUserId,
              sessionId: result.createdSessionId
            });
          } catch (err) {
            console.error('Debug logging error:', err);
          }
          
          // Start webhook status polling
          setWebhookStatus('processing');
          await waitForWebhookProcessing(result.createdUserId, result.createdSessionId);
        } else {
          console.log('❌ [ERROR] No userId after verification');
          debugLogger.error('VERIFICATION', 'No user ID provided after verification');
          setVerificationError('Verification completed but no user was created. Please try again.');
        }
      } else {
        console.log('⚠️  [WARNING] Verification status not complete:', result.status);
        debugLogger.warn('VERIFICATION', 'Verification not complete, status:', result.status);
        setVerificationError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      debugLogger.error('VERIFICATION', 'Verification error:', err);
      debugLogger.error('VERIFICATION', 'Error details:', {
        message: err.message,
        stack: err.stack,
        errors: err.errors,
        code: err.code,
        status: err.status
      });
      
      // Log verification error
      try {
        authDebugger.log('CLERK', 'verify_done', 'ERROR', { 
          code: err.errors?.[0]?.code || 'unknown',
          message: err.message || 'Verification failed'
        });
      } catch (logErr) {
        console.error('Debug logging error:', logErr);
      }
      
      const errorMessage = err.errors?.[0]?.message || 'Invalid verification code';
      setVerificationError(errorMessage);
    } finally {
      console.log('🔄 [STATE] Verification complete, resetting state: isLoading=false, isVerifying=false');
      debugLogger.info('VERIFICATION', 'Verification process completed, setting loading to false');
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
            <div className="space-y-3">
              <Button onClick={() => navigate('/dashboard')} variant="primary" size="lg" className="w-full">
                {t('goToDashboardButton')}
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
              <>
                {!showVerificationStep && (
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
                        {t('buttons.goBack')}
                      </Button>
                      <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto bg-swiss-mint hover:bg-opacity-90" disabled={isLoading}>
                        {isLoading ? t('creatingAccount') : t('buttons.createAccount')}
                      </Button>
                    </div>
                  </form>
                )}

                {showVerificationStep && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    {(() => {
                      console.log('🟡 [RENDER] Verification step rendering', {
                        showVerificationStep,
                        webhookStatus,
                        verificationCode
                      });
                      
                      try {
                        authDebugger.log('CLERK', 'verify_form_render', 'INFO', { 
                          webhookStatus,
                          showVerificationStep: true
                        });
                      } catch (err) {
                        console.error('Debug logging error:', err);
                      }
                      
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
                        <form onSubmit={(e) => {
                          console.log('🔵 [FORM] onSubmit fired!');
                          
                          // CRITICAL: Prevent default FIRST
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Log form submission
                          try {
                            authDebugger.log('CLERK', 'verify_form_submit', 'INFO', { 
                              hasCode: !!verificationCode,
                              codeLength: verificationCode.length
                            });
                          } catch (err) {
                            console.error('Debug logging error:', err);
                          }
                          
                          debugLogger.info('FORM', 'Verification form submitted');
                          debugLogger.info('FORM', 'Form submission prevented, calling handleVerification');
                          
                          // Call handler
                          try {
                            handleVerification(e);
                          } catch (err) {
                            console.error('🔴 [FORM] handleVerification error:', err);
                            try {
                              authDebugger.log('CLERK', 'verify_error', 'ERROR', { 
                                message: String(err)
                              });
                            } catch (logErr) {
                              console.error('Debug logging error:', logErr);
                            }
                          }
                        }} className="space-y-4" noValidate>
                          <div>
                            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                              {t('common:labels.verificationCode', 'Verification Code')}
                            </label>
                          <input
                            type="text"
                            id="verificationCode"
                            value={verificationCode}
                            onChange={(e) => {
                              console.log('⌨️  [INPUT] Verification code changed:', { length: e.target.value.length });
                              debugLogger.debug('FORM', 'Verification code changed:', e.target.value);
                              setVerificationCode(e.target.value);
                              
                              // Log when code is complete
                              if (e.target.value.length === 6) {
                                console.log('✅ [INPUT] 6-digit code entered, ready to verify');
                                try {
                                  authDebugger.log('CLERK', 'verify_code_complete', 'INFO', { codeLength: 6 });
                                } catch (err) {
                                  console.error('Debug logging error:', err);
                                }
                              }
                            }}
                              onInvalid={(e) => {
                                debugLogger.warn('FORM', 'Input validation failed:', e);
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
                            onClick={(e) => {
                              console.log('🟢 [BUTTON] onClick fired', {
                                isLoading,
                                isVerifying,
                                hasCode: !!verificationCode,
                                codeLength: verificationCode.length,
                                disabled: isLoading || isVerifying,
                                buttonType: (e.currentTarget as HTMLButtonElement).type,
                                formElement: (e.currentTarget as HTMLButtonElement).form
                              });
                              
                              // Log button click
                              try {
                                authDebugger.log('CLERK', 'verify_button_click', 'INFO', { 
                                  isLoading,
                                  isVerifying,
                                  hasCode: !!verificationCode,
                                  codeLength: verificationCode.length,
                                  disabled: isLoading || isVerifying,
                                  buttonType: (e.currentTarget as HTMLButtonElement).type,
                                  hasForm: !!(e.currentTarget as HTMLButtonElement).form
                                });
                              } catch (err) {
                                console.error('Debug logging error:', err);
                              }
                            }}
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
          </>
        )}
      </Card>
    </div>
  );
};

export default SignupPage;
