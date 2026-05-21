import { UserRole } from '@prisma/client';

export type AgentName =
  | 'echo-validate'
  | 'staffing-request-parser'
  | 'match-explanation';

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

export const AI_AGENTS: Record<AgentName, AgentConfig> = {
  'echo-validate': {
    name: 'echo-validate',
    models: ['google/gemini-2.5-flash', 'deepseek/deepseek-chat', 'anthropic/claude-haiku-4-5-20251001'],
    maxOutputTokens: 200,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    scopeRule: 'admin-only',
  },

  'staffing-request-parser': {
    name: 'staffing-request-parser',
    models: ['google/gemini-2.5-flash', 'deepseek/deepseek-chat'],
    maxOutputTokens: 120,
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    scopeRule: 'organization',
    requiredInputFields: ['rawText'],
    dailyTokenBudget: 50000,
  },

  'match-explanation': {
    name: 'match-explanation',
    models: ['google/gemini-2.5-flash', 'deepseek/deepseek-chat'],
    maxOutputTokens: 100,
    allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    scopeRule: 'organization',
    cacheTtlSeconds: 3600,
    dailyTokenBudget: 100000,
  },
};
