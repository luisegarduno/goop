import { query, type Options, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { AgentProvider, AgentStreamEvent, AgentTurnOptions } from "./types";
import { withRecap } from "./recap";

// Model aliases understood by the Claude Code runtime. Aliases track the
// current model generation automatically, which keeps this list evergreen.
// "sonnet" is listed first because it is available on every subscription plan
// (Opus requires Max).
export const CLAUDE_CODE_MODELS = ["sonnet", "opus", "haiku"] as const;

// Same file tools goop exposes to API-key providers - no Bash, no network.
// Claude Code enforces these itself; anything outside the list is denied
// because the session runs in "dontAsk" permission mode.
const GOOP_TOOLSET = ["Read", "Write", "Edit", "Grep", "Glob"];

const MAX_TURNS = 100;

// Context window per Claude Code model alias. Used only as a fallback before a
// turn has run (once a turn completes, the runtime reports the real window).
const DEFAULT_CLAUDE_CODE_CONTEXT_WINDOW = 200_000;
const CLAUDE_CODE_CONTEXT_WINDOWS: Record<string, number> = {
  sonnet: 1_000_000,
  opus: 1_000_000,
  haiku: 200_000,
};

/** Fallback context window for a Claude Code model alias (sonnet/opus/haiku). */
export function getClaudeCodeContextWindow(model?: string | null): number {
  if (!model) return DEFAULT_CLAUDE_CODE_CONTEXT_WINDOW;
  return CLAUDE_CODE_CONTEXT_WINDOWS[model] ?? DEFAULT_CLAUDE_CODE_CONTEXT_WINDOW;
}

/**
 * Derive a single context-usage number from a Claude Agent SDK `result`
 * message. Prefers the per-model `modelUsage` (which also carries the real
 * `contextWindow`), falling back to the aggregate `usage`. The reported total
 * is the full prompt the model saw: fresh input plus cached tokens.
 */
export function usageFromResult(
  msg: unknown
): { contextTokens: number; contextWindow: number } | null {
  const result = msg as {
    modelUsage?: Record<
      string,
      {
        inputTokens?: number;
        cacheReadInputTokens?: number;
        cacheCreationInputTokens?: number;
        contextWindow?: number;
      }
    >;
    usage?: {
      input_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };

  const entries = result.modelUsage ? Object.values(result.modelUsage) : [];
  if (entries.length > 0) {
    // Pick the primary model (largest prompt) - subagents may add extra entries.
    let best: (typeof entries)[number] | null = null;
    let bestTokens = -1;
    for (const entry of entries) {
      const tokens =
        (entry.inputTokens ?? 0) +
        (entry.cacheReadInputTokens ?? 0) +
        (entry.cacheCreationInputTokens ?? 0);
      if (tokens > bestTokens) {
        bestTokens = tokens;
        best = entry;
      }
    }
    if (best && best.contextWindow) {
      return { contextTokens: Math.max(0, bestTokens), contextWindow: best.contextWindow };
    }
  }

  const usage = result.usage;
  if (usage) {
    const contextTokens =
      (usage.input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0);
    // Context window unknown from the aggregate usage; 0 signals "use fallback".
    return { contextTokens: Math.max(0, contextTokens), contextWindow: 0 };
  }

  return null;
}

interface BlockLike {
  type?: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

function blocksOf(message: unknown): BlockLike[] {
  const content = (message as { content?: unknown })?.content;
  if (typeof content === "string") return [{ type: "text", text: content }];
  return Array.isArray(content) ? (content as BlockLike[]) : [];
}

function stringifyToolResult(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block: BlockLike) =>
        block?.type === "text" && typeof block.text === "string"
          ? block.text
          : JSON.stringify(block)
      )
      .join("\n");
  }
  return content == null ? "" : JSON.stringify(content);
}

/**
 * Translates the Claude Agent SDK message stream into goop AgentStreamEvents.
 * Kept separate from process handling so it can be unit-tested with synthetic
 * messages.
 */
export class ClaudeCodeEventMapper {
  // Characters of streamed text since the last full assistant message. Used to
  // fall back to full-message text if partial stream events are unavailable.
  private streamedTextChars = 0;
  // tool_use ids emitted this turn; tool_results are only forwarded for these,
  // which filters out history replays on resume.
  private pendingToolIds = new Set<string>();
  private lastAuthError: string | null = null;

