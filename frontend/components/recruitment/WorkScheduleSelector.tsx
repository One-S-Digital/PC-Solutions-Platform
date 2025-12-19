import React from 'react';
import { useTranslation } from 'react-i18next';
import { JobWorkSchedule } from '../../types';
import { STANDARD_INPUT_FIELD } from '../../constants';

interface WorkScheduleSelectorProps {
  value: JobWorkSchedule;
  onChange: (schedule: JobWorkSchedule) => void;
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  { key: 1, label: 'monday' },
  { key: 2, label: 'tuesday' },
  { key: 3, label: 'wednesday' },
  { key: 4, label: 'thursday' },
  { key: 5, label: 'friday' },
  { key: 6, label: 'saturday' },
  { key: 0, label: 'sunday' },
];

const TIME_SLOTS = ['MORNING', 'AFTERNOON', 'FULL_DAY', 'FLEXIBLE'] as const;

const WorkScheduleSelector: React.FC<WorkScheduleSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation(['recruitment', 'common']);

  const handleDayToggle = (dayKey: number) => {
    const currentDays = value.preferredDays || [];
    const newDays = currentDays.includes(dayKey)
      ? currentDays.filter(d => d !== dayKey)
      : [...currentDays, dayKey];
    onChange({ ...value, preferredDays: newDays });
  };

  const handleTimeSlotChange = (slot: typeof TIME_SLOTS[number]) => {
    onChange({ ...value, preferredTimeSlot: slot });
  };

  const handleHoursChange = (hours: string) => {
    const numHours = hours ? parseInt(hours, 10) : undefined;
    onChange({ ...value, expectedHoursPerWeek: numHours });
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700">
        {t('recruitment:jobPostModal.workSchedule.title')}
      </h4>

      {/* Expected Hours Per Week */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {t('recruitment:jobPostModal.workSchedule.expectedHours')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="60"
            value={value.expectedHoursPerWeek || ''}
            onChange={(e) => handleHoursChange(e.target.value)}
            disabled={disabled}
            placeholder="40"
            className={`${STANDARD_INPUT_FIELD} w-24`}
          />
          <span className="text-sm text-gray-500">
            {t('recruitment:jobPostModal.workSchedule.hoursPerWeek')}
          </span>
        </div>
      </div>

      {/* Preferred Time Slot */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          {t('recruitment:jobPostModal.workSchedule.preferredTimeSlot')}
        </label>
        <div className="flex flex-wrap gap-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => handleTimeSlotChange(slot)}
              disabled={disabled}
              className={`
                px-3 py-1.5 text-sm rounded-full border transition-colors
                ${value.preferredTimeSlot === slot
                  ? 'bg-swiss-mint text-white border-swiss-mint'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-mint'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {t(`recruitment:jobPostModal.workSchedule.timeSlots.${slot}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred Days */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          {t('recruitment:jobPostModal.workSchedule.preferredDays')}
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = (value.preferredDays || []).includes(day.key);
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => handleDayToggle(day.key)}
                disabled={disabled}
                className={`
                  w-10 h-10 text-xs font-medium rounded-lg border transition-colors
                  ${isSelected
                    ? 'bg-swiss-mint text-white border-swiss-mint'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-swiss-mint'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {t(`recruitment:jobPostModal.workSchedule.days.${day.label}`).substring(0, 2)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkScheduleSelector;
