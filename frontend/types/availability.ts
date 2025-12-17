/**
 * Educator Availability Scheduling System Types
 * 
 * Calendly-style availability system for educators to set their
 * working schedule so daycares can find replacement staff.
 */

// Employment type preference
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CUSTOM_SCHEDULE';

export const EMPLOYMENT_TYPES: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CUSTOM_SCHEDULE'];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-Time',
  PART_TIME: 'Part-Time',
  CUSTOM_SCHEDULE: 'Replacement/Substitute',
};

export const EMPLOYMENT_TYPE_DESCRIPTIONS: Record<EmploymentType, string> = {
  FULL_TIME: 'Available for full-time positions (40h/week)',
  PART_TIME: 'Available for part-time positions',
  CUSTOM_SCHEDULE: 'Available for replacement work with specific hours',
};

// Time slot for a specific period
export interface TimeSlot {
  id: string;       // Unique identifier for React keys
  start: string;    // HH:MM format (e.g., "09:00")
  end: string;      // HH:MM format (e.g., "17:00")
}

// Daily availability configuration
export interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

// Day of week type (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Day labels for display
export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export const DAY_LABELS_SHORT: Record<DayOfWeek, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

// Weekly schedule type
export type WeeklySchedule = Record<DayOfWeek, DayAvailability>;

// Date override type
export type DateOverrideType = 'UNAVAILABLE' | 'CUSTOM';

// Date override for specific dates
export interface DateOverride {
  id: string;             // Unique identifier
  date: string;           // ISO date string (YYYY-MM-DD)
  type: DateOverrideType;
  reason?: string;        // Optional reason (e.g., "Holiday", "Training")
  slots?: TimeSlot[];     // Custom slots if type is 'CUSTOM'
}

// Complete availability settings
export interface EducatorAvailabilitySettings {
  employmentType: EmploymentType;
  weeklySchedule: WeeklySchedule;
  dateOverrides: DateOverride[];
  timezone: string;           // e.g., "Europe/Zurich"
  effectiveFrom?: string;     // When availability starts (ISO date)
  effectiveUntil?: string;    // When availability ends (ISO date)
  notes?: string;             // Additional notes for daycares
  
  // Quick availability indicator (computed)
  isCurrentlyAvailable?: boolean;
  nextAvailableDate?: string;
}

// Helper functions
export const createEmptyTimeSlot = (): TimeSlot => ({
  id: crypto.randomUUID(),
  start: '09:00',
  end: '17:00',
});

export const createEmptyDayAvailability = (): DayAvailability => ({
  enabled: false,
  slots: [],
});

export const createDefaultWeeklySchedule = (): WeeklySchedule => ({
  0: { enabled: false, slots: [] },
  1: { enabled: true, slots: [{ id: crypto.randomUUID(), start: '08:00', end: '17:00' }] },
  2: { enabled: true, slots: [{ id: crypto.randomUUID(), start: '08:00', end: '17:00' }] },
  3: { enabled: true, slots: [{ id: crypto.randomUUID(), start: '08:00', end: '17:00' }] },
  4: { enabled: true, slots: [{ id: crypto.randomUUID(), start: '08:00', end: '17:00' }] },
  5: { enabled: true, slots: [{ id: crypto.randomUUID(), start: '08:00', end: '17:00' }] },
  6: { enabled: false, slots: [] },
});

export const createEmptyAvailabilitySettings = (): EducatorAvailabilitySettings => ({
  employmentType: 'CUSTOM_SCHEDULE',
  weeklySchedule: createDefaultWeeklySchedule(),
  dateOverrides: [],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich',
  notes: '',
});

// Preset schedules for quick setup
export interface SchedulePreset {
  id: string;
  name: string;
  description: string;
  settings: Partial<EducatorAvailabilitySettings>;
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: 'full-time-standard',
    name: 'Full-Time Standard',
    description: 'Monday to Friday, 8:00 AM - 5:00 PM',
    settings: {
      employmentType: 'FULL_TIME',
      weeklySchedule: {
        0: { enabled: false, slots: [] },
        1: { enabled: true, slots: [{ id: '1', start: '08:00', end: '17:00' }] },
        2: { enabled: true, slots: [{ id: '2', start: '08:00', end: '17:00' }] },
        3: { enabled: true, slots: [{ id: '3', start: '08:00', end: '17:00' }] },
        4: { enabled: true, slots: [{ id: '4', start: '08:00', end: '17:00' }] },
        5: { enabled: true, slots: [{ id: '5', start: '08:00', end: '17:00' }] },
        6: { enabled: false, slots: [] },
      },
    },
  },
  {
    id: 'part-time-mornings',
    name: 'Part-Time Mornings',
    description: 'Monday to Friday, 8:00 AM - 12:00 PM',
    settings: {
      employmentType: 'PART_TIME',
      weeklySchedule: {
        0: { enabled: false, slots: [] },
        1: { enabled: true, slots: [{ id: '1', start: '08:00', end: '12:00' }] },
        2: { enabled: true, slots: [{ id: '2', start: '08:00', end: '12:00' }] },
        3: { enabled: true, slots: [{ id: '3', start: '08:00', end: '12:00' }] },
        4: { enabled: true, slots: [{ id: '4', start: '08:00', end: '12:00' }] },
        5: { enabled: true, slots: [{ id: '5', start: '08:00', end: '12:00' }] },
        6: { enabled: false, slots: [] },
      },
    },
  },
  {
    id: 'part-time-afternoons',
    name: 'Part-Time Afternoons',
    description: 'Monday to Friday, 1:00 PM - 6:00 PM',
    settings: {
      employmentType: 'PART_TIME',
      weeklySchedule: {
        0: { enabled: false, slots: [] },
        1: { enabled: true, slots: [{ id: '1', start: '13:00', end: '18:00' }] },
        2: { enabled: true, slots: [{ id: '2', start: '13:00', end: '18:00' }] },
        3: { enabled: true, slots: [{ id: '3', start: '13:00', end: '18:00' }] },
        4: { enabled: true, slots: [{ id: '4', start: '13:00', end: '18:00' }] },
        5: { enabled: true, slots: [{ id: '5', start: '13:00', end: '18:00' }] },
        6: { enabled: false, slots: [] },
      },
    },
  },
  {
    id: 'flexible-weekdays',
    name: 'Flexible Weekdays',
    description: 'Monday to Friday, flexible hours',
    settings: {
      employmentType: 'CUSTOM_SCHEDULE',
      weeklySchedule: {
        0: { enabled: false, slots: [] },
        1: { enabled: true, slots: [{ id: '1', start: '07:00', end: '19:00' }] },
        2: { enabled: true, slots: [{ id: '2', start: '07:00', end: '19:00' }] },
        3: { enabled: true, slots: [{ id: '3', start: '07:00', end: '19:00' }] },
        4: { enabled: true, slots: [{ id: '4', start: '07:00', end: '19:00' }] },
        5: { enabled: true, slots: [{ id: '5', start: '07:00', end: '19:00' }] },
        6: { enabled: false, slots: [] },
      },
    },
  },
];

