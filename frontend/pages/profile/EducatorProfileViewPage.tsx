import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  PaperClipIcon,
  EnvelopeIcon,
  PlusCircleIcon,
  StarIcon,
  UserCircleIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useRecruitmentApi } from '../../hooks/useRecruitmentApi';
import { CandidateProfile, UserRole } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useMessaging } from '../../contexts/MessagingContext';

const SectionCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({
  title,
  icon: Icon,
  children,
}) => (
  <Card className="p-6">
    <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
      <Icon className="w-6 h-6 mr-3 text-swiss-teal" />
      {title}
    </h2>
    {children}
  </Card>
);

const EducatorProfileViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard', 'common', 'profile']);
  const { getCandidateById } = useRecruitmentApi();
  const { currentUser } = useAppContext();
  const { startOrGetConversation, sendMessage } = useMessaging();

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandidate = async () => {
      if (!id) {
        setError('Educator ID is required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getCandidateById(id);
        setCandidate({
          ...data,
          skills: data.skills ?? [],
          workExperience: data.workExperience ?? [],
          education: data.education ?? [],
          certifications: data.certifications ?? [],
          documents: data.documents ?? [],
        });
      } catch (err) {
        console.error('Failed to fetch candidate:', err);
        setError(err instanceof Error ? err.message : 'Failed to load educator profile');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [id, getCandidateById]);

  const handleSendMessage = async () => {
    if (!candidate) return;
    try {
      const conversationId = await startOrGetConversation(candidate.id, candidate.name, UserRole.EDUCATOR);
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleInviteToApply = async () => {
    if (!candidate || !currentUser) return;
    try {
      const conversationId = await startOrGetConversation(candidate.id, candidate.name, UserRole.EDUCATOR);
      await sendMessage(
        conversationId,
        `Dear ${candidate.name},\n\nWe were impressed with your profile and would like to invite you to apply for a position with our daycare. Please let us know if you're interested.\n\nBest regards,`,
      );
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <LoadingSpinner text={t('common:loading', 'Loading...')} />
        </Card>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <UserCircleIcon className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-xl font-semibold text-swiss-charcoal">
                {t('profile:educator.notFound', 'Educator not found')}
              </p>
              <p className="text-gray-600">
                {error || t('profile:educator.notFoundMessage', 'The profile you are looking for does not exist.')}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon}>
                {t('common:buttons.goBack', 'Go Back')}
              </Button>
              <Button variant="primary" onClick={() => window.location.reload()}>
                {t('common:buttons.retry', 'Retry')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const {
    name,
    avatarUrl,
    currentRoleOrTitle,
    location,
    availabilityStatus,
    shortBio,
    skills,
    workExperience,
    education,
    educationText,
    certifications,
    availabilityPreferences,
    documents,
    email,
    phone,
    experience,
  } = candidate;

  const isOwnProfile = currentUser?.id === candidate.id;
  const isFoundationUser = currentUser?.role === UserRole.FOUNDATION;
  const isAdminOrSuperAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon} className="mb-0">
        {t('common:buttons.goBack', 'Go Back')}
      </Button>

      {/* Social Media Style Header with Cover Image and Avatar */}
      <Card className="overflow-hidden p-0">
        {/* Cover Image Section */}
        <div className="w-full aspect-[4/1] bg-gradient-to-r from-swiss-mint/20 to-swiss-teal/20 relative">
          <div className="w-full h-full bg-gradient-to-br from-swiss-mint/30 via-swiss-teal/20 to-swiss-mint/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          {/* Avatar Section - Positioned at bottom of cover */}
          <div className="absolute bottom-0 left-6 transform translate-y-1/2">
            <div className="relative">
              <img
                src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=48CFAE&color=fff&size=160&rounded=true`}
                alt={name}
                className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-white object-cover"
              />
            </div>
          </div>
        </div>

        {/* Profile Header Content */}
        <div className="pt-20 pb-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-swiss-charcoal">{name}</h1>
              {currentRoleOrTitle && (
                <p className="text-xl text-swiss-teal mt-1">{currentRoleOrTitle}</p>
              )}
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                {location && (
                  <p className="flex items-start gap-2">
                    <MapPinIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="min-w-0 whitespace-normal break-words">{location}</span>
                  </p>
                )}
                {availabilityStatus && (
                  <p className="flex items-start gap-2">
                    <CalendarDaysIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="min-w-0 whitespace-normal break-words">{availabilityStatus}</span>
                  </p>
                )}
              </div>
              {shortBio && (
                <p className="text-gray-700 mt-4 max-w-2xl">{shortBio}</p>
              )}
            </div>
            {!isOwnProfile && (
              <div className="flex flex-wrap gap-2">
                {isFoundationUser && (
                  <Button
                    variant="primary"
                    leftIcon={PlusCircleIcon}
                    onClick={handleInviteToApply}
                  >
                    {t('profile:educator.inviteToApply', 'Invite to Apply')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  leftIcon={EnvelopeIcon}
                  onClick={handleSendMessage}
                >
                  {t('common:buttons.sendMessage', 'Send Message')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {shortBio && (
            <SectionCard title={t('profile:educator.bio', 'About')} icon={UserCircleIcon}>
              <p className="text-gray-700 whitespace-pre-line">{shortBio}</p>
            </SectionCard>
          )}

          <SectionCard title={t('profile:educator.experience', 'Work Experience')} icon={BriefcaseIcon}>
            <div className="space-y-4">
              {workExperience && workExperience.length > 0 ? (
                workExperience.map((exp, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md">
                    <h3 className="font-semibold text-swiss-charcoal">{exp.jobTitle}</h3>
                    <p className="text-sm text-swiss-teal">{exp.institutionName}</p>
                    <p className="text-xs text-gray-500">
                      {exp.startDate} – {exp.endDate}
                    </p>
                    {exp.descriptionPoints && exp.descriptionPoints.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-gray-600 mt-1 space-y-0.5">
                        {exp.descriptionPoints.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : experience ? (
                <p className="text-sm text-gray-600 whitespace-pre-line">{experience}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  {t('profile:educator.noExperience', 'No experience listed yet.')}
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard title={t('profile:educator.education', 'Education')} icon={AcademicCapIcon}>
            <div className="space-y-4">
              {education && education.length > 0 ? (
                education.map((edu, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md">
                    <h3 className="font-semibold text-swiss-charcoal">{edu.degree}</h3>
                    <p className="text-sm text-swiss-teal">{edu.institutionName}</p>
                    <p className="text-xs text-gray-500">
                      {t('profile:educator.graduated', 'Graduated')}: {edu.graduationYear}
                    </p>
                    {edu.description && <p className="text-sm text-gray-600 mt-1">{edu.description}</p>}
                  </div>
                ))
              ) : educationText ? (
                <p className="text-sm text-gray-600 whitespace-pre-line">{educationText}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  {t('profile:educator.noEducation', 'No education details yet.')}
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard title={t('profile:educator.certifications', 'Certifications')} icon={StarIcon}>
            <div className="space-y-3">
              {certifications && certifications.length > 0 ? (
                certifications.map((cert, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md">
                    <h3 className="font-semibold text-swiss-charcoal">{cert.name}</h3>
                    {cert.issuingOrganization && (
                      <p className="text-sm text-swiss-teal">{cert.issuingOrganization}</p>
                    )}
                    {(cert.issueDate || cert.expiryDate) && (
                      <p className="text-xs text-gray-500">
                        {cert.issueDate && `${t('profile:educator.issued', 'Issued')}: ${cert.issueDate}`}
                        {cert.issueDate && cert.expiryDate && ' • '}
                        {cert.expiryDate && `${t('profile:educator.expires', 'Expires')}: ${cert.expiryDate}`}
                      </p>
                    )}
                    {cert.credentialUrl && (
                      <a
                        href={cert.credentialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-swiss-mint hover:underline mt-1 inline-block"
                      >
                        {t('profile:educator.viewCredential', 'View Credential')}
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  {t('profile:educator.noCertifications', 'No certifications listed yet.')}
                </p>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <SectionCard title={t('profile:educator.skills', 'Skills & Specialties')} icon={StarIcon}>
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map(skill => (
                  <span
                    key={skill}
                    className="bg-swiss-mint/10 text-swiss-mint text-xs font-medium px-2.5 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">
                  {t('profile:educator.noSkills', 'No skills listed yet.')}
                </span>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title={t('profile:educator.availability', 'Availability & Preferences')}
            icon={CalendarDaysIcon}
          >
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <strong>{t('profile:educator.preferredDays', 'Preferred Days')}:</strong>{' '}
                {availabilityPreferences?.days?.join(', ') ?? t('profile:educator.notProvided', 'Not provided')}
              </p>
              <p>
                <strong>{t('profile:educator.preferredTimes', 'Preferred Times')}:</strong>{' '}
                {availabilityPreferences?.times ?? t('profile:educator.notProvided', 'Not provided')}
              </p>
              <p>
                <strong>{t('profile:educator.contractType', 'Contract Type')}:</strong>{' '}
                {availabilityPreferences?.contractType ?? t('profile:educator.notProvided', 'Not provided')}
              </p>
              <p>
                <strong>{t('profile:educator.preferredAgeGroups', 'Preferred Age Groups')}:</strong>{' '}
                {availabilityPreferences?.preferredAgeGroups?.join(', ') ??
                  t('profile:educator.notProvided', 'Not provided')}
              </p>
            </div>
          </SectionCard>

          <SectionCard title={t('profile:educator.documents', 'CV & Documents')} icon={PaperClipIcon}>
            <ul className="space-y-2">
              {documents && documents.length > 0 ? (
                documents.map((doc, index) => (
                  <li key={index}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-swiss-mint hover:underline hover:text-swiss-teal p-2 -m-2 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <PaperClipIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {doc.name} ({doc.type})
                      </span>
                    </a>
                  </li>
                ))
              ) : (
                <li className="text-xs text-gray-500">
                  {t('profile:educator.noDocuments', 'No documents uploaded yet.')}
                </li>
              )}
            </ul>
          </SectionCard>

          {(email || phone) && (
            <SectionCard title={t('profile:educator.contact', 'Contact')} icon={EnvelopeIcon}>
              <div className="space-y-2 text-sm">
                {email && (
                  <p className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${email}`} className="hover:text-swiss-mint">
                      {email}
                    </a>
                  </p>
                )}
                {phone && (
                  <p className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${phone}`} className="hover:text-swiss-mint">
                      {phone}
                    </a>
                  </p>
                )}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {!isOwnProfile && (isFoundationUser || isAdminOrSuperAdmin) && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-3">
            {isFoundationUser && (
              <Button variant="primary" leftIcon={PlusCircleIcon} onClick={handleInviteToApply}>
                {t('profile:educator.inviteToApply', 'Invite to Apply')}
              </Button>
            )}
            <Button variant="outline" leftIcon={EnvelopeIcon} onClick={handleSendMessage}>
              {t('common:buttons.sendMessage', 'Send Message')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EducatorProfileViewPage;
