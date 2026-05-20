import { UserRole } from '@prisma/client';

export type AgentName = 'echo-validate';

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
    cacheTtlSeconds: undefined,
  },
};
