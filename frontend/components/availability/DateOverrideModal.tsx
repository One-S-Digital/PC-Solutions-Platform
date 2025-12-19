import React, { useState, useEffect } from 'react';
import { DateOverride, DateOverrideType, TimeSlot, createEmptyTimeSlot } from '../../types/availability';
import TimeSlotInput from './TimeSlotInput';
import { XMarkIcon, PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface DateOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (override: DateOverride) => void;
  existingOverride?: DateOverride;
  existingDates?: string[]; // Dates that already have overrides
}

const DateOverrideModal: React.FC<DateOverrideModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingOverride,
  existingDates = [],
}) => {
  const [date, setDate] = useState<string>('');
  const [type, setType] = useState<DateOverrideType>('UNAVAILABLE');
  const [reason, setReason] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [error, setError] = useState<string>('');

  // Initialize form when modal opens or existing override changes
  useEffect(() => {
    if (isOpen) {
      if (existingOverride) {
        setDate(existingOverride.date);
        setType(existingOverride.type);
        setReason(existingOverride.reason || '');
        setSlots(existingOverride.slots || [createEmptyTimeSlot()]);
      } else {
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(tomorrow.toISOString().split('T')[0]);
        setType('UNAVAILABLE');
        setReason('');
        setSlots([createEmptyTimeSlot()]);
      }
      setError('');
    }
  }, [isOpen, existingOverride]);

  const handleSave = () => {
    // Validation
    if (!date) {
      setError('Please select a date');
      return;
    }

    // Check if date already has an override (unless we're editing that same date)
    if (existingDates.includes(date) && existingOverride?.date !== date) {
      setError('This date already has an override');
      return;
    }

    // Check if date is in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setError('Cannot set override for past dates');
      return;
    }

    // Validate time slots for CUSTOM type
    if (type === 'CUSTOM') {
      if (slots.length === 0) {
        setError('Please add at least one time slot');
        return;
      }
      const hasInvalidSlot = slots.some(slot => !slot.start || !slot.end || slot.start >= slot.end);
      if (hasInvalidSlot) {
        setError('Please ensure all time slots have valid start and end times');
        return;
      }
    }

    const override: DateOverride = {
      id: existingOverride?.id || crypto.randomUUID(),
      date,
      type,
      reason: reason.trim() || undefined,
      slots: type === 'CUSTOM' ? slots : undefined,
    };

    onSave(override);
    onClose();
  };

  const handleSlotChange = (index: number, slot: TimeSlot) => {
    const newSlots = [...slots];
    newSlots[index] = slot;
    setSlots(newSlots);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleAddSlot = () => {
    setSlots([...slots, createEmptyTimeSlot()]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform rounded-xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              {existingOverride ? 'Edit Date Override' : 'Add Date Override'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-500 rounded transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Date picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setError('');
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm
                    focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint"
                />
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Override type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Override Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setType('UNAVAILABLE')}
                  className={`
                    flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all
                    ${type === 'UNAVAILABLE' 
                      ? 'border-red-400 bg-red-50 text-red-700' 
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  Unavailable
                </button>
                <button
                  type="button"
                  onClick={() => setType('CUSTOM')}
                  className={`
                    flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-all
                    ${type === 'CUSTOM' 
                      ? 'border-swiss-mint bg-swiss-mint/10 text-swiss-mint' 
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  Custom Hours
                </button>
              </div>
            </div>

            {/* Custom time slots */}
            {type === 'CUSTOM' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Hours
                </label>
                <div className="space-y-2">
                  {slots.map((slot, index) => (
                    <TimeSlotInput
                      key={slot.id}
                      slot={slot}
                      onChange={(newSlot) => handleSlotChange(index, newSlot)}
                      onRemove={() => handleRemoveSlot(index)}
                      showRemove={slots.length > 1}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="inline-flex items-center gap-1 text-sm text-swiss-mint hover:text-swiss-mint-dark transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add time slot</span>
                  </button>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={type === 'UNAVAILABLE' ? 'e.g., Holiday, Vacation, Training' : 'e.g., Extra hours available'}
                className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm
                  focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint
                  placeholder:text-gray-400"
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-swiss-mint hover:bg-swiss-mint-dark 
                rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:ring-offset-2"
            >
              {existingOverride ? 'Save Changes' : 'Add Override'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateOverrideModal;
