import { describe, test, expect, beforeEach } from "bun:test";
import { useSessionStore } from "./session";
import { MockLocalStorage, resetStore } from "../../test/helpers";

// Mock localStorage
const mockLocalStorage = new MockLocalStorage();
global.localStorage = mockLocalStorage as any;

beforeEach(() => {
  mockLocalStorage.clear();
  resetStore(useSessionStore);
});

describe("Session Store - Session Setters", () => {
  test("setSessionId updates state and localStorage", () => {
    const { setSessionId } = useSessionStore.getState();

    setSessionId("session-123");

    expect(useSessionStore.getState().sessionId).toBe("session-123");
    expect(localStorage.getItem("goop_session_id")).toBe("session-123");
  });

  test("setWorkingDirectory updates state and localStorage", () => {
    const { setWorkingDirectory } = useSessionStore.getState();

    setWorkingDirectory("/home/user/project");

    expect(useSessionStore.getState().workingDirectory).toBe(
      "/home/user/project"
    );
    expect(localStorage.getItem("goop_working_directory")).toBe(
      "/home/user/project"
    );
  });

  test("setProvider updates state and localStorage", () => {
    const { setProvider } = useSessionStore.getState();

    setProvider("openai");

    expect(useSessionStore.getState().provider).toBe("openai");
    expect(localStorage.getItem("goop_provider")).toBe("openai");
  });

  test("setModel updates state and localStorage", () => {
    const { setModel } = useSessionStore.getState();

    setModel("gpt-4");

    expect(useSessionStore.getState().model).toBe("gpt-4");
    expect(localStorage.getItem("goop_model")).toBe("gpt-4");
  });
});

describe("Session Store - Message Management", () => {
  test("addMessage appends to messages array", () => {
    const { addMessage } = useSessionStore.getState();

    const message = {
      id: "msg-1",
      role: "user" as const,
      parts: [{ type: "text" as const, text: "Hello" }],
    };

    addMessage(message);

    expect(useSessionStore.getState().messages).toHaveLength(1);
    expect(useSessionStore.getState().messages[0]).toEqual(message);
  });

  test("setMessages replaces entire array", () => {
    const { setMessages, addMessage } = useSessionStore.getState();

    addMessage({ id: "msg-1", role: "user", parts: [] });
    addMessage({ id: "msg-2", role: "assistant", parts: [] });

    const newMessages = [{ id: "msg-3", role: "user" as const, parts: [] }];
    setMessages(newMessages);

    expect(useSessionStore.getState().messages).toHaveLength(1);
    expect(useSessionStore.getState().messages[0].id).toBe("msg-3");
  });
});

describe("Session Store - Streaming State", () => {
  test("appendText concatenates to currentText", () => {
    const { appendText } = useSessionStore.getState();

    appendText("Hello");
    appendText(" world");

    expect(useSessionStore.getState().currentText).toBe("Hello world");
  });

  test("addToolUse moves currentText to parts and adds tool_use", () => {
    const { appendText, addToolUse } = useSessionStore.getState();

    appendText("Thinking...");
    addToolUse("read_file", { path: "test.txt" });

    const state = useSessionStore.getState();
    expect(state.currentText).toBe("");
    expect(state.currentParts).toHaveLength(2);
    expect(state.currentParts[0]).toEqual({
      type: "text",
      text: "Thinking...",
    });
    expect(state.currentParts[1]).toMatchObject({
      type: "tool_use",
      name: "read_file",
    });
  });

  test("addToolResult appends to currentParts", () => {
    const { addToolResult } = useSessionStore.getState();

    addToolResult("File contents");

    const state = useSessionStore.getState();
    expect(state.currentParts).toHaveLength(1);
    expect(state.currentParts[0]).toMatchObject({
      type: "tool_result",
      result: "File contents",
    });
  });

  test("startNewMessage saves current content and resets buffers", () => {
    const { appendText, addToolUse, startNewMessage } =
      useSessionStore.getState();

    appendText("Using tool");
    addToolUse("grep", { pattern: "test" });

    startNewMessage();

    const state = useSessionStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].role).toBe("assistant");
    expect(state.messages[0].parts).toHaveLength(2); // text + tool_use
    expect(state.currentText).toBe("");
    expect(state.currentParts).toHaveLength(0);
  });

  test("finishStreaming creates final message and sets streaming false", () => {
    const { appendText, setStreaming, finishStreaming } =
      useSessionStore.getState();

    setStreaming(true);
    appendText("Final response");
    finishStreaming();

    const state = useSessionStore.getState();
    expect(state.isStreaming).toBe(false);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].parts[0].text).toBe("Final response");
    expect(state.currentText).toBe("");
  });
});

describe("Session Store - Session Lifecycle", () => {
  test("loadSession updates all state and localStorage", () => {
    const { loadSession } = useSessionStore.getState();

    loadSession("session-456", "/home/test", "anthropic", "claude-sonnet-4-0", [
      { id: "msg-1", role: "user", parts: [] },
    ]);

    const state = useSessionStore.getState();
    expect(state.sessionId).toBe("session-456");
    expect(state.workingDirectory).toBe("/home/test");
    expect(state.provider).toBe("anthropic");
    expect(state.model).toBe("claude-sonnet-4-0");
    expect(state.messages).toHaveLength(1);
    expect(localStorage.getItem("goop_session_id")).toBe("session-456");
  });

  test("clearSession resets state and removes localStorage", () => {
    const { setSessionId, setWorkingDirectory, clearSession } =
      useSessionStore.getState();

    setSessionId("session-789");
    setWorkingDirectory("/tmp");

    clearSession();

    const state = useSessionStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.workingDirectory).toBeNull();
    expect(state.messages).toHaveLength(0);
    expect(localStorage.getItem("goop_session_id")).toBeNull();
  });
});
