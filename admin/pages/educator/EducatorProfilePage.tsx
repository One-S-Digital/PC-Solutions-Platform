
import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { STANDARD_INPUT_FIELD, MOCK_CANDIDATE_PROFILES } from '../../constants';
import { 
    UserCircleIcon, IdentificationIcon, ArrowUpTrayIcon, CalendarDaysIcon, 
    BriefcaseIcon, AcademicCapIcon, PaperClipIcon, StarIcon, PencilSquareIcon, XMarkIcon 
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { CandidateProfile, WorkExperienceItem, EducationItem, DocumentItem, CertificationItem } from '../../types';

// Use the first mock candidate as the data for this page
const mockCandidateData = MOCK_CANDIDATE_PROFILES[0];

const SectionCard: React.FC<{ titleKey: string; icon: React.ElementType; children: React.ReactNode; onEdit?: () => void; isEditing?: boolean }> = ({ titleKey, icon: Icon, children, onEdit, isEditing }) => {
    const { t } = useTranslation();
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-swiss-charcoal flex items-center">
            <Icon className="w-6 h-6 mr-3 text-swiss-teal" />
            {t(titleKey)}
          </h2>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} leftIcon={isEditing ? XMarkIcon : PencilSquareIcon}>
              {isEditing ? t('buttons.cancel') : t('buttons.edit')}
            </Button>
          )}
        </div>
        {children}
      </Card>
    );
};

const EducatorProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<CandidateProfile>(mockCandidateData);
  const [isEditing, setIsEditing] = useState(false);
  const [editSection, setEditSection] = useState<string | null>(null);

  const handleSave = () => {
    console.log("Saving profile data:", profile);
    alert("Profile changes saved!");
    setIsEditing(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-swiss-charcoal flex items-center mb-4 sm:mb-0">
          <IdentificationIcon className="w-8 h-8 mr-3 text-swiss-mint" />
          {t('sidebar.myProfile')}
        </h1>
        <div className="flex space-x-2">
            {isEditing && <Button variant="light" onClick={() => setIsEditing(false)}>{t('buttons.cancel')}</Button>}
            <Button variant="primary" leftIcon={isEditing ? undefined : PencilSquareIcon} onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
                {isEditing ? t('buttons.saveChanges') : t('educatorProfilePage.editProfile')}
            </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 text-center">
              <img 
                src={profile.avatarUrl} 
                alt="Profile" 
                className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white shadow-lg bg-gray-200"
              />
              {isEditing && <input type="file" className="text-xs text-center mx-auto block w-full max-w-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-swiss-teal/10 file:text-swiss-teal hover:file:bg-swiss-teal/20" />}
              <h2 className="text-2xl font-bold text-swiss-charcoal mt-4">{profile.name}</h2>
              <p className="text-md text-swiss-teal">{profile.currentRoleOrTitle}</p>
              <p className="text-sm text-gray-500">{profile.location}</p>
            </Card>

            <SectionCard titleKey="educatorProfilePage.skills.title" icon={StarIcon}>
                <div className="flex flex-wrap gap-2">
                {profile.skills.map(skill => (
                    <span key={skill} className="bg-swiss-mint/10 text-swiss-mint text-xs font-medium px-2.5 py-1 rounded-full">
                    {skill}
                    </span>
                ))}
                </div>
            </SectionCard>
             <SectionCard titleKey="educatorProfilePage.availability.title" icon={CalendarDaysIcon}>
                 <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>{t('educatorProfilePage.availability.days')}:</strong> {profile.availabilityPreferences.days.join(', ')}</p>
                    <p><strong>{t('educatorProfilePage.availability.times')}:</strong> {profile.availabilityPreferences.times}</p>
                    <p><strong>{t('educatorProfilePage.availability.contract')}:</strong> {profile.availabilityPreferences.contractType}</p>
                    <p><strong>{t('educatorProfilePage.availability.ageGroups')}:</strong> {profile.availabilityPreferences.preferredAgeGroups.join(', ')}</p>
                 </div>
            </SectionCard>
             <SectionCard titleKey="educatorProfilePage.documents.title" icon={PaperClipIcon}>
                <ul className="space-y-2">
                {profile.documents.map((doc) => (
                    <li key={doc.id}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" 
                        className="flex items-center text-swiss-mint hover:underline hover:text-swiss-teal p-2 -m-2 rounded-md hover:bg-gray-50 transition-colors">
                        <PaperClipIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{doc.name} ({doc.type})</span>
                    </a>
                    </li>
                ))}
                </ul>
            </SectionCard>
        </div>

        <div className="lg:col-span-2 space-y-6">
            <SectionCard titleKey="educatorProfilePage.bio.title" icon={UserCircleIcon}>
                {isEditing ? (
                    <textarea value={profile.shortBio} onChange={e => setProfile({...profile, shortBio: e.target.value})} rows={4} className={STANDARD_INPUT_FIELD}/>
                ) : (
                    <p className="text-gray-700 whitespace-pre-line">{profile.shortBio}</p>
                )}
            </SectionCard>
            <SectionCard titleKey="educatorProfilePage.experience.title" icon={BriefcaseIcon}>
                <div className="space-y-4">
                {profile.workExperience.map((exp) => (
                    <div key={exp.id} className="relative p-3 bg-gray-50 rounded-md">
                    <h3 className="font-semibold text-swiss-charcoal">{exp.jobTitle}</h3>
                    <p className="text-sm text-swiss-teal">{exp.institutionName}</p>
                    <p className="text-xs text-gray-500">{exp.startDate} – {exp.endDate}</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-0.5">
                        {exp.descriptionPoints.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                    </div>
                ))}
                </div>
            </SectionCard>
            <SectionCard titleKey="educatorProfilePage.education.title" icon={AcademicCapIcon}>
                <div className="space-y-4">
                {profile.education.map((edu) => (
                    <div key={edu.id} className="p-3 bg-gray-50 rounded-md">
                    <h3 className="font-semibold text-swiss-charcoal">{edu.degree}</h3>
                    <p className="text-sm text-swiss-teal">{edu.institutionName}</p>
                    <p className="text-xs text-gray-500">{t('educatorProfilePage.education.graduated')}: {edu.graduationYear}</p>
                    </div>
                ))}
                </div>
            </SectionCard>
             {profile.certifications && profile.certifications.length > 0 && (
                <SectionCard titleKey="educatorProfilePage.certifications.title" icon={StarIcon}>
                    <div className="space-y-3">
                        {profile.certifications.map((cert) => (
                            <div key={cert.id} className="p-3 bg-gray-50 rounded-md">
                                <h3 className="font-semibold text-swiss-charcoal">{cert.name}</h3>
                                <p className="text-sm text-swiss-teal">{cert.issuingOrganization}</p>
                                <p className="text-xs text-gray-500">
                                    {t('educatorProfilePage.certifications.issued')}: {cert.issueDate} {cert.expiryDate && ` - ${t('educatorProfilePage.certifications.expires')}: ${cert.expiryDate}`}
                                </p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}
        </div>
      </div>
    </div>
  );
};

export default EducatorProfilePage;
