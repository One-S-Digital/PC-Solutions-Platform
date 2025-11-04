
import React, { useState, useEffect } from 'react';
import { SettingsFormData, UserRole } from '../../../types';
import { STANDARD_INPUT_FIELD } from '../../../constants';
import SettingsSectionWrapper from '../SettingsSectionWrapper';
import { UserCircleIcon, EyeIcon, EyeSlashIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
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
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser, updateCurrentUserInfo } = useAppContext();
  const { changePassword } = useAuthContext();
  const { addNotification } = useNotifications();
  
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
        addNotification({ title: t('common:settingsAccountSecurity.notifications.passwordChanged'), message: '', type: 'success' });
        setPasswordInfo({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      } catch (error) {
        const message = error instanceof Error ? error.message : t('common:errors.unknown');
        setPasswordError(message);
        addNotification({ title: message, message: '', type: 'error' });
      } finally {
        setIsUpdatingPassword(false);
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
              <p className="text-gray-500 pt-2">{t(`userRoles.${userRole}`, userRole)}</p>
            </div>
            <div className="form-label md:pt-2">{t('common:settingsAccountSecurity.personalInfo.memberSinceLabel')}</div>
            <div className="form-input-container">
              <p className="text-gray-500 pt-2">{currentUser?.memberSince ? new Date(currentUser.memberSince).toLocaleDateString() : 'N/A'}</p>
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
               <Button type="submit" variant="secondary" disabled={isUpdatingPassword}>
                 {isUpdatingPassword ? 'Updating...' : t('common:settingsAccountSecurity.changePassword.updatePasswordButton')}
               </Button>
               {passwordError && (
                 <p className="text-sm text-swiss-coral">{passwordError}</p>
               )}
             </div>
        </form>

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
