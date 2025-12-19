import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inquiry, InquiryStatus } from '../../types';
import Button from '../ui/Button';
import { XMarkIcon, BuildingStorefrontIcon, PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface InquiryDetailModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (inquiryId: string, newStatus: InquiryStatus, responseMessage?: string, quotedAmount?: number) => void;
}

// Explicit namespace to avoid dashboard/common collision
const InquiryDetailModal: React.FC<InquiryDetailModalProps> = ({ inquiry, isOpen, onClose, onUpdateStatus }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  
  const [responseMessage, setResponseMessage] = useState('');
  const [quotedAmount, setQuotedAmount] = useState<string>('');
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [selectedAction, setSelectedAction] = useState<InquiryStatus | null>(null);

  // Reset form state when inquiry changes
  useEffect(() => {
    setResponseMessage('');
    setQuotedAmount('');
    setShowResponseForm(false);
    setSelectedAction(null);
  }, [inquiry?.id]);

  if (!isOpen || !inquiry) return null;

  const handleViewProfile = () => {
    navigate(`/partner/${inquiry.buyerOrgId}`);
    onClose();
  };

  const handleQuickStatusUpdate = (newStatus: InquiryStatus) => {
    if (newStatus === InquiryStatus.QUOTED) {
      setSelectedAction(newStatus);
      setShowResponseForm(true);
    } else if (newStatus === InquiryStatus.CONTACTED || newStatus === InquiryStatus.PENDING) {
      setSelectedAction(newStatus);
      setShowResponseForm(true);
    } else {
      onUpdateStatus(inquiry.id, newStatus);
    }
  };

  const handleSubmitResponse = () => {
    if (selectedAction) {
      const parsedAmount = parseFloat(quotedAmount);
      const amount = quotedAmount && !isNaN(parsedAmount) ? parsedAmount : undefined;
      onUpdateStatus(inquiry.id, selectedAction, responseMessage || undefined, amount);
      setShowResponseForm(false);
      setResponseMessage('');
      setQuotedAmount('');
      setSelectedAction(null);
    }
  };

  const getStatusColor = (status: InquiryStatus) => {
    switch (status) {
      case InquiryStatus.NEW: return 'bg-blue-100 text-blue-700';
      case InquiryStatus.PENDING: return 'bg-swiss-coral/20 text-swiss-coral';
      case InquiryStatus.CONTACTED: return 'bg-swiss-sand/30 text-amber-700';
      case InquiryStatus.QUOTED: return 'bg-purple-100 text-purple-700';
      case InquiryStatus.FULFILLED: return 'bg-swiss-mint text-white';
      case InquiryStatus.DECLINED:
      case InquiryStatus.CANCELLED:
        return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'URGENT': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const renderActions = () => {
    if (showResponseForm) {
      return (
        <div className="w-full space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {selectedAction === InquiryStatus.QUOTED 
                ? t('dashboard:inquiryDetailModal.quoteAmount', 'Quote Amount (CHF)')
                : t('dashboard:inquiryDetailModal.responseMessage', 'Response Message')}
            </label>
            {selectedAction === InquiryStatus.QUOTED && (
              <input
                type="number"
                step="0.01"
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-md focus:ring-swiss-teal focus:border-swiss-teal mb-2"
              />
            )}
            <textarea
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder={t('dashboard:inquiryDetailModal.responsePlaceholder', 'Enter your response to the customer...')}
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:ring-swiss-teal focus:border-swiss-teal"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="light" onClick={() => { setShowResponseForm(false); setSelectedAction(null); }}>
              {t('common:buttons.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" onClick={handleSubmitResponse}>
              {t('dashboard:inquiryDetailModal.sendResponse', 'Send Response')}
            </Button>
          </div>
        </div>
      );
    }

    switch (inquiry.status) {
      case InquiryStatus.NEW:
        return (
          <>
            <Button variant="danger" onClick={() => handleQuickStatusUpdate(InquiryStatus.DECLINED)}>
              {t('dashboard:inquiryDetailModal.actions.decline', 'Decline')}
            </Button>
            <Button variant="secondary" onClick={() => handleQuickStatusUpdate(InquiryStatus.PENDING)}>
              {t('dashboard:inquiryDetailModal.actions.markPending', 'Mark as Pending')}
            </Button>
            <Button variant="primary" onClick={() => handleQuickStatusUpdate(InquiryStatus.CONTACTED)}>
              {t('dashboard:inquiryDetailModal.actions.contacted', 'Mark as Contacted')}
            </Button>
          </>
        );
      case InquiryStatus.PENDING:
      case InquiryStatus.CONTACTED:
        return (
          <>
            <Button variant="danger" onClick={() => handleQuickStatusUpdate(InquiryStatus.DECLINED)}>
              {t('dashboard:inquiryDetailModal.actions.decline', 'Decline')}
            </Button>
            <Button variant="secondary" onClick={() => handleQuickStatusUpdate(InquiryStatus.QUOTED)}>
              {t('dashboard:inquiryDetailModal.actions.sendQuote', 'Send Quote')}
            </Button>
            <Button variant="primary" onClick={() => onUpdateStatus(inquiry.id, InquiryStatus.FULFILLED)}>
              {t('dashboard:inquiryDetailModal.actions.markFulfilled', 'Mark as Fulfilled')}
            </Button>
          </>
        );
      case InquiryStatus.QUOTED:
        return (
          <>
            <Button variant="danger" onClick={() => handleQuickStatusUpdate(InquiryStatus.DECLINED)}>
              {t('dashboard:inquiryDetailModal.actions.decline', 'Decline')}
            </Button>
            <Button variant="primary" onClick={() => onUpdateStatus(inquiry.id, InquiryStatus.FULFILLED)}>
              {t('dashboard:inquiryDetailModal.actions.markFulfilled', 'Mark as Fulfilled')}
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-swiss-charcoal">{t('dashboard:inquiryDetailModal.title', 'Inquiry Details')}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600" aria-label={t('common:buttons.close', 'Close')}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Status and Date */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            <div className="p-3 bg-gray-50 rounded-md">
              <span className="block text-xs text-gray-500">{t('dashboard:inquiryDetailModal.inquiryId', 'Inquiry ID')}</span>
              <span className="font-semibold">{inquiry.id.substring(0, 8)}...</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <span className="block text-xs text-gray-500">{t('dashboard:inquiryDetailModal.date', 'Date')}</span>
              <span className="font-semibold">{new Date(inquiry.createdAt).toLocaleDateString(i18n.language)}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <span className="block text-xs text-gray-500">{t('dashboard:inquiryDetailModal.status', 'Status')}</span>
              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(inquiry.status)}`}>
                {t(`inquiryStatus.${inquiry.status.toLowerCase()}` as const, inquiry.status)}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <span className="block text-xs text-gray-500">{t('dashboard:inquiryDetailModal.urgency', 'Urgency')}</span>
              {inquiry.urgency ? (
                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getUrgencyColor(inquiry.urgency)}`}>
                  {t(`inquiryUrgency.${inquiry.urgency.toLowerCase()}` as const, inquiry.urgency)}
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </div>
          
          {/* From Organization */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">{t('dashboard:inquiryDetailModal.from', 'From')}</h3>
            <div className="flex items-center p-3 border rounded-md">
              <div className="w-12 h-12 bg-swiss-teal/10 rounded-full flex items-center justify-center mr-3">
                <BuildingStorefrontIcon className="w-6 h-6 text-swiss-teal" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{inquiry.buyerName}</p>
                {inquiry.contactName && <p className="text-sm text-gray-500">{inquiry.contactName}</p>}
              </div>
              <Button variant="outline" size="sm" leftIcon={BuildingStorefrontIcon} onClick={handleViewProfile}>
                {t('dashboard:inquiryDetailModal.viewProfile', 'View Profile')}
              </Button>
            </div>
          </div>

          {/* Contact Information */}
          {(inquiry.contactEmail || inquiry.contactPhone) && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">{t('dashboard:inquiryDetailModal.contactInfo', 'Contact Information')}</h3>
              <div className="flex flex-wrap gap-4">
                {inquiry.contactEmail && (
                  <a href={`mailto:${inquiry.contactEmail}`} className="flex items-center text-swiss-teal hover:underline">
                    <EnvelopeIcon className="w-4 h-4 mr-1" />
                    {inquiry.contactEmail}
                  </a>
                )}
                {inquiry.contactPhone && (
                  <a href={`tel:${inquiry.contactPhone}`} className="flex items-center text-swiss-teal hover:underline">
                    <PhoneIcon className="w-4 h-4 mr-1" />
                    {inquiry.contactPhone}
                  </a>
                )}
                {inquiry.preferredContactMethod && (
                  <span className="flex items-center text-gray-500">
                    <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />
                    {t('dashboard:inquiryDetailModal.preferredContact', 'Preferred')}: {t(`preferredContactMethod.${inquiry.preferredContactMethod.toLowerCase()}` as const, inquiry.preferredContactMethod)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Inquiry Details */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">{inquiry.subject || t('dashboard:inquiryDetailModal.message', 'Message')}</h3>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="whitespace-pre-wrap">{inquiry.message}</p>
            </div>
          </div>

          {/* Additional Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {inquiry.productInterest && (
              <div className="p-3 border rounded-md">
                <span className="block text-xs text-gray-500 mb-1">{t('dashboard:inquiryDetailModal.productInterest', 'Product Interest')}</span>
                <span className="font-medium">{inquiry.productInterest}</span>
              </div>
            )}
            {inquiry.quantity && (
              <div className="p-3 border rounded-md">
                <span className="block text-xs text-gray-500 mb-1">{t('dashboard:inquiryDetailModal.quantity', 'Est. Quantity')}</span>
                <span className="font-medium">{inquiry.quantity}</span>
              </div>
            )}
            {inquiry.budget && (
              <div className="p-3 border rounded-md">
                <span className="block text-xs text-gray-500 mb-1">{t('dashboard:inquiryDetailModal.budget', 'Budget')}</span>
                <span className="font-medium">{inquiry.budget}</span>
              </div>
            )}
          </div>

          {/* Quote / Response */}
          {(inquiry.quotedAmount || inquiry.responseMessage) && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
              <h3 className="font-semibold mb-2 text-purple-700">{t('dashboard:inquiryDetailModal.yourResponse', 'Your Response')}</h3>
              {inquiry.quotedAmount && (
                <p className="text-lg font-bold text-purple-700 mb-2">
                  {t('dashboard:inquiryDetailModal.quotedAmount', 'Quoted Amount')}: CHF {inquiry.quotedAmount.toFixed(2)}
                </p>
              )}
              {inquiry.responseMessage && (
                <p className="text-purple-800">{inquiry.responseMessage}</p>
              )}
            </div>
          )}

          {/* Supplier Notes */}
          {inquiry.supplierNotes && (
            <div className="mb-6">
              <h3 className="font-semibold mb-1">{t('dashboard:inquiryDetailModal.internalNotes', 'Internal Notes')}</h3>
              <p className="text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-md italic">{inquiry.supplierNotes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-gray-500 space-y-1">
            {inquiry.respondedAt && (
              <p>{t('dashboard:inquiryDetailModal.respondedAt', 'First responded')}: {new Date(inquiry.respondedAt).toLocaleString(i18n.language)}</p>
            )}
            {inquiry.fulfilledAt && (
              <p>{t('dashboard:inquiryDetailModal.fulfilledAt', 'Fulfilled')}: {new Date(inquiry.fulfilledAt).toLocaleString(i18n.language)}</p>
            )}
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t flex flex-wrap justify-end gap-3">
          <Button type="button" variant="light" onClick={onClose}>{t('common:buttons.close', 'Close')}</Button>
          {renderActions()}
        </div>
      </div>
    </div>
  );
};

export default InquiryDetailModal;
