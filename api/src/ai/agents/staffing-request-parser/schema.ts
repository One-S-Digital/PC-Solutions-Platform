import { z } from 'zod';

export const StaffingRequestParserSchema = z.object({
  roleRequired: z.string().describe('Primary role needed, e.g. "Educator", "Assistant"'),
  contractType: z
    .enum(['FULL_TIME', 'PART_TIME', 'TEMPORARY', 'INTERNSHIP', 'REPLACEMENT'])
    .nullable()
    .optional(),
  startDate: z.string().nullable().optional().describe('ISO date string or null'),
  endDate: z.string().nullable().optional().describe('ISO date string or null'),
  hoursPerWeek: z.number().int().min(1).max(45).nullable().optional(),
  canton: z.string().nullable().optional().describe('Swiss canton abbreviation, e.g. "GE", "VD"'),
  city: z.string().nullable().optional(),
  ageGroups: z
    .array(z.enum(['INFANT', 'TODDLER', 'PRESCHOOL', 'SCHOOL_AGE']))
    .default([]),
  languages: z.array(z.string()).default([]).describe('ISO 639-1 language codes, e.g. ["fr","de"]'),
  qualifications: z
    .array(z.string())
    .default([])
    .describe('Required diplomas or certifications, e.g. ["EDE", "ASSC"]'),
  notes: z.string().nullable().optional().describe('Any extra context not captured in structured fields'),
});

export type StaffingRequestParserOutput = z.infer<typeof StaffingRequestParserSchema>;
