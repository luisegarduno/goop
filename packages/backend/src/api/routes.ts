import { Hono } from "hono";
import { db } from "../db/index";
import { sessions, messages } from "../db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { z } from "zod";

export const apiRoutes = new Hono();
import { SessionManager } from "../session/index";
import { formatSSE } from "../streaming/index";
import type { Provider } from "../providers/base";
import type { AgentProvider } from "../providers/agent/types";

// Get available providers
apiRoutes.get("/providers", async (c) => {
  const { AVAILABLE_PROVIDERS } = await import("../providers/index");
  return c.json(AVAILABLE_PROVIDERS);
});

// Get models for a specific provider
apiRoutes.get("/providers/:name/models", async (c) => {
  const providerName = c.req.param("name");

  if (
    providerName !== "anthropic" &&
    providerName !== "openai" &&
    providerName !== "claude-code" &&
    providerName !== "codex"
  ) {
    return c.json({ error: "Unknown provider" }, 400);
  }

  if (providerName === "claude-code") {
    const { CLAUDE_CODE_MODELS } = await import("../providers/agent/claude-code");
    return c.json({ models: CLAUDE_CODE_MODELS });
  }

  if (providerName === "codex") {
    const { CODEX_MODELS } = await import("../providers/agent/codex");
    return c.json({ models: CODEX_MODELS });
  }

  if (providerName === "anthropic") {
    const { ANTHROPIC_MODELS } = await import("../providers/anthropic");
    return c.json({ models: ANTHROPIC_MODELS });
  } else if (providerName === "openai") {
    // Try to fetch models dynamically from OpenAI API
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        // Fall back to static list if no API key
        const { OPENAI_MODELS } = await import("../providers/openai");
        return c.json({ models: OPENAI_MODELS });
      }

      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey });
      const response = await client.models.list();

      // Filter to only chat completion models and sort by ID
      const chatModels = response.data
        .filter(
          (model) =>
            model.id.includes("gpt") &&
            !model.id.includes("instruct") &&
            !model.id.includes("vision")
        )
        .map((model) => model.id)
        .sort()
        .reverse(); // Most recent first

      return c.json({ models: chatModels });
    } catch (error) {
      console.error("Failed to fetch OpenAI models:", error);
      // Fall back to static list
      const { OPENAI_MODELS } = await import("../providers/openai");
      return c.json({ models: OPENAI_MODELS });
    }
  }
});

// Auth status for a provider.
// API-key providers report whether a key is configured in the environment;
// subscription providers (claude-code, codex) report whether the user is
// logged in via the corresponding CLI.
apiRoutes.get("/providers/:name/status", async (c) => {
  const providerName = c.req.param("name");

  if (providerName === "claude-code" || providerName === "codex") {
    const { claudeCodeAuthStatus, codexAuthStatus } = await import(
      "../utils/agent-auth"
    );
    const status =
      providerName === "claude-code" ? claudeCodeAuthStatus() : codexAuthStatus();
    return c.json(status);
  }

  if (providerName === "anthropic" || providerName === "openai") {
    const envKey =
      providerName === "anthropic"
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY;
    return c.json({
      authType: "api_key",
      authenticated: !!envKey,
      method: envKey ? "env" : null,
      detail: envKey
        ? `${providerName.toUpperCase()}_API_KEY is configured in .env`
        : `${providerName.toUpperCase()}_API_KEY is not configured`,
    });
  }

  return c.json({ error: "Unknown provider" }, 400);
});

// Validate API key for a provider
apiRoutes.post("/providers/validate", async (c) => {
  const body = await c.req.json();

  const { provider, apiKey } = z
    .object({
      provider: z.enum(["anthropic", "openai"]),
      apiKey: z.string().min(1),
    })
    .parse(body);

  try {
    const { validateProviderApiKey } = await import("../utils/validation");
    await validateProviderApiKey(provider, apiKey);
    return c.json({ valid: true });
  } catch (error: any) {
    console.error(`[API] ${provider} key validation failed:`, error.message);
    return c.json(
      {
        valid: false,
        error: error.message || "Invalid API key",
      },
      400
    );
  }
});

