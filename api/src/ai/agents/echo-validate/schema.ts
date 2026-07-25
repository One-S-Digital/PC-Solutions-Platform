import { z } from 'zod';

export const EchoValidateSchema = z.object({
  echo: z.string(),
  model: z.string().optional(),
});

export type EchoValidateOutput = z.infer<typeof EchoValidateSchema>;
