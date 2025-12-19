# Educator Availability Scheduling System Design

## Overview

This document outlines the design for a Calendly-style availability scheduling system for educators. The system allows educators to set their weekly availability, specify their employment type preference, and manage special date overrides - enabling daycares to quickly find available replacement staff.

## Research: How Calendly Works

### Core Calendly Concepts

1. **Weekly Schedule Template**
   - Users define their recurring availability on a week-by-week basis
   - Each day of the week can have different availability hours
   - Multiple time slots per day are supported (e.g., morning and afternoon with lunch break)

2. **Time Slots**
   - Availability is defined as time ranges (e.g., 9:00 AM - 12:00 PM)
   - Users can add multiple non-overlapping time ranges per day
   - Minimum granularity is typically 15-minute increments

3. **Date Overrides**
   - Users can set specific dates as unavailable (vacations, holidays)
   - Users can also add extra availability on specific dates
   - Overrides take precedence over the weekly schedule

4. **Buffer Times**
   - Time before/after events for preparation
   - Not critical for our use case but good to consider

### Key UX Patterns

- **Visual Week Grid**: Shows all 7 days with time slots clearly visible
- **Toggle Days On/Off**: Quick way to enable/disable entire days
- **Time Picker**: Dropdown or input for start/end times
- **Add/Remove Slots**: Easy way to add multiple time ranges per day
- **Preview Mode**: Shows what the schedule looks like on a calendar

---

## Our Implementation Design

### Employment Type Options

Educators can choose from three employment type preferences:

1. **Full-Time** - Available for full-time positions (typically 40 hours/week)
2. **Part-Time** - Available for part-time positions (flexible hours)
3. **Custom Schedule** - Available for replacement/substitute work with specific hours

### Data Structure

```typescript
// Employment Type
type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CUSTOM_SCHEDULE';

// Time slot for a specific period
interface TimeSlot {
  start: string;  // HH:MM format (e.g., "09:00")
  end: string;    // HH:MM format (e.g., "17:00")
}

// Daily availability configuration
interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

// Weekly schedule (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
interface WeeklySchedule {
  0: DayAvailability;  // Sunday
  1: DayAvailability;  // Monday
  2: DayAvailability;  // Tuesday
  3: DayAvailability;  // Wednesday
  4: DayAvailability;  // Thursday
  5: DayAvailability;  // Friday
  6: DayAvailability;  // Saturday
}

// Date override for specific dates
interface DateOverride {
  date: string;        // ISO date string (YYYY-MM-DD)
  type: 'UNAVAILABLE' | 'CUSTOM';
  reason?: string;     // Optional reason (e.g., "Holiday", "Training")
  slots?: TimeSlot[];  // Custom slots if type is 'CUSTOM'
}

// Complete availability settings
interface EducatorAvailabilitySettings {
  employmentType: EmploymentType;
  weeklySchedule: WeeklySchedule;
  dateOverrides: DateOverride[];
  timezone: string;    // e.g., "Europe/Zurich"
  effectiveFrom?: string;  // When availability starts (ISO date)
  effectiveUntil?: string; // When availability ends (ISO date)
  notes?: string;      // Additional notes for daycares
  
  // Quick availability indicator
  isCurrentlyAvailable: boolean;
  nextAvailableDate?: string;
}
```

### Database Schema

We'll store the availability as a JSON field in the User model (similar to the current `availability` string field, but structured):

```prisma
// In schema.prisma - Update User model
model User {
  // ... existing fields ...
  
  // Replace the simple availability string with structured data
  availability           String?   // Keep for backward compatibility
  availabilitySettings   Json?     // New: Structured availability settings
  
  // ... rest of model ...
}
```

The `availabilitySettings` JSON field will store the `EducatorAvailabilitySettings` object.

### UI Components

#### 1. AvailabilityScheduler (Main Container)
The main component that orchestrates all availability settings.

