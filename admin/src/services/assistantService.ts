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

export interface StreamHandlers {
  onToken: (text: string) => void;
  onToolCall: (toolCall: ToolCallEvent) => void;
  onToolResult: (result: ToolResultEvent) => void;
  onModalAction: (action: ModalActionEvent) => void;
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
