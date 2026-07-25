export default function prompt(
  input: Record<string, unknown>,
  locale: string,
): string {
  const lang =
    locale === 'de' ? 'German' : locale === 'en' ? 'English' : 'French';

  return `You are a staffing coordinator assistant for Swiss childcare foundations.
Extract structured staffing requirements from the free-text request below.
The request is written in ${lang}. Respond ONLY with a valid JSON object — no markdown, no explanation.

Required JSON shape:
{
  "roleRequired": string,           // Primary role, e.g. "Educator" / "Assistant" / "Auxiliaire"
  "contractType": "FULL_TIME"|"PART_TIME"|"TEMPORARY"|"INTERNSHIP"|"REPLACEMENT"|null,
  "startDate": "YYYY-MM-DD"|null,
  "endDate": "YYYY-MM-DD"|null,
  "hoursPerWeek": integer|null,
  "canton": string|null,            // Swiss canton abbreviation, e.g. "GE"
  "city": string|null,
  "ageGroups": ("INFANT"|"TODDLER"|"PRESCHOOL"|"SCHOOL_AGE")[],
  "languages": string[],            // ISO 639-1 codes, e.g. ["fr","de"]
  "qualifications": string[],       // e.g. ["EDE","ASSC","CFC"]
  "notes": string|null              // anything not captured above
}

Use null for fields not mentioned. Do not invent information.

Free-text request:
---
${input.rawText as string}
---`;
}
