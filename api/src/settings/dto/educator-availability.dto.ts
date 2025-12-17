import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// Time slot DTO
export class TimeSlotDto {
  @IsString()
  id: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:MM format',
  })
  start: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:MM format',
  })
  end: string;
}

// Day availability DTO
export class DayAvailabilityDto {
  @IsBoolean()
  enabled: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  slots: TimeSlotDto[];
}

// Date override DTO
export class DateOverrideDto {
  @IsString()
  id: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  date: string;

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

// Weekly schedule DTO (0-6 for Sunday-Saturday)
export class WeeklyScheduleDto {
  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  0: DayAvailabilityDto; // Sunday

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  1: DayAvailabilityDto; // Monday

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  2: DayAvailabilityDto; // Tuesday

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  3: DayAvailabilityDto; // Wednesday

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  4: DayAvailabilityDto; // Thursday

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  5: DayAvailabilityDto; // Friday

  @ValidateNested()
  @Type(() => DayAvailabilityDto)
  6: DayAvailabilityDto; // Saturday
}

// Employment type enum
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CUSTOM_SCHEDULE';

// Main educator availability settings DTO
export class EducatorAvailabilitySettingsDto {
  @IsEnum(['FULL_TIME', 'PART_TIME', 'CUSTOM_SCHEDULE'])
  employmentType: EmploymentType;

  @IsObject()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  weeklySchedule: WeeklyScheduleDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateOverrideDto)
  dateOverrides: DateOverrideDto[];

  @IsString()
  timezone: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'effectiveFrom must be in YYYY-MM-DD format',
  })
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'effectiveUntil must be in YYYY-MM-DD format',
  })
  effectiveUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isCurrentlyAvailable?: boolean;

  @IsOptional()
  @IsString()
  nextAvailableDate?: string;
}

// Update DTO for partial updates
export class UpdateEducatorAvailabilityDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EducatorAvailabilitySettingsDto)
  availabilitySettings?: EducatorAvailabilitySettingsDto;
}
