import { create } from "zustand";

interface MessagePart {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  name?: string;
  result?: string;
  input?: Record<string, unknown>;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
}

interface SessionStore {
  sessionId: string | null;
  workingDirectory: string | null;
  provider: string | null;
  model: string | null;
  messages: Message[];
  isStreaming: boolean;
  currentText: string;
  currentParts: MessagePart[];
  setSessionId: (id: string) => void;
  setWorkingDirectory: (dir: string) => void;
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  appendText: (text: string) => void;
  addToolUse: (toolName: string, input: Record<string, unknown>) => void;
  addToolResult: (result: string) => void;
  startNewMessage: () => void;
  finishStreaming: () => void;
  setStreaming: (streaming: boolean) => void;
  clearSession: () => void;
  loadSession: (id: string, workingDir: string, provider: string, model: string, messages: Message[]) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  workingDirectory: null,
  provider: null,
  model: null,
  messages: [],
  isStreaming: false,
  currentText: "",
  currentParts: [],
  setSessionId: (id) => {
    set({ sessionId: id });
    // Persist to localStorage
    localStorage.setItem("goop_session_id", id);
  },
  setWorkingDirectory: (dir) => {
    set({ workingDirectory: dir });
    // Persist to localStorage
    localStorage.setItem("goop_working_directory", dir);
  },
  setProvider: (provider) => {
    set({ provider });
    localStorage.setItem("goop_provider", provider);
  },
  setModel: (model) => {
    set({ model });
    localStorage.setItem("goop_model", model);
  },
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  appendText: (text) =>
    set((state) => ({ currentText: state.currentText + text })),
  addToolUse: (toolName, input) =>
    set((state) => {
      // If there's accumulated text, save it first
      const newParts = [...state.currentParts];
      if (state.currentText) {
        newParts.push({ type: "text", text: state.currentText });
      }
      // Add the tool use part
      newParts.push({ type: "tool_use", name: toolName, input });
      return { currentParts: newParts, currentText: "" };
    }),
  addToolResult: (result) =>
    set((state) => ({
      currentParts: [...state.currentParts, { type: "tool_result", result }],
    })),
  startNewMessage: () =>
    set((state) => {
      // Save current message if it has content
      const parts = [...state.currentParts];
      if (state.currentText) {
        parts.push({ type: "text", text: state.currentText });
      }

      const newMessages =
        parts.length > 0
          ? [
              ...state.messages,
              {
                id: crypto.randomUUID(),
                role: "assistant" as const,
                parts,
              },
            ]
          : state.messages;

      // Reset for new message
      return {
        messages: newMessages,
        currentText: "",
        currentParts: [],
      };
    }),
  finishStreaming: () =>
    set((state) => {
      const parts = [...state.currentParts];
      // Add any remaining text
      if (state.currentText) {
        parts.push({ type: "text", text: state.currentText });
      }

      return {
        messages:
          parts.length > 0
            ? [
                ...state.messages,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  parts,
                },
              ]
            : state.messages,
        currentText: "",
        currentParts: [],
        isStreaming: false,
      };
    }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearSession: () => {
    set({ sessionId: null, workingDirectory: null, provider: null, model: null, messages: [], currentText: "", currentParts: [], isStreaming: false });
    localStorage.removeItem("goop_session_id");
    localStorage.removeItem("goop_working_directory");
    localStorage.removeItem("goop_provider");
    localStorage.removeItem("goop_model");
  },
  loadSession: (id, workingDir, provider, model, messages) => {
    set({
      sessionId: id,
      workingDirectory: workingDir,
      provider,
      model,
      messages,
      currentText: "",
      currentParts: [],
      isStreaming: false,
    });
    // Persist to localStorage
    localStorage.setItem("goop_session_id", id);
    localStorage.setItem("goop_working_directory", workingDir);
    localStorage.setItem("goop_provider", provider);
    localStorage.setItem("goop_model", model);
  },
}));
