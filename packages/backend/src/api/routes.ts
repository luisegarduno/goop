import { Hono } from "hono";
import { db } from "../db/index";
import { sessions, messages } from "../db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { z } from "zod";

export const apiRoutes = new Hono();
import { SessionManager } from "../session/index";
import { formatSSE } from "../streaming/index";

const sessionManager = new SessionManager();

// Create session
apiRoutes.post("/sessions", async (c) => {
  const body = await c.req.json();

  const { title, workingDirectory } = z
    .object({
      title: z.string().default("New Conversation"),
      workingDirectory: z.string().min(1, "Working directory is required"),
    })
    .parse(body);

  // Validate working directory exists and is accessible
  const { access, constants } = await import("fs/promises");
  try {
    await access(workingDirectory, constants.R_OK);
  } catch {
    return c.json(
      { error: "Working directory does not exist or is not accessible" },
      400
    );
  }

  const [session] = await db
    .insert(sessions)
    .values({
      title,
      workingDirectory,
    })
    .returning();

  if (!session) {
    return c.json({ error: "Failed to create session" }, 500);
  }

  return c.json(session);
});

// Get session
apiRoutes.get("/sessions/:id", async (c) => {
  const id = c.req.param("id");

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, id),
  });

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json(session);
});

// List sessions
apiRoutes.get("/sessions", async (c) => {
  const allSessions = await db.query.sessions.findMany({
    orderBy: [desc(sessions.updatedAt)],
  });

  return c.json(allSessions);
});

// Get session messages
apiRoutes.get("/sessions/:id/messages", async (c) => {
  const sessionId = c.req.param("id");

  const sessionMessages = await db.query.messages.findMany({
    where: eq(messages.sessionId, sessionId),
    with: {
      parts: {
        orderBy: (parts, { asc }) => [asc(parts.order)],
      },
    },
    orderBy: [asc(messages.createdAt)],
  });

  return c.json(sessionMessages);
});

// Create message
apiRoutes.post("/sessions/:id/messages", async (c) => {
  const sessionId = c.req.param("id");
  const body = await c.req.json();

  const { content } = z
    .object({
      content: z.string(),
    })
    .parse(body);

  // Fetch session to get working directory
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const workingDir = session.workingDirectory;

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        for await (const event of sessionManager.processMessage(
          sessionId,
          content,
          workingDir
        )) {
          const message = formatSSE(event);
          controller.enqueue(encoder.encode(message));
        }
      } catch (error: any) {
        console.error("Error in SSE stream:", error);
        const errorEvent = formatSSE({
          type: "message.done",
          messageId: "",
        });
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// GET-based SSE endpoint for all events
apiRoutes.get("/sessions/:id/events", async (c) => {
  const sessionId = c.req.param("id");

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const ping = `event: connected\ndata: ${JSON.stringify({
        sessionId,
      })}\n\n`;
      controller.enqueue(encoder.encode(ping));

      // Keep connection alive with periodic pings
      const interval = setInterval(() => {
        const ping = `:ping\n\n`;
        controller.enqueue(encoder.encode(ping));
      }, 30000);

      // Cleanup on close
      c.req.raw.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
