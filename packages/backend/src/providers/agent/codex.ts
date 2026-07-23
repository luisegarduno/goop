import { Codex, type ThreadEvent, type ThreadItem, type ThreadOptions } from "@openai/codex-sdk";
import { AgentProvider, AgentStreamEvent, AgentTurnOptions } from "./types";
import { withRecap } from "./recap";

// "default" defers to the Codex CLI's configured default model, which tracks
// the current ChatGPT-plan model lineup without goop hardcoding version names.
export const CODEX_MODELS = ["default"] as const;

const MAX_TOOL_OUTPUT_CHARS = 10000;

function truncateOutput(text: string): string {
  if (text.length <= MAX_TOOL_OUTPUT_CHARS) return text;
  return text.slice(0, MAX_TOOL_OUTPUT_CHARS) + "\n… (output truncated)";
}

function toInputRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return value === undefined ? {} : { arguments: value };
}

/**
 * Translates Codex thread events into goop AgentStreamEvents. Kept separate
 * from process handling so it can be unit-tested with synthetic events.
 */
export class CodexEventMapper {
  // agent_message items stream cumulative text; track what we already emitted.
  private emittedTextLength = new Map<string, number>();
  // Items we already announced with a tool_use event.
  private announcedTools = new Set<string>();

  private textDelta(item: { id: string; text: string }): AgentStreamEvent[] {
    const previous = this.emittedTextLength.get(item.id) ?? 0;
    if (item.text.length <= previous) return [];
    this.emittedTextLength.set(item.id, item.text.length);
    return [{ type: "text", text: item.text.slice(previous) }];
  }

  private announceTool(
    item: ThreadItem,
    name: string,
    input: Record<string, unknown>
  ): AgentStreamEvent[] {
    if (this.announcedTools.has(item.id)) return [];
    this.announcedTools.add(item.id);
    return [{ type: "tool_use", id: item.id, name, input }];
  }

  private handleItem(item: ThreadItem, completed: boolean): AgentStreamEvent[] {
    switch (item.type) {
      case "agent_message":
        return this.textDelta(item);

      case "command_execution": {
        const events = this.announceTool(item, "shell", {
          command: item.command,
        });
        if (completed) {
          const exit =
            item.exit_code !== undefined ? `\n(exit code ${item.exit_code})` : "";
          events.push({
            type: "tool_result",
            toolUseId: item.id,
            result: truncateOutput(item.aggregated_output ?? "") + exit,
            isError: item.status === "failed",
          });
        }
        return events;
      }

      case "file_change": {
        // Only emitted once the patch succeeds or fails.
        const summary = item.changes
          .map((change) => `${change.kind} ${change.path}`)
          .join("\n");
        const events = this.announceTool(item, "apply_patch", {
          changes: summary,
        });
        events.push({
          type: "tool_result",
          toolUseId: item.id,
          result: item.status === "completed" ? summary : `patch failed\n${summary}`,
          isError: item.status === "failed",
        });
        return events;
      }

      case "web_search": {
        const events = this.announceTool(item, "web_search", {
          query: item.query,
        });
        if (completed) {
          events.push({
            type: "tool_result",
            toolUseId: item.id,
            result: "search completed",
          });
        }
        return events;
      }

      case "mcp_tool_call": {
        const events = this.announceTool(
          item,
          `${item.server}.${item.tool}`,
          toInputRecord(item.arguments)
        );
        if (completed) {
          const payload = item.error
            ? item.error.message
            : JSON.stringify(item.result?.structured_content ?? item.result?.content ?? "done");
          events.push({
            type: "tool_result",
            toolUseId: item.id,
            result: truncateOutput(payload),
            isError: item.status === "failed",
          });
        }
        return events;
      }

      case "error":
        return [{ type: "text", text: `\n⚠ ${item.message}\n` }];

      // reasoning summaries and todo lists have no goop UI equivalent
      case "reasoning":
      case "todo_list":
      default:
        return [];
    }
  }

  handle(event: ThreadEvent): AgentStreamEvent[] {
    switch (event.type) {
      case "thread.started":
        console.log(`[CodexProvider] Thread ${event.thread_id}`);
        return [{ type: "session", agentSessionId: event.thread_id }];

      case "item.started":
      case "item.updated":
        return this.handleItem(event.item, false);

      case "item.completed":
        return this.handleItem(event.item, true);

      case "turn.failed":
        throw new Error(`Codex error: ${event.error.message}`);

      case "error":
        throw new Error(`Codex error: ${event.message}`);

      case "turn.started":
      case "turn.completed":
      default:
        return [];
    }
  }
}

function subprocessEnv(): Record<string, string> {
  // Drop the API key so usage is billed to the user's ChatGPT plan (codex
  // login), never the API key configured for the "openai" provider. The SDK
  // replaces the subprocess environment entirely when env is provided, so
  // everything else is passed through.
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== "OPENAI_API_KEY") env[key] = value;
  }
  return env;
}

export class CodexProvider implements AgentProvider {
  kind = "agent" as const;
  name = "codex";
  private model?: string;

  constructor(model?: string) {
    this.model = model && model !== "default" ? model : undefined;
  }

  private threadOptions(workingDir: string): ThreadOptions {
    return {
      ...(this.model ? { model: this.model } : {}),
      workingDirectory: workingDir,
      // Codex sandboxes command execution at the OS level; workspace-write
      // confines writes to the working directory, mirroring goop's security
      // model for the other providers.
      sandboxMode: "workspace-write",
      approvalPolicy: "never",
      skipGitRepoCheck: true,
    };
  }

  async *runTurn(options: AgentTurnOptions): AsyncGenerator<AgentStreamEvent> {
    const codex = new Codex({ env: subprocessEnv() });
    let emittedContent = false;

    const attempt = async function* (
      this: CodexProvider,
      resumeSessionId: string | null,
      prompt: string
    ): AsyncGenerator<AgentStreamEvent> {
      const thread = resumeSessionId
        ? codex.resumeThread(resumeSessionId, this.threadOptions(options.workingDir))
        : codex.startThread(this.threadOptions(options.workingDir));
      const mapper = new CodexEventMapper();
      const { events } = await thread.runStreamed(prompt);
      for await (const event of events) {
        yield* mapper.handle(event);
      }
    }.bind(this);

    try {
      for await (const event of attempt(options.resumeSessionId, options.prompt)) {
        if (event.type !== "session") emittedContent = true;
        yield event;
      }
      return;
    } catch (error: any) {
      // If resuming failed before producing anything, fall back to a fresh
      // thread seeded with a recap of the stored conversation.
      if (emittedContent || !options.resumeSessionId) throw error;
      console.warn(
        `[CodexProvider] Resume of thread ${options.resumeSessionId} failed (${error?.message}); starting a fresh thread`
      );
    }

    yield* attempt(null, withRecap(options.prompt, options.recapPrompt));
  }
}
