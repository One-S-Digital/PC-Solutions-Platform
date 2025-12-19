import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMessaging } from '../contexts/MessagingContext';
import { Organization, UserRole } from '../types';

/**
 * Shared hook for sending messages to organization contacts.
 * Extracts common messaging logic used across profile pages.
 */
export const useOrganizationMessaging = () => {
  const { t } = useTranslation(['common']);
  const { startOrGetConversation } = useMessaging();
  const navigate = useNavigate();

  /**
   * Initiates a conversation with an organization's primary contact.
   * 
   * @param organization - The organization to message (may contain __rawData with members)
   * @param fallbackRole - The UserRole to use if the primary member's role is not available
   * @returns Promise that resolves when navigation completes, or shows an error alert
   */
  const sendMessageToOrganization = async (
    organization: Organization,
    fallbackRole: UserRole
  ): Promise<void> => {
    // Access raw data which includes members relation from API
    const rawData = (organization as any).__rawData || organization;
    const primaryMember = rawData.members?.[0]?.user;
    
    if (!primaryMember) {
      alert(t('common:errors.noContactAvailable', 'No contact available for this organization.'));
      return;
    }

    try {
      const conversationId = await startOrGetConversation(
        primaryMember.id,
        primaryMember.firstName && primaryMember.lastName
          ? `${primaryMember.firstName} ${primaryMember.lastName}`
          : organization.name,
        primaryMember.role || fallbackRole
      );
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert(t('common:errors.messagingFailed', 'Failed to start conversation. Please try again.'));
    }
  };

  return { sendMessageToOrganization };
};
