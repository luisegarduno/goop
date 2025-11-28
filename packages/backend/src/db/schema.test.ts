import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearDatabase,
} from "../../test/setup";
import { sessions, messages, messageParts } from "./schema";
import { eq } from "drizzle-orm";

describe("Database Schema", () => {
  let db: any;
  let client: any;

  beforeEach(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    client = setup.client;
    await clearDatabase(db);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe("Sessions Table", () => {
    test("creates session with all required fields", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test Session",
          workingDirectory: "/tmp/test",
          provider: "anthropic",
          model: "claude-3-5-haiku-latest",
        })
        .returning();

      expect(session.id).toBeDefined();
      expect(session.title).toBe("Test Session");
      expect(session.workingDirectory).toBe("/tmp/test");
      expect(session.provider).toBe("anthropic");
      expect(session.model).toBe("claude-3-5-haiku-latest");
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    test("generates UUID for id field", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
          provider: "anthropic",
          model: "claude-3-5-haiku-latest",
        })
        .returning();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(session.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    test("uses default values for provider and model", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
        })
        .returning();

      expect(session.provider).toBe("anthropic");
      expect(session.model).toBe("claude-3-5-haiku-latest");
    });

    test("sets timestamps automatically", async () => {
      const before = new Date();
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
        })
        .returning();
      const after = new Date();

      expect(session.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(session.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(session.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("Messages Table", () => {
    test("creates message linked to session", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
        })
        .returning();

      const [message] = await db
        .insert(messages)
        .values({
          sessionId: session.id,
          role: "user",
        })
        .returning();

      expect(message.id).toBeDefined();
      expect(message.sessionId).toBe(session.id);
      expect(message.role).toBe("user");
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    test("cascade deletes messages when session deleted", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
        })
        .returning();

      await db.insert(messages).values({
        sessionId: session.id,
        role: "user",
      });

      await db.delete(sessions).where(eq(sessions.id, session.id));

      const remainingMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, session.id));

      expect(remainingMessages).toHaveLength(0);
    });
  });

  describe("Message Parts Table", () => {
    test("creates message part with text content", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
        })
        .returning();

      const [message] = await db
        .insert(messages)
        .values({
          sessionId: session.id,
          role: "user",
        })
        .returning();

      const [part] = await db
        .insert(messageParts)
        .values({
          messageId: message.id,
          type: "text",
          content: { text: "Hello world" },
          order: 0,
        })
        .returning();

      expect(part.id).toBeDefined();
      expect(part.messageId).toBe(message.id);
      expect(part.type).toBe("text");
      expect(part.content).toEqual({ text: "Hello world" });
      expect(part.order).toBe(0);
    });

    test("creates message part with tool_use content", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
        })
        .returning();

      const [message] = await db
        .insert(messages)
        .values({
          sessionId: session.id,
          role: "assistant",
        })
        .returning();

      const [part] = await db
        .insert(messageParts)
        .values({
          messageId: message.id,
          type: "tool_use",
          content: {
            id: "tool-123",
            name: "read_file",
            input: { path: "test.txt" },
          },
          order: 0,
        })
        .returning();

      expect(part.type).toBe("tool_use");
      expect(part.content.name).toBe("read_file");
      expect(part.content.input).toEqual({ path: "test.txt" });
    });

    test("cascade deletes parts when message deleted", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
        })
        .returning();

      const [message] = await db
        .insert(messages)
        .values({
          sessionId: session.id,
          role: "user",
        })
        .returning();

      await db.insert(messageParts).values({
        messageId: message.id,
        type: "text",
        content: { text: "Test" },
        order: 0,
      });

      await db.delete(messages).where(eq(messages.id, message.id));

      const remainingParts = await db
        .select()
        .from(messageParts)
        .where(eq(messageParts.messageId, message.id));

      expect(remainingParts).toHaveLength(0);
    });

    test("maintains order of parts", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
        })
        .returning();

      const [message] = await db
        .insert(messages)
        .values({
          sessionId: session.id,
          role: "assistant",
        })
        .returning();

      await db.insert(messageParts).values([
        {
          messageId: message.id,
          type: "text",
          content: { text: "First" },
          order: 0,
        },
        {
          messageId: message.id,
          type: "text",
          content: { text: "Second" },
          order: 1,
        },
        {
          messageId: message.id,
          type: "text",
          content: { text: "Third" },
          order: 2,
        },
      ]);

      const parts = await db
        .select()
        .from(messageParts)
        .where(eq(messageParts.messageId, message.id))
        .orderBy(messageParts.order);

      expect(parts).toHaveLength(3);
      expect(parts[0].content.text).toBe("First");
      expect(parts[1].content.text).toBe("Second");
      expect(parts[2].content.text).toBe("Third");
    });
  });

  describe("Relations", () => {
    test("loads messages with session", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
        })
        .returning();

      await db.insert(messages).values([
        { sessionId: session.id, role: "user" },
        { sessionId: session.id, role: "assistant" },
      ]);

      const result = await db.query.sessions.findFirst({
        where: eq(sessions.id, session.id),
        with: {
          messages: true,
        },
      });

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[1].role).toBe("assistant");
    });

    test("loads parts with message", async () => {
      const [session] = await db
        .insert(sessions)
        .values({
          title: "Test",
          workingDirectory: "/tmp",
        })
        .returning();

      const [message] = await db
        .insert(messages)
        .values({
          sessionId: session.id,
          role: "user",
        })
        .returning();

      await db.insert(messageParts).values([
        {
          messageId: message.id,
          type: "text",
          content: { text: "Part 1" },
          order: 0,
        },
        {
          messageId: message.id,
          type: "text",
          content: { text: "Part 2" },
          order: 1,
        },
      ]);

      const result = await db.query.messages.findFirst({
        where: eq(messages.id, message.id),
        with: {
          parts: true,
        },
      });

      expect(result.parts).toHaveLength(2);
    });
  });
});
