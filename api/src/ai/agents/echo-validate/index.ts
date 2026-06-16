import { AgentName, AgentConfig } from '../../ai-agents.config';
import { UserRole } from '@prisma/client';

export const echoValidateAgent: AgentConfig = {
  name: 'echo-validate' as AgentName,
  models: ['google/gemini-2.5-flash', 'deepseek/deepseek-chat', 'anthropic/claude-haiku-4-5-20251001'],
  maxOutputTokens: 200,
  allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  scopeRule: 'admin-only',
};
