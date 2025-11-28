import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { Hono } from "hono";
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestSession,
} from "../../test/setup";
import * as schema from "../db/schema";

let db: any;
let client: any;
let app: Hono;

beforeEach(async () => {
  const testDb = await setupTestDatabase();
  db = testDb.db;
  client = testDb.client;

  // Set dummy API keys for testing (these won't be used for real API calls)
  process.env.ANTHROPIC_API_KEY = "sk-ant-api03-test1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  process.env.OPENAI_API_KEY = "sk-proj-test1234567890abcdef1234567890abcdef1234567890abcdef";

  // Mock the database module to use our test database
  mock.module("../db/index", () => ({
    db: db,
  }));

  // Mock the validation utilities to avoid real API calls
  mock.module("../utils/validation", () => ({
    validateProviderApiKey: async (provider: string, apiKey: string) => {
      // Check for unknown providers first
      if (provider !== "anthropic" && provider !== "openai") {
        throw new Error(`Unknown provider: ${provider}`);
      }

      // Mock validation - just check basic format
      if (provider === "anthropic" && !apiKey.startsWith("sk-ant-")) {
        throw new Error("Invalid Anthropic API key format");
      }
      if (provider === "openai" && !apiKey.startsWith("sk-")) {
        throw new Error("Invalid OpenAI API key format");
      }
      // If format is correct, validation passes
      return;
    },
  }));

  // Mock provider constructors to not require real API keys
  mock.module("../providers/anthropic", () => {
    return {
      ANTHROPIC_MODELS: [
        "claude-3-haiku-20240307",
        "claude-3-5-haiku-latest",
        "claude-opus-4-0",
        "claude-sonnet-4-0",
        "claude-opus-4-1",
        "claude-haiku-4-5",
        "claude-opus-4-5",
        "claude-sonnet-4-5",
      ],
      AnthropicProvider: class MockAnthropicProvider {
        name = "anthropic";
        constructor(model: string, apiKey?: string) {}
        async *stream() {
          yield { type: "text", text: "Mock Anthropic response" };
        }
      },
    };
  });

  mock.module("../providers/openai", () => {
    return {
      OPENAI_MODELS: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
      OpenAIProvider: class MockOpenAIProvider {
        name = "openai";
        constructor(model: string, apiKey?: string) {}
        async *stream() {
          yield { type: "text", text: "Mock OpenAI response" };
        }
      },
    };
  });

  // Mock the SessionManager to avoid making real API calls during tests
  mock.module("../session/index", () => {
    return {
      SessionManager: class MockSessionManager {
        constructor(provider: any) {}

        async *processMessage(
          sessionId: string,
          content: string,
          workingDir: string
        ): AsyncGenerator<any> {
          // Mock implementation that yields a simple SSE event sequence
          yield { type: "message.start", messageId: "mock-message-id" };
          yield { type: "message.delta", text: "Mock response" };
          yield { type: "message.done", messageId: "mock-message-id" };
        }
      },
    };
  });

  // Import routes AFTER mocking the database and SessionManager
  const { apiRoutes } = await import("./routes");

  // Create Hono app with routes
  app = new Hono();

  // Add error handling middleware for Zod errors
  app.onError((err: any, c: any) => {
    if (err.name === "ZodError") {
      return c.json({ error: "Validation error", details: err.issues }, 400);
    }
    console.error("Test error:", err);
    return c.json({ error: err.message }, 500);
  });

  app.route("/api", apiRoutes);
});

afterEach(async () => {
  await teardownTestDatabase();
  // Clean up environment variables
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  // Restore all mocks to prevent interference with other tests
  mock.restore();
});

