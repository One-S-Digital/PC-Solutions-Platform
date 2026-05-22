import { AgentConfig } from '../../ai-agents.config';
import { UserRole } from '@prisma/client';

export const ASSISTANT_ORCHESTRATOR_CONFIG: AgentConfig = {
  name: 'assistant-orchestrator' as any,
  models: ['anthropic/claude-sonnet-4-6', 'google/gemini-2.5-pro'],
  maxOutputTokens: 1000,
  allowedRoles: [UserRole.FOUNDATION, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  scopeRule: 'organization',
  dailyTokenBudget: 500000,
};
