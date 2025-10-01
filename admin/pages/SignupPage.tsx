
import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../contexts/AppContext';
import { SignupRole, SignupFormData, SwissCanton, SupportedLanguage } from '../types';
import { APP_NAME, STANDARD_INPUT_FIELD, SWISS_CANTONS } from '../constants';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { BuildingOffice2Icon, UserIcon, CogIcon, UsersIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, SquaresPlusIcon } from '@heroicons/react/24/outline';

const SignupPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signup, currentUser } = useAppContext();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1); // Step 3 for confirmation
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

  // Redirect if user is already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const rolesConfig: { role: SignupRole; nameKey: string; icon: React.ElementType }[] = [
    { role: SignupRole.FOUNDATION, nameKey: 'signupPage.roles.foundation', icon: BuildingOffice2Icon },
    { role: SignupRole.SUPPLIER, nameKey: 'signupPage.roles.supplier', icon: UserIcon },
    { role: SignupRole.SERVICE_PROVIDER, nameKey: 'signupPage.roles.serviceProvider', icon: CogIcon },
    { role: SignupRole.PARENT, nameKey: 'signupPage.roles.parent', icon: UsersIcon },
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
  }

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

    if (selectedRole !== SignupRole.PARENT && !formData.organisationName) newErrors.organisationName = t('signupPage.errors.organisationNameRequired');
    if (!formData.contactPerson) newErrors.contactPerson = t(selectedRole === SignupRole.PARENT ? 'signupPage.errors.parentNameRequired' : 'signupPage.errors.contactPersonRequired');
    if (!formData.email) newErrors.email = t('signupPage.errors.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('signupPage.errors.emailInvalid');
    if (!formData.password) newErrors.password = t('signupPage.errors.passwordRequired');
    else if (formData.password.length < 6) newErrors.password = t('signupPage.errors.passwordTooShort');
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('signupPage.errors.passwordsNoMatch');
    
    if (selectedRole !== SignupRole.PARENT && !formData.phone) newErrors.phone = t('signupPage.errors.phoneRequired');
    if (selectedRole !== SignupRole.PARENT && !formData.canton) newErrors.canton = t('signupPage.errors.cantonRequired');

    if (selectedRole === SignupRole.FOUNDATION && (formData.capacity === undefined || formData.capacity <=0)) newErrors.capacity = t('signupPage.errors.capacityRequired');
    if (selectedRole === SignupRole.SUPPLIER && !formData.category) newErrors.category = t('signupPage.errors.categoryRequired');
    if (selectedRole === SignupRole.SERVICE_PROVIDER && !formData.serviceType) newErrors.serviceType = t('signupPage.errors.serviceTypeRequired');
    
    if (selectedRole === SignupRole.PARENT) {
        if (formData.childAge === undefined || formData.childAge <=0) newErrors.childAge = t('signupPage.errors.childAgeRequired');
        if (!formData.childStartDate) newErrors.childStartDate = t('signupPage.errors.childStartDateRequired');
    }

    if (!formData.termsAccepted) newErrors.termsAccepted = t('signupPage.errors.termsRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep2() || !selectedRole) return;
    setIsLoading(true);
    const result = await signup(formData, selectedRole);
    if(result.success) {
      if (result.redirectTo) {
        navigate(result.redirectTo, { state: { fromSignup: true, role: selectedRole } });
      } else {
        setCurrentStep(3);
      }
    } else {
      setErrors({ email: result.message });
    }
    setIsLoading(false);
  };
  
  const renderField = (name: keyof SignupFormData, labelKey: string, type: string = 'text', required: boolean = true, placeholderKey?: string, options?: readonly string[]) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{t(labelKey)}{required ? <span className="text-swiss-coral">*</span> : ''}</label>
      {type === 'select' && options ? (
        <select id={name} name={name} value={formData[name as keyof SignupFormData] as string || ''} onChange={handleChange} className={`${STANDARD_INPUT_FIELD} ${errors[name as keyof SignupFormData] ? 'border-swiss-coral' : ''}`}>
          <option value="">{t('signupPage.placeholders.select')}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <div className="relative">
          <input type={ (name === 'password' && !showPassword) || (name === 'confirmPassword' && !showConfirmPassword) ? 'password' : type}
            id={name} name={name} 
            value={String(formData[name as keyof SignupFormData] ?? '')}
            onChange={handleChange}
            className={`${STANDARD_INPUT_FIELD} ${errors[name as keyof SignupFormData] ? 'border-swiss-coral' : ''}`}
            placeholder={placeholderKey ? t(placeholderKey) : ''} />
            {(name === 'password' || name === 'confirmPassword') && (
                 <button type="button" onClick={() => name === 'password' ? setShowPassword(!showPassword) : setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-swiss-teal"
                    aria-label={ (name === 'password' && showPassword) || (name === 'confirmPassword' && showConfirmPassword) ? t('hidePassword') : t('showPassword')}
                 >
                    { (name === 'password' && showPassword) || (name === 'confirmPassword' && showConfirmPassword) ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                </button>
            )}
        </div>
      )}
      {errors[name as keyof SignupFormData] && <p className="text-xs text-swiss-coral mt-1">{errors[name as keyof SignupFormData]}</p>}
    </div>
  );

  const progressText = currentStep === 1 ? t('signupPage.progressStep1') : t('signupPage.progressStep2');
  const formTitle = currentStep === 1 ? t('signupPage.selectRoleTitle') : t('signupPage.detailsTitle', { role: selectedRole ? t(rolesConfig.find(rc => rc.role === selectedRole)!.nameKey) : '' });

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-xl">
        {currentStep === 3 ? (
            <div className="text-center">
                <CheckCircleIcon className="w-16 h-16 text-swiss-mint mx-auto mb-4"/>
                <h1 className="text-2xl font-bold text-swiss-charcoal">{t('signupPage.submissionSuccessTitle')}</h1>
                <p className="text-gray-600 mt-2 mb-6">{t('signupPage.submissionSuccessMessage')}</p>
                <Button onClick={() => navigate('/dashboard')} variant="primary" size="lg">
                    {t('signupPage.goToDashboardButton')}
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
                  <button key={role} onClick={() => handleRoleSelect(role)} aria-pressed={selectedRole === role}
                    className="p-6 border-2 rounded-lg text-center transition-all duration-200 ease-in-out hover:shadow-lg hover:border-swiss-mint hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-swiss-mint border-gray-300 bg-white">
                    <Icon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <span className="block font-semibold text-swiss-charcoal">{t(nameKey)}</span>
                  </button>
                ))}
              </div>
            )}

            {currentStep === 2 && selectedRole && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {selectedRole !== SignupRole.PARENT && renderField('organisationName', 'signupPage.labels.organisationName', 'text', true, 'signupPage.placeholders.organisationName')}
                {renderField('contactPerson', selectedRole === SignupRole.PARENT ? 'signupPage.labels.parentName' : 'signupPage.labels.contactPerson', 'text', true, selectedRole === SignupRole.PARENT ? 'signupPage.placeholders.parentName' : 'signupPage.placeholders.contactPerson')}
                {renderField('email', 'signupPage.labels.email', 'email', true, 'signupPage.placeholders.email')}
                {renderField('password', 'signupPage.labels.password', 'password', true, 'signupPage.placeholders.password')}
                {renderField('confirmPassword', 'signupPage.labels.confirmPassword', 'password', true, 'signupPage.placeholders.confirmPassword')}
                
                {selectedRole !== SignupRole.PARENT && renderField('phone', 'signupPage.labels.phone', 'tel', true, 'signupPage.placeholders.phone')}
                {selectedRole !== SignupRole.PARENT && renderField('canton', 'signupPage.labels.canton', 'select', true, undefined, SWISS_CANTONS)}

                {selectedRole === SignupRole.FOUNDATION && renderField('capacity', 'signupPage.labels.capacity', 'number', true)}
                {selectedRole === SignupRole.SUPPLIER && renderField('category', 'signupPage.labels.category', 'text', true, 'signupPage.placeholders.category')}
                {selectedRole === SignupRole.SERVICE_PROVIDER && renderField('serviceType', 'signupPage.labels.serviceType', 'text', true, 'signupPage.placeholders.serviceType')}
                
                {selectedRole === SignupRole.PARENT && (
                    <>
                        {renderField('childAge', 'signupPage.labels.childAge', 'number', true)}
                        {renderField('childStartDate', 'signupPage.labels.childStartDate', 'date', true)}
                    </>
                )}

                <div className="pt-2">
                  <label htmlFor="termsAccepted" className="flex items-center">
                    <input type="checkbox" id="termsAccepted" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} className={`h-4 w-4 text-swiss-mint border-gray-300 rounded focus:ring-swiss-mint ${errors.termsAccepted ? 'border-swiss-coral' : ''}`} />
                    <span className="ml-2 text-sm text-gray-600">{t('signupPage.termsLabel')}{' '}<a href="#/terms" target="_blank" rel="noopener noreferrer" className="text-swiss-mint hover:underline">{t('signupPage.termsLink')}</a>.</span>
                  </label>
                  {errors.termsAccepted && <p className="text-xs text-swiss-coral mt-1">{errors.termsAccepted}</p>}
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4">
                    <Button type="button" variant="light" onClick={handleBackToRoleSelection} leftIcon={ArrowLeftIcon} className="w-full sm:w-auto">
                        {t('buttons.goBack')}
                    </Button>
                    <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto bg-swiss-mint hover:bg-opacity-90" disabled={isLoading}>
                    {isLoading ? t('signupPage.creatingAccount') : t('signupPage.createAccountButton')}
                    </Button>
                </div>
              </form>
            )}
             <p className="mt-6 text-center text-sm text-gray-600">
              {t('loginPage.alreadyAccount')}{' '}
              <Link to="/login" className="font-medium text-swiss-mint hover:underline">
                {t('buttons.login')}
              </Link>
            </p>
        </>
        )}
      </Card>
    </div>
  );
};

export default SignupPage;
