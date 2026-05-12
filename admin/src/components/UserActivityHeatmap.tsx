import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';

interface Props {
  userId: string;
  activeDays: string[];
  totalActiveDays: number;
  currentStreak: number;
  year: number;
  onYearChange: (year: number) => void;
  isLoading?: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildCalendar(year: number, activeSet: Set<string>) {
  // Week columns from Jan 1 to Dec 31, Sunday-anchored
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const startOffset = jan1.getUTCDay(); // 0=Sun, pad to align first week

  // Pad beginning of first week
  const days: { date: string | null; active: boolean }[] = Array(startOffset).fill({ date: null, active: false });

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDays = isLeap ? 366 : 365;

  for (let d = 0; d < totalDays; d++) {
    const dt = new Date(Date.UTC(year, 0, d + 1));
    const iso = dt.toISOString().split('T')[0];
    days.push({ date: iso, active: activeSet.has(iso) });
  }

  // Pad end to complete last week
  while (days.length % 7 !== 0) days.push({ date: null, active: false });

  // Reshape: weeks × days (columns × rows)
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return { weeks, startOffset };
}

function monthLabels(year: number, weeks: { date: string | null; active: boolean }[][]) {
  const labels: { month: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const firstDay = week.find(d => d.date);
    if (firstDay?.date) {
      const m = new Date(firstDay.date).getUTCMonth();
      if (m !== lastMonth) {
        labels.push({ month: MONTHS[m], col });
        lastMonth = m;
      }
    }
  });
  return labels;
}

export function UserActivityHeatmap({ activeDays, totalActiveDays, currentStreak, year, onYearChange, isLoading }: Props) {
  const { t } = useTranslation('admin');
  const activeSet = useMemo(() => new Set(activeDays), [activeDays]);
  const { weeks } = useMemo(() => buildCalendar(year, activeSet), [year, activeSet]);
  const mLabels = useMemo(() => monthLabels(year, weeks), [weeks, year]);

  const currentYear = new Date().getUTCFullYear();

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-24 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('userProfile.activityHeatmap.title', 'Login Activity')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('userProfile.activityHeatmap.subtitle', '{{count}} active days in {{year}}', { count: totalActiveDays, year })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1 text-orange-500 text-sm font-medium">
              <Flame className="w-4 h-4" />
              <span>{currentStreak}d</span>
            </div>
          )}
          {/* Year picker */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onYearChange(year - 1)}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 w-10 text-center">{year}</span>
            <button
              onClick={() => onYearChange(year + 1)}
              disabled={year >= currentYear}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-0.5 min-w-max">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-0.5 mr-1">
            <div className="h-4" /> {/* month label spacer */}
            {DAYS.map((day, i) => (
              <div key={day} className={`h-3 flex items-center text-[10px] text-gray-400 w-6 ${i % 2 === 1 ? '' : 'invisible'}`}>
                {day.slice(0, 1)}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, colIdx) => {
            const label = mLabels.find(l => l.col === colIdx);
            return (
              <div key={colIdx} className="flex flex-col gap-0.5">
                <div className="h-4 flex items-end">
                  {label && (
                    <span className="text-[10px] text-gray-400 leading-none">{label.month}</span>
                  )}
                </div>
                {week.map((cell, rowIdx) => (
                  <div
                    key={rowIdx}
                    title={cell.date || ''}
                    className={`w-3 h-3 rounded-sm ${
                      cell.date === null
                        ? 'bg-transparent'
                        : cell.active
                        ? 'bg-indigo-500'
                        : 'bg-gray-100'
                    }`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-gray-400">{t('userProfile.activityHeatmap.less', 'Less')}</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-indigo-300" />
        <div className="w-3 h-3 rounded-sm bg-indigo-500" />
        <span className="text-[10px] text-gray-400">{t('userProfile.activityHeatmap.more', 'More')}</span>
      </div>
    </div>
  );
}
