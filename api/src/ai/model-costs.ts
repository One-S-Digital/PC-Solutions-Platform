// Cost in USD per 1M tokens (input/output)
export const MODEL_COSTS: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'google/gemini-2.5-flash':             { inputPer1M: 0.075, outputPer1M: 0.30  },
  'deepseek/deepseek-chat':              { inputPer1M: 0.14,  outputPer1M: 0.28  },
  'anthropic/claude-haiku-4-5-20251001': { inputPer1M: 0.80,  outputPer1M: 4.00  },
  'anthropic/claude-sonnet-4':           { inputPer1M: 3.00,  outputPer1M: 15.00 },
  'google/gemini-2.5-pro':              { inputPer1M: 1.25,  outputPer1M: 10.00 },
};

export function calculateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_COSTS[model];
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M;
}
