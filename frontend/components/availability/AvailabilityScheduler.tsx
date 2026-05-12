import React, { useState, useEffect } from 'react';
import {
  EducatorAvailabilitySettings,
  createEmptyAvailabilitySettings,
  SchedulePreset,
  calculateWeeklyHours,
  getEmploymentTypes,
} from '../../types/availability';
import EmploymentTypeSelector from './EmploymentTypeSelector';
import WeeklyScheduleEditor from './WeeklyScheduleEditor';
import DateOverridesList from './DateOverridesList';
import AvailabilityCalendarPreview from './AvailabilityCalendarPreview';
import SchedulePresets from './SchedulePresets';
import {
  CalendarDaysIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface AvailabilitySchedulerProps {
  value?: EducatorAvailabilitySettings;
  onChange: (settings: EducatorAvailabilitySettings) => void;
  disabled?: boolean;
  showPreview?: boolean;
  compact?: boolean;
}

const AvailabilityScheduler: React.FC<AvailabilitySchedulerProps> = ({
  value,
  onChange,
  disabled = false,
  showPreview = true,
  compact = false,
}) => {
  // Initialize with default settings if no value provided
  const [settings, setSettings] = useState<EducatorAvailabilitySettings>(
    value || createEmptyAvailabilitySettings()
  );
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCalendar, setShowCalendar] = useState(!compact);

  // Sync with external value
  useEffect(() => {
    if (value) {
      setSettings(value);
    }
  }, [value]);

  // Notify parent of changes
  const handleChange = (newSettings: EducatorAvailabilitySettings) => {
    setSettings(newSettings);
    onChange(newSettings);
  };

  const handleApplyPreset = (preset: SchedulePreset) => {
    const newSettings = {
      ...settings,
      ...preset.settings,
      weeklySchedule: preset.settings.weeklySchedule ? {
        ...preset.settings.weeklySchedule,
        // Ensure all slots have unique IDs
        ...Object.fromEntries(
          Object.entries(preset.settings.weeklySchedule).map(([day, daySettings]) => [
            day,
            {
              ...daySettings,
              slots: daySettings.slots.map(slot => ({
                ...slot,
                id: crypto.randomUUID(),
              })),
            },
          ])
        ),
      } : settings.weeklySchedule,
    } as EducatorAvailabilitySettings;
    
    handleChange(newSettings);
  };

  const weeklyHours = calculateWeeklyHours(settings.weeklySchedule);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-swiss-mint/10 flex items-center justify-center flex-shrink-0">
          <CalendarDaysIcon className="w-5 h-5 text-swiss-mint" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Availability Schedule</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Set your working schedule so daycares can find you for replacement positions
          </p>
        </div>
        {weeklyHours > 0 && (
          <div className="text-right">
            <div className="text-2xl font-bold text-swiss-mint">{weeklyHours}h</div>
            <div className="text-xs text-gray-500">per week</div>
          </div>
        )}
      </div>

      {/* Employment Type Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <EmploymentTypeSelector
          value={getEmploymentTypes(settings)}
          onChange={(types) => handleChange({ ...settings, employmentTypes: types })}
          disabled={disabled}
        />
      </div>

      {/* Replacement Pool Notice */}
      {getEmploymentTypes(settings).includes('CUSTOM_SCHEDULE') && (
        <div className="flex items-start gap-2 p-3 bg-teal-50 rounded-lg border border-teal-200">
          <UserGroupIcon className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-teal-700">
            <p className="font-medium">Replacement Pool</p>
            <p className="mt-0.5 text-teal-600">
              By selecting Replacement/Substitute, your profile will be added to the replacement
              staff pool so daycares can find you for short-notice shifts.
            </p>
          </div>
        </div>
      )}

      {/* Quick Setup Presets */}
      <SchedulePresets
        currentSettings={settings}
        onApplyPreset={handleApplyPreset}
        disabled={disabled}
      />

      {/* Weekly Schedule */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          Weekly Schedule
          <span className="text-xs font-normal text-gray-500">
            Set your regular availability for each day
          </span>
        </h4>
        <WeeklyScheduleEditor
          schedule={settings.weeklySchedule}
          onChange={(schedule) => handleChange({ ...settings, weeklySchedule: schedule })}
          disabled={disabled}
        />
      </div>

      {/* Date Overrides */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <DateOverridesList
          overrides={settings.dateOverrides}
          onChange={(overrides) => handleChange({ ...settings, dateOverrides: overrides })}
          disabled={disabled}
        />
      </div>

      {/* Additional Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Notes
        </label>
        <textarea
          value={settings.notes || ''}
          onChange={(e) => handleChange({ ...settings, notes: e.target.value })}
          disabled={disabled}
          rows={3}
          placeholder="Add any additional information about your availability (e.g., preferred areas, travel distance, special conditions)..."
          className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm
            focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint
            disabled:bg-gray-50 disabled:text-gray-500
            placeholder:text-gray-400"
        />
      </div>

      {/* Calendar Preview (collapsible) */}
      {showPreview && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">Calendar Preview</span>
            {showCalendar ? (
              <ChevronUpIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {showCalendar && (
            <div className="px-4 pb-4">
              <AvailabilityCalendarPreview settings={settings} />
            </div>
          )}
        </div>
      )}

      {/* Advanced Settings (collapsible) */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">Advanced Settings</span>
          {showAdvanced ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4">
            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => handleChange({ ...settings, timezone: e.target.value })}
                disabled={disabled}
                className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm
                  focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint
                  disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="Europe/Zurich">Europe/Zurich (CET/CEST)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
              </select>
            </div>

            {/* Effective dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available From (optional)
                </label>
                <input
                  type="date"
                  value={settings.effectiveFrom || ''}
                  onChange={(e) => handleChange({ ...settings, effectiveFrom: e.target.value || undefined })}
                  disabled={disabled}
                  className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm
                    focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint
                    disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Until (optional)
                </label>
                <input
                  type="date"
                  value={settings.effectiveUntil || ''}
                  onChange={(e) => handleChange({ ...settings, effectiveUntil: e.target.value || undefined })}
                  disabled={disabled}
                  className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm
                    focus:ring-2 focus:ring-swiss-mint focus:border-swiss-mint
                    disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">How it works</p>
          <p className="mt-1 text-blue-600">
            Your availability is visible to daycares searching for replacement staff. 
            They can filter by days and times you're available to find the perfect match for their needs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityScheduler;
