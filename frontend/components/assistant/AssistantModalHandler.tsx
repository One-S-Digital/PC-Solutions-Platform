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

      case 'navigate': {
        const route = prefill?.route;
        if (route && typeof route === 'string') {
          navigate(route);
        }
        break;
      }

      case 'dynamic': {
        // open_modal tool: args contain { modal, prefill } — re-dispatch via the
        // same handler by recursing through the switch on the inner modal name.
        const innerModal = prefill?.modal;
        const innerPrefill = (prefill?.prefill ?? {}) as Record<string, unknown>;
        if (innerModal && typeof innerModal === 'string') {
          const prefillParam = encodeURIComponent(JSON.stringify(innerPrefill));
          switch (innerModal) {
            case 'staffing_request_modal':
              navigate(`/foundation/staffing-requests?prefill=${prefillParam}`);
              break;
            case 'job_post_modal':
              navigate('/recruitment/job-listings');
              break;
            default:
              if (import.meta.env.DEV) {
                console.warn('[AssistantModalHandler] Unknown dynamic modal:', innerModal, innerPrefill);
              }
          }
        }
        break;
      }

      default:
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
