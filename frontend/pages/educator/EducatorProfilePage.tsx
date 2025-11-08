
import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { STANDARD_INPUT_FIELD } from '../../constants';
import {
    UserCircleIcon, IdentificationIcon, CalendarDaysIcon,
    BriefcaseIcon, AcademicCapIcon, PaperClipIcon, StarIcon, PencilSquareIcon, XMarkIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { CandidateProfile } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useRecruitmentApi } from '../../hooks/useRecruitmentApi';

const SectionCard: React.FC<{ titleKey: string; icon: React.ElementType; children: React.ReactNode; onEdit?: () => void; isEditing?: boolean }> = ({ titleKey, icon: Icon, children, onEdit, isEditing }) => {
    const { t } = useTranslation(['dashboard', 'common']);
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-swiss-charcoal flex items-center">
            <Icon className="w-6 h-6 mr-3 text-swiss-teal" />
            {t(titleKey)}
          </h2>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} leftIcon={isEditing ? XMarkIcon : PencilSquareIcon}>
              {isEditing ? t('common:buttons.cancel') : t('common:buttons.edit')}
            </Button>
          )}
        </div>
        {children}
      </Card>
    );
};

const EducatorProfilePage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAppContext();
  const { getCandidateById } = useRecruitmentApi();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchProfile = useMemo(
    () => async () => {
      if (!currentUser) {
        setLoading(false);
        setProfile(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getCandidateById(currentUser.id);
        setProfile({
          ...data,
          skills: data.skills ?? [],
          workExperience: data.workExperience ?? [],
          education: data.education ?? [],
          certifications: data.certifications ?? [],
          documents: data.documents ?? [],
        });
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : t('educatorProfilePage.loadError', 'Unable to load profile.'));
        setProfile(null);
      } finally {
        setLoading(false);
      }
    },
    [currentUser, getCandidateById, t],
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = () => {
    console.log('Saving profile data:', profile);
    alert(t('educatorProfilePage.saveSuccess', 'Profile changes saved!'));
    setIsEditing(false);
  };

  if (loading) {
    return <p className="text-center text-gray-500">{t('common:loading', 'Loading...')}</p>;
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <p className="text-red-600">{error || t('educatorProfilePage.loadError', 'Unable to load profile.')}</p>
        <Button variant="primary" onClick={fetchProfile}>{t('common:buttons.retry', 'Retry')}</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center mb-4 sm:mb-0">
          <IdentificationIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('sidebar.myProfile')}
        </h1>
        <div className="flex space-x-2">
            {isEditing && <Button variant="light" onClick={() => setIsEditing(false)}>{t('common:buttons.cancel')}</Button>}
            <Button variant="primary" leftIcon={isEditing ? undefined : PencilSquareIcon} onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
                {isEditing ? t('common:buttons.saveChanges') : t('educatorProfilePage.editProfile')}
            </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 text-center">
                <img
                  src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}`}
                  alt="Profile"
                  className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white shadow-lg bg-gray-200"
                />
              {isEditing && <input type="file" className="text-xs text-center mx-auto block w-full max-w-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-swiss-teal/10 file:text-swiss-teal hover:file:bg-swiss-teal/20" />}
              <h2 className="text-2xl font-bold text-swiss-charcoal mt-4">{profile.name}</h2>
                <p className="text-md text-swiss-teal">{profile.currentRoleOrTitle ?? t('educatorProfilePage.roleUnknown', 'Role not specified')}</p>
                <p className="text-sm text-gray-500">{profile.location ?? t('educatorProfilePage.locationUnknown', 'Location not provided')}</p>
            </Card>

            <SectionCard titleKey="educatorProfilePage.skills.title" icon={StarIcon}>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.length > 0
                    ? profile.skills.map(skill => (
                        <span key={skill} className="bg-swiss-mint/10 text-swiss-mint text-xs font-medium px-2.5 py-1 rounded-full">
                          {skill}
                        </span>
                      ))
                    : <span className="text-xs text-gray-500">{t('educatorProfilePage.skills.empty', 'No skills listed yet.')}</span>}
                </div>
            </SectionCard>
             <SectionCard titleKey="educatorProfilePage.availability.title" icon={CalendarDaysIcon}>
                 <div className="space-y-2 text-sm text-gray-700">
                      <p><strong>{t('educatorProfilePage.availability.days')}:</strong> {profile.availabilityPreferences?.days?.join(', ') ?? t('educatorProfilePage.notProvided', 'Not provided')}</p>
                      <p><strong>{t('educatorProfilePage.availability.times')}:</strong> {profile.availabilityPreferences?.times ?? t('educatorProfilePage.notProvided', 'Not provided')}</p>
                      <p><strong>{t('educatorProfilePage.availability.contract')}:</strong> {profile.availabilityPreferences?.contractType ?? t('educatorProfilePage.notProvided', 'Not provided')}</p>
                      <p><strong>{t('educatorProfilePage.availability.ageGroups')}:</strong> {profile.availabilityPreferences?.preferredAgeGroups?.join(', ') ?? t('educatorProfilePage.notProvided', 'Not provided')}</p>
                 </div>
            </SectionCard>
             <SectionCard titleKey="educatorProfilePage.documents.title" icon={PaperClipIcon}>
                <ul className="space-y-2">
                  {profile.documents && profile.documents.length > 0 ? (
                    profile.documents.map((doc) => (
                      <li key={doc.id}>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" 
                            className="flex items-center text-swiss-mint hover:underline hover:text-swiss-teal p-2 -m-2 rounded-md hover:bg-gray-50 transition-colors">
                            <PaperClipIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{doc.name} ({doc.type})</span>
                        </a>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-gray-500">{t('educatorProfilePage.documents.empty', 'No documents uploaded yet.')}</li>
                  )}
                </ul>
            </SectionCard>
        </div>

        <div className="lg:col-span-2 space-y-6">
            <SectionCard titleKey="educatorProfilePage.bio.title" icon={UserCircleIcon}>
                  {isEditing ? (
                      <textarea value={profile.shortBio ?? ''} onChange={e => setProfile({...profile, shortBio: e.target.value})} rows={4} className={STANDARD_INPUT_FIELD}/>
                  ) : (
                      <p className="text-gray-700 whitespace-pre-line">
                        {profile.shortBio ?? t('educatorProfilePage.bio.empty', 'No bio information yet.')}
                      </p>
                  )}
            </SectionCard>
            <SectionCard titleKey="educatorProfilePage.experience.title" icon={BriefcaseIcon}>
                <div className="space-y-4">
                  {profile.workExperience && profile.workExperience.length > 0 ? profile.workExperience.map((exp) => (
                    <div key={exp.id} className="relative p-3 bg-gray-50 rounded-md">
                    <h3 className="font-semibold text-swiss-charcoal">{exp.jobTitle}</h3>
                    <p className="text-sm text-swiss-teal">{exp.institutionName}</p>
                    <p className="text-xs text-gray-500">{exp.startDate} – {exp.endDate}</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-0.5">
                        {exp.descriptionPoints.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                    </div>
                  )) : <p className="text-sm text-gray-500">{t('educatorProfilePage.experience.empty', 'No experience added yet.')}</p>}
                </div>
            </SectionCard>
            <SectionCard titleKey="educatorProfilePage.education.title" icon={AcademicCapIcon}>
                <div className="space-y-4">
                  {profile.education && profile.education.length > 0 ? profile.education.map((edu) => (
                    <div key={edu.id} className="p-3 bg-gray-50 rounded-md">
                    <h3 className="font-semibold text-swiss-charcoal">{edu.degree}</h3>
                    <p className="text-sm text-swiss-teal">{edu.institutionName}</p>
                    <p className="text-xs text-gray-500">{t('educatorProfilePage.education.graduated')}: {edu.graduationYear}</p>
                    </div>
                  )) : <p className="text-sm text-gray-500">{t('educatorProfilePage.education.empty', 'No education added yet.')}</p>}
                </div>
            </SectionCard>
               <SectionCard titleKey="educatorProfilePage.certifications.title" icon={StarIcon}>
                  <div className="space-y-3">
                    {profile.certifications && profile.certifications.length > 0 ? (
                      profile.certifications.map((cert) => (
                        <div key={cert.id} className="p-3 bg-gray-50 rounded-md">
                            <h3 className="font-semibold text-swiss-charcoal">{cert.name}</h3>
                            <p className="text-sm text-swiss-teal">{cert.issuingOrganization}</p>
                            <p className="text-xs text-gray-500">
                                {t('educatorProfilePage.certifications.issued')}: {cert.issueDate}
                                {cert.expiryDate && ` - ${t('educatorProfilePage.certifications.expires')}: ${cert.expiryDate}`}
                            </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">{t('educatorProfilePage.certifications.empty', 'No certifications added yet.')}</p>
                    )}
                  </div>
              </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default EducatorProfilePage;
