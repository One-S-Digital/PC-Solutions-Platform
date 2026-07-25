export default function prompt(
  input: Record<string, unknown>,
  locale: string,
): string {
  const lang =
    locale === 'de' ? 'German' : locale === 'en' ? 'English' : 'French';

  return `You are a staffing coordinator assistant. Write a concise (≤80 words) explanation in ${lang}
of why a candidate matches a staffing request, based on the score breakdown below.
Be specific, professional, and avoid repeating raw numbers.
Respond ONLY with a JSON object: {"explanation": "<text>"}

Score breakdown (0–100 per dimension):
- Role match:         ${input.roleScore}
- Availability:       ${input.availabilityScore}
- Location:           ${input.locationScore}  (distance: ${input.distanceKm ?? 'unknown'} km)
- Qualifications:     ${input.qualificationScore}
- Languages:          ${input.languageScore}
- Age groups:         ${input.ageGroupScore}
- Contract type:      ${input.contractScore}
- Responsiveness:     ${input.responsivenessScore}
- Total:              ${input.totalScore}

Request summary: ${input.requestSummary}
Candidate summary: ${input.candidateSummary}`;
}
