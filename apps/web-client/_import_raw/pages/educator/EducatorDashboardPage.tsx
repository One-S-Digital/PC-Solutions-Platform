
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BriefcaseIcon, CheckCircleIcon, UserCircleIcon, AcademicCapIcon, EyeIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';

const EducatorDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  // Mock data based on UI Spec
  const profileCompletion = 80; // Percentage

  const applicationStatus = {
    submitted: 5,
    viewed: 3,
    interviews: 1,
    offers: 1,
  };

  const jobRecommendations = [
    { id: 'job1', title: 'Lead Educator (Bilingual)', foundation: 'KinderWelt Vaud', match: 92 },
    { id: 'job2', title: 'Early Childhood Specialist', foundation: 'Happy Kids Geneva', match: 85 },
    { id: 'job3', title: 'Montessori Guide', foundation: 'Zurich Child Center', match: 78 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-swiss-charcoal">
          {t('educatorDashboard.title')}
        </h1>
        <p className="text-gray-500 mt-1">{t('educatorDashboard.welcome', { name: currentUser?.name?.split(' ')[0] })}</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-swiss-charcoal">{t('educatorDashboard.profileCompletion.title')}</h2>
            <p className="text-sm text-gray-500">{t('educatorDashboard.profileCompletion.subtitle')}</p>
          </div>
          <div className="w-full sm:w-auto mt-4 sm:mt-0 flex items-center gap-4">
            <div className="w-full sm:w-48 bg-gray-200 rounded-full h-2.5">
              <div className="bg-swiss-mint h-2.5 rounded-full" style={{ width: `${profileCompletion}%` }}></div>
            </div>
            <span className="font-semibold text-swiss-mint">{profileCompletion}%</span>
            <Button variant="outline" size="sm" onClick={() => navigate('/educator/profile')}>{t('educatorDashboard.profileCompletion.button')}</Button>
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Application Status) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">{t('educatorDashboard.applicationStatus.title')}</h2>
            <ul className="space-y-3">
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{t('educatorDashboard.applicationStatus.submitted')}</span>
                <span className="font-bold text-swiss-charcoal bg-gray-100 px-2 py-0.5 rounded-md">{applicationStatus.submitted}</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{t('educatorDashboard.applicationStatus.viewed')}</span>
                <span className="font-bold text-swiss-charcoal bg-gray-100 px-2 py-0.5 rounded-md">{applicationStatus.viewed}</span>
              </li>
               <li className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{t('educatorDashboard.applicationStatus.interviews')}</span>
                <span className="font-bold text-swiss-mint bg-swiss-mint/10 px-2 py-0.5 rounded-md">{applicationStatus.interviews}</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{t('educatorDashboard.applicationStatus.offers')}</span>
                <span className="font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-md">{applicationStatus.offers}</span>
              </li>
            </ul>
             <Button variant="secondary" size="sm" className="w-full mt-5" onClick={() => navigate('/educator/applications')}>
                {t('educatorDashboard.applicationStatus.button')}
            </Button>
          </Card>
          <Card className="p-5">
             <h2 className="text-lg font-semibold text-swiss-charcoal mb-2 flex items-center"><AcademicCapIcon className="w-5 h-5 mr-2 text-swiss-coral"/>{t('educatorDashboard.skills.title')}</h2>
             <p className="text-sm text-gray-500 mb-3">{t('educatorDashboard.skills.subtitle')}</p>
             <Button variant="outline" size="sm" className="w-full">{t('educatorDashboard.skills.button')}</Button>
          </Card>
        </div>

        {/* Right Column (Job Recommendations) */}
        <div className="lg:col-span-2">
          <Card className="p-5 h-full">
            <h2 className="text-lg font-semibold text-swiss-charcoal mb-4">{t('educatorDashboard.recommendations.title')}</h2>
            <div className="space-y-4">
              {jobRecommendations.map(job => (
                <div key={job.id} className="p-4 rounded-lg border border-gray-200 hover:border-swiss-mint hover:bg-swiss-mint/5 transition-all flex items-center">
                  <div className="mr-4 p-2 bg-swiss-teal/10 rounded-md">
                    <BriefcaseIcon className="w-6 h-6 text-swiss-teal"/>
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold text-swiss-charcoal">{job.title}</p>
                    <p className="text-sm text-gray-500">{job.foundation}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-bold text-swiss-mint">{job.match}% {t('educatorDashboard.recommendations.match')}</p>
                    <Button variant="ghost" size="xs" onClick={() => alert(`${t('buttons.applyNow')} TBD`)}>{t('buttons.applyNow')} <ArrowUpRightIcon className="w-3 h-3 ml-1"/></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EducatorDashboardPage;
