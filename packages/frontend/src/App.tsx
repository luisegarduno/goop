import { useEffect, useState } from "react";
import { Terminal } from "./components/Terminal";
import { InputBox } from "./components/InputBox";
import { SetupModal } from "./components/SetupModal";
import { SessionSwitcher } from "./components/SessionSwitcher";
import { useSSE } from "./hooks/useSSE";
import { useSessionStore } from "./stores/session";
import { createSession, getSession, getMessages } from "./api/client";
import "./styles/index.css";

function App() {
  const { sessionId, setSessionId, setWorkingDirectory, addMessage, setMessages, clearSession } = useSessionStore();
  const [showSetup, setShowSetup] = useState(false);

  useSSE(sessionId);

  useEffect(() => {
    // Try to restore session from localStorage
    const restoreSession = async () => {
      const savedSessionId = localStorage.getItem("goop_session_id");
      const savedWorkingDir = localStorage.getItem("goop_working_directory");

      if (savedSessionId && savedWorkingDir) {
        try {
          // Verify session exists on backend
          const session = await getSession(savedSessionId);

          // Load messages for this session
          const messages = await getMessages(savedSessionId);

          // Restore session - use backend's working directory as source of truth
          setSessionId(savedSessionId);
          setWorkingDirectory(session.workingDirectory);
          setMessages(messages);

          if (import.meta.env.DEV) {
            console.log(`Restored session ${savedSessionId} with ${messages.length} messages`);
            console.log(`Working directory: ${session.workingDirectory || savedWorkingDir}`);
          }
        } catch (error) {
          console.error("Failed to restore session:", error);
          // Session doesn't exist or error occurred, show setup
          clearSession();
          setShowSetup(true);
        }
      } else {
        // No saved session, show setup
        setShowSetup(true);
      }
    };

    restoreSession();
    // Zustand store actions are stable references; including them for clarity and future-proofing.
  }, [setSessionId, setWorkingDirectory, setMessages, clearSession]);

  const handleSetupComplete = async (dir: string, title: string) => {
    setShowSetup(false);

    try {
      // Create new session with working directory and title
      const session = await createSession(dir, title);
      setSessionId(session.id);
      setWorkingDirectory(dir); // Set after successful session creation
      if (import.meta.env.DEV) {
        console.log(`Created new session "${title}" (${session.id}) with working directory: ${dir}`);
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      clearSession(); // Clear both session and working directory
      setShowSetup(true); // Show modal again
    }
  };

  const handleSend = async (message: string) => {
    if (!sessionId) return;

    // Add user message to UI
    addMessage({
      id: Date.now().toString(),
      role: "user",
      parts: [{ type: "text", text: message }],
    });

    // Send to backend and stream the response
    const { setStreaming, appendText, addToolUse, addToolResult, startNewMessage, finishStreaming } = useSessionStore.getState();

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
      let messageCount = 0; // Track how many message.start events we've received

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
                messageCount++;
                // If this is not the first message (i.e., after tool execution), start a new message
                if (messageCount > 1) {
                  startNewMessage();
                }
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
      {showSetup && <SetupModal onComplete={handleSetupComplete} />}

      {/* Session Switcher - Top Right Corner */}
      {sessionId && (
        <div className="absolute top-4 right-4 z-40">
          <SessionSwitcher />
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <Terminal />
      </div>
      <InputBox onSend={handleSend} />
    </div>
  );
}

export default App;