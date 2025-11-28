import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearDatabase,
  createTestSession,
} from "../../test/setup";
import { MockProvider } from "../../test/mocks/provider";
import type { StreamEvent } from "../providers/base";
import * as schema from "../db/schema";

let db: any;
let client: any;
let SessionManager: any;

beforeEach(async () => {
  const setup = await setupTestDatabase();
  db = setup.db;
  client = setup.client;

  // Mock the database module to use our test database
  mock.module("../db/index", () => ({
    db: db,
  }));

  // Import SessionManager AFTER mocking the database
  const sessionModule = await import("./index");
  SessionManager = sessionModule.SessionManager;
});

afterEach(async () => {
  if (db) {
    await clearDatabase(db);
  }
  await teardownTestDatabase();
});

describe("SessionManager - Basic Message Processing", () => {
  test("processes simple text response", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      { type: "text", text: "Hello" },
      { type: "text", text: " world" },
      { type: "done" },
    ]);
    const manager = new SessionManager(provider);

    const events: any[] = [];
    for await (const event of manager.processMessage(
      session.id,
      "Hi",
      session.workingDirectory
    )) {
      events.push(event);
    }

    // Verify event sequence
    expect(events[0]).toMatchObject({ type: "message.start" });
    expect(events[1]).toMatchObject({ type: "message.delta", text: "Hello" });
    expect(events[2]).toMatchObject({ type: "message.delta", text: " world" });
    expect(events[events.length - 1]).toMatchObject({ type: "message.done" });
  });

  test("stores user message in database", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      { type: "text", text: "Response" },
      { type: "done" },
    ]);
    const manager = new SessionManager(provider);

    for await (const _ of manager.processMessage(
      session.id,
      "User message",
      session.workingDirectory
    )) {
      // Consume stream
    }

    // Verify user message was stored
    const messages = await db.query.messages.findMany({
      where: (messages: any, { eq }: any) => eq(messages.sessionId, session.id),
      with: { parts: true },
    });

    const userMessage = messages.find((m: any) => m.role === "user");
    expect(userMessage).toBeDefined();
    expect(userMessage.parts).toHaveLength(1);
    expect(userMessage.parts[0].type).toBe("text");
    expect(userMessage.parts[0].content.text).toBe("User message");
  });

  test("stores assistant message in database", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      { type: "text", text: "Assistant response" },
      { type: "done" },
    ]);
    const manager = new SessionManager(provider);

    for await (const _ of manager.processMessage(
      session.id,
      "Hi",
      session.workingDirectory
    )) {
      // Consume stream
    }

    const messages = await db.query.messages.findMany({
      where: (messages: any, { eq }: any) => eq(messages.sessionId, session.id),
      with: { parts: true },
    });

    const assistantMessage = messages.find((m: any) => m.role === "assistant");
    expect(assistantMessage).toBeDefined();
    expect(assistantMessage.parts).toHaveLength(1);
    expect(assistantMessage.parts[0].content.text).toBe("Assistant response");
  });

  test("updates session timestamp", async () => {
    const session = await createTestSession(db);
    const originalTimestamp = session.updatedAt;

    const provider = new MockProvider([
      { type: "text", text: "Response" },
      { type: "done" },
    ]);
    const manager = new SessionManager(provider);

    await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay

    for await (const _ of manager.processMessage(
      session.id,
      "Hi",
      session.workingDirectory
    )) {
      // Consume stream
    }

    const updated = await db.query.sessions.findFirst({
      where: (sessions: any, { eq }: any) => eq(sessions.id, session.id),
    });

    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      originalTimestamp.getTime()
    );
  });
});

