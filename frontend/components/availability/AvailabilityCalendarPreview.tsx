import React, { useState, useMemo } from 'react';
import { 
  EducatorAvailabilitySettings, 
  getDateAvailabilityStatus, 
  DateAvailabilityStatus,
  DayOfWeek
} from '../../types/availability';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface AvailabilityCalendarPreviewProps {
  settings: EducatorAvailabilitySettings;
  startOnMonday?: boolean;
}

const AvailabilityCalendarPreview: React.FC<AvailabilityCalendarPreviewProps> = ({
  settings,
  startOnMonday = true,
}) => {
  const { t } = useTranslation(['settings']);
  const [currentDate, setCurrentDate] = useState(new Date());
  const dayKey: Record<DayOfWeek, string> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  // Get the first day of the month
  const firstDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }, [currentDate]);

  // Get the last day of the month
  const lastDayOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }, [currentDate]);

  // Get days to display
  const calendarDays = useMemo(() => {
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Determine the starting day of week
    let startDayOfWeek = firstDayOfMonth.getDay();
    if (startOnMonday) {
      startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    }

    // Add days from previous month
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(prevMonth);
      day.setDate(prevMonth.getDate() - i);
      days.push({ date: day, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      days.push({ date: day, isCurrentMonth: true });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
      days.push({ date: day, isCurrentMonth: false });
    }

    return days;
  }, [currentDate, firstDayOfMonth, lastDayOfMonth, startOnMonday]);

  // Get day headers
  const dayHeaders = useMemo(() => {
    if (startOnMonday) {
      return [1, 2, 3, 4, 5, 6, 0] as DayOfWeek[];
    }
    return [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];
  }, [startOnMonday]);

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const getStatusColor = (status: DateAvailabilityStatus): string => {
    switch (status) {
      case 'available':
        return 'bg-swiss-mint text-white';
      case 'partial':
        return 'bg-yellow-400 text-white';
      case 'override':
        return 'bg-blue-400 text-white';
      case 'unavailable':
      default:
        return 'bg-gray-100 text-gray-400';
    }
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const monthYear = currentDate.toLocaleDateString(undefined, { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-gray-700">
          {t('settings:availability.preview.title', 'Calendar Preview')}
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-xs font-medium text-gray-900 min-w-[110px] text-center">
            {monthYear}
          </span>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Compact calendar (constrained width so it doesn't balloon on desktop) */}
      <div className="mx-auto w-full max-w-[320px]">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {dayHeaders.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-medium text-gray-500 py-0.5"
            >
              {t(
                `settings:availability.weeklySchedule.daysShort.${dayKey[day]}`,
                dayKey[day]
              )}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map(({ date, isCurrentMonth }, index) => {
            const status = getDateAvailabilityStatus(settings, date);
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div
                key={index}
                className={`
                  relative aspect-square flex items-center justify-center text-[10px] rounded-md
                  transition-colors
                  ${!isCurrentMonth ? 'opacity-25' : ''}
                  ${isPast ? 'opacity-40' : ''}
                  ${getStatusColor(status)}
                  ${isToday(date) ? 'ring-2 ring-swiss-mint ring-offset-1' : ''}
                `}
                title={`${date.toLocaleDateString()}: ${status}`}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-swiss-mint" />
          <span className="text-[11px] text-gray-600">
            {t('settings:availability.preview.available', 'Available')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-yellow-400" />
          <span className="text-[11px] text-gray-600">
            {t('settings:availability.preview.partiallyAvailable', 'Partially Available')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-blue-400" />
          <span className="text-[11px] text-gray-600">
            {t('settings:availability.preview.override', 'Override')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-gray-100" />
          <span className="text-[11px] text-gray-600">
            {t('settings:availability.preview.unavailable', 'Unavailable')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendarPreview;
