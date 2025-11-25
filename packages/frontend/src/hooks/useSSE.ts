import { useEffect } from "react";
import { useSessionStore } from "../stores/session";

export function useSSE(sessionId: string | null) {
  const { appendText, finishStreaming, setStreaming } = useSessionStore();

  useEffect(() => {
    if (!sessionId) return;

    // Note: This needs a GET endpoint for SSE
    // For MVP, we'll implement a simpler approach
    // The actual implementation should use EventSource

    const eventSource = new EventSource(
      `http://localhost:3001/api/sessions/${sessionId}/events`
    );

    eventSource.addEventListener("message.start", () => {
      setStreaming(true);
    });

    eventSource.addEventListener("message.delta", (e) => {
      const data = JSON.parse(e.data);
      appendText(data.text);
    });

    eventSource.addEventListener("message.done", () => {
      finishStreaming();
    });

    eventSource.onerror = () => {
      console.error("SSE connection error");
      finishStreaming();
    };

    return () => eventSource.close();
  }, [sessionId]);
}