describe("Provider Endpoints", () => {
  test("GET /providers - returns available providers", async () => {
    const res = await app.request("/api/providers");
    expect(res.status).toBe(200);

    const providers = (await res.json()) as any[];
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
    expect(providers[0]).toHaveProperty("name");
    expect(providers[0]).toHaveProperty("displayName");
  });

  test("GET /providers/:name/models - returns Anthropic models", async () => {
    const res = await app.request("/api/providers/anthropic/models");
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data).toHaveProperty("models");
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.models.length).toBeGreaterThan(0);
  });

  test("GET /providers/:name/models - returns OpenAI models", async () => {
    const res = await app.request("/api/providers/openai/models");
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data).toHaveProperty("models");
    expect(Array.isArray(data.models)).toBe(true);
  });

  test("GET /providers/:name/models - returns 400 for unknown provider", async () => {
    const res = await app.request("/api/providers/unknown/models");
    expect(res.status).toBe(400);

    const error = (await res.json()) as any;
    expect(error).toHaveProperty("error");
  });

  test("POST /providers/validate - validates Anthropic API key format", async () => {
    const res = await app.request("/api/providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "anthropic",
        apiKey: process.env.ANTHROPIC_API_KEY,
      }),
    });

    // Note: This will fail validation because it's not a real key
    // but it should return a structured response
    expect([200, 400]).toContain(res.status);
    const result = (await res.json()) as any;
    expect(result).toHaveProperty("valid");
  });

  test("POST /providers/validate - validates OpenAI API key format", async () => {
    const res = await app.request("/api/providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        apiKey: process.env.OPENAI_API_KEY,
      }),
    });

    // Note: This will fail validation because it's not a real key
    expect([200, 400]).toContain(res.status);
    const result = (await res.json()) as any;
    expect(result).toHaveProperty("valid");
  });

  test("POST /providers/validate - returns 400 for missing fields", async () => {
    const res = await app.request("/api/providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "anthropic" }),
    });

    expect(res.status).toBe(400);
  });

  test("GET /providers/:name/api-key - returns masked Anthropic key", async () => {
    const res = await app.request("/api/providers/anthropic/api-key");
    expect(res.status).toBe(200);

    const result = (await res.json()) as any;
    expect(result).toHaveProperty("apiKey");
    expect(result).toHaveProperty("isConfigured");
    expect(result.isConfigured).toBe(true);
    expect(result.apiKey).toContain("***");
  });

  test("GET /providers/:name/api-key - returns masked OpenAI key", async () => {
    const res = await app.request("/api/providers/openai/api-key");
    expect(res.status).toBe(200);

    const result = (await res.json()) as any;
    expect(result).toHaveProperty("apiKey");
    expect(result).toHaveProperty("isConfigured");
    expect(result.isConfigured).toBe(true);
  });

  test("GET /providers/:name/api-key - returns 400 for unknown provider", async () => {
    const res = await app.request("/api/providers/unknown/api-key");
    expect(res.status).toBe(400);
  });
});

