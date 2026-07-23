import { ProviderMessage } from "../base";

const MAX_MESSAGE_CHARS = 1500;
const MAX_RECAP_CHARS = 12000;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

/**
 * Builds a plain-text recap of the stored conversation so an agent runtime
 * that lost its native session (deleted transcript, changed working
 * directory) can continue with context. Most recent messages win when the
 * budget runs out.
 */
export function buildRecapPrompt(history: ProviderMessage[]): string | null {
  if (history.length === 0) return null;

  const lines: string[] = [];
  for (const message of history) {
    const label = message.role === "user" ? "User" : "Assistant";
    const chunks: string[] = [];
    for (const part of message.content) {
      if (part.type === "text" && part.text?.trim()) {
        chunks.push(truncate(part.text.trim(), MAX_MESSAGE_CHARS));
      } else if (part.type === "tool_use" && part.name) {
        chunks.push(`[used tool: ${part.name}]`);
      }
      // tool_result parts are noise in a recap - the surviving text already
      // reflects what the agent learned from them.
    }
    if (chunks.length > 0) {
      lines.push(`${label}: ${chunks.join("\n")}`);
    }
  }

  if (lines.length === 0) return null;

  // Keep the most recent lines that fit the budget.
  const kept: string[] = [];
  let used = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (used + line.length > MAX_RECAP_CHARS && kept.length > 0) break;
    kept.unshift(truncate(line, MAX_RECAP_CHARS));
    used += line.length;
  }

  const omitted = lines.length - kept.length;
  const header =
    omitted > 0 ? `(${omitted} earlier message(s) omitted)\n` : "";
  return header + kept.join("\n\n");
}

/**
 * Wraps a user prompt with the recap when a native resume was not possible.
 */
export function withRecap(prompt: string, recap: string | null): string {
  if (!recap) return prompt;
  return [
    "<conversation-recap>",
    "You are continuing an existing conversation. The native session history",
    "could not be resumed, so here is a recap of what happened so far:",
    "",
    recap,
    "</conversation-recap>",
    "",
    prompt,
  ].join("\n");
}
