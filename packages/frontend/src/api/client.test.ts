import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  createSession,
  updateSession,
  getSession,
  getAllSessions,
  getMessages,
} from "./client";
import { createMockFetch } from "../../test/helpers";

let originalFetch: typeof global.fetch;

beforeEach(() => {
  originalFetch = global.fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("API Client - Session Operations", () => {
  test("createSession sends correct request", async () => {
    const mockResponse = {
      id: "session-123",
      title: "Test",
      workingDirectory: "/tmp",
      provider: "anthropic",
      model: "claude-3-5-haiku-latest",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    global.fetch = createMockFetch({
      "POST http://localhost:3001/api/sessions": { data: mockResponse },
    }) as any;

    const result = await createSession(
      "/tmp",
      "Test",
      "anthropic",
      "claude-3-5-haiku-latest"
    );

    expect(result.id).toBe("session-123");
    expect(result.title).toBe("Test");
  });

  test("updateSession sends PATCH request", async () => {
    const mockResponse = {
      id: "session-456",
      title: "Updated",
      workingDirectory: "/home",
      provider: "openai",
      model: "gpt-4",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    global.fetch = createMockFetch({
      "PATCH http://localhost:3001/api/sessions/session-456": {
        data: mockResponse,
      },
    }) as any;

    const result = await updateSession("session-456", {
      title: "Updated",
      provider: "openai",
      model: "gpt-4",
    });

    expect(result.title).toBe("Updated");
  });

  test("getSession retrieves session by ID", async () => {
    const mockResponse = {
      id: "session-789",
      title: "My Session",
      workingDirectory: "/code",
      provider: "anthropic",
      model: "claude-sonnet-4-0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    global.fetch = createMockFetch({
      "GET http://localhost:3001/api/sessions/session-789": {
        data: mockResponse,
      },
    }) as any;

    const result = await getSession("session-789");

    expect(result.id).toBe("session-789");
  });

  test("getAllSessions returns array of sessions", async () => {
    const mockResponse = [
      {
        id: "s1",
        title: "Session 1",
        workingDirectory: "/tmp",
        provider: "anthropic",
        model: "claude-3-5-haiku-latest",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "s2",
        title: "Session 2",
        workingDirectory: "/tmp",
        provider: "anthropic",
        model: "claude-3-5-haiku-latest",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    global.fetch = createMockFetch({
      "GET http://localhost:3001/api/sessions": { data: mockResponse },
    }) as any;

    const result = await getAllSessions();

    expect(result).toHaveLength(2);
  });
});

describe("API Client - Message Operations", () => {
  test("getMessages transforms backend format to frontend format", async () => {
    const backendMessages = [
      {
        id: "msg-1",
        sessionId: "s1",
        role: "user",
        createdAt: new Date().toISOString(),
        parts: [
          {
            id: "part-1",
            messageId: "msg-1",
            type: "text",
            content: { text: "Hello" },
            order: 0,
          },
        ],
      },
    ];

    global.fetch = createMockFetch({
      "GET http://localhost:3001/api/sessions/s1/messages": {
        data: backendMessages,
      },
    }) as any;

    const result = await getMessages("s1");

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("user");
    expect(result[0].parts[0]).toEqual({ type: "text", text: "Hello" });
  });

  test("getMessages handles tool_use parts", async () => {
    const backendMessages = [
      {
        id: "msg-2",
        sessionId: "s2",
        role: "assistant",
        createdAt: new Date().toISOString(),
        parts: [
          {
            id: "part-2",
            messageId: "msg-2",
            type: "tool_use",
            content: { id: "t1", name: "read_file", input: { path: "x" } },
            order: 0,
          },
        ],
      },
    ];

    global.fetch = createMockFetch({
      "GET http://localhost:3001/api/sessions/s2/messages": {
        data: backendMessages,
      },
    }) as any;

    const result = await getMessages("s2");

    expect(result[0].parts[0]).toMatchObject({
      type: "tool_use",
      name: "read_file",
    });
  });

  test("getMessages handles tool_result parts", async () => {
    const backendMessages = [
      {
        id: "msg-3",
        sessionId: "s3",
        role: "user",
        createdAt: new Date().toISOString(),
        parts: [
          {
            id: "part-3",
            messageId: "msg-3",
            type: "tool_result",
            content: { tool_use_id: "t1", content: "Result data" },
            order: 0,
          },
        ],
      },
    ];

    global.fetch = createMockFetch({
      "GET http://localhost:3001/api/sessions/s3/messages": {
        data: backendMessages,
      },
    }) as any;

    const result = await getMessages("s3");

    expect(result[0].parts[0]).toMatchObject({
      type: "tool_result",
      result: "Result data",
    });
  });
});
