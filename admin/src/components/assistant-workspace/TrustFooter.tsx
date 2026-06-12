import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Trust disclaimer under the composer. This sentence states the product's
 * core guarantee — outward actions only ever run after explicit approval —
 * which the orchestrator's L3 gating enforces. Keep it true.
 */
export const TrustFooter: React.FC = () => {
  const { t } = useTranslation('assistant');

  return (
    <p className="mt-2 pb-1 text-center text-xs text-gray-400">
      {t(
        'workspace.trustFooter',
        'The assistant takes no external action without your approval · Responses are grounded in your data and verified cantonal directives'
      )}
    </p>
  );
};
