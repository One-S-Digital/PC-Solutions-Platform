import React from 'react';
import { WeeklySchedule, DayOfWeek, DayAvailability, calculateWeeklyHours } from '../../types/availability';
import DayScheduleRow from './DayScheduleRow';
import { ClockIcon } from '@heroicons/react/24/outline';

interface WeeklyScheduleEditorProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  disabled?: boolean;
  startOnMonday?: boolean;
}

const WeeklyScheduleEditor: React.FC<WeeklyScheduleEditorProps> = ({
  schedule,
  onChange,
  disabled = false,
  startOnMonday = true,
}) => {
  // Get days in order (starting from Monday or Sunday)
  const getDaysInOrder = (): DayOfWeek[] => {
    if (startOnMonday) {
      return [1, 2, 3, 4, 5, 6, 0] as DayOfWeek[];
    }
    return [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];
  };

  const handleDayChange = (day: DayOfWeek, availability: DayAvailability) => {
    onChange({
      ...schedule,
      [day]: availability,
    });
  };

  const totalHours = calculateWeeklyHours(schedule);
  const enabledDays = Object.values(schedule).filter(d => d.enabled).length;

  return (
    <div className="space-y-1">
      {/* Header with summary */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
        <h4 className="text-sm font-medium text-gray-700">Set your availability for each day</h4>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <ClockIcon className="w-4 h-4" />
          <span>{totalHours} hours/week</span>
          <span className="text-gray-300 mx-1">•</span>
          <span>{enabledDays} days</span>
        </div>
      </div>

      {/* Day rows */}
      <div className="space-y-1">
        {getDaysInOrder().map((day) => (
          <DayScheduleRow
            key={day}
            day={day}
            availability={schedule[day]}
            onChange={(availability) => handleDayChange(day, availability)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Quick actions */}
      {!disabled && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">Quick actions:</span>
          <button
            type="button"
            onClick={() => {
              // Enable all weekdays with default hours
              const newSchedule = { ...schedule };
              for (let day = 1; day <= 5; day++) {
                newSchedule[day as DayOfWeek] = {
                  enabled: true,
                  slots: newSchedule[day as DayOfWeek].slots.length > 0 
                    ? newSchedule[day as DayOfWeek].slots 
                    : [{ id: crypto.randomUUID(), start: '08:00', end: '17:00' }],
                };
              }
              onChange(newSchedule);
            }}
            className="text-xs text-swiss-mint hover:text-swiss-mint-dark transition-colors"
          >
            Enable weekdays
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => {
              // Disable all days
              const newSchedule = { ...schedule };
              for (let day = 0; day <= 6; day++) {
                newSchedule[day as DayOfWeek] = {
                  ...newSchedule[day as DayOfWeek],
                  enabled: false,
                };
              }
              onChange(newSchedule);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => {
              // Copy Monday's schedule to all weekdays
              const mondaySchedule = schedule[1];
              if (!mondaySchedule.enabled) return;
              
              const newSchedule = { ...schedule };
              for (let day = 2; day <= 5; day++) {
                newSchedule[day as DayOfWeek] = {
                  enabled: true,
                  slots: mondaySchedule.slots.map(slot => ({
                    ...slot,
                    id: crypto.randomUUID(),
                  })),
                };
              }
              onChange(newSchedule);
            }}
            className="text-xs text-swiss-mint hover:text-swiss-mint-dark transition-colors"
          >
            Copy Monday to weekdays
          </button>
        </div>
      )}
    </div>
  );
};

export default WeeklyScheduleEditor;
