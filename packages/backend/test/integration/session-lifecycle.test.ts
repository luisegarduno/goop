import { describe, test, expect, afterAll } from "bun:test";
import {
  createSession,
  getSession,
  updateSession,
  getAllSessions,
  getMessages,
} from "../../../frontend/src/api/client";

const TEST_WORKING_DIR = "/tmp";
const API_BASE = "http://localhost:3001/api";

// Track created session IDs for cleanup
const createdSessionIds: string[] = [];

describe("Integration: Session Lifecycle", () => {
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

  test("create, read, update session", async () => {
    // Create
    const created = await createSession(
      TEST_WORKING_DIR,
      "Lifecycle Test",
      "anthropic",
      "claude-3-5-haiku-latest"
    );

    expect(created.id).toBeDefined();
    expect(created.title).toBe("Lifecycle Test");

    // Track for cleanup
    createdSessionIds.push(created.id);

    // Read
    const fetched = await getSession(created.id);
    expect(fetched.id).toBe(created.id);

    // Update
    const updated = await updateSession(created.id, {
      title: "Updated Title",
      model: "claude-sonnet-4-0",
    });

    expect(updated.title).toBe("Updated Title");
    expect(updated.model).toBe("claude-sonnet-4-0");
  });

  test("list all sessions", async () => {
    // Create multiple sessions
    const session1 = await createSession(
      TEST_WORKING_DIR,
      "Session 1",
      "anthropic",
      "claude-3-5-haiku-latest"
    );
    const session2 = await createSession(
      TEST_WORKING_DIR,
      "Session 2",
      "anthropic",
      "claude-sonnet-4-0"
    );

    // Track for cleanup
    createdSessionIds.push(session1.id, session2.id);

    const sessions = await getAllSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });

  test("provider change clears messages", async () => {
    const session = await createSession(
      TEST_WORKING_DIR,
      "Provider Change Test",
      "anthropic",
      "claude-3-5-haiku-latest"
    );

    // Track for cleanup
    createdSessionIds.push(session.id);

    // Send a message
    const response = await fetch(
      `http://localhost:3001/api/sessions/${session.id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Hello" }),
      }
    );

    // Wait for response to complete
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }

    // Verify messages exist
    let messages = await getMessages(session.id);
    expect(messages.length).toBeGreaterThan(0);

    // Change provider
    await updateSession(session.id, {
      provider: "openai",
      model: "gpt-4",
    });

    // Verify messages cleared
    messages = await getMessages(session.id);
    expect(messages).toHaveLength(0);
  }, 30000); // 30 second timeout for API calls
});
