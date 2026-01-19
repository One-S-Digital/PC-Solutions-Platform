import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, TagIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

export type ValidatedPromoCode = {
  id: string;
  code: string;
  discountType: 'Percentage' | 'FixedAmount' | 'FreeMinutes';
  value: number;
  description?: string;
};

interface ApplyPromoCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName?: string;
  initialCode?: string;
  onApply: (promo: ValidatedPromoCode) => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

const formatDiscountLabel = (
  t: (key: string, options?: any) => string,
  promo: ValidatedPromoCode,
) => {
  switch (promo.discountType) {
    case 'Percentage':
      return t('common:promoCodes.discount.percentage', { value: promo.value });
    case 'FixedAmount':
      return t('common:promoCodes.discount.fixedAmount', { value: promo.value });
    case 'FreeMinutes':
      return t('common:promoCodes.discount.freeMinutes', { value: promo.value });
    default:
      return `${promo.value}`;
  }
};

const ApplyPromoCodeModal: React.FC<ApplyPromoCodeModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  initialCode,
  onApply,
  onRemove,
  showRemove = false,
}) => {
  const { t } = useTranslation(['dashboard', 'common', 'marketplace']);
  const { request } = useAuthenticatedApi();

  const [code, setCode] = useState(initialCode ?? '');
  const [isValidating, setIsValidating] = useState(false);
  const [validatedPromo, setValidatedPromo] = useState<ValidatedPromoCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setCode(initialCode ?? '');
    setValidatedPromo(null);
    setErrorMessage(null);
    setIsValidating(false);
  }, [isOpen, initialCode]);

  const canApply = useMemo(() => code.trim().length >= 3 && !isValidating, [code, isValidating]);

  const handleValidate = useCallback(async () => {
    if (!code.trim()) {
      return;
    }
    setIsValidating(true);
    setValidatedPromo(null);
    setErrorMessage(null);

    try {
      const response = await request<{
        success: boolean;
        valid: boolean;
        data?: {
          id: string;
          code: string;
          discountType: 'Percentage' | 'FixedAmount' | 'FreeMinutes';
          value: number;
          description?: string;
        } | null;
      }>(`/promo-codes/validate/${organizationId}?code=${encodeURIComponent(code.trim())}`);

      if (response?.success && response.valid && response.data) {
        setValidatedPromo({
          id: response.data.id,
          code: response.data.code,
          discountType: response.data.discountType,
          value: response.data.value,
          description: response.data.description || undefined,
        });
        return;
      }

      setErrorMessage(t('common:promoCodes.messages.invalid'));
    } catch (err) {
      console.error('Promo code validation failed:', err);
      setErrorMessage(t('common:promoCodes.messages.error'));
    } finally {
      setIsValidating(false);
    }
  }, [code, organizationId, request, t]);

  const handleApply = useCallback(() => {
    if (!validatedPromo) {
      return;
    }
    onApply(validatedPromo);
    onClose();
  }, [validatedPromo, onApply, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-promo-code-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-swiss-mint" />
            <div>
              <h2 id="apply-promo-code-title" className="text-lg font-semibold text-swiss-charcoal">
                {t('common:promoCodes.modal.title')}
              </h2>
              {organizationName ? (
                <p className="text-sm text-gray-500">
                  {t('common:promoCodes.modal.subtitle', { organizationName })}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('common:buttons.close', 'Close')}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common:promoCodes.modal.codeLabel')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setValidatedPromo(null);
                  setErrorMessage(null);
                }}
                placeholder={t('common:promoCodes.modal.codePlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swiss-mint font-mono uppercase"
                onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                maxLength={50}
              />
              <Button
                variant="outline"
                onClick={handleValidate}
                disabled={!code.trim() || isValidating}
              >
                {isValidating ? t('common:promoCodes.modal.validating') : t('common:promoCodes.modal.validate')}
              </Button>
            </div>
          </div>

          {validatedPromo ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start gap-2">
              <CheckCircleIcon className="w-5 h-5 mt-0.5" />
              <div>
                <div className="font-medium">
                  {t('common:promoCodes.messages.valid')}
                </div>
                <div className="text-green-700">
                  {formatDiscountLabel(t, validatedPromo)}
                  {validatedPromo.description ? (
                    <span className="text-green-700"> • {validatedPromo.description}</span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <ExclamationCircleIcon className="w-5 h-5 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between gap-3">
          <div>
            {showRemove && onRemove ? (
              <Button variant="light" onClick={onRemove} type="button">
                {t('common:promoCodes.modal.remove')}
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="light" onClick={onClose} type="button">
              {t('common:buttons.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" onClick={handleApply} disabled={!validatedPromo || !canApply} type="button">
              {t('common:promoCodes.modal.apply')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyPromoCodeModal;

