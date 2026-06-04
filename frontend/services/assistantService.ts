import { apiService } from './api';
import { useAuth } from '@clerk/clerk-react';

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

// ─── Authenticated fetch helper ─────────────────────────────────────────────

/**
 * Returns a raw fetch-compatible function that injects the Clerk JWT.
 * The caller must be inside a React component/hook context that provides useAuth.
 * For use in non-hook contexts, pass `getToken` directly.
 */
async function getAuthHeaders(getToken: () => Promise<string | null>): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Authentication token not available');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

// ─── Service functions ───────────────────────────────────────────────────────

/**
 * Creates a new conversation with the AI assistant.
 * @param getToken  Clerk's `getToken` function from `useAuth()`
 * @param locale    The user's locale string, e.g. "en" | "fr" | "de"
 */
export async function createConversation(
  getToken: () => Promise<string | null>,
  locale: string
): Promise<{ id: string }> {
  const headers = await getAuthHeaders(getToken);
  const url = `${apiService.apiBaseUrl}/assistant/conversations`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ locale }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = (errorData as any)?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  // Handle both { id } and { data: { id } } shapes
  return { id: data?.id ?? data?.data?.id };
}

/**
 * Confirms a pending L3 tool call (e.g. contact_admin) so the backend executes
 * it. Returns the structured tool result (or an error).
 */
export async function confirmToolCall(
  getToken: () => Promise<string | null>,
  conversationId: string,
  toolCallId: string
): Promise<{ toolCallId: string; toolName: string; result?: Record<string, unknown>; error?: string }> {
  const headers = await getAuthHeaders(getToken);
  const url = `${apiService.apiBaseUrl}/assistant/conversations/${conversationId}/tool-calls/${toolCallId}/confirm`;
  const response = await fetch(url, { method: 'POST', headers, cache: 'no-store' });
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
  const url = `${apiService.apiBaseUrl}/assistant/conversations/${conversationId}/tool-calls/${toolCallId}/reject`;
  await fetch(url, { method: 'POST', headers, cache: 'no-store' }).catch(() => undefined);
}

/**
 * Sends a message to the assistant over a streaming SSE connection.
 * The backend sends: `event: <type>\ndata: <json>\n\n`
 */
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

  // SSE streams do not use JSON response, so override Accept
  headers['Accept'] = 'text/event-stream';

  const url = `${apiService.apiBaseUrl}/assistant/conversations/${conversationId}/messages`;

  let response: Response;
  try {
    response = await fetch(url, {
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
    const msg = (errorData as any)?.message || `HTTP ${response.status}`;
    handlers.onError(msg);
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

      // SSE messages are separated by double newlines
      const parts = buffer.split('\n\n');
      // Keep incomplete last part in buffer
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        if (!part.trim()) continue;

        // Parse event type and data from SSE block
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
          // Not valid JSON — skip
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
          default:
            // Ignore unknown event types
            break;
        }
      }
    }
  } catch (readErr) {
    handlers.onError(readErr instanceof Error ? readErr.message : 'Stream read error');
  } finally {
    reader.releaseLock();
  }

  // If the stream ended without a done event, call onDone to flush
  handlers.onDone();
}
