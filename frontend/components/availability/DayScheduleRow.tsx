import React from 'react';
import { DayAvailability, TimeSlot, DayOfWeek, DAY_LABELS, createEmptyTimeSlot } from '../../types/availability';
import TimeSlotInput from './TimeSlotInput';
import { PlusIcon } from '@heroicons/react/24/outline';

interface DayScheduleRowProps {
  day: DayOfWeek;
  availability: DayAvailability;
  onChange: (availability: DayAvailability) => void;
  disabled?: boolean;
}

const DayScheduleRow: React.FC<DayScheduleRowProps> = ({
  day,
  availability,
  onChange,
  disabled = false,
}) => {
  const handleToggle = () => {
    if (disabled) return;
    
    if (!availability.enabled) {
      // When enabling, add a default time slot if none exist
      onChange({
        enabled: true,
        slots: availability.slots.length > 0 ? availability.slots : [createEmptyTimeSlot()],
      });
    } else {
      onChange({
        enabled: false,
        slots: availability.slots,
      });
    }
  };

  const handleSlotChange = (index: number, slot: TimeSlot) => {
    const newSlots = [...availability.slots];
    newSlots[index] = slot;
    onChange({ ...availability, slots: newSlots });
  };

  const handleRemoveSlot = (index: number) => {
    const newSlots = availability.slots.filter((_, i) => i !== index);
    onChange({
      ...availability,
      slots: newSlots,
      enabled: newSlots.length > 0 ? availability.enabled : false,
    });
  };

  const handleAddSlot = () => {
    // Find the latest end time to suggest a good start time
    const latestEnd = availability.slots.reduce((latest, slot) => {
      return slot.end > latest ? slot.end : latest;
    }, '09:00');
    
    const newSlot: TimeSlot = {
      id: crypto.randomUUID(),
      start: latestEnd,
      end: '17:00',
    };
    
    onChange({
      ...availability,
      slots: [...availability.slots, newSlot],
    });
  };

  const isWeekend = day === 0 || day === 6;

  return (
    <div
      className={`
        flex items-start py-3 px-3 rounded-lg transition-colors
        ${availability.enabled ? 'bg-white' : 'bg-gray-50'}
        ${isWeekend ? 'border-l-2 border-l-gray-200' : ''}
      `}
    >
      {/* Day label and toggle */}
      <div className="w-24 flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`
            relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-swiss-mint focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${availability.enabled ? 'bg-swiss-mint' : 'bg-gray-200'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${availability.enabled ? 'translate-x-4' : 'translate-x-0'}
            `}
          />
        </button>
        <span
          className={`
            text-sm font-medium cursor-pointer select-none
            ${availability.enabled ? 'text-gray-900' : 'text-gray-500'}
          `}
          onClick={handleToggle}
        >
          {DAY_LABELS[day].slice(0, 3)}
        </span>
      </div>

      {/* Time slots */}
      <div className="flex-1 min-w-0">
        {availability.enabled ? (
          <div className="space-y-2">
            {availability.slots.map((slot, index) => (
              <TimeSlotInput
                key={slot.id}
                slot={slot}
                onChange={(newSlot) => handleSlotChange(index, newSlot)}
                onRemove={() => handleRemoveSlot(index)}
                showRemove={availability.slots.length > 1}
                disabled={disabled}
              />
            ))}
            
            {/* Add slot button */}
            {!disabled && (
              <button
                type="button"
                onClick={handleAddSlot}
                className="inline-flex items-center gap-1 text-sm text-swiss-mint hover:text-swiss-mint-dark transition-colors mt-1"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add time slot</span>
              </button>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400 pt-1 block">Unavailable</span>
        )}
      </div>
    </div>
  );
};

export default DayScheduleRow;
