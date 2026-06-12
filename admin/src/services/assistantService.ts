// ─── Event types ────────────────────────────────────────────────────────────

export interface ToolCallEvent {
  toolCallId: string;
  toolName: string;
  level: 'L1_ANSWER' | 'L2_DRAFT' | 'L3_EXECUTE';
  approvalRequired: boolean;
  args: Record<string, unknown>;
  modal?: string;
}

export interface ToolResultEvent {
  toolCallId: string;
  toolName: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface ModalActionEvent {
  modal: string;
  prefill: Record<string, unknown>;
}

export interface ToolStatusEvent {
  toolCallId: string;
  toolName: string;
  status: string;
  label: string;
}

export interface NextStepsEvent {
  nextSteps: string[];
}

// ─── Conversation history types ─────────────────────────────────────────────

export type ConversationKind = 'CHAT' | 'DRAFT' | 'BRIEFING' | 'ORDER';

export interface ConversationSummary {
  id: string;
  title: string | null;
  kind: ConversationKind;
  statusLabel: string | null;
  lastActivityAt: string;
  startedAt: string;
}

export interface ConversationHistoryMessage {
  id: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  createdAt: string;
}

export interface ConversationHistoryToolCall {
  id: string;
  toolName: string;
  level: 'L1_ANSWER' | 'L2_DRAFT' | 'L3_EXECUTE';
  inputJson: Record<string, unknown> | null;
  outputJson: Record<string, unknown> | null;
  status: 'PROPOSED' | 'AWAITING_APPROVAL' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'FAILED';
  approvalRequired: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationHistoryMessage[];
  toolCalls: ConversationHistoryToolCall[];
}

// ─── Morning briefing (admin: platform-wide items) ──────────────────────────

export type BriefingItemType =
  | 'pending_educator_approvals'
  | 'stale_applications_platform'
  | 'unassigned_parent_leads'
  | 'replacements_without_matches'
  | 'open_support_tickets'
  | 'canton_policy_updates'
  | 'unread_notifications';

export interface BriefingItem {
  type: BriefingItemType;
  count: number;
  meta?: Record<string, unknown>;
}

export interface Briefing {
  generatedAt: string;
  items: BriefingItem[];
  conversationId: string | null;
}

export interface StreamHandlers {
  onToken: (text: string) => void;
  onToolCall: (toolCall: ToolCallEvent) => void;
  onToolResult: (result: ToolResultEvent) => void;
  onModalAction: (action: ModalActionEvent) => void;
  onToolStatus?: (status: ToolStatusEvent) => void;
  onNextSteps?: (event: NextStepsEvent) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function getAuthHeaders(getToken: () => Promise<string | null>): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Authentication token not available');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export async function createConversation(
  getToken: () => Promise<string | null>,
  locale: string
): Promise<{ id: string }> {
  const headers = await getAuthHeaders(getToken);
  const response = await fetch(`${API_BASE_URL}/assistant/conversations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ locale }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as any)?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return { id: data?.id ?? data?.data?.id };
}

/** Fetches the Morning Briefing (deterministic platform-wide items, cached server-side). */
export async function getBriefing(
  getToken: () => Promise<string | null>,
  locale: string
): Promise<Briefing> {
  const headers = await getAuthHeaders(getToken);
  const response = await fetch(
    `${API_BASE_URL}/assistant/briefing?locale=${encodeURIComponent(locale)}`,
    { headers, cache: 'no-store' }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as any)?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return (data?.data ?? data) as Briefing;
}

/** Lists the user's conversations (non-archived, newest activity first). */
export async function listConversations(
  getToken: () => Promise<string | null>
): Promise<ConversationSummary[]> {
  const headers = await getAuthHeaders(getToken);
  const response = await fetch(`${API_BASE_URL}/assistant/conversations`, {
    headers,
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as any)?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : (data?.data ?? []);
}

/** Fetches a conversation with its full message + tool-call history. */
export async function getConversationHistory(
  getToken: () => Promise<string | null>,
  conversationId: string
): Promise<ConversationDetail> {
  const headers = await getAuthHeaders(getToken);
  const response = await fetch(`${API_BASE_URL}/assistant/conversations/${conversationId}`, {
    headers,
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as any)?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return (data?.data ?? data) as ConversationDetail;
}

/** Renames and/or (un)archives a conversation. */
export async function updateConversation(
  getToken: () => Promise<string | null>,
  conversationId: string,
  patch: { title?: string; archived?: boolean }
): Promise<ConversationSummary> {
  const headers = await getAuthHeaders(getToken);
  const response = await fetch(`${API_BASE_URL}/assistant/conversations/${conversationId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(patch),
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as any)?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return (data?.data ?? data) as ConversationSummary;
}

/**
 * Confirms a pending L3 tool call (e.g. approve_educator) so the backend
 * executes it. Returns the structured tool result (or an error).
 */
export async function confirmToolCall(
  getToken: () => Promise<string | null>,
  conversationId: string,
  toolCallId: string,
  overrideArgs?: Record<string, unknown>
): Promise<{ toolCallId: string; toolName: string; result?: Record<string, unknown>; error?: string }> {
  const headers = await getAuthHeaders(getToken);
  const url = `${API_BASE_URL}/assistant/conversations/${conversationId}/tool-calls/${toolCallId}/confirm`;
  const body = overrideArgs ? JSON.stringify({ overrideArgs }) : undefined;
  const response = await fetch(url, { method: 'POST', headers, body, cache: 'no-store' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as any)?.message || `HTTP ${response.status}`);
  }
  return response.json();
}

/** Marks a pending L3 tool call as rejected (user cancelled). */
export async function rejectToolCall(
  getToken: () => Promise<string | null>,
  conversationId: string,
  toolCallId: string
): Promise<void> {
  const headers = await getAuthHeaders(getToken);
  const url = `${API_BASE_URL}/assistant/conversations/${conversationId}/tool-calls/${toolCallId}/reject`;
  await fetch(url, { method: 'POST', headers, cache: 'no-store' }).catch(() => undefined);
}

export async function streamMessage(
  getToken: () => Promise<string | null>,
  conversationId: string,
  message: string,
  handlers: StreamHandlers
): Promise<void> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders(getToken);
  } catch (err) {
    handlers.onError(err instanceof Error ? err.message : 'Authentication failed');
    return;
  }

  headers['Accept'] = 'text/event-stream';

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/assistant/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
      cache: 'no-store',
    });
  } catch (networkErr) {
    handlers.onError(networkErr instanceof Error ? networkErr.message : 'Network error');
    return;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    handlers.onError((errorData as any)?.message || `HTTP ${response.status}`);
    return;
  }

  if (!response.body) {
    handlers.onError('No response body for SSE stream');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = 'message';
        let dataLine = '';

        for (const line of part.split('\n')) {
          if (line.startsWith('event:')) {
            eventType = line.slice('event:'.length).trim();
          } else if (line.startsWith('data:')) {
            dataLine = line.slice('data:'.length).trim();
          }
        }

        if (!dataLine) continue;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(dataLine);
        } catch {
          continue;
        }

        switch (eventType) {
          case 'token':
            handlers.onToken((parsed.text as string) ?? (parsed.token as string) ?? '');
            break;
          case 'tool_call':
            handlers.onToolCall(parsed as unknown as ToolCallEvent);
            break;
          case 'tool_result':
            handlers.onToolResult(parsed as unknown as ToolResultEvent);
            break;
          case 'tool_status':
            handlers.onToolStatus?.(parsed as unknown as ToolStatusEvent);
            break;
          case 'next_steps':
            handlers.onNextSteps?.(parsed as unknown as NextStepsEvent);
            break;
          case 'modal_action':
            handlers.onModalAction(parsed as unknown as ModalActionEvent);
            break;
          case 'error':
            handlers.onError((parsed.message as string) ?? 'Unknown error');
            break;
          case 'done':
            handlers.onDone();
            break;
        }
      }
    }
  } catch (readErr) {
    handlers.onError(readErr instanceof Error ? readErr.message : 'Stream read error');
  } finally {
    reader.releaseLock();
  }

  handlers.onDone();
}