  handle(msg: SDKMessage): AgentStreamEvent[] {
    switch (msg.type) {
      case "system":
        if (msg.subtype === "init") {
          console.log(
            `[ClaudeCodeProvider] Session ${msg.session_id} (auth: ${msg.apiKeySource}, claude-code ${msg.claude_code_version})`
          );
          return [{ type: "session", agentSessionId: msg.session_id }];
        }
        return [];

      case "stream_event": {
        if (msg.parent_tool_use_id) return [];
        const event = msg.event as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        if (
          event?.type === "content_block_delta" &&
          event.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          this.streamedTextChars += event.delta.text.length;
          return [{ type: "text", text: event.delta.text }];
        }
        return [];
      }

      case "assistant": {
        if (msg.parent_tool_use_id) return [];
        const events: AgentStreamEvent[] = [];
        for (const block of blocksOf(msg.message)) {
          if (block.type === "text" && block.text) {
            // Only emit full text when no deltas were streamed for this
            // message (i.e. includePartialMessages was ignored).
            if (this.streamedTextChars === 0) {
              events.push({ type: "text", text: block.text });
            }
          } else if (block.type === "tool_use" && block.id && block.name) {
            this.pendingToolIds.add(block.id);
            events.push({
              type: "tool_use",
              id: block.id,
              name: block.name,
              input: (block.input as Record<string, unknown>) ?? {},
            });
          }
        }
        this.streamedTextChars = 0;
        return events;
      }

      case "user": {
        if (msg.parent_tool_use_id) return [];
        const events: AgentStreamEvent[] = [];
        for (const block of blocksOf(msg.message)) {
          if (
            block.type === "tool_result" &&
            block.tool_use_id &&
            this.pendingToolIds.has(block.tool_use_id)
          ) {
            this.pendingToolIds.delete(block.tool_use_id);
            events.push({
              type: "tool_result",
              toolUseId: block.tool_use_id,
              result: stringifyToolResult(block.content),
              isError: block.is_error === true,
            });
          }
        }
        return events;
      }

      case "auth_status":
        if (msg.error) this.lastAuthError = msg.error;
        return [];

      case "result": {
        const usage = usageFromResult(msg);
        const usageEvents: AgentStreamEvent[] = usage
          ? [
              {
                type: "usage",
                contextTokens: usage.contextTokens,
                contextWindow: usage.contextWindow,
              },
            ]
          : [];
        if (msg.subtype === "success") return usageEvents;
        if (msg.subtype === "error_max_turns") {
          return [
            ...usageEvents,
            {
              type: "text",
              text: "\n⚠ Stopped after reaching the maximum number of turns.",
            },
          ];
        }
        const errors =
          "errors" in msg && msg.errors.length > 0
            ? msg.errors.join("; ")
            : msg.subtype;
        const authHint =
          this.lastAuthError || /auth/i.test(errors)
            ? " Run `claude` in a terminal and use /login to sign in with your Claude subscription."
            : "";
        throw new Error(`Claude Code error: ${errors}.${authHint}`);
      }

      default:
        return [];
    }
  }
}

export class ClaudeCodeProvider implements AgentProvider {
  kind = "agent" as const;
  name = "claude-code";
  private model?: string;

  constructor(model?: string) {
    this.model = model && model !== "default" ? model : undefined;
  }

  private buildOptions(workingDir: string, resumeSessionId: string | null): Options {
    return {
      cwd: workingDir,
      model: this.model,
      ...(resumeSessionId ? { resume: resumeSessionId } : {}),
      tools: GOOP_TOOLSET,
      allowedTools: GOOP_TOOLSET,
      permissionMode: "dontAsk",
      includePartialMessages: true,
      persistSession: true,
      maxTurns: MAX_TURNS,
      settingSources: [],
      systemPrompt: {
        type: "preset",
        preset: "claude_code",
        append:
          "You are running inside goop, a coding assistant UI. Only the file tools (Read, Write, Edit, Grep, Glob) are available in this environment; there is no Bash and no network access. Stay within the working directory.",
      },
      // Strip the API key so usage is billed to the user's Claude
      // subscription (CLI login / CLAUDE_CODE_OAUTH_TOKEN), never the API key
      // configured for the "anthropic" provider.
      env: { ...process.env, ANTHROPIC_API_KEY: undefined },
    };
  }

  async *runTurn(options: AgentTurnOptions): AsyncGenerator<AgentStreamEvent> {
    let emittedContent = false;

    const attempt = (resumeSessionId: string | null, prompt: string) =>
      query({
        prompt,
        options: this.buildOptions(options.workingDir, resumeSessionId),
      });

    try {
      const mapper = new ClaudeCodeEventMapper();
      for await (const msg of attempt(options.resumeSessionId, options.prompt)) {
        for (const event of mapper.handle(msg)) {
          if (event.type !== "session") emittedContent = true;
          yield event;
        }
      }
      return;
    } catch (error: any) {
      // If resuming failed before producing anything, fall back to a fresh
      // session seeded with a recap of the stored conversation.
      if (emittedContent || !options.resumeSessionId) throw error;
      console.warn(
        `[ClaudeCodeProvider] Resume of session ${options.resumeSessionId} failed (${error?.message}); starting a fresh session`
      );
    }

    const mapper = new ClaudeCodeEventMapper();
    for await (const msg of attempt(
      null,
      withRecap(options.prompt, options.recapPrompt)
    )) {
      yield* mapper.handle(msg);
    }
  }
}
