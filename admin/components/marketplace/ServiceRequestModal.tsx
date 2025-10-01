
import React, { useState, useEffect } from 'react';
import { Service, ServiceRequest } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card'; 
import { XMarkIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { STANDARD_INPUT_FIELD } from '../../constants';

interface ServiceRequestModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitRequest: (requestData: Omit<ServiceRequest, 'id' | 'requestDate' | 'status' | 'foundationId' | 'foundationOrgId' | 'providerId' | 'serviceName' | 'serviceId'>) => void;
}

const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({ service, isOpen, onClose, onSubmitRequest }) => {
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPreferredDate('');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen || !service) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitRequest({
      preferredDate: preferredDate || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out" role="dialog" aria-modal="true" aria-labelledby="serviceRequestModalTitle">
      <Card className="w-full max-w-lg bg-white p-0 shadow-xl rounded-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 id="serviceRequestModalTitle" className="text-xl font-semibold text-swiss-charcoal">Request Service: {service.title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label="Close modal">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="serviceNameModal" className="block text-sm font-medium text-gray-700 mb-1">Service</label>
              <input
                type="text"
                id="serviceNameModal"
                value={service.title}
                readOnly
                className={`${STANDARD_INPUT_FIELD} bg-gray-100 cursor-not-allowed`}
              />
            </div>
            <div>
              <label htmlFor="providerNameModal" className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <input
                type="text"
                id="providerNameModal"
                value={service.providerName}
                readOnly
                className={`${STANDARD_INPUT_FIELD} bg-gray-100 cursor-not-allowed`}
              />
            </div>
            <div>
              <label htmlFor="preferredDateModal" className="block text-sm font-medium text-gray-700 mb-1">Preferred Date (Optional)</label>
              <div className="relative">
                <input
                    type="date"
                    id="preferredDateModal"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className={`${STANDARD_INPUT_FIELD} pr-10`} // Add padding for icon
                />
                <CalendarDaysIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label htmlFor="notesModal" className="block text-sm font-medium text-gray-700 mb-1">Notes / Specific Requirements (Optional)</label>
              <textarea
                id="notesModal"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={STANDARD_INPUT_FIELD}
                placeholder="e.g., Number of children for workshop, specific areas for cleaning..."
              />
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Button type="button" variant="light" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="secondary">Submit Request</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ServiceRequestModal;