describe("SessionManager - Tool Execution", () => {
  test("executes tool and continues conversation", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      // First call: tool use
      [
        {
          type: "tool_use",
          toolUse: {
            id: "tool_123",
            name: "read_file",
            input: { path: "test.txt" },
          },
        },
        { type: "done" },
      ],
      // Second call after tool execution: text response
      [
        { type: "text", text: "File contents received" },
        { type: "done" },
      ],
    ]);
    const manager = new SessionManager(provider);

    const events: any[] = [];
    for await (const event of manager.processMessage(
      session.id,
      "Read test.txt",
      "/tmp"
    )) {
      events.push(event);
    }

    // Verify event sequence
    const toolStartEvent = events.find((e) => e.type === "tool.start");
    expect(toolStartEvent).toBeDefined();
    expect(toolStartEvent.toolName).toBe("read_file");

    const toolResultEvent = events.find((e) => e.type === "tool.result");
    expect(toolResultEvent).toBeDefined();
    expect(toolResultEvent.toolId).toBe("tool_123");

    // Verify second message.start after tool
    const messageStarts = events.filter((e) => e.type === "message.start");
    expect(messageStarts.length).toBeGreaterThanOrEqual(2);
  });

  test("stores tool_use in database", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      [
        {
          type: "tool_use",
          toolUse: {
            id: "tool_456",
            name: "write_file",
            input: { path: "output.txt", content: "data" },
          },
        },
        { type: "done" },
      ],
      [
        { type: "text", text: "Done" },
        { type: "done" },
      ],
    ]);
    const manager = new SessionManager(provider);

    for await (const _ of manager.processMessage(
      session.id,
      "Write file",
      "/tmp"
    )) {
      // Consume stream
    }

    const messages = await db.query.messages.findMany({
      where: (messages: any, { eq }: any) => eq(messages.sessionId, session.id),
      with: { parts: { orderBy: (parts: any, { asc }: any) => [asc(parts.order)] } },
    });

    const toolUsePart = messages
      .flatMap((m: any) => m.parts)
      .find((p: any) => p.type === "tool_use");

    expect(toolUsePart).toBeDefined();
    expect(toolUsePart.content.name).toBe("write_file");
    expect(toolUsePart.content.input.path).toBe("output.txt");
  });

  test("stores tool_result as user message", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      [
        {
          type: "tool_use",
          toolUse: {
            id: "tool_789",
            name: "read_file",
            input: { path: "test.txt" },
          },
        },
        { type: "done" },
      ],
      [
        { type: "text", text: "Acknowledged" },
        { type: "done" },
      ],
    ]);
    const manager = new SessionManager(provider);

    for await (const _ of manager.processMessage(
      session.id,
      "Read file",
      "/tmp"
    )) {
      // Consume stream
    }

    const messages = await db.query.messages.findMany({
      where: (messages: any, { eq }: any) => eq(messages.sessionId, session.id),
      with: { parts: true },
      orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)],
    });

    // Should have: user message, assistant (tool_use), user (tool_result), assistant (text)
    expect(messages.length).toBeGreaterThanOrEqual(3);

    const toolResultMessage = messages.find(
      (m: any) => m.role === "user" && m.parts.some((p: any) => p.type === "tool_result")
    );
    expect(toolResultMessage).toBeDefined();
    expect(toolResultMessage.parts[0].content.tool_use_id).toBe("tool_789");
  });

  test("handles tool execution errors gracefully", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      [
        {
          type: "tool_use",
          toolUse: {
            id: "tool_error",
            name: "nonexistent_tool",
            input: {},
          },
        },
        { type: "done" },
      ],
      [
        { type: "text", text: "Error handled" },
        { type: "done" },
      ],
    ]);
    const manager = new SessionManager(provider);

    const events: any[] = [];
    for await (const event of manager.processMessage(
      session.id,
      "Use bad tool",
      "/tmp"
    )) {
      events.push(event);
    }

    // Should still emit tool.result with error message
    const toolResult = events.find((e) => e.type === "tool.result");
    expect(toolResult).toBeDefined();
    expect(toolResult.result).toContain("Tool execution failed");
  });

  test("supports multiple tool calls in sequence", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      [
        {
          type: "tool_use",
          toolUse: { id: "t1", name: "read_file", input: { path: "a.txt" } },
        },
        { type: "done" },
      ],
      [
        {
          type: "tool_use",
          toolUse: { id: "t2", name: "read_file", input: { path: "b.txt" } },
        },
        { type: "done" },
      ],
      [
        { type: "text", text: "Both files read" },
        { type: "done" },
      ],
    ]);
    const manager = new SessionManager(provider);

    const events: any[] = [];
    for await (const event of manager.processMessage(
      session.id,
      "Read files",
      "/tmp"
    )) {
      events.push(event);
    }

    const toolStarts = events.filter((e) => e.type === "tool.start");
    expect(toolStarts.length).toBe(2);

    const toolResults = events.filter((e) => e.type === "tool.result");
    expect(toolResults.length).toBe(2);
  });
});

