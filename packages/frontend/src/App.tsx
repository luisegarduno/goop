import { useEffect } from "react";
import { Terminal } from "./components/Terminal";
import { InputBox } from "./components/InputBox";
import { useSSE } from "./hooks/useSSE";
import { useSessionStore } from "./stores/session";
import { createSession, getSession, getMessages } from "./api/client";
import "./styles/index.css";

function App() {
  const { sessionId, setSessionId, addMessage, setMessages, clearSession } = useSessionStore();

  useSSE(sessionId);

  useEffect(() => {
    // Try to restore session from localStorage
    const restoreSession = async () => {
      const savedSessionId = localStorage.getItem("goop_session_id");

      if (savedSessionId) {
        try {
          // Verify session exists on backend
          await getSession(savedSessionId);

          // Load messages for this session
          const messages = await getMessages(savedSessionId);

          // Restore session
          setSessionId(savedSessionId);
          setMessages(messages);

          console.log(`Restored session ${savedSessionId} with ${messages.length} messages`);
        } catch (error) {
          console.error("Failed to restore session:", error);
          // Session doesn't exist or error occurred, create new one
          clearSession();
          const session = await createSession();
          setSessionId(session.id);
          console.log(`Created new session ${session.id}`);
        }
      } else {
        // No saved session, create new one
        const session = await createSession();
        setSessionId(session.id);
        console.log(`Created new session ${session.id}`);
      }
    };

    restoreSession();
  }, []);

  const handleSend = async (message: string) => {
    if (!sessionId) return;

    // Add user message to UI
    addMessage({
      id: Date.now().toString(),
      role: "user",
      parts: [{ type: "text", text: message }],
    });

    // Send to backend and stream the response
    const { setStreaming, appendText, addToolUse, addToolResult, finishStreaming } = useSessionStore.getState();

    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });

      if (!response.body) {
        console.error("No response body");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      setStreaming(true);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());

              if (data.type === 'message.start') {
                // Message started
              } else if (data.type === 'message.delta') {
                appendText(data.text);
              } else if (data.type === 'message.done') {
                finishStreaming();
              } else if (data.type === 'tool.start') {
                addToolUse(data.toolName, data.input);
              } else if (data.type === 'tool.result') {
                addToolResult(data.result);
              }
            } catch (e) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error("Error streaming response:", error);
      finishStreaming();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 overflow-hidden">
        <Terminal />
      </div>
      <InputBox onSend={handleSend} />
    </div>
  );
}

export default App;