// Get masked API key from environment for a provider
// Returns a masked version (e.g., "sk-ant-***...***xyz") for security
apiRoutes.get("/providers/:name/api-key", async (c) => {
  const providerName = c.req.param("name");

  // Subscription providers don't use API keys
  if (providerName === "claude-code" || providerName === "codex") {
    return c.json({ apiKey: null, isConfigured: false });
  }

  if (providerName !== "anthropic" && providerName !== "openai") {
    return c.json({ error: "Unknown provider" }, 400);
  }

  try {
    const { maskApiKey } = await import("../utils/security");

    const apiKey =
      providerName === "anthropic"
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY;
    const maskedKey = maskApiKey(apiKey);
    return c.json({
      apiKey: maskedKey,
      isConfigured: !!apiKey,
    });
  } catch (error: any) {
    console.error(
      `[API] Failed to get API key for ${providerName}:`,
      error.message
    );
    return c.json({ error: "Failed to retrieve API key" }, 500);
  }
});

// Create session
apiRoutes.post("/sessions", async (c) => {
  const body = await c.req.json();

  const { title, workingDirectory, provider, model, apiKey } = z
    .object({
      title: z.string().default("New Conversation"),
      workingDirectory: z.string().min(1, "Working directory is required"),
      provider: z
        .enum(["anthropic", "openai", "claude-code", "codex"])
        .default("anthropic"),
      model: z.string().min(1, "Model is required"),
      apiKey: z.string().optional(), // Optional for validation
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

  // Validate API key if provided (subscription providers don't use one)
  if (apiKey && (provider === "anthropic" || provider === "openai")) {
    try {
      const { validateProviderApiKey } = await import("../utils/validation");
      await validateProviderApiKey(provider, apiKey);
    } catch (error: any) {
      return c.json(
        { error: `Invalid ${provider} API key: ${error.message}` },
        400
      );
    }
  }

  // Validate model is valid for provider
  try {
    const { getProviderInfo } = await import("../providers/index");
    const providerInfo = getProviderInfo(provider);

    // For Anthropic, validate against static list
    // OpenAI models are not validated to allow dynamic models and fine-tuned variants
    if (provider === "anthropic" && !providerInfo.models.includes(model)) {
      return c.json(
        {
          error: `Invalid model for ${provider}. Allowed: ${providerInfo.models.join(
            ", "
          )}`,
        },
        400
      );
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }

  const [session] = await db
    .insert(sessions)
    .values({
      title,
      workingDirectory,
      provider,
      model,
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

// Update session settings
apiRoutes.patch("/sessions/:id", async (c) => {
  const sessionId = c.req.param("id");
  const body = await c.req.json();

  const { title, workingDirectory, provider, model, apiKey } = z
    .object({
      title: z.string().optional(),
      workingDirectory: z.string().optional(),
      provider: z.enum(["anthropic", "openai", "claude-code", "codex"]).optional(),
      model: z.string().optional(),
      apiKey: z.string().optional(),
    })
    .parse(body);

  // Validate working directory if provided
  if (workingDirectory) {
    const { access, constants } = await import("fs/promises");
    try {
      await access(workingDirectory, constants.R_OK);
    } catch {
      return c.json(
        { error: "Working directory does not exist or is not accessible" },
        400
      );
    }
  }

  // Get current session for validation and provider change check
  const currentSession = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!currentSession) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Validate API key if provided (subscription providers don't use one)
  if (apiKey) {
    const targetProvider = provider || currentSession.provider;
    if (targetProvider === "anthropic" || targetProvider === "openai") {
      try {
        const { validateProviderApiKey } = await import("../utils/validation");
        await validateProviderApiKey(targetProvider, apiKey);
      } catch (error: any) {
        return c.json(
          { error: `Invalid ${targetProvider} API key: ${error.message}` },
          400
        );
      }
    }
  }

  // Validate model is valid for the provider (current or new)
  if (model !== undefined) {
    const targetProvider = (provider ||
      currentSession.provider) as import("../providers/index").ProviderName;

    try {
      const { getProviderInfo } = await import("../providers/index");
      const providerInfo = getProviderInfo(targetProvider);

      // For Anthropic, validate against static list
      // OpenAI models are not validated here because the model list is fetched dynamically
      // from the OpenAI API and may include models not in the static fallback list
      if (
        targetProvider === "anthropic" &&
        !providerInfo.models.includes(model)
      ) {
        return c.json(
          {
            error: `Invalid model for ${targetProvider}. Allowed: ${providerInfo.models.join(
              ", "
            )}`,
          },
          400
        );
      }
    } catch (error: any) {
      return c.json({ error: error.message }, 400);
    }
  }

  // Check if provider is being changed
  let providerChanged = false;
  if (provider !== undefined && currentSession.provider !== provider) {
    providerChanged = true;
    console.log(
      `[API] Provider changed from ${currentSession.provider} to ${provider} - clearing message history`
    );
  }

  // If provider changed, clear all messages for this session to avoid format incompatibility
  if (providerChanged) {
    await db.delete(messages).where(eq(messages.sessionId, sessionId));
  }

  // Build update object with only provided fields
  const updateData: any = {
    updatedAt: new Date(),
  };
  if (title !== undefined) updateData.title = title;
  if (workingDirectory !== undefined)
    updateData.workingDirectory = workingDirectory;
  if (provider !== undefined) updateData.provider = provider;
  if (model !== undefined) updateData.model = model;

  // The native agent session (Claude Code / Codex) can't be resumed across a
  // provider switch or a working directory change - drop it so the next turn
  // starts fresh (with a recap of the stored history where applicable).
  if (
    providerChanged ||
    (workingDirectory !== undefined &&
      workingDirectory !== currentSession.workingDirectory)
  ) {
    updateData.agentSessionId = null;
  }

  const [updatedSession] = await db
    .update(sessions)
    .set(updateData)
    .where(eq(sessions.id, sessionId))
    .returning();

  if (!updatedSession) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json(updatedSession);
});

// Delete session
apiRoutes.delete("/sessions/:id", async (c) => {
  const sessionId = c.req.param("id");

  // Check if session exists
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Delete session (cascade will delete messages and message parts)
  await db.delete(sessions).where(eq(sessions.id, sessionId));

  return c.json({ success: true, message: "Session deleted" });
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

  // Fetch session to get provider and model
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Subscription providers need a CLI login instead of an API key - surface a
  // clear error before opening the SSE stream.
  if (session.provider === "claude-code" || session.provider === "codex") {
    const { claudeCodeAuthStatus, codexAuthStatus } = await import(
      "../utils/agent-auth"
    );
    const status =
      session.provider === "claude-code"
        ? claudeCodeAuthStatus()
        : codexAuthStatus();
    if (!status.authenticated) {
      return c.json({ error: `${status.detail} ${status.hint ?? ""}`.trim() }, 400);
    }
  }

  // Create provider instance based on session settings
  let provider: Provider | AgentProvider;
  try {
    const { createProvider } = await import("../providers/index");
    provider = createProvider(
      session.provider as import("../providers/index").ProviderName,
      session.model
    );
  } catch (error: any) {
    console.error("[API] Failed to create provider:", error);
    const keyHint =
      session.provider === "anthropic" || session.provider === "openai"
        ? ` Ensure ${session.provider.toUpperCase()}_API_KEY is set in .env`
        : "";
    return c.json(
      {
        error: `Failed to initialize ${session.provider} provider: ${error.message}.${keyHint}`,
      },
      500
    );
  }

  // Create session manager with dynamic provider
  const sessionManager = new SessionManager(provider);

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
          try {
            const message = formatSSE(event);
            controller.enqueue(encoder.encode(message));
          } catch (enqueueError: any) {
            // Controller is already closed (likely timeout or client disconnect)
            // Check for common controller closure indicators
            const isControllerClosed =
              enqueueError instanceof TypeError ||
              enqueueError.message?.includes("invalid state") ||
              enqueueError.code === "ERR_INVALID_STATE";

            if (isControllerClosed) {
              console.log(
                "[SSE] Controller closed during enqueue, stopping stream"
              );
              return; // Exit the start function - controller is already closed
            }
            // Re-throw unexpected errors
            throw enqueueError;
          }
        }
      } catch (error: any) {
        console.error("Error in SSE stream:", error);

        // Surface the error in the transcript, then close the message
        try {
          const errorText = formatSSE({
            type: "message.delta",
            text: `\n⚠ ${error?.message || "Something went wrong"}`,
          });
          controller.enqueue(encoder.encode(errorText));
          const errorEvent = formatSSE({
            type: "message.done",
            messageId: "",
          });
          controller.enqueue(encoder.encode(errorEvent));
        } catch (enqueueError) {
          // Controller closed, can't send error event
          console.log(
            "[SSE] Could not send error event, controller already closed"
          );
        }
      } finally {
        try {
          controller.close();
        } catch (closeError) {
          // Controller already closed, ignore
          console.log("[SSE] Controller already closed in finally block");
        }
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