describe("SessionManager - History Loading", () => {
  test("loads conversation history for context", async () => {
    const session = await createTestSession(db);
    const provider1 = new MockProvider([
      { type: "text", text: "Response 1" },
      { type: "done" },
    ]);
    const manager1 = new SessionManager(provider1);

    // First conversation turn
    for await (const _ of manager1.processMessage(
      session.id,
      "Message 1",
      "/tmp"
    )) {
      // Consume
    }

    // Second conversation turn with new provider instance
    const provider2 = new MockProvider([
      { type: "text", text: "Response 2" },
      { type: "done" },
    ]);
    const manager2 = new SessionManager(provider2);

    for await (const _ of manager2.processMessage(
      session.id,
      "Message 2",
      "/tmp"
    )) {
      // Consume
    }

    // Verify history includes previous messages
    const allMessages = await db.query.messages.findMany({
      where: (messages: any, { eq }: any) => eq(messages.sessionId, session.id),
      with: { parts: true },
    });

    expect(allMessages.length).toBe(4); // 2 user + 2 assistant
  });

  test("transforms database format to provider format", async () => {
    const session = await createTestSession(db);

    // Create mock history in database
    const [userMsg] = await db
      .insert(schema.messages)
      .values({
        sessionId: session.id,
        role: "user",
      })
      .returning();

    await db.insert(schema.messageParts).values({
      messageId: userMsg.id,
      type: "text",
      content: { text: "Hello" },
      order: 0,
    });

    // Track provider calls to verify history transformation
    let capturedHistory: any = null;
    const provider = new MockProvider([
      { type: "text", text: "Response" },
      { type: "done" },
    ]);

    // Override stream to capture history
    const originalStream = provider.stream.bind(provider);
    provider.stream = async function* (messages, tools) {
      capturedHistory = messages;
      yield* originalStream(messages, tools);
    };

    const manager = new SessionManager(provider);
    for await (const _ of manager.processMessage(
      session.id,
      "Next message",
      "/tmp"
    )) {
      // Consume
    }

    // Verify provider.stream was called with transformed history
    expect(capturedHistory).toBeDefined();
    expect(Array.isArray(capturedHistory)).toBe(true);
    expect(capturedHistory[0]).toMatchObject({
      role: "user",
      content: [{ type: "text", text: "Hello" }],
    });
  });
});

describe("SessionManager - SSE Event Formatting", () => {
  test("emits message.start at conversation beginning", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      { type: "text", text: "Hi" },
      { type: "done" },
    ]);
    const manager = new SessionManager(provider);

    const events: any[] = [];
    for await (const event of manager.processMessage(
      session.id,
      "Hello",
      "/tmp"
    )) {
      events.push(event);
    }

    expect(events[0].type).toBe("message.start");
    expect(events[0]).toHaveProperty("messageId");
  });

  test("emits message.start after tool execution", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      [
        {
          type: "tool_use",
          toolUse: { id: "t1", name: "read_file", input: { path: "x" } },
        },
        { type: "done" },
      ],
      [
        { type: "text", text: "Done" },
        { type: "done" },
      ],
    ]);
    const manager = new SessionManager(provider);

    const events: any[] = [];
    for await (const event of manager.processMessage(
      session.id,
      "Test",
      "/tmp"
    )) {
      events.push(event);
    }

    const messageStarts = events.filter((e) => e.type === "message.start");
    expect(messageStarts.length).toBe(2); // Initial + after tool
  });

  test("emits message.done at conversation end", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      { type: "text", text: "Done" },
      { type: "done" },
    ]);
    const manager = new SessionManager(provider);

    const events: any[] = [];
    for await (const event of manager.processMessage(
      session.id,
      "Test",
      "/tmp"
    )) {
      events.push(event);
    }

    expect(events[events.length - 1].type).toBe("message.done");
  });

  test("emits correct sequence for tool execution", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      [
        {
          type: "tool_use",
          toolUse: { id: "tool_1", name: "read_file", input: { path: "test.txt" } },
        },
        { type: "done" },
      ],
      [
        { type: "text", text: "File processed" },
        { type: "done" },
      ],
    ]);
    const manager = new SessionManager(provider);

    const events: any[] = [];
    for await (const event of manager.processMessage(
      session.id,
      "Read test.txt",
      "/tmp"
    )) {
      events.push(event);
    }

    // Verify sequence: message.start → tool.start → tool.result → message.start → message.delta → message.done
    const eventTypes = events.map((e) => e.type);
    expect(eventTypes).toContain("message.start");
    expect(eventTypes).toContain("tool.start");
    expect(eventTypes).toContain("tool.result");
    expect(eventTypes).toContain("message.delta");
    expect(eventTypes).toContain("message.done");

    // Verify order: tool events come before second message.start
    const firstMessageStartIdx = eventTypes.indexOf("message.start");
    const toolStartIdx = eventTypes.indexOf("tool.start");
    const toolResultIdx = eventTypes.indexOf("tool.result");
    const secondMessageStartIdx = eventTypes.lastIndexOf("message.start");

    expect(toolStartIdx).toBeGreaterThan(firstMessageStartIdx);
    expect(toolResultIdx).toBeGreaterThan(toolStartIdx);
    expect(secondMessageStartIdx).toBeGreaterThan(toolResultIdx);
  });
});