```
┌─────────────────────────────────────────────────────────────────┐
│  Availability Settings                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Employment Type                                         │   │
│  │  ○ Full-Time    ○ Part-Time    ● Custom Schedule        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Weekly Schedule                                         │   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │ MON  [✓] │ 09:00 - 12:00 │ + Add slot              ││   │
│  │  │          │ 13:00 - 17:00 │                         ││   │
│  │  ├──────────┼───────────────┼─────────────────────────┤│   │
│  │  │ TUE  [✓] │ 09:00 - 17:00 │ + Add slot              ││   │
│  │  ├──────────┼───────────────┼─────────────────────────┤│   │
│  │  │ WED  [✓] │ 09:00 - 17:00 │ + Add slot              ││   │
│  │  ├──────────┼───────────────┼─────────────────────────┤│   │
│  │  │ THU  [✓] │ 09:00 - 17:00 │ + Add slot              ││   │
│  │  ├──────────┼───────────────┼─────────────────────────┤│   │
│  │  │ FRI  [✓] │ 09:00 - 15:00 │ + Add slot              ││   │
│  │  ├──────────┼───────────────┼─────────────────────────┤│   │
│  │  │ SAT  [ ] │ Not available │                         ││   │
│  │  ├──────────┼───────────────┼─────────────────────────┤│   │
│  │  │ SUN  [ ] │ Not available │                         ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Date Overrides (Vacations, Special Days)               │   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │ Dec 25, 2025 │ Unavailable │ Holiday        │ [×]  ││   │
│  │  │ Dec 26, 2025 │ Unavailable │ Holiday        │ [×]  ││   │
│  │  │ Jan 15, 2026 │ 14:00-18:00 │ Extra hours    │ [×]  ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  │  [+ Add Date Override]                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Additional Notes                                        │   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │ Available for last-minute requests. Prefer to work  ││   │
│  │  │ in Zurich area. Can travel up to 30 min commute.   ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Preview Your Availability                               │   │
│  │  ┌───┬───┬───┬───┬───┬───┬───┐                         │   │
│  │  │Mon│Tue│Wed│Thu│Fri│Sat│Sun│ December 2025           │   │
│  │  ├───┼───┼───┼───┼───┼───┼───┤                         │   │
│  │  │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │                         │   │
│  │  │ ● │ ● │ ● │ ● │ ● │   │   │                         │   │
│  │  ├───┼───┼───┼───┼───┼───┼───┤                         │   │
│  │  │ 8 │ 9 │10 │11 │12 │13 │14 │                         │   │
│  │  │ ● │ ● │ ● │ ● │ ● │   │   │                         │   │
│  │  └───┴───┴───┴───┴───┴───┴───┘                         │   │
│  │  ● = Available    ○ = Partially    - = Unavailable     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Component Breakdown

| Component | Description |
|-----------|-------------|
| `AvailabilityScheduler.tsx` | Main container component that orchestrates all child components |
| `EmploymentTypeSelector.tsx` | Radio/toggle for selecting Full-Time, Part-Time, or Custom Schedule |
| `WeeklyScheduleEditor.tsx` | Grid showing all 7 days with toggle and time slots |
| `DayScheduleRow.tsx` | Single day row with enable toggle and time slots |
| `TimeSlotInput.tsx` | Start/end time picker for a single slot |
| `DateOverridesList.tsx` | List of date overrides with add/remove |
| `DateOverrideModal.tsx` | Modal to add/edit a date override |
| `AvailabilityCalendarPreview.tsx` | Visual calendar showing availability |
| `AvailabilityNotes.tsx` | Text area for additional notes |

### API Changes

#### New DTOs

```typescript
// educator-availability.dto.ts
import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TimeSlotDto {
  @IsString()
  start: string;  // HH:MM

  @IsString()
  end: string;    // HH:MM
}

export class DayAvailabilityDto {
  @IsBoolean()
  enabled: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  slots: TimeSlotDto[];
}

export class DateOverrideDto {
  @IsString()
  date: string;  // YYYY-MM-DD

  @IsEnum(['UNAVAILABLE', 'CUSTOM'])
  type: 'UNAVAILABLE' | 'CUSTOM';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  slots?: TimeSlotDto[];
}

export class UpdateEducatorAvailabilityDto {
  @IsEnum(['FULL_TIME', 'PART_TIME', 'CUSTOM_SCHEDULE'])
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CUSTOM_SCHEDULE';

  @IsObject()
  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  weeklySchedule: Record<number, DayAvailabilityDto>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateOverrideDto)
  dateOverrides: DateOverrideDto[];

  @IsString()
  timezone: string;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  effectiveUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### Search/Query Functionality

For daycares searching for replacement staff:

```typescript
// Query interface for finding available educators
interface AvailabilitySearchQuery {
  date: string;           // The date when replacement is needed
  startTime?: string;     // Start time of shift
  endTime?: string;       // End time of shift
  employmentType?: EmploymentType[];  // Filter by employment type
  region?: string;        // Canton/region filter
  skills?: string[];      // Required skills
}

// Search result with availability info
interface EducatorSearchResult {
  educator: User;
  isAvailableOnDate: boolean;
  availableSlots: TimeSlot[];
  employmentType: EmploymentType;
  matchScore: number;  // How well they match the requirements
}
```

### Default Schedules

For convenience, we provide preset schedules:

