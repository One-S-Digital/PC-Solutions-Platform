import { UserRole } from '@prisma/client';

export type AgentName =
  | 'echo-validate'
  | 'staffing-request-parser'
  | 'match-explanation'
  | 'assistant-orchestrator';

export type ScopeRule = 'self' | 'organization' | 'admin-only' | 'any';

export interface AgentConfig {
  name: AgentName;
  models: string[];
  maxOutputTokens: number;
  allowedRoles: UserRole[];
  scopeRule: ScopeRule;
  cacheTtlSeconds?: number;
  requiredInputFields?: string[];
  retrieval?: { scope: string; k: number };
  dailyTokenBudget?: number;
}

// ── Model priority lists ──────────────────────────────────────────────────────
// Free tier first (zero cost), paid value models as fallback.
// The OpenRouter adapter tries each in order on failure.

const FREE_THEN_VALUE = [
  'deepseek/deepseek-chat-v4-flash:free',   // DeepSeek V4 Flash — free tier
  'google/gemma-4-31b-it:free',             // Gemma 4 31B — free tier
  'deepseek/deepseek-chat-v4-flash',        // DeepSeek V4 Flash — paid ($0.10/$0.20 per 1M)
  'google/gemini-3-flash',                  // Gemini 3 Flash — paid ($0.50/$3.00 per 1M)
  'x-ai/grok-4.1-fast',                    // Grok 4.1 Fast — paid ($1.25/$2.50 per 1M)
];

const ORCHESTRATOR_MODELS = FREE_THEN_VALUE;

export const AI_AGENTS: Record<AgentName, AgentConfig> = {
  'echo-validate': {
    name: 'echo-validate',
    models: FREE_THEN_VALUE,
    maxOutputTokens: 200,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    scopeRule: 'admin-only',
  },

  'staffing-request-parser': {
    name: 'staffing-request-parser',
    models: FREE_THEN_VALUE,
    maxOutputTokens: 120,
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    scopeRule: 'organization',
    requiredInputFields: ['rawText'],
    dailyTokenBudget: 50000,
  },

  'match-explanation': {
    name: 'match-explanation',
    models: FREE_THEN_VALUE,
    maxOutputTokens: 100,
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    scopeRule: 'organization',
    cacheTtlSeconds: 3600,
    dailyTokenBudget: 100000,
  },

  'assistant-orchestrator': {
    name: 'assistant-orchestrator',
    models: ORCHESTRATOR_MODELS,
    maxOutputTokens: 2000,
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    scopeRule: 'organization',
    dailyTokenBudget: 500000,
  },
};
