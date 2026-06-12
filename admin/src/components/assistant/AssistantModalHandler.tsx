import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AssistantModalHandlerProps {
  pendingModal: { modal: string; prefill: Record<string, unknown> } | null;
  onHandled: () => void;
}

export const AssistantModalHandler: React.FC<AssistantModalHandlerProps> = ({
  pendingModal,
  onHandled,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!pendingModal) return;

    const { modal, prefill } = pendingModal;

    switch (modal) {
      case 'navigate': {
        const route = typeof prefill?.route === 'string' ? prefill.route : null;
        if (route && route.startsWith('/')) navigate(route);
        break;
      }

      case 'invite_user_modal':
        navigate('/users');
        break;

      case 'job_post_modal':
        navigate('/job-listings');
        break;

      case 'candidate_shortlist_modal':
        navigate('/candidates');
        break;

      case 'staffing_request_modal':
        navigate('/candidates');
        break;

      default:
        if (import.meta.env.DEV) {
          console.warn('[AssistantModalHandler] Unknown modal:', modal, prefill);
        }
        break;
    }

    onHandled();
  }, [pendingModal, navigate, onHandled]);

  return null;
};
