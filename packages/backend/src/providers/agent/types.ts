/**
 * Agent providers wrap a full agent runtime (Claude Code, Codex) instead of a
 * raw chat-completions API. The runtime executes its own tools and keeps its
 * own conversation history on disk, so goop streams its events for display and
 * persistence but does not run the tool loop itself.
 *
 * This is how subscription plans (Claude Pro/Max, ChatGPT Plus/Pro) are
 * supported: both runtimes authenticate with the user's existing CLI login
 * rather than an API key.
 */

export type AgentStreamEvent =
  | { type: "session"; agentSessionId: string }
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | { type: "tool_result"; toolUseId: string; result: string; isError?: boolean };

export interface AgentTurnOptions {
  /** The new user message for this turn. */
  prompt: string;
  /** Directory the agent operates in (session working directory). */
  workingDir: string;
  /** Native runtime session/thread id to resume, if any. */
  resumeSessionId: string | null;
  /**
   * Plain-text recap of the stored conversation. Used when the native session
   * cannot be resumed (deleted transcript, changed working directory) so the
   * agent still has context.
   */
  recapPrompt: string | null;
}

export interface AgentProvider {
  kind: "agent";
  name: string;
  runTurn(options: AgentTurnOptions): AsyncGenerator<AgentStreamEvent>;
}

export function isAgentProvider(provider: unknown): provider is AgentProvider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    (provider as { kind?: string }).kind === "agent"
  );
}
