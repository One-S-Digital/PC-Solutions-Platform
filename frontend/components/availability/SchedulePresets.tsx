import React from 'react';
import {
  EducatorAvailabilitySettings,
  SCHEDULE_PRESETS,
  SchedulePreset,
  getEmploymentTypes,
} from '../../types/availability';
import { SparklesIcon, CheckIcon } from '@heroicons/react/24/outline';

interface SchedulePresetsProps {
  currentSettings: EducatorAvailabilitySettings;
  onApplyPreset: (preset: SchedulePreset) => void;
  disabled?: boolean;
}

const SchedulePresets: React.FC<SchedulePresetsProps> = ({
  currentSettings,
  onApplyPreset,
  disabled = false,
}) => {
  // Check if current settings match a preset
  const isPresetActive = (preset: SchedulePreset): boolean => {
    // Compare employment types using getEmploymentTypes() for both sides so that
    // the new employmentTypes[] array and legacy single employmentType field are
    // both handled correctly.
    const presetTypes = preset.settings.employmentTypes
      ? [...preset.settings.employmentTypes].sort()
      : preset.settings.employmentType
        ? [preset.settings.employmentType]
        : [];
    const currentTypes = [...getEmploymentTypes(currentSettings)].sort();
    if (JSON.stringify(presetTypes) !== JSON.stringify(currentTypes)) {
      return false;
    }
    // Simple check - compare enabled days and first slot times
    const presetSchedule = preset.settings.weeklySchedule;
    if (!presetSchedule) return false;

    for (let day = 0; day <= 6; day++) {
      const presetDay = presetSchedule[day as keyof typeof presetSchedule];
      const currentDay = currentSettings.weeklySchedule[day as keyof typeof currentSettings.weeklySchedule];
      
      if (presetDay.enabled !== currentDay.enabled) return false;
      if (presetDay.enabled && currentDay.enabled) {
        if (presetDay.slots.length !== currentDay.slots.length) return false;
        if (presetDay.slots.length > 0 && currentDay.slots.length > 0) {
          if (presetDay.slots[0].start !== currentDay.slots[0].start ||
              presetDay.slots[0].end !== currentDay.slots[0].end) {
            return false;
          }
        }
      }
    }
    return true;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <SparklesIcon className="w-4 h-4 text-swiss-mint" />
        <h4 className="text-sm font-medium text-gray-700">Quick Setup</h4>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {SCHEDULE_PRESETS.map((preset) => {
          const isActive = isPresetActive(preset);
          
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => !disabled && !isActive && onApplyPreset(preset)}
              disabled={disabled || isActive}
              className={`
                relative p-3 rounded-lg border text-left transition-all
                ${isActive 
                  ? 'border-swiss-mint bg-swiss-mint/10 cursor-default' 
                  : 'border-gray-200 hover:border-swiss-mint/50 hover:bg-white cursor-pointer'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isActive && (
                <div className="absolute top-2 right-2">
                  <CheckIcon className="w-4 h-4 text-swiss-mint" />
                </div>
              )}
              <div className="text-sm font-medium text-gray-900 pr-5">
                {preset.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {preset.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SchedulePresets;
