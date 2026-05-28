export default function prompt(
  input: {
    userMessage: string;
    conversationHistory: string;
    availableTools: string;
    locale: string;
    toolResult?: string;
    role?: string;
    userProfile?: string;
    platformContext?: string;
    userState?: string;
  },
  locale: 'fr' | 'de' | 'en' = 'fr',
): string {
  const lang = locale === 'de' ? 'German' : locale === 'en' ? 'English' : 'French';
  const contextBlock = buildContextBlock(input);

  if (input.toolResult && !input.availableTools) {
    return `You are the PC Solutions Platform Virtual Assistant.

LANGUAGE: Always respond in ${lang}.

${contextBlock}

A tool has been executed. Use the result below to give a clear, direct, helpful answer.
Do NOT call another tool. Set toolCall to null.

CONVERSATION SO FAR:
${input.conversationHistory}

USER MESSAGE: ${input.userMessage}

TOOL RESULT:
${input.toolResult}

Respond with JSON: {"message": "...", "toolCall": null}`;
  }

  const toolSection = input.availableTools
    ? `TOOLS: Use tools for actions. Never describe an action without using the appropriate tool.
Available tools: ${input.availableTools}

TOOL SELECTION RULES:
1. Platform question / how-to → use search_help_docs
2. Find candidates / staffing request → use search_internal_candidates (FOUNDATION only)
3. Draft job post → use draft_job_post (FOUNDATION only)
4. Draft parent reply → use draft_parent_reply (FOUNDATION only)
5. Open a form/modal → use open_modal
6. View my profile data → use get_my_profile
7. View my leads (FOUNDATION) → use get_my_leads
8. View my enquiries (PARENT) → use get_my_enquiries
9. View my applications (EDUCATOR) → use get_my_applications
10. View my orders (FOUNDATION/SUPPLIER) → use get_my_orders
11. View my listings (SUPPLIER/SERVICE_PROVIDER) → use get_my_listings
12. View my service requests (SERVICE_PROVIDER) → use get_my_service_requests
13. Navigate to a page → use navigate_to
14. L2 tools: explain what you will do before running
15. If no tool fits → answer directly with toolCall: null`
    : '';

  const priorToolResults = input.toolResult
    ? `PRIOR TOOL RESULTS:\n${input.toolResult}\n`
    : '';

  return `You are the PC Solutions Platform Virtual Assistant — a helpful, knowledgeable assistant for the PC Solutions Swiss childcare platform.

LANGUAGE: Always respond in ${lang}.

${contextBlock}

${toolSection}

${priorToolResults}CONVERSATION SO FAR:
${input.conversationHistory}

USER MESSAGE: ${input.userMessage}

Be concise, accurate, and helpful. Always respond in ${lang}.

Respond with JSON: {"message": "...", "toolCall": {"name": "...", "args": {...}} | null}`;
}

function buildContextBlock(input: {
  role?: string;
  userProfile?: string;
  platformContext?: string;
  userState?: string;
}): string {
  const parts: string[] = [];
  if (input.userProfile) parts.push(`USER: ${input.userProfile}`);
  if (input.platformContext) parts.push(`WHAT THIS USER CAN DO:\n${input.platformContext}`);
  if (input.userState) parts.push(`CURRENT ACTIVITY:\n${input.userState}`);
  return parts.length > 0 ? parts.join('\n\n') : '';
}
