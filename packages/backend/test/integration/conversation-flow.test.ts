import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createSession, getMessages } from "../../../frontend/src/api/client";

// These tests require a running backend server and PostgreSQL
const API_BASE = "http://localhost:3001/api";
const TEST_WORKING_DIR = "/tmp";

// Track created session IDs for cleanup
const createdSessionIds: string[] = [];

describe("Integration: Conversation Flow", () => {
  afterAll(async () => {
    // Clean up all test sessions
    console.log(`[Test Cleanup] Deleting ${createdSessionIds.length} test sessions...`);

    for (const sessionId of createdSessionIds) {
      try {
        const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          console.log(`[Test Cleanup] Deleted session ${sessionId}`);
        } else {
          console.warn(`[Test Cleanup] Failed to delete session ${sessionId}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`[Test Cleanup] Error deleting session ${sessionId}:`, error);
      }
    }
  });

  test("complete conversation with text response", async () => {
    // Create session
    const session = await createSession(
      TEST_WORKING_DIR,
      "[TEST] Integration Test - Text Response",
      "anthropic",
      "claude-3-5-haiku-latest"
    );

    expect(session.id).toBeDefined();
    createdSessionIds.push(session.id); // Track for cleanup

    // Send message (this will be a real API call to backend)
    const response = await fetch(
      `${API_BASE}/sessions/${session.id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Say hello" }),
      }
    );

    expect(response.ok).toBe(true);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    // Read SSE stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const events: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          events.push(data);
        }
      }
    }

    // Verify event sequence
    expect(events[0].type).toBe("message.start");
    expect(events[events.length - 1].type).toBe("message.done");

    // Verify messages persisted
    const messages = await getMessages(session.id);
    expect(messages.length).toBeGreaterThanOrEqual(2); // User + assistant
  }, 30000); // 30 second timeout for API calls

  test("conversation with tool execution", async () => {
    const session = await createSession(
      TEST_WORKING_DIR,
      "[TEST] Integration Test - Tool Execution",
      "anthropic",
      "claude-3-5-haiku-latest"
    );

    createdSessionIds.push(session.id); // Track for cleanup

    // Send message requesting file read
    const response = await fetch(
      `${API_BASE}/sessions/${session.id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "List files in current directory using glob tool",
        }),
      }
    );

    expect(response.ok).toBe(true);

    // Read stream and look for tool events
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const events: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          events.push(JSON.parse(line.slice(6)));
        }
      }
    }

    // Verify tool execution events
    const toolStart = events.find((e) => e.type === "tool.start");
    expect(toolStart).toBeDefined();

    const toolResult = events.find((e) => e.type === "tool.result");
    expect(toolResult).toBeDefined();

    // Verify database persistence
    const messages = await getMessages(session.id);
    const toolUseParts = messages
      .flatMap((m) => m.parts)
      .filter((p) => p.type === "tool_use");
    expect(toolUseParts.length).toBeGreaterThan(0);
  }, 30000);
});