describe("SessionManager - Edge Cases", () => {
  test("handles empty text response", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([{ type: "done" }]);
    const manager = new SessionManager(provider);

    const events: any[] = [];
    for await (const event of manager.processMessage(
      session.id,
      "Hi",
      "/tmp"
    )) {
      events.push(event);
    }

    // Should still emit start and done events
    expect(events[0].type).toBe("message.start");
    expect(events[events.length - 1].type).toBe("message.done");
  });

  test("handles text before and after tool use", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      [
        { type: "text", text: "Let me check that file. " },
        {
          type: "tool_use",
          toolUse: { id: "t1", name: "read_file", input: { path: "file.txt" } },
        },
        { type: "done" },
      ],
      [
        { type: "text", text: "I found the content." },
        { type: "done" },
      ],
    ]);
    const manager = new SessionManager(provider);

    const events: any[] = [];
    for await (const event of manager.processMessage(
      session.id,
      "Read file.txt",
      "/tmp"
    )) {
      events.push(event);
    }

    // Verify text before tool
    const deltasBefore = events.filter(
      (e, i) => e.type === "message.delta" && i < events.findIndex((ev) => ev.type === "tool.start")
    );
    expect(deltasBefore.length).toBeGreaterThan(0);

    // Verify text after tool
    const deltasAfter = events.filter(
      (e, i) => e.type === "message.delta" && i > events.findIndex((ev) => ev.type === "tool.result")
    );
    expect(deltasAfter.length).toBeGreaterThan(0);
  });

  test("stores message parts in correct order", async () => {
    const session = await createTestSession(db);
    const provider = new MockProvider([
      [
        { type: "text", text: "First" },
        {
          type: "tool_use",
          toolUse: { id: "t1", name: "read_file", input: { path: "x" } },
        },
        { type: "done" },
      ],
      [
        { type: "text", text: "Second" },
        { type: "done" },
      ],
    ]);
    const manager = new SessionManager(provider);

    for await (const _ of manager.processMessage(
      session.id,
      "Test",
      "/tmp"
    )) {
      // Consume
    }

    const messages = await db.query.messages.findMany({
      where: (messages: any, { eq }: any) => eq(messages.sessionId, session.id),
      with: { parts: { orderBy: (parts: any, { asc }: any) => [asc(parts.order)] } },
    });

    const firstAssistant = messages.find((m: any) => m.role === "assistant");
    expect(firstAssistant.parts.length).toBe(2); // text + tool_use
    expect(firstAssistant.parts[0].type).toBe("text");
    expect(firstAssistant.parts[0].order).toBe(0);
    expect(firstAssistant.parts[1].type).toBe("tool_use");
    expect(firstAssistant.parts[1].order).toBe(1);
  });
});