describe("Session Endpoints", () => {
  test("POST /sessions - creates new session with valid data", async () => {
    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Session",
        workingDirectory: "/tmp",
        provider: "anthropic",
        model: "claude-3-5-haiku-latest",
      }),
    });

    expect(res.status).toBe(200);
    const session = (await res.json()) as any;
    expect(session).toHaveProperty("id");
    expect(session.title).toBe("Test Session");
    expect(session.workingDirectory).toBe("/tmp");
    expect(session.provider).toBe("anthropic");
    expect(session.model).toBe("claude-3-5-haiku-latest");
  });

  test("POST /sessions - uses default title if not provided", async () => {
    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workingDirectory: "/tmp",
        provider: "anthropic",
        model: "claude-3-5-haiku-latest",
      }),
    });

    expect(res.status).toBe(200);
    const session = (await res.json()) as any;
    expect(session.title).toBe("New Conversation");
  });

  test("POST /sessions - validates working directory exists", async () => {
    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workingDirectory: "/nonexistent/path/that/does/not/exist",
        provider: "anthropic",
        model: "claude-3-5-haiku-latest",
      }),
    });

    expect(res.status).toBe(400);
    const error = (await res.json()) as any;
    expect(error.error).toContain("not accessible");
  });

  test("POST /sessions - validates Anthropic model", async () => {
    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workingDirectory: "/tmp",
        provider: "anthropic",
        model: "invalid-model-name",
      }),
    });

    expect(res.status).toBe(400);
    const error = (await res.json()) as any;
    expect(error.error).toContain("Invalid model");
  });

  test("POST /sessions - accepts any OpenAI model (no validation)", async () => {
    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workingDirectory: "/tmp",
        provider: "openai",
        model: "gpt-5-nano",
      }),
    });

    // OpenAI models are not validated, so this should succeed
    expect(res.status).toBe(200);
  });

  test("GET /sessions/:id - returns session by ID", async () => {
    const session = await createTestSession(db);

    const res = await app.request(`/api/sessions/${session.id}`);
    expect(res.status).toBe(200);

    const retrieved = (await res.json()) as any;
    expect(retrieved.id).toBe(session.id);
    expect(retrieved.title).toBe(session.title);
  });

  test("GET /sessions/:id - returns 404 for nonexistent session", async () => {
    const res = await app.request(
      "/api/sessions/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status).toBe(404);
  });

  test("PATCH /sessions/:id - updates session title", async () => {
    const session = await createTestSession(db);

    const res = await app.request(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Updated Title",
      }),
    });

    expect(res.status).toBe(200);
    const updated = (await res.json()) as any;
    expect(updated.title).toBe("Updated Title");
    expect(updated.provider).toBe(session.provider); // Unchanged
    expect(updated.model).toBe(session.model); // Unchanged
  });

  test("PATCH /sessions/:id - updates session model", async () => {
    const session = await createTestSession(db);

    const res = await app.request(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-0",
      }),
    });

    expect(res.status).toBe(200);
    const updated = (await res.json()) as any;
    expect(updated.model).toBe("claude-sonnet-4-0");
  });

  test("PATCH /sessions/:id - validates working directory if provided", async () => {
    const session = await createTestSession(db);

    const res = await app.request(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workingDirectory: "/nonexistent/invalid/path",
      }),
    });

    expect(res.status).toBe(400);
  });

  test("PATCH /sessions/:id - clears messages when provider changes", async () => {
    const session = await createTestSession(db);

    // Create a message for this session
    const [message] = await db
      .insert(schema.messages)
      .values({
        sessionId: session.id,
        role: "user",
      })
      .returning();

    await db.insert(schema.messageParts).values({
      messageId: message.id,
      type: "text",
      content: { text: "Hello" },
      order: 0,
    });

    // Change provider
    const res = await app.request(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4",
      }),
    });

    expect(res.status).toBe(200);

    // Verify messages were deleted
    const messages = await db.query.messages.findMany({
      where: (messages: any, { eq }: any) => eq(messages.sessionId, session.id),
    });
    expect(messages).toHaveLength(0);
  });

  test("PATCH /sessions/:id - does not clear messages when only model changes", async () => {
    const session = await createTestSession(db);

    // Create a message for this session
    const [message] = await db
      .insert(schema.messages)
      .values({
        sessionId: session.id,
        role: "user",
      })
      .returning();

    await db.insert(schema.messageParts).values({
      messageId: message.id,
      type: "text",
      content: { text: "Hello" },
      order: 0,
    });

    // Change only the model (same provider)
    const res = await app.request(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-0",
      }),
    });

    expect(res.status).toBe(200);

    // Verify messages were NOT deleted
    const messages = await db.query.messages.findMany({
      where: (messages: any, { eq }: any) => eq(messages.sessionId, session.id),
    });
    expect(messages.length).toBeGreaterThan(0);
  });

  test("PATCH /sessions/:id - returns 404 for nonexistent session", async () => {
    const res = await app.request(
      "/api/sessions/00000000-0000-0000-0000-000000000000",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Title" }),
      }
    );

    expect(res.status).toBe(404);
  });

  test("GET /sessions - lists all sessions ordered by updatedAt", async () => {
    await createTestSession(db, { title: "Session 1" });
    await createTestSession(db, { title: "Session 2" });
    await createTestSession(db, { title: "Session 3" });

    const res = await app.request("/api/sessions");
    expect(res.status).toBe(200);

    const sessions = (await res.json()) as any;
    expect(sessions).toHaveLength(3);
    expect(Array.isArray(sessions)).toBe(true);
    // Verify ordering by checking that first session has most recent updatedAt
    expect(new Date(sessions[0].updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(sessions[1].updatedAt).getTime()
    );
  });

  test("GET /sessions - returns empty array when no sessions exist", async () => {
    const res = await app.request("/api/sessions");
    expect(res.status).toBe(200);

    const sessions = (await res.json()) as any;
    expect(sessions).toHaveLength(0);
  });

  test("DELETE /sessions/:id - deletes session and cascade deletes messages", async () => {
    const session = await createTestSession(db);

    // Create a message for this session
    const [message] = await db
      .insert(schema.messages)
      .values({
        sessionId: session.id,
        role: "user",
      })
      .returning();

    await db.insert(schema.messageParts).values({
      messageId: message.id,
      type: "text",
      content: { text: "Test message" },
      order: 0,
    });

    // Delete the session
    const res = await app.request(`/api/sessions/${session.id}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const result = (await res.json()) as any;
    expect(result.success).toBe(true);

    // Verify session is deleted
    const deletedSession = await db.query.sessions.findFirst({
      where: (sessions: any, { eq }: any) => eq(sessions.id, session.id),
    });
    expect(deletedSession).toBeUndefined();

    // Verify messages were cascade deleted
    const deletedMessages = await db.query.messages.findMany({
      where: (messages: any, { eq }: any) => eq(messages.sessionId, session.id),
    });
    expect(deletedMessages).toHaveLength(0);
  });

  test("DELETE /sessions/:id - returns 404 for nonexistent session", async () => {
    const res = await app.request(
      "/api/sessions/00000000-0000-0000-0000-000000000000",
      {
        method: "DELETE",
      }
    );

    expect(res.status).toBe(404);
  });
});

describe("Message Endpoints", () => {
  test("GET /sessions/:id/messages - returns empty array for new session", async () => {
    const session = await createTestSession(db);

    const res = await app.request(`/api/sessions/${session.id}/messages`);
    expect(res.status).toBe(200);

    const messages = (await res.json()) as any;
    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(0);
  });

  test("GET /sessions/:id/messages - returns messages with parts", async () => {
    const session = await createTestSession(db);

    // Create a user message
    const [userMessage] = await db
      .insert(schema.messages)
      .values({
        sessionId: session.id,
        role: "user",
      })
      .returning();

    await db.insert(schema.messageParts).values({
      messageId: userMessage.id,
      type: "text",
      content: { text: "Hello" },
      order: 0,
    });

    // Create an assistant message
    const [assistantMessage] = await db
      .insert(schema.messages)
      .values({
        sessionId: session.id,
        role: "assistant",
      })
      .returning();

    await db.insert(schema.messageParts).values({
      messageId: assistantMessage.id,
      type: "text",
      content: { text: "Hi there!" },
      order: 0,
    });

    const res = await app.request(`/api/sessions/${session.id}/messages`);
    expect(res.status).toBe(200);

    const messages = (await res.json()) as any;
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].parts).toHaveLength(1);
    expect(messages[0].parts[0].content.text).toBe("Hello");
    expect(messages[1].role).toBe("assistant");
    expect(messages[1].parts[0].content.text).toBe("Hi there!");
  });

  test("GET /sessions/:id/messages - orders messages by createdAt", async () => {
    const session = await createTestSession(db);

    // Create multiple messages with slight delays
    const [msg1] = await db
      .insert(schema.messages)
      .values({
        sessionId: session.id,
        role: "user",
      })
      .returning();

    await db.insert(schema.messageParts).values({
      messageId: msg1.id,
      type: "text",
      content: { text: "First" },
      order: 0,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const [msg2] = await db
      .insert(schema.messages)
      .values({
        sessionId: session.id,
        role: "assistant",
      })
      .returning();

    await db.insert(schema.messageParts).values({
      messageId: msg2.id,
      type: "text",
      content: { text: "Second" },
      order: 0,
    });

    const res = await app.request(`/api/sessions/${session.id}/messages`);
    expect(res.status).toBe(200);

    const messages = (await res.json()) as any;
    expect(messages).toHaveLength(2);
    expect(messages[0].parts[0].content.text).toBe("First");
    expect(messages[1].parts[0].content.text).toBe("Second");
  });

  test("POST /sessions/:id/messages - returns SSE stream", async () => {
    const session = await createTestSession(db);

    const res = await app.request(`/api/sessions/${session.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
    expect(res.headers.get("Connection")).toBe("keep-alive");
  });

  test("POST /sessions/:id/messages - returns 404 for nonexistent session", async () => {
    const res = await app.request(
      "/api/sessions/00000000-0000-0000-0000-000000000000/messages",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Hello" }),
      }
    );

    expect(res.status).toBe(404);
  });

  test("POST /sessions/:id/messages - validates request body", async () => {
    const session = await createTestSession(db);

    const res = await app.request(`/api/sessions/${session.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // Missing content field
    });

    expect(res.status).toBe(400);
  });
});