// Time options for dropdowns (15-minute intervals)
export const TIME_OPTIONS: string[] = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

// Validation helpers
export const isValidTimeSlot = (slot: TimeSlot): boolean => {
  const [startHour, startMin] = slot.start.split(':').map(Number);
  const [endHour, endMin] = slot.end.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return endMinutes > startMinutes;
};

export const doTimeSlotsOverlap = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  const [s1Start, s1End] = [slot1.start, slot1.end].map(t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  });
  const [s2Start, s2End] = [slot2.start, slot2.end].map(t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  });
  return s1Start < s2End && s2Start < s1End;
};

export const formatTimeSlot = (slot: TimeSlot): string => {
  return `${slot.start} - ${slot.end}`;
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Calculate total hours per week
export const calculateWeeklyHours = (schedule: WeeklySchedule): number => {
  let totalMinutes = 0;
  
  for (const day of Object.values(schedule)) {
    if (day.enabled) {
      for (const slot of day.slots) {
        const [startHour, startMin] = slot.start.split(':').map(Number);
        const [endHour, endMin] = slot.end.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        totalMinutes += endMinutes - startMinutes;
      }
    }
  }
  
  return Math.round((totalMinutes / 60) * 10) / 10;
};

// Check if a specific date/time is available
export const isDateTimeAvailable = (
  settings: EducatorAvailabilitySettings,
  date: Date,
  time?: string
): boolean => {
  const dateStr = date.toISOString().split('T')[0];
  
  // Check date overrides first
  const override = settings.dateOverrides.find(o => o.date === dateStr);
  if (override) {
    if (override.type === 'UNAVAILABLE') return false;
    if (override.type === 'CUSTOM' && override.slots && time) {
      return override.slots.some(slot => {
        const [startHour, startMin] = slot.start.split(':').map(Number);
        const [endHour, endMin] = slot.end.split(':').map(Number);
        const [checkHour, checkMin] = time.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const checkMinutes = checkHour * 60 + checkMin;
        return checkMinutes >= startMinutes && checkMinutes < endMinutes;
      });
    }
  }
  
  // Check weekly schedule
  const dayOfWeek = date.getDay() as DayOfWeek;
  const daySchedule = settings.weeklySchedule[dayOfWeek];
  
  if (!daySchedule.enabled) return false;
  if (!time) return true;
  
  return daySchedule.slots.some(slot => {
    const [startHour, startMin] = slot.start.split(':').map(Number);
    const [endHour, endMin] = slot.end.split(':').map(Number);
    const [checkHour, checkMin] = time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const checkMinutes = checkHour * 60 + checkMin;
    return checkMinutes >= startMinutes && checkMinutes < endMinutes;
  });
};

// Get availability status for a date
export type DateAvailabilityStatus = 'available' | 'partial' | 'unavailable' | 'override';

export const getDateAvailabilityStatus = (
  settings: EducatorAvailabilitySettings,
  date: Date
): DateAvailabilityStatus => {
  const dateStr = date.toISOString().split('T')[0];
  
  // Check date overrides first
  const override = settings.dateOverrides.find(o => o.date === dateStr);
  if (override) {
    return 'override';
  }
  
  // Check weekly schedule
  const dayOfWeek = date.getDay() as DayOfWeek;
  const daySchedule = settings.weeklySchedule[dayOfWeek];
  
  if (!daySchedule.enabled || daySchedule.slots.length === 0) {
    return 'unavailable';
  }
  
  // Calculate total available hours
  let totalMinutes = 0;
  for (const slot of daySchedule.slots) {
    const [startHour, startMin] = slot.start.split(':').map(Number);
    const [endHour, endMin] = slot.end.split(':').map(Number);
    totalMinutes += (endHour * 60 + endMin) - (startHour * 60 + startMin);
  }
  
  // Consider 6+ hours as full availability, less as partial
  if (totalMinutes >= 360) {
    return 'available';
  }
  return 'partial';
};
