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
      case 'staffing_request_modal': {
        const prefillParam = encodeURIComponent(JSON.stringify(prefill));
        navigate(`/foundation/staffing-requests?prefill=${prefillParam}`);
        break;
      }

      case 'job_post_modal': {
        // Navigate to recruitment job listings; full modal TBD in a later milestone
        navigate('/recruitment/job-listings');
        break;
      }

      case 'candidate_shortlist_modal': {
        const requestId = prefill?.requestId ?? prefill?.id;
        if (requestId) {
          navigate(`/foundation/staffing-requests?requestId=${encodeURIComponent(String(requestId))}`);
        } else {
          navigate('/foundation/staffing-requests');
        }
        break;
      }

      default:
        // Unknown modal — log in dev, silently ignore in prod
        if (import.meta.env.DEV) {
          console.warn('[AssistantModalHandler] Unknown modal:', modal, prefill);
        }
        break;
    }

    onHandled();
  }, [pendingModal, navigate, onHandled]);

  // This component renders nothing — it's a side-effect runner
  return null;
};
