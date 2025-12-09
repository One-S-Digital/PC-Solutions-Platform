
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { SettingsFormData, UserRole } from '../../../types';
import { STANDARD_INPUT_FIELD } from '../../../constants';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { UserCircleIcon, EyeIcon, EyeSlashIcon, ShieldExclamationIcon, CheckCircleIcon, EnvelopeIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Button from '../../ui/Button';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../contexts/AppContext';
import { useAuthContext } from '../../../providers/AuthProvider';
import { useNotifications } from '../../../contexts/NotificationContext';

interface AccountSecuritySettingsProps {
  settings: SettingsFormData;
  onChange: (field: keyof SettingsFormData, value: any) => void;
  userRole: UserRole;
}

const AccountSecuritySettings: React.FC<AccountSecuritySettingsProps> = ({ settings, onChange, userRole }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { currentUser, updateCurrentUserInfo } = useAppContext();
  const { changePassword, changeEmail, verifyEmailChange } = useAuthContext();
  const { addNotification } = useNotifications();
  const { user: clerkUser } = useUser();
  
  const [personalInfo, setPersonalInfo] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    orgName: currentUser?.orgName || ''
  });

  // Sync local state when currentUser updates
  useEffect(() => {
    if (currentUser) {
      setPersonalInfo({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        orgName: currentUser.orgName || ''
      });
    }
  }, [currentUser]);
  
  const [passwordInfo, setPasswordInfo] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingEmailAddressId, setPendingEmailAddressId] = useState<string | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<'input' | 'verify'>('input');
  
  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPersonalInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserInfo({ 
      firstName: personalInfo.firstName, 
      lastName: personalInfo.lastName,
      orgName: personalInfo.orgName 
    });
    addNotification({ title: t('common:settingsAccountSecurity.notifications.infoUpdated'), message: '', type: 'success' });
  };

    const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError(null);
      setPasswordSuccess(false);

      if (passwordInfo.newPassword !== passwordInfo.confirmNewPassword) {
        addNotification({ title: t('common:forms.passwordsDoNotMatch'), message: '', type: 'error' });
        return;
      }

      if (passwordInfo.newPassword.length < 8) {
        addNotification({ title: t('common:forms.passwordTooShort'), message: '', type: 'error' });
        return;
      }

      setIsUpdatingPassword(true);

      try {
        await changePassword(passwordInfo.currentPassword, passwordInfo.newPassword);
        // Show success notification
        addNotification({ 
          title: t('common:settingsAccountSecurity.notifications.passwordChanged'), 
          message: t('common:settingsAccountSecurity.notifications.passwordChangedMessage', 'Your password has been successfully updated. You can now use your new password to sign in.'),
          type: 'success' 
        });
        // Clear form and show success state
        setPasswordInfo({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        setPasswordSuccess(true);
        // Clear success message after 10 seconds
        setTimeout(() => {
          setPasswordSuccess(false);
        }, 10000);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('common:errors.unknown');
        setPasswordError(message);
        setPasswordSuccess(false);
        addNotification({ title: message, message: '', type: 'error' });
      } finally {
        setIsUpdatingPassword(false);
      }
    };

  const handleInitiateEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      addNotification({ title: t('common:forms.emailInvalid'), message: '', type: 'error' });
      return;
    }

    // Check if it's the same as current email
    if (newEmail.toLowerCase() === currentUser?.email?.toLowerCase()) {
      addNotification({ 
        title: t('common:settingsAccountSecurity.changeEmail.sameEmailError', 'New email must be different from current email'), 
        message: '', 
        type: 'error' 
      });
      return;
    }

    setIsUpdatingEmail(true);

    try {
      await changeEmail(newEmail);
      
      // Find the newly created email address ID from Clerk
      if (clerkUser) {
        const pendingEmail = clerkUser.emailAddresses.find(
          e => e.emailAddress.toLowerCase() === newEmail.toLowerCase() && 
               e.verification?.status !== 'verified'
        );
        if (pendingEmail) {
          setPendingEmailAddressId(pendingEmail.id);
        }
      }

      // Move to verification step
      setEmailChangeStep('verify');
      addNotification({ 
        title: t('common:settingsAccountSecurity.changeEmail.verificationSent', 'Verification code sent'), 
        message: t('common:settingsAccountSecurity.changeEmail.verificationSentMessage', 'Please check your new email for the verification code.'),
        type: 'success' 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common:errors.unknown');
      setEmailError(message);
      addNotification({ title: message, message: '', type: 'error' });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!verificationCode.trim()) {
      addNotification({ 
        title: t('common:settingsAccountSecurity.changeEmail.enterCode', 'Please enter the verification code'), 
        message: '', 
        type: 'error' 
      });
      return;
    }

    // Use local variable to avoid race condition with async state updates
    let emailIdToVerify = pendingEmailAddressId;

    if (!emailIdToVerify) {
      // Try to find it again
      if (clerkUser) {
        const pendingEmail = clerkUser.emailAddresses.find(
          e => e.emailAddress.toLowerCase() === newEmail.toLowerCase() && 
               e.verification?.status !== 'verified'
        );
        if (pendingEmail) {
          emailIdToVerify = pendingEmail.id;
          setPendingEmailAddressId(emailIdToVerify);
        } else {
          addNotification({ 
            title: t('common:settingsAccountSecurity.changeEmail.sessionExpired', 'Session expired. Please try again.'), 
            message: '', 
            type: 'error' 
          });
          handleCancelEmailChange();
          return;
        }
      }
    }

    if (!emailIdToVerify) {
      addNotification({ 
        title: t('common:settingsAccountSecurity.changeEmail.sessionExpired', 'Session expired. Please try again.'), 
        message: '', 
        type: 'error' 
      });
      handleCancelEmailChange();
      return;
    }

    setIsVerifyingEmail(true);

    try {
      await verifyEmailChange(verificationCode, emailIdToVerify);
      
      setEmailSuccess(true);
      setEmailChangeStep('input');
      setNewEmail('');
      setVerificationCode('');
      setPendingEmailAddressId(null);
      
      addNotification({ 
        title: t('common:settingsAccountSecurity.changeEmail.emailChanged', 'Email changed successfully'), 
        message: t('common:settingsAccountSecurity.changeEmail.emailChangedMessage', 'Your email address has been successfully updated.'),
        type: 'success' 
      });

      // Clear success message after 10 seconds
      setTimeout(() => {
        setEmailSuccess(false);
      }, 10000);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common:errors.unknown');
      setEmailError(message);
      addNotification({ title: message, message: '', type: 'error' });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleCancelEmailChange = () => {
    setEmailChangeStep('input');
    setNewEmail('');
    setVerificationCode('');
    setPendingEmailAddressId(null);
    setEmailError(null);
  };

  const handleResendVerificationCode = async () => {
    if (!pendingEmailAddressId || !clerkUser) return;

    try {
      const emailAddress = clerkUser.emailAddresses.find(e => e.id === pendingEmailAddressId);
      if (emailAddress) {
        await emailAddress.prepareVerification({ strategy: 'email_code' });
        addNotification({ 
          title: t('common:settingsAccountSecurity.changeEmail.codeResent', 'Verification code resent'), 
          message: t('common:settingsAccountSecurity.changeEmail.codeResentMessage', 'A new verification code has been sent to your email.'),
          type: 'success' 
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common:errors.unknown');
      addNotification({ title: message, message: '', type: 'error' });
    }
  };

  const handleAccountDeletion = () => {
      if (window.confirm(t('settingsPrivacyData.confirmGDPRDelete'))) {
          if (window.confirm(t('common:settingsAccountSecurity.dangerZone.finalConfirmation'))) {
              // Mock action: In a real app, this would trigger a backend process.
              console.log("ACCOUNT DELETION INITIATED FOR USER:", currentUser?.id);
              alert(t('settingsPrivacyData.deletionRequestSubmittedHelpText'));
          }
      }
  };

  const hasOrgName = [UserRole.FOUNDATION, UserRole.PRODUCT_SUPPLIER, UserRole.SERVICE_PROVIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole);
  const emailErrorDescriptionId = 'change-email-error-feedback';
  const showEmailInputError = Boolean(emailError && emailChangeStep === 'input');
  const showVerificationError = Boolean(emailError && emailChangeStep === 'verify');
  
  return (
    <SettingsSectionWrapper title={t('settings:page.accountSecurity')} icon={UserCircleIcon}>
      <div className="space-y-8">
        {/* Personal Information Section */}
        <form onSubmit={handleUpdateInfo}>
          <h3 className="text-lg font-medium text-gray-900">{t('common:settingsAccountSecurity.personalInfo.title')}</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
            <label htmlFor="firstName" className="form-label md:pt-2">First Name</label>
            <div className="form-input-container">
              <input type="text" id="firstName" name="firstName" value={personalInfo.firstName} onChange={handlePersonalInfoChange} className={STANDARD_INPUT_FIELD} />
            </div>

            <label htmlFor="lastName" className="form-label md:pt-2">Last Name</label>
            <div className="form-input-container">
              <input type="text" id="lastName" name="lastName" value={personalInfo.lastName} onChange={handlePersonalInfoChange} className={STANDARD_INPUT_FIELD} />
            </div>

            {hasOrgName && (
              <>
                <label htmlFor="orgName" className="form-label md:pt-2">{t('common:settingsAccountSecurity.personalInfo.orgNameLabel')}</label>
                <div className="form-input-container">
                  <input type="text" id="orgName" name="orgName" value={personalInfo.orgName} onChange={handlePersonalInfoChange} className={STANDARD_INPUT_FIELD} />
                </div>
              </>
            )}
            
            <div className="form-label md:pt-2">{t('common:settingsAccountSecurity.personalInfo.emailLabel')}</div>
            <div className="form-input-container">
              <p className="text-gray-500 pt-2">{currentUser?.email}</p>
            </div>
            <div className="form-label md:pt-2">{t('common:settingsAccountSecurity.personalInfo.accountTypeLabel')}</div>
            <div className="form-input-container">
              <p className="text-gray-500 pt-2">{t(`common:userRoles.${userRole}`, userRole)}</p>
            </div>
            <div className="form-label md:pt-2">{t('common:settingsAccountSecurity.personalInfo.memberSinceLabel')}</div>
            <div className="form-input-container">
              <p className="text-gray-500 pt-2">{currentUser?.memberSince ? new Date(currentUser.memberSince).toLocaleDateString(i18n.language) : 'N/A'}</p>
            </div>
          </div>
           <div className="mt-4">
             <Button type="submit" variant="secondary">{t('common:settingsAccountSecurity.personalInfo.updateInfoButton')}</Button>
           </div>
        </form>

        <hr />

        {/* Change Password Section */}
          <form onSubmit={handleUpdatePassword}>
          <h3 className="text-lg font-medium text-gray-900">{t('common:settingsAccountSecurity.changePassword.title')}</h3>
          <div className="mt-2 mb-4">
            <p className="text-sm text-gray-600">
              For security reasons, you may need to sign out and sign back in before changing your password. 
              If you encounter a verification error, please sign out and sign back in, then try again.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
            <label htmlFor="currentPassword" className="form-label md:pt-2">{t('common:settingsAccountSecurity.changePassword.currentPasswordLabel')}</label>
            <div className="form-input-container relative">
              <input type={showCurrentPassword ? "text" : "password"} id="currentPassword" name="currentPassword" value={passwordInfo.currentPassword} onChange={handlePasswordChange} className={STANDARD_INPUT_FIELD} />
              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"><span className="sr-only">Toggle</span>{showCurrentPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}</button>
            </div>
            
            <label htmlFor="newPassword" className="form-label md:pt-2">{t('common:settingsAccountSecurity.changePassword.newPasswordLabel')}</label>
            <div className="form-input-container relative">
              <input type={showNewPassword ? "text" : "password"} id="newPassword" name="newPassword" value={passwordInfo.newPassword} onChange={handlePasswordChange} className={STANDARD_INPUT_FIELD} />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"><span className="sr-only">Toggle</span>{showNewPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}</button>
            </div>
            
            <label htmlFor="confirmNewPassword" className="form-label md:pt-2">{t('common:settingsAccountSecurity.changePassword.confirmNewPasswordLabel')}</label>
            <div className="form-input-container relative">
              <input type={showConfirmPassword ? "text" : "password"} id="confirmNewPassword" name="confirmNewPassword" value={passwordInfo.confirmNewPassword} onChange={handlePasswordChange} className={STANDARD_INPUT_FIELD} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"><span className="sr-only">Toggle</span>{showConfirmPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}</button>
            </div>
          </div>
            <div className="mt-4 space-y-2">
               <Button type="submit" variant="secondary" disabled={isUpdatingPassword || passwordSuccess}>
                 {isUpdatingPassword ? 'Updating...' : passwordSuccess ? t('common:settingsAccountSecurity.changePassword.passwordUpdated', 'Password Updated') : t('common:settingsAccountSecurity.changePassword.updatePasswordButton')}
               </Button>
               
               {/* Success Message */}
               {passwordSuccess && (
                 <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                   <div className="flex items-start">
                     <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                     <div className="flex-1">
                       <p className="text-sm font-medium text-green-800">
                         {t('common:settingsAccountSecurity.notifications.passwordChanged')}
                       </p>
                       <p className="text-sm text-green-700 mt-1">
                         {t('common:settingsAccountSecurity.notifications.passwordChangedMessage', 'Your password has been successfully updated. You can now use your new password to sign in.')}
                       </p>
                     </div>
                   </div>
                 </div>
               )}

               {/* Error Message */}
               {passwordError && (
                 <div className="mt-2">
                   <p className="text-sm text-swiss-coral font-medium">{passwordError}</p>
                   {passwordError.includes('verification') && (
                     <p className="text-sm text-gray-600 mt-1">
                       Tip: Try signing out and signing back in, then attempt to change your password again.
                     </p>
                   )}
                 </div>
               )}
             </div>
        </form>

        <hr />

        {/* Change Email Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <EnvelopeIcon className="w-5 h-5 mr-2" />
            {t('common:settingsAccountSecurity.changeEmail.title', 'Change Email Address')}
          </h3>
          <div className="mt-2 mb-4">
            <p className="text-sm text-gray-600">
              {t('common:settingsAccountSecurity.changeEmail.description', 'Change the email address associated with your account. A verification code will be sent to your new email address.')}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {t('common:settingsAccountSecurity.changeEmail.currentEmailLabel', 'Current email')}: <span className="font-medium text-gray-700">{currentUser?.email}</span>
            </p>
          </div>

          {emailError && (
            <div
              className="mt-4 rounded-lg border border-swiss-coral/40 bg-swiss-coral/5 p-4"
              role="alert"
              aria-live="assertive"
              id={emailErrorDescriptionId}
            >
              <div className="flex items-start">
                <XCircleIcon className="h-5 w-5 text-swiss-coral mt-0.5 mr-3 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-swiss-coral">
                    {t('common:settingsAccountSecurity.changeEmail.errorTitle', "We couldn't update your email address")}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{emailError}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {emailChangeStep === 'input'
                      ? t(
                          'common:settingsAccountSecurity.changeEmail.errorHelpInput',
                          'Please double-check the email address or try again with a different one.'
                        )
                      : t(
                          'common:settingsAccountSecurity.changeEmail.errorHelpVerify',
                          'Please re-enter the verification code or request a new one below.'
                        )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {emailChangeStep === 'input' ? (
            <form onSubmit={handleInitiateEmailChange}>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
                <label htmlFor="newEmail" className="form-label md:pt-2">
                  {t('common:settingsAccountSecurity.changeEmail.newEmailLabel', 'New Email Address')}
                </label>
                <div className="form-input-container">
                  <input 
                    type="email" 
                    id="newEmail" 
                    name="newEmail" 
                    value={newEmail} 
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      if (emailError) {
                        setEmailError(null);
                      }
                    }} 
                    placeholder={t('common:settingsAccountSecurity.changeEmail.newEmailPlaceholder', 'Enter your new email address')}
                    className={`${STANDARD_INPUT_FIELD} ${showEmailInputError ? 'border-swiss-coral focus:border-swiss-coral ring-1 ring-swiss-coral/30' : ''}`} 
                    aria-invalid={showEmailInputError}
                    aria-describedby={showEmailInputError ? emailErrorDescriptionId : undefined}
                    required
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Button type="submit" variant="secondary" disabled={isUpdatingEmail || emailSuccess || !newEmail.trim()}>
                  {isUpdatingEmail 
                    ? t('common:settingsAccountSecurity.changeEmail.sending', 'Sending...') 
                    : t('common:settingsAccountSecurity.changeEmail.sendVerificationCode', 'Send Verification Code')}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyEmailChange}>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  {t('common:settingsAccountSecurity.changeEmail.verificationSentTo', 'A verification code has been sent to {{email}}. Please enter the code below to complete the email change.', { email: newEmail })}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
                <label htmlFor="verificationCode" className="form-label md:pt-2">
                  {t('common:settingsAccountSecurity.changeEmail.verificationCodeLabel', 'Verification Code')}
                </label>
                <div className="form-input-container">
                  <input 
                    type="text" 
                    id="verificationCode" 
                    name="verificationCode" 
                    value={verificationCode} 
                    onChange={(e) => {
                      setVerificationCode(e.target.value);
                      if (emailError) {
                        setEmailError(null);
                      }
                    }} 
                    placeholder={t('common:settingsAccountSecurity.changeEmail.verificationCodePlaceholder', 'Enter 6-digit code')}
                    className={`${STANDARD_INPUT_FIELD} ${showVerificationError ? 'border-swiss-coral focus:border-swiss-coral ring-1 ring-swiss-coral/30' : ''}`} 
                    maxLength={6}
                    aria-invalid={showVerificationError}
                    aria-describedby={showVerificationError ? emailErrorDescriptionId : undefined}
                    required
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={isVerifyingEmail || !verificationCode.trim()}>
                  {isVerifyingEmail 
                    ? t('common:settingsAccountSecurity.changeEmail.verifying', 'Verifying...') 
                    : t('common:settingsAccountSecurity.changeEmail.verifyAndChange', 'Verify & Change Email')}
                </Button>
                <Button type="button" variant="light" onClick={handleResendVerificationCode}>
                  {t('common:settingsAccountSecurity.changeEmail.resendCode', 'Resend Code')}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelEmailChange}>
                  {t('common:buttons.cancel', 'Cancel')}
                </Button>
              </div>
            </form>
          )}

          {/* Success Message */}
          {emailSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    {t('common:settingsAccountSecurity.changeEmail.emailChanged', 'Email changed successfully')}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {t('common:settingsAccountSecurity.changeEmail.emailChangedMessage', 'Your email address has been successfully updated.')}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        <hr />

        {/* Danger Zone */}
        <div className="p-4 border border-swiss-coral/50 rounded-lg bg-swiss-coral/5">
            <h3 className="text-lg font-medium text-swiss-coral flex items-center"><ShieldExclamationIcon className="w-5 h-5 mr-2"/> {t('common:settingsAccountSecurity.dangerZone.title')}</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-form-layout gap-x-6 gap-y-4 items-start">
                <div className="form-label">
                    <p className="font-medium">{t('common:settingsAccountSecurity.dangerZone.deleteAccountTitle')}</p>
                    <p className="text-xs text-gray-500">{t('common:settingsAccountSecurity.dangerZone.deleteAccountSubtitle')}</p>
                </div>
                <div className="form-input-container">
                    <Button variant="danger" onClick={handleAccountDeletion}>{t('common:settingsAccountSecurity.dangerZone.deleteAccountButton')}</Button>
                </div>
            </div>
        </div>

      </div>
    </SettingsSectionWrapper>
  );
};

export default AccountSecuritySettings;
