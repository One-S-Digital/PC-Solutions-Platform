
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { APP_NAME, STANDARD_INPUT_FIELD, SWISS_CANTONS } from '../constants'; 
import { ArrowLeftIcon, SquaresPlusIcon } from '@heroicons/react/24/outline';
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import { UserRole } from '../types'; 
import { useTranslation } from 'react-i18next';
import { useFrontendSettings } from '../hooks/useFrontendSettings';

const ParentLeadFormPage: React.FC = () => {
  const { t } = useTranslation(['parentLeadForm', 'common']);
  const { submitParentLead, currentUser } = useAppContext(); 
  const navigate = useNavigate();
  const { settings } = useFrontendSettings();
  const isParentUser = currentUser?.role === UserRole.PARENT;
  const [formData, setFormData] = useState({
    canton: '',
    municipality: '',
    childAge: '',
    desiredStartDate: '',
    specialNeeds: '',
    contactName: '', 
    contactEmail: '', 
    contactPhone: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [unauthenticatedSuccess, setUnauthenticatedSuccess] = useState(false); // New state
  const backButtonLabel = isParentUser
    ? t('parentLeadForm:buttons.backToDashboard', 'Back to dashboard')
    : t('parentLeadForm:buttons.backToHome', 'Back to home');

  useEffect(() => {
    if (currentUser && currentUser.role !== UserRole.PARENT) {
      navigate('/dashboard', { replace: true });
    } else if (currentUser && currentUser.role === UserRole.PARENT) {
      setFormData(prev => ({
        ...prev,
        contactName: currentUser.name,
        contactEmail: currentUser.email,
      }));
    }
  }, [currentUser, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.canton || !formData.childAge || !formData.desiredStartDate || !formData.contactName || !formData.contactEmail) {
        alert(t('parentLeadForm:messages.error', { defaultValue: 'Please fill in all required fields' }));
        return;
    }
    const wasUnauthenticated = !currentUser;

    submitParentLead({
      canton: formData.canton,
      municipality: formData.municipality,
      childAge: parseInt(formData.childAge, 10),
      desiredStartDate: formData.desiredStartDate,
      specialNeeds: formData.specialNeeds,
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
    });

    if (wasUnauthenticated) {
      setUnauthenticatedSuccess(true);
    }
    setSubmitted(true);
  };

  const handleBackClick = () => {
    if (isParentUser) {
      navigate('/parent/dashboard');
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const BackButton = ({ maxWidthClass }: { maxWidthClass: string }) => (
    <div className={`w-full ${maxWidthClass} mb-4 self-start`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={ArrowLeftIcon}
        onClick={handleBackClick}
        className="px-0 text-swiss-teal hover:text-swiss-mint"
      >
        {backButtonLabel}
      </Button>
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-swiss-light-gray flex flex-col items-center justify-center p-4">
        <BackButton maxWidthClass="max-w-lg" />
        <Card className="w-full max-w-lg p-8 text-center">
            {settings?.logoAsset?.publicUrl ? (
              <img 
                src={settings.logoAsset.publicUrl} 
                alt={settings.siteName || APP_NAME} 
                className="h-16 w-auto mx-auto mb-4" 
              />
            ) : (
              <SquaresPlusIcon className="h-16 w-16 text-swiss-mint mx-auto mb-4" />
            )}
          <h1 className="text-2xl font-bold text-swiss-charcoal mb-4">{t('parentLeadForm:messages.success')}</h1>
          {unauthenticatedSuccess ? (
            <>
              <p className="text-gray-600 mb-6">
                {t('parentLeadForm:messages.success')}
              </p>
              <Button variant="primary" onClick={() => navigate('/login')}>{t('common:buttons.goToLogin')}</Button>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                {t('parentLeadForm:messages.success')}
              </p>
              <Button variant="primary" onClick={() => navigate('/parent/enquiries')}>{t('parentLeadForm:buttons.viewMyEnquiries')}</Button>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-6">
      <BackButton maxWidthClass="max-w-2xl" />
      <div className="text-center mb-8">
        {settings?.logoAsset?.publicUrl ? (
          <img 
            src={settings.logoAsset.publicUrl} 
            alt={settings.siteName || APP_NAME} 
            className="h-16 w-auto mx-auto mb-2" 
          />
        ) : (
          <SquaresPlusIcon className="h-12 w-12 text-swiss-mint mx-auto mb-2" />
        )}
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>
      <Card className="w-full max-w-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">{t('labels.fullName')}</label>
            <input type="text" name="contactName" id="contactName" value={formData.contactName} onChange={handleChange} required className={STANDARD_INPUT_FIELD} placeholder={t('placeholders.fullName')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">{t('labels.email')}</label>
              <input type="email" name="contactEmail" id="contactEmail" value={formData.contactEmail} onChange={handleChange} required className={STANDARD_INPUT_FIELD} placeholder={t('placeholders.email')} />
            </div>
            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">{t('labels.phoneNumber')}</label>
              <input type="tel" name="contactPhone" id="contactPhone" value={formData.contactPhone} onChange={handleChange} className={STANDARD_INPUT_FIELD} placeholder={t('placeholders.phoneNumber')} />
            </div>
          </div>
          
          <hr className="my-6"/>
          <h2 className="text-lg font-semibold text-swiss-charcoal">{t('labels.childNeeds')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="canton" className="block text-sm font-medium text-gray-700 mb-1">{t('labels.canton')}</label>
              <select name="canton" id="canton" value={formData.canton} onChange={handleChange} required className={STANDARD_INPUT_FIELD}>
                <option value="">{t('placeholders.canton')}</option>
                {SWISS_CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="municipality" className="block text-sm font-medium text-gray-700 mb-1">{t('labels.municipality')}</label>
              <input type="text" name="municipality" id="municipality" value={formData.municipality} onChange={handleChange} className={STANDARD_INPUT_FIELD} placeholder={t('placeholders.municipality')} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="childAge" className="block text-sm font-medium text-gray-700 mb-1">{t('labels.childAge')}</label>
              <input type="number" name="childAge" id="childAge" value={formData.childAge} onChange={handleChange} required min="0" max="72" className={STANDARD_INPUT_FIELD} placeholder={t('placeholders.childAge')} />
            </div>
            <div>
              <label htmlFor="desiredStartDate" className="block text-sm font-medium text-gray-700 mb-1">{t('labels.startDate')}</label>
              <input type="date" name="desiredStartDate" id="desiredStartDate" value={formData.desiredStartDate} onChange={handleChange} required className={STANDARD_INPUT_FIELD} placeholder={t('placeholders.startDate')} />
            </div>
          </div>

          <div>
            <label htmlFor="specialNeeds" className="block text-sm font-medium text-gray-700 mb-1">{t('labels.specialNeeds')}</label>
            <textarea name="specialNeeds" id="specialNeeds" value={formData.specialNeeds} onChange={handleChange} rows={3} className={STANDARD_INPUT_FIELD} placeholder={t('placeholders.specialRequirements')}></textarea>
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary" size="lg" className="w-full">{t('common:buttons.submitEnquiry')}</Button>
          </div>
        </form>
      </Card>
      <p className="text-center text-sm text-gray-500 mt-8">
        {t('auth:alreadyHaveAccount')}{' '}
        <Link to="/login" className="text-swiss-mint hover:underline">{t('common:buttons.login')}</Link>
      </p>
    </div>
  );
};

export default ParentLeadFormPage;
