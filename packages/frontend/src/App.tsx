import { useEffect, useState } from "react";
import { Terminal } from "./components/Terminal";
import { InputBox } from "./components/InputBox";
import { SetupModal } from "./components/SetupModal";
import { SettingsModal } from "./components/SettingsModal";
import { SessionSwitcher } from "./components/SessionSwitcher";
import { useSessionStore } from "./stores/session";
import { getSession, getMessages, updateSession, API_BASE } from "./api/client";
import "./styles/index.css";

function App() {
  const {
    sessionId,
    workingDirectory,
    provider,
    model,
    setSessionId,
    setWorkingDirectory,
    setProvider,
    setModel,
    addMessage,
    setMessages,
    clearSession,
  } = useSessionStore();
  const [showSetup, setShowSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
          setProvider(session.provider);
          setModel(session.model);
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
  }, [setSessionId, setWorkingDirectory, setProvider, setModel, setMessages, clearSession]);

  const handleSetupComplete = (
    sessionId: string,
    dir: string,
    provider: string,
    model: string
  ) => {
    // Session already created by SetupModal
    setShowSetup(false);
    setSessionId(sessionId);
    setWorkingDirectory(dir);
    setProvider(provider);
    setModel(model);

    if (import.meta.env.DEV) {
      console.log(
        `Session created: ${sessionId} with ${provider}/${model} in ${dir}`
      );
    }
  };

  const handleSettingsSave = async (
    newProvider: string,
    newModel: string,
    apiKey: string,
    workingDirectory: string
  ) => {
    if (!sessionId) return;

    try {
      // Check if provider is changing
      const providerChanged = provider && provider !== newProvider;

      const updatedSession = await updateSession(sessionId, {
        provider: newProvider,
        model: newModel,
        workingDirectory,
        apiKey,
      });

      // Update store with new settings
      setProvider(updatedSession.provider);
      setModel(updatedSession.model);
      setWorkingDirectory(updatedSession.workingDirectory);

      // Clear messages if provider changed (backend also clears them)
      if (providerChanged) {
        setMessages([]);
        if (import.meta.env.DEV) {
          console.log(`Provider changed - conversation history cleared`);
        }
      }

      if (import.meta.env.DEV) {
        console.log(
          `Updated session settings: ${updatedSession.provider}/${updatedSession.model}`
        );
      }
    } catch (error) {
      console.error("Failed to update session:", error);
      throw error;
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
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
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

      {/* Session Switcher & New Session Button - Top Right Corner */}
      {sessionId && (
        <div className="absolute top-4 right-4 z-40 flex gap-2">
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 transition-colors flex items-center gap-2"
            title="Session settings"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm">Settings</span>
          </button>
          <button
            onClick={() => {
              clearSession();
              setShowSetup(true);
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md border border-green-700 transition-colors flex items-center gap-2"
            title="Start a new session"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">New Session</span>
          </button>
          <SessionSwitcher />
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <Terminal />
      </div>
      <InputBox onSend={handleSend} />

      {/* Settings Modal */}
      {showSettings && sessionId && provider && model && workingDirectory && (
        <SettingsModal
          currentProvider={provider}
          currentModel={model}
          currentWorkingDirectory={workingDirectory}
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
      )}
    </div>
  );
}

export default App;