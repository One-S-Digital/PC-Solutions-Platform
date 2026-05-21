import { z } from 'zod';

export const MatchExplanationSchema = z.object({
  explanation: z
    .string()
    .max(400)
    .describe('80-word prose summary of why this candidate matches the request'),
});

export type MatchExplanationOutput = z.infer<typeof MatchExplanationSchema>;
