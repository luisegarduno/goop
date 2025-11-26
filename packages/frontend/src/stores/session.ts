import { create } from "zustand";

interface MessagePart {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  name?: string;
  result?: string;
  input?: any;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
}

interface SessionStore {
  sessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  currentText: string;
  currentParts: MessagePart[];
  setSessionId: (id: string) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  appendText: (text: string) => void;
  addToolUse: (toolName: string, input: any) => void;
  addToolResult: (result: string) => void;
  finishStreaming: () => void;
  setStreaming: (streaming: boolean) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  messages: [],
  isStreaming: false,
  currentText: "",
  currentParts: [],
  setSessionId: (id) => {
    set({ sessionId: id });
    // Persist to localStorage
    localStorage.setItem("goop_session_id", id);
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
                  id: Date.now().toString(),
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
    set({ sessionId: null, messages: [], currentText: "", currentParts: [], isStreaming: false });
    localStorage.removeItem("goop_session_id");
  },
}));
