import React from 'react';
import { TimeSlot, TIME_OPTIONS, isValidTimeSlot, formatTime } from '../../types/availability';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface TimeSlotInputProps {
  slot: TimeSlot;
  onChange: (slot: TimeSlot) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  disabled?: boolean;
}

const TimeSlotInput: React.FC<TimeSlotInputProps> = ({
  slot,
  onChange,
  onRemove,
  showRemove = true,
  disabled = false,
}) => {
  const isValid = isValidTimeSlot(slot);

  const handleStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...slot, start: e.target.value });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...slot, end: e.target.value });
  };

  // Filter end time options to only show times after start time
  const getEndTimeOptions = () => {
    const startIndex = TIME_OPTIONS.indexOf(slot.start);
    return TIME_OPTIONS.filter((_, index) => index > startIndex);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 flex-1">
        <select
          value={slot.start}
          onChange={handleStartChange}
          disabled={disabled}
          className={`
            block w-28 rounded-md border py-1.5 px-2 text-sm
            focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint
            disabled:bg-gray-50 disabled:text-gray-500
            ${isValid ? 'border-gray-300' : 'border-red-300 focus:ring-red-500 focus:border-red-500'}
          `}
        >
          {TIME_OPTIONS.map((time) => (
            <option key={`start-${time}`} value={time}>
              {formatTime(time)}
            </option>
          ))}
        </select>
        
        <span className="text-gray-400 text-sm">to</span>
        
        <select
          value={slot.end}
          onChange={handleEndChange}
          disabled={disabled}
          className={`
            block w-28 rounded-md border py-1.5 px-2 text-sm
            focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint
            disabled:bg-gray-50 disabled:text-gray-500
            ${isValid ? 'border-gray-300' : 'border-red-300 focus:ring-red-500 focus:border-red-500'}
          `}
        >
          {getEndTimeOptions().map((time) => (
            <option key={`end-${time}`} value={time}>
              {formatTime(time)}
            </option>
          ))}
        </select>
      </div>
      
      {showRemove && onRemove && !disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Remove time slot"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
      
      {!isValid && (
        <span className="text-xs text-red-500 ml-1">Invalid</span>
      )}
    </div>
  );
};

export default TimeSlotInput;
