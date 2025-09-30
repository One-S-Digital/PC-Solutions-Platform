import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CandidateProfile, WorkExperienceItem, EducationItem, DocumentItem, UserRole } from '../../types';
import { MOCK_CANDIDATE_PROFILES } from '../../constants';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ArrowLeftIcon, MapPinIcon, BriefcaseIcon, AcademicCapIcon, CalendarDaysIcon, PaperClipIcon, EnvelopeIcon, PlusCircleIcon, StarIcon, UserCircleIcon, PhoneIcon, HeartIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useMessaging } from '../../contexts/MessagingContext';

const SectionCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <Card className="p-6">
    <h2 className="text-xl font-semibold text-swiss-charcoal mb-4 flex items-center">
      <Icon className="w-6 h-6 mr-3 text-swiss-teal" />
      {title}
    </h2>
    {children}
  </Card>
);

const CandidateProfilePage: React.FC = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { toggleFavoriteCandidate, isCandidateFavorite } = useAppContext();
  const { startOrGetConversation, sendMessage } = useMessaging();

  const candidate = MOCK_CANDIDATE_PROFILES.find(c => c.id === candidateId);

  if (!candidate) {
    return (
      <div className="p-6 text-center">
        <UserCircleIcon className="w-12 h-12 mx-auto text-gray-400" />
        <p className="mt-4 text-xl font-semibold text-swiss-charcoal">Candidate not found.</p>
        <p className="text-gray-600">The profile you are looking for does not exist or the ID is incorrect.</p>
        <Button onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon} variant="outline" className="mt-6">
          Go Back
        </Button>
      </div>
    );
  }

  const {
    name, avatarUrl, currentRoleOrTitle, location, availabilityStatus, shortBio, skills,
    workExperience, education, certifications, availabilityPreferences, documents, email, phone
  } = candidate;

  const isFavorite = isCandidateFavorite(candidate.id);

  const handleSendMessage = () => {
    const conversationId = startOrGetConversation(candidate.id, candidate.name, UserRole.EDUCATOR);
    navigate(`/messages/${conversationId}`);
  };

  const handleInviteToApply = () => {
    const conversationId = startOrGetConversation(candidate.id, candidate.name, UserRole.EDUCATOR);
    sendMessage(conversationId, `Dear ${candidate.name},\n\nWe were impressed with your profile on the Swiss Daycare Platform and would like to invite you to apply for a position at our daycare. Please let us know if you're interested.\n\nBest regards,`);
    navigate(`/messages/${conversationId}`);
  };

  const handleInviteToInterview = () => {
    const conversationId = startOrGetConversation(candidate.id, candidate.name, UserRole.EDUCATOR);
    sendMessage(conversationId, `Dear ${candidate.name},\n\nThank you for your interest. We would like to invite you for an interview. Please suggest some times that work for you.\n\nBest regards,`);
    navigate(`/messages/${conversationId}`);
  };


  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} leftIcon={ArrowLeftIcon} className="mb-0">
        Back to Candidate Pool
      </Button>

      {/* Header Section */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start">
          <img 
            src={avatarUrl || `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=48CFAE&color=fff&size=128`} 
            alt={name} 
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg mb-4 sm:mb-0 sm:mr-6 flex-shrink-0 bg-gray-200"
          />
          <div className="flex-grow text-center sm:text-left">
            <h1 className="text-3xl font-bold text-swiss-charcoal">{name}</h1>
            <p className="text-xl text-swiss-teal mt-1">{currentRoleOrTitle}</p>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p className="flex items-center justify-center sm:justify-start">
                <MapPinIcon className="w-5 h-5 mr-2 text-gray-400" /> {location}
              </p>
              <p className="flex items-center justify-center sm:justify-start">
                <CalendarDaysIcon className="w-5 h-5 mr-2 text-gray-400" /> {availabilityStatus}
              </p>
              {email && <p className="flex items-center justify-center sm:justify-start"><EnvelopeIcon className="w-5 h-5 mr-2 text-gray-400" /> {email}</p>}
              {phone && <p className="flex items-center justify-center sm:justify-start"><PhoneIcon className="w-5 h-5 mr-2 text-gray-400" /> {phone}</p>}
            </div>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-auto flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-center flex-shrink-0">
            <Button variant="primary" leftIcon={PlusCircleIcon} size="md" className="w-full sm:w-auto" onClick={handleInviteToApply}>Invite to Apply</Button>
            <Button variant="outline" leftIcon={EnvelopeIcon} size="md" className="w-full sm:w-auto" onClick={handleSendMessage}>Send Message</Button>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Short Bio" icon={UserCircleIcon}>
            <p className="text-gray-700 whitespace-pre-line">{shortBio}</p>
          </SectionCard>

          <SectionCard title="Work Experience" icon={BriefcaseIcon}>
            <div className="space-y-4">
              {workExperience.map((exp, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-md">
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

          <SectionCard title="Education" icon={AcademicCapIcon}>
            <div className="space-y-4">
              {education.map((edu, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-md">
                  <h3 className="font-semibold text-swiss-charcoal">{edu.degree}</h3>
                  <p className="text-sm text-swiss-teal">{edu.institutionName}</p>
                  <p className="text-xs text-gray-500">Graduated: {edu.graduationYear}</p>
                  {edu.description && <p className="text-sm text-gray-600 mt-1">{edu.description}</p>}
                </div>
              ))}
            </div>
          </SectionCard>
          
          {certifications && certifications.length > 0 && (
             <SectionCard title="Certifications" icon={StarIcon}>
                 <div className="space-y-3">
                    {certifications.map((cert, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-md">
                            <h3 className="font-semibold text-swiss-charcoal">{cert.name}</h3>
                            <p className="text-sm text-swiss-teal">{cert.issuingOrganization}</p>
                            <p className="text-xs text-gray-500">
                                Issued: {cert.issueDate} {cert.expiryDate && ` - Expires: ${cert.expiryDate}`}
                            </p>
                            {cert.credentialUrl && <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-swiss-mint hover:underline">View Credential</a>}
                        </div>
                    ))}
                 </div>
            </SectionCard>
          )}

        </div>

        {/* Right Column */}
        <div className="lg:col-span-1 space-y-6">
          <SectionCard title="Skills & Specialties" icon={StarIcon}>
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <span key={skill} className="bg-swiss-mint/10 text-swiss-mint text-xs font-medium px-2.5 py-1 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </SectionCard>
          
          <SectionCard title="Availability & Preferences" icon={CalendarDaysIcon}>
             <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Preferred Days:</strong> {availabilityPreferences.days.join(', ')}</p>
                <p><strong>Preferred Times:</strong> {availabilityPreferences.times}</p>
                <p><strong>Contract Type:</strong> {availabilityPreferences.contractType}</p>
                <p><strong>Preferred Age Groups:</strong> {availabilityPreferences.preferredAgeGroups.join(', ')}</p>
             </div>
          </SectionCard>

          <SectionCard title="CV & Documents" icon={PaperClipIcon}>
            <ul className="space-y-2">
              {documents.map((doc, index) => (
                <li key={index}>
                  <a 
                    href={doc.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center text-swiss-mint hover:underline hover:text-swiss-teal p-2 -m-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <PaperClipIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{doc.name} ({doc.type})</span>
                  </a>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      {/* Bottom Call-to-Action Block */}
      <Card className="p-6 mt-8">
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <Button variant="primary" size="lg" leftIcon={PlusCircleIcon} onClick={handleInviteToInterview}>Invite to Interview</Button>
            <Button 
                variant={isFavorite ? "secondary" : "light"} 
                size="lg" 
                leftIcon={isFavorite ? HeartIcon : StarIcon} // Using Heart for filled favorite state
                onClick={() => toggleFavoriteCandidate(candidate.id)}
                className={isFavorite ? "text-white bg-swiss-coral" : ""}
            >
                {isFavorite ? "Favorited" : "Add to Favorites"}
            </Button>
            <Button variant="outline" size="lg" leftIcon={EnvelopeIcon} onClick={handleSendMessage}>Message Candidate</Button>
        </div>
      </Card>

    </div>
  );
};

export default CandidateProfilePage;