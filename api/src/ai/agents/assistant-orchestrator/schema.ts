import { z } from 'zod';

export const AssistantOrchestratorSchema = z.object({
  message: z.string(),
  toolCall: z
    .object({ name: z.string(), args: z.record(z.string(), z.unknown()) })
    .nullable()
    .optional(),
  nextSteps: z.array(z.string()).optional(),
});

export type AssistantOrchestratorOutput = z.infer<typeof AssistantOrchestratorSchema>;
