import React, { useState } from 'react';
import { ParentLead, FoundationLeadResponseStatus, LeadMainStatus, FoundationResponse, UserRole } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { MOCK_FOUNDATION_ORG_KINDERWELT } from '../../constants'; // For foundation name
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, ChatBubbleLeftEllipsisIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../../contexts/AppContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LeadCardProps {
  lead: ParentLead;
  foundationOrgId: string;
  onUpdateLead: (updatedLead: ParentLead) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, foundationOrgId, onUpdateLead }) => {
  const { t } = useTranslation();
  const [showResponseInput, setShowResponseInput] = useState(false);
  const [responseText, setResponseText] = useState('');
  const { currentUser } = useAppContext(); // Assuming foundation name comes from currentUser or org lookup
  const { startOrGetConversation } = useMessaging();
  const navigate = useNavigate();
  
  const foundationName = currentUser?.orgName || MOCK_FOUNDATION_ORG_KINDERWELT.name; // Use current user's org name

  let myResponse = lead.responses.find(r => r.foundationId === foundationOrgId);

  const handleResponse = (status: FoundationLeadResponseStatus, message?: string) => {
    const now = new Date().toISOString();
    const updatedResponses = lead.responses.filter(r => r.foundationId !== foundationOrgId);
    const newResponse: FoundationResponse = {
      foundationId: foundationOrgId,
      foundationName: foundationName, 
      status: status,
      messageToParent: message,
      responseDate: now,
    };
    updatedResponses.push(newResponse);

    let newMainStatus = lead.mainStatus;
    if (status === FoundationLeadResponseStatus.INTERESTED || status === FoundationLeadResponseStatus.NEEDS_MORE_INFO) {
        newMainStatus = LeadMainStatus.PROCESSING;
    } else if (status === FoundationLeadResponseStatus.ENROLLED) {
        newMainStatus = LeadMainStatus.CLOSED_ENROLLED;
    }
    // More complex logic for mainStatus based on all responses needed for other CLOSED states

    onUpdateLead({ ...lead, responses: updatedResponses, mainStatus: newMainStatus });
    setShowResponseInput(false);
    setResponseText('');
  };

  const handleMessageParent = () => {
    if (!lead.parentId || !lead.contactName) {
        alert(t('leadCard.alert.missingParentInfo'));
        return;
    }
    const conversationId = startOrGetConversation(lead.parentId, lead.contactName, UserRole.PARENT);
    navigate(`/messages/${conversationId}`);
  };

  const getMyResponseStatus = () => myResponse?.status || FoundationLeadResponseStatus.NOT_RESPONDED;

  const getStatusInfo = (status: FoundationLeadResponseStatus) => {
    switch(status) {
        case FoundationLeadResponseStatus.NOT_RESPONDED: return { className: 'bg-gray-200 text-gray-700', label: t('leadCard.status.notResponded') };
        case FoundationLeadResponseStatus.INTERESTED: return { className: 'bg-green-100 text-green-700', label: t('leadCard.status.interested') };
        case FoundationLeadResponseStatus.NOT_INTERESTED: return { className: 'bg-red-100 text-red-700', label: t('leadCard.status.notInterested') };
        case FoundationLeadResponseStatus.NEEDS_MORE_INFO: return { className: 'bg-yellow-100 text-yellow-700', label: t('leadCard.status.needsMoreInfo') };
        case FoundationLeadResponseStatus.ENROLLED: return { className: 'bg-purple-100 text-purple-700', label: t('leadCard.status.enrolled') };
        default: return { className: 'bg-gray-200 text-gray-700', label: status };
    }
  };

  const currentStatusInfo = getStatusInfo(getMyResponseStatus());

  return (
    <Card className="flex flex-col p-5 space-y-3">
      <div>
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-swiss-charcoal">
              {t('leadCard.title', { name: lead.contactName })}
            </h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${currentStatusInfo.className}`}>
                {currentStatusInfo.label}
            </span>
        </div>
        <p className="text-sm text-gray-500">
          {t('leadCard.forLocation', { canton: lead.canton, municipality: lead.municipality ? `- ${lead.municipality}` : '' })}
        </p>
      </div>
      
      <div className="text-sm text-gray-700 space-y-1">
        <p><strong>{t('leadCard.childAge')}:</strong> {lead.childAge}</p>
        <p><strong>{t('leadCard.desiredStart')}:</strong> {new Date(lead.desiredStartDate).toLocaleDateString()}</p>
        <p><strong>{t('leadCard.submittedOn')}:</strong> {new Date(lead.submissionDate).toLocaleDateString()}</p>
        {lead.specialNeeds && <p><strong>{t('leadCard.notes')}:</strong> <span className="italic">{lead.specialNeeds}</span></p>}
      </div>

      {/* Initial Action Buttons (if not yet responded or needs more info) */}
      {(!myResponse || 
        (myResponse.status !== FoundationLeadResponseStatus.INTERESTED && 
         myResponse.status !== FoundationLeadResponseStatus.NOT_INTERESTED &&
         myResponse.status !== FoundationLeadResponseStatus.ENROLLED)
       ) && (
        <>
          <div className="pt-3 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
             <Button 
                variant="primary" 
                size="sm" 
                leftIcon={CheckCircleIcon}
                onClick={() => handleResponse(FoundationLeadResponseStatus.INTERESTED, t('leadCard.defaultMessages.interested'))}
                disabled={getMyResponseStatus() === FoundationLeadResponseStatus.INTERESTED}
            >
              {t('leadCard.buttons.interested')}
            </Button>
            <Button 
                variant="danger" 
                size="sm" 
                leftIcon={XCircleIcon}
                onClick={() => handleResponse(FoundationLeadResponseStatus.NOT_INTERESTED, t('leadCard.defaultMessages.notInterested'))}
                disabled={getMyResponseStatus() === FoundationLeadResponseStatus.NOT_INTERESTED}
            >
              {t('leadCard.buttons.notInterested')}
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                leftIcon={QuestionMarkCircleIcon}
                onClick={() => setShowResponseInput(true)}
                disabled={getMyResponseStatus() === FoundationLeadResponseStatus.NEEDS_MORE_INFO}
            >
              {t('leadCard.buttons.needInfo')}
            </Button>
          </div>
          {showResponseInput && (
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <label htmlFor={`response-text-${lead.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                {t('leadCard.questionFor', { name: lead.contactName })}:
              </label>
              <textarea
                id={`response-text-${lead.id}`}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={2}
                className="input-field w-full text-sm" // Assuming input-field is globally styled or use STANDARD_INPUT_FIELD
                placeholder={t('leadCard.questionPlaceholder')}
              />
              <div className="mt-2 flex justify-end space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setShowResponseInput(false)}>{t('buttons.cancel')}</Button>
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleResponse(FoundationLeadResponseStatus.NEEDS_MORE_INFO, responseText)}
                    disabled={!responseText.trim()}
                    leftIcon={PaperAirplaneIcon}
                >
                    {t('leadCard.buttons.sendQuestion')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Displaying Response and Subsequent Actions */}
      {myResponse && (
        <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="p-3 bg-gray-50 rounded-md text-sm mb-3">
                <p className="font-medium">{t('leadCard.yourResponse')}: <span className={`${currentStatusInfo.className} px-1.5 py-0.5 rounded`}>{currentStatusInfo.label}</span></p>
                {myResponse.messageToParent && <p className="italic mt-1">{t('leadCard.messageSent')}: "{myResponse.messageToParent}"</p>}
            </div>
             <div className="flex flex-wrap gap-2 justify-end">
                <Button 
                    variant="outline" 
                    size="sm" 
                    leftIcon={ChatBubbleLeftEllipsisIcon}
                    onClick={handleMessageParent}
                >
                    {t('leadCard.buttons.messageParent')}
                </Button>
                {myResponse.status === FoundationLeadResponseStatus.INTERESTED && (
                    <Button 
                        variant="primary" 
                        size="sm" 
                        leftIcon={CheckCircleIcon}
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleResponse(FoundationLeadResponseStatus.ENROLLED, t('leadCard.defaultMessages.enrolled'))}
                    >
                      {t('leadCard.buttons.markEnrolled')}
                    </Button>
                )}
            </div>
        </div>
      )}
    </Card>
  );
};

export default LeadCard;