export const API_BASE = "http://localhost:3001/api";

export async function createSession(
  workingDirectory: string,
  title: string = "New Conversation",
  provider: string = "anthropic",
  model: string = "claude-3-5-haiku-latest",
  apiKey?: string
): Promise<SessionInfo> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, workingDirectory, provider, model, apiKey }),
  });

  if (!res.ok) {
    let errorMessage = `Failed to create session: ${res.status}`;
    try {
      const error = await res.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // If not JSON, use the status code message
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function updateSession(
  sessionId: string,
  updates: {
    title?: string;
    workingDirectory?: string;
    provider?: string;
    model?: string;
    apiKey?: string;
  }
): Promise<SessionInfo> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    let errorMessage = `Failed to update session: ${res.status}`;
    try {
      const error = await res.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // If not JSON, use the status code message
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function getSession(id: string) {
  const res = await fetch(`${API_BASE}/sessions/${id}`);
  return res.json();
}

export interface SessionInfo {
  id: string;
  title: string;
  workingDirectory: string;
  provider: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export async function getAllSessions(): Promise<SessionInfo[]> {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) {
    let errorMessage = `Failed to fetch sessions: ${res.status}`;
    try {
      const error = await res.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // If not JSON, use the status code message
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

interface BackendMessagePart {
  id: string;
  messageId: string;
  type: string;
  content: Record<string, unknown>;
  order: number;
}

interface BackendMessage {
  id: string;
  sessionId: string;
  role: string;
  createdAt: string;
  parts: BackendMessagePart[];
}

export interface FrontendMessage {
  id: string;
  role: "user" | "assistant";
  parts: Array<{
    type: "text" | "tool_use" | "tool_result";
    text?: string;
    name?: string;
    result?: string;
    input?: Record<string, unknown>;
  }>;
}

export async function getMessages(
  sessionId: string
): Promise<FrontendMessage[]> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`);
  const backendMessages: BackendMessage[] = await res.json();

  // Transform backend messages to frontend format
  return backendMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: msg.parts.map((part) => {
      if (part.type === "text") {
        return {
          type: "text" as const,
          text: part.content.text as string,
        };
      } else if (part.type === "tool_use") {
        return {
          type: "tool_use" as const,
          name: part.content.name as string,
          input: part.content.input as Record<string, unknown>,
        };
      } else if (part.type === "tool_result") {
        return {
          type: "tool_result" as const,
          result: part.content.content as string,
        };
      }
      // Fallback
      return {
        type: "text" as const,
        text: JSON.stringify(part.content),
      };
    }),
  }));
}

export function sendMessage(sessionId: string, content: string): EventSource {
  // Using POST with SSE requires different approach
  // We'll use a workaround: encode in query params or use different endpoint
  // For now, create a simple polling connection
  const url = `${API_BASE}/sessions/${sessionId}/messages`;

  // Trigger POST in background
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  // Return EventSource for streaming (needs separate GET endpoint)
  // This is a simplified version - real implementation needs backend adjustment
  return new EventSource(`${API_BASE}/sessions/${sessionId}/stream`);
}
