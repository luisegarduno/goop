import { ProviderMessage, ToolDefinition } from "../providers/base";

/** A single row in the context-window breakdown. */
export interface UsageCategory {
  /** Human-readable label, e.g. "Messages". */
  label: string;
  /** Token count attributed to this category. */
  tokens: number;
  /** Fraction of the total context window (0..1). */
  percent: number;
}

/** Full context-window usage snapshot for a conversation. */
export interface ContextUsage {
  model: string;
  contextWindow: number;
  /** Total input tokens the next request would consume. */
  totalTokens: number;
  /** Fraction of the context window used (0..1). */
  usedPercent: number;
  /** Ordered breakdown: System prompt, Tools, Messages, Free space. */
  categories: UsageCategory[];
}

/**
 * Counts the input tokens for a request. Kept abstract so the orchestrator can
 * be unit-tested with a fake counter and wired to the Anthropic SDK in
 * production.
 */
export type TokenCounter = (args: {
  messages: ProviderMessage[];
  tools?: ToolDefinition[];
  system?: string;
}) => Promise<number>;

/**
 * Build a coarse Used/Free breakdown from a known total. Used for agent
 * providers (Claude Code), where the runtime reports its own usage but goop
 * can't attribute it to System prompt / Tools / Messages.
 */
export function simpleUsage(params: {
  model: string;
  contextWindow: number;
  totalTokens: number;
}): ContextUsage {
  const { model, contextWindow } = params;
  const totalTokens = Math.max(0, params.totalTokens);
  const freeTokens = Math.max(0, contextWindow - totalTokens);
  const pct = (tokens: number) =>
    contextWindow > 0 ? tokens / contextWindow : 0;

  return {
    model,
    contextWindow,
    totalTokens,
    usedPercent: pct(totalTokens),
    categories: [
      { label: "Used", tokens: totalTokens, percent: pct(totalTokens) },
      { label: "Free space", tokens: freeTokens, percent: pct(freeTokens) },
    ],
  };
}

interface ComputeParams {
  model: string;
  contextWindow: number;
  system: string;
  messages: ProviderMessage[];
  tools: ToolDefinition[];
  count: TokenCounter;
}

/**
 * Compute an itemized context-window usage breakdown.
 *
 * Categories are attributed via incremental counting so each delta is
 * non-negative and the parts sum to the total:
 *   - messages = count(messages)                     (conversation + base overhead)
 *   - system   = count(system, messages) - messages  (0 when no system prompt)
 *   - tools    = count(system, messages, tools) - count(system, messages)
 *   - free     = contextWindow - total
 *
 * With no messages, no request would be sent, so everything is zero except a
 * full free-space row (avoids an unnecessary/invalid empty-message count call).
 */
export async function computeContextUsage(
  params: ComputeParams
): Promise<ContextUsage> {
  const { model, contextWindow, system, messages, tools, count } = params;

  let messagesTokens = 0;
  let systemTokens = 0;
  let toolsTokens = 0;

  if (messages.length > 0) {
    const msgs = await count({ messages });
    const msgsSys = system
      ? await count({ messages, system })
      : msgs;
    const total = await count({ messages, tools, system });

    messagesTokens = msgs;
    systemTokens = Math.max(0, msgsSys - msgs);
    toolsTokens = Math.max(0, total - msgsSys);
  }

  const totalTokens = messagesTokens + systemTokens + toolsTokens;
  const freeTokens = Math.max(0, contextWindow - totalTokens);

  const pct = (tokens: number) =>
    contextWindow > 0 ? tokens / contextWindow : 0;

  const categories: UsageCategory[] = [
    { label: "System prompt", tokens: systemTokens, percent: pct(systemTokens) },
    { label: "Tools", tokens: toolsTokens, percent: pct(toolsTokens) },
    { label: "Messages", tokens: messagesTokens, percent: pct(messagesTokens) },
    { label: "Free space", tokens: freeTokens, percent: pct(freeTokens) },
  ];

  return {
    model,
    contextWindow,
    totalTokens,
    usedPercent: pct(totalTokens),
    categories,
  };
}