```typescript
const PRESET_SCHEDULES = {
  FULL_TIME_STANDARD: {
    // Monday to Friday, 8:00-17:00
    employmentType: 'FULL_TIME',
    weeklySchedule: {
      0: { enabled: false, slots: [] },
      1: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
      2: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
      3: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
      4: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
      5: { enabled: true, slots: [{ start: '08:00', end: '17:00' }] },
      6: { enabled: false, slots: [] },
    }
  },
  PART_TIME_MORNINGS: {
    employmentType: 'PART_TIME',
    weeklySchedule: {
      0: { enabled: false, slots: [] },
      1: { enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
      2: { enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
      3: { enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
      4: { enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
      5: { enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
      6: { enabled: false, slots: [] },
    }
  },
  PART_TIME_AFTERNOONS: {
    employmentType: 'PART_TIME',
    weeklySchedule: {
      0: { enabled: false, slots: [] },
      1: { enabled: true, slots: [{ start: '13:00', end: '18:00' }] },
      2: { enabled: true, slots: [{ start: '13:00', end: '18:00' }] },
      3: { enabled: true, slots: [{ start: '13:00', end: '18:00' }] },
      4: { enabled: true, slots: [{ start: '13:00', end: '18:00' }] },
      5: { enabled: true, slots: [{ start: '13:00', end: '18:00' }] },
      6: { enabled: false, slots: [] },
    }
  },
};
```

### Translation Keys

```json
{
  "availability": {
    "title": "Availability",
    "subtitle": "Set your working schedule so daycares can find you",
    "employmentType": {
      "label": "Employment Type Preference",
      "fullTime": "Full-Time",
      "fullTimeDesc": "Available for full-time positions (40h/week)",
      "partTime": "Part-Time",
      "partTimeDesc": "Available for part-time positions",
      "customSchedule": "Replacement/Substitute",
      "customScheduleDesc": "Available for replacement work with specific hours"
    },
    "weeklySchedule": {
      "title": "Weekly Schedule",
      "subtitle": "Set your regular availability for each day",
      "days": {
        "monday": "Monday",
        "tuesday": "Tuesday",
        "wednesday": "Wednesday",
        "thursday": "Thursday",
        "friday": "Friday",
        "saturday": "Saturday",
        "sunday": "Sunday"
      },
      "notAvailable": "Not available",
      "addSlot": "Add time slot",
      "removeSlot": "Remove"
    },
    "timeSlot": {
      "from": "From",
      "to": "To",
      "invalid": "End time must be after start time"
    },
    "dateOverrides": {
      "title": "Date Overrides",
      "subtitle": "Mark specific dates as unavailable or add extra hours",
      "addOverride": "Add Date Override",
      "unavailable": "Unavailable",
      "customHours": "Custom Hours",
      "reason": "Reason (optional)",
      "noOverrides": "No date overrides set"
    },
    "preview": {
      "title": "Calendar Preview",
      "available": "Available",
      "partiallyAvailable": "Partially Available",
      "unavailable": "Unavailable"
    },
    "notes": {
      "title": "Additional Notes",
      "placeholder": "Add any additional information about your availability (e.g., preferred areas, travel distance, special conditions)..."
    },
    "presets": {
      "title": "Quick Setup",
      "fullTimeStandard": "Full-Time (Mon-Fri, 8AM-5PM)",
      "partTimeMornings": "Part-Time Mornings (Mon-Fri, 8AM-12PM)",
      "partTimeAfternoons": "Part-Time Afternoons (Mon-Fri, 1PM-6PM)",
      "applyPreset": "Apply"
    }
  }
}
```

---

## Implementation Steps

### Phase 1: Foundation (Types & Schema)
1. Create TypeScript types for availability settings
2. Add JSON field to database schema
3. Create DTO for API validation

### Phase 2: UI Components
1. Build TimeSlotInput component
2. Build DayScheduleRow component
3. Build WeeklyScheduleEditor component
4. Build DateOverrideModal component
5. Build DateOverridesList component
6. Build AvailabilityCalendarPreview component
7. Build EmploymentTypeSelector component
8. Build main AvailabilityScheduler component

### Phase 3: Integration
1. Update EducatorProfileForm to include new availability section
2. Update EducatorProfileSettings to include new availability section
3. Update API endpoints to handle new availability format
4. Add migration to update existing data

### Phase 4: Search & Display
1. Add availability filtering to educator search
2. Create availability display component for educator profiles
3. Add availability indicators to search results

---

## Benefits

1. **For Educators**: Easy-to-use visual interface to set availability, similar to popular tools like Calendly
2. **For Daycares**: Quick identification of available replacement staff for specific dates/times
3. **For Platform**: Structured data enables better matching and search functionality
4. **Professional**: Modern UI that matches industry standards

---

## Technical Considerations

1. **Timezone Handling**: All times stored in UTC, displayed in user's local timezone
2. **Backward Compatibility**: Keep old `availability` field, migrate to new format
3. **Performance**: Index on availability settings for search queries
4. **Validation**: Ensure time slots don't overlap, end time after start time
