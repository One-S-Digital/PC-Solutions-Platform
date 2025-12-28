
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { APP_NAME, STANDARD_INPUT_FIELD, SWISS_CANTONS } from '../constants'; 
import { ArrowLeftIcon, SquaresPlusIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import { UserRole } from '../types'; 
import { useTranslation } from 'react-i18next';
import { useFrontendSettings } from '../hooks/useFrontendSettings';
import { getHomePath } from '../utils/navigation';

const ParentLeadFormPage: React.FC = () => {
  const { t } = useTranslation(['parentLeadForm', 'common']);
  const { submitParentLead, currentUser } = useAppContext(); 
  const navigate = useNavigate();
  const { settings, loading: settingsLoading } = useFrontendSettings();
  const isParentUser = currentUser?.role === UserRole.PARENT;
  const homePath = getHomePath(currentUser);
  const logoUrl = settings?.logoAsset?.publicUrl;
  const showLogoFallback = !settingsLoading && !logoUrl;

  const renderLogo = (imageClassName: string, iconClassName: string) => {
    if (logoUrl) {
      return (
        <Link to={homePath} aria-label={t('common:buttons.goHome', 'Go to home')}>
          <img src={logoUrl} alt={settings?.siteName || APP_NAME} className={imageClassName} />
        </Link>
      );
    }

    if (showLogoFallback) {
      return (
        <Link to={homePath} aria-label={t('common:buttons.goHome', 'Go to home')}>
          <SquaresPlusIcon className={iconClassName} />
        </Link>
      );
    }

    return <span className={imageClassName} aria-hidden="true" />;
  };
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
  const [cities, setCities] = useState<string[]>(['']);
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

  const handleCityChange = (index: number, value: string) => {
    const newCities = [...cities];
    newCities[index] = value;
    setCities(newCities);
  };

  const addCity = () => {
    setCities([...cities, '']);
  };

  const removeCity = (index: number) => {
    if (cities.length > 1) {
      const newCities = cities.filter((_, i) => i !== index);
      setCities(newCities);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.canton || !formData.childAge || !formData.desiredStartDate || !formData.contactName || !formData.contactEmail) {
        alert(t('parentLeadForm:messages.error', { defaultValue: 'Please fill in all required fields' }));
        return;
    }
    const wasUnauthenticated = !currentUser;

    // Filter out empty cities and trim whitespace
    const preferredCities = cities.filter(city => city.trim() !== '').map(city => city.trim());

    submitParentLead({
      canton: formData.canton,
      municipality: formData.municipality,
      preferredCities,
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
            {renderLogo('h-16 w-auto mx-auto mb-4', 'h-16 w-16 text-swiss-mint mx-auto mb-4')}
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
        {renderLogo('h-16 w-auto mx-auto mb-2', 'h-12 w-12 text-swiss-mint mx-auto mb-2')}
        <h1 className="text-3xl font-bold text-swiss-charcoal">{t('parentLeadForm:title')}</h1>
        <p className="text-gray-600">{t('parentLeadForm:subtitle')}</p>
      </div>
      <Card className="w-full max-w-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">{t('parentLeadForm:labels.fullName')}</label>
            <input type="text" name="contactName" id="contactName" value={formData.contactName} onChange={handleChange} required className={STANDARD_INPUT_FIELD} placeholder={t('parentLeadForm:placeholders.fullName')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">{t('parentLeadForm:labels.email')}</label>
              <input type="email" name="contactEmail" id="contactEmail" value={formData.contactEmail} onChange={handleChange} required className={STANDARD_INPUT_FIELD} placeholder={t('parentLeadForm:placeholders.email')} />
            </div>
            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">{t('parentLeadForm:labels.phoneNumber')}</label>
              <input type="tel" name="contactPhone" id="contactPhone" value={formData.contactPhone} onChange={handleChange} className={STANDARD_INPUT_FIELD} placeholder={t('parentLeadForm:placeholders.phoneNumber')} />
            </div>
          </div>
          
          <hr className="my-6"/>
          <h2 className="text-lg font-semibold text-swiss-charcoal">{t('parentLeadForm:labels.childNeeds')}</h2>

          <div>
            <label htmlFor="canton" className="block text-sm font-medium text-gray-700 mb-1">{t('parentLeadForm:labels.canton')}</label>
            <select name="canton" id="canton" value={formData.canton} onChange={handleChange} required className={STANDARD_INPUT_FIELD}>
              <option value="">{t('parentLeadForm:placeholders.canton')}</option>
              {SWISS_CANTONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {formData.canton && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('parentLeadForm:labels.cities')}</label>
              <p className="text-xs text-gray-500 mb-2">{t('parentLeadForm:labels.citiesHelpText')}</p>
              <div className="space-y-2">
                {cities.map((city, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => handleCityChange(index, e.target.value)}
                      className={`${STANDARD_INPUT_FIELD} flex-1`}
                      placeholder={t('parentLeadForm:placeholders.city')}
                    />
                    {cities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCity(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        title={t('parentLeadForm:buttons.removeCity')}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCity}
                className="mt-2 inline-flex items-center gap-1 text-sm text-swiss-teal hover:text-swiss-mint transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                {t('parentLeadForm:buttons.addCity')}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="childAge" className="block text-sm font-medium text-gray-700 mb-1">{t('parentLeadForm:labels.childAge')}</label>
              <input type="number" name="childAge" id="childAge" value={formData.childAge} onChange={handleChange} required min="0" max="72" className={STANDARD_INPUT_FIELD} placeholder={t('parentLeadForm:placeholders.childAge')} />
            </div>
            <div>
              <label htmlFor="desiredStartDate" className="block text-sm font-medium text-gray-700 mb-1">{t('parentLeadForm:labels.startDate')}</label>
              <input type="date" name="desiredStartDate" id="desiredStartDate" value={formData.desiredStartDate} onChange={handleChange} required className={STANDARD_INPUT_FIELD} />
            </div>
          </div>

          <div>
            <label htmlFor="specialNeeds" className="block text-sm font-medium text-gray-700 mb-1">{t('parentLeadForm:labels.specialNeeds')}</label>
            <textarea name="specialNeeds" id="specialNeeds" value={formData.specialNeeds} onChange={handleChange} rows={3} className={STANDARD_INPUT_FIELD} placeholder={t('parentLeadForm:placeholders.specialRequirements')}></textarea>
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
