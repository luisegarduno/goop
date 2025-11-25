const API_BASE = "http://localhost:3001/api";

export async function createSession(): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
  });
  return res.json();
}

export async function getSession(id: string) {
  const res = await fetch(`${API_BASE}/sessions/${id}`);
  return res.json();
}

interface BackendMessagePart {
  id: string;
  messageId: string;
  type: string;
  content: any;
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
    input?: any;
  }>;
}

export async function getMessages(sessionId: string): Promise<FrontendMessage[]> {
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
          text: part.content.text,
        };
      } else if (part.type === "tool_use") {
        return {
          type: "tool_use" as const,
          name: part.content.name,
          input: part.content.input,
        };
      } else if (part.type === "tool_result") {
        return {
          type: "tool_result" as const,
          result: part.content.content,
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
