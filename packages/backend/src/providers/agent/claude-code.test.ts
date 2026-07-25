import { describe, test, expect } from "bun:test";
import {
  ClaudeCodeEventMapper,
  usageFromResult,
  getClaudeCodeContextWindow,
} from "./claude-code";

function initMessage(sessionId = "session-1") {
  return {
    type: "system",
    subtype: "init",
    session_id: sessionId,
    apiKeySource: "oauth",
    claude_code_version: "test",
  } as any;
}

function textDelta(text: string) {
  return {
    type: "stream_event",
    parent_tool_use_id: null,
    event: {
      type: "content_block_delta",
      delta: { type: "text_delta", text },
    },
  } as any;
}

function assistantMessage(content: any[]) {
  return {
    type: "assistant",
    parent_tool_use_id: null,
    message: { content },
  } as any;
}

function userToolResult(toolUseId: string, content: unknown, isError = false) {
  return {
    type: "user",
    parent_tool_use_id: null,
    message: {
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          content,
          is_error: isError,
        },
      ],
    },
  } as any;
}

describe("ClaudeCodeEventMapper", () => {
  test("emits session id from init message", () => {
    const mapper = new ClaudeCodeEventMapper();
    expect(mapper.handle(initMessage("abc"))).toEqual([
      { type: "session", agentSessionId: "abc" },
    ]);
  });

  test("streams text deltas and suppresses the duplicate full message", () => {
    const mapper = new ClaudeCodeEventMapper();
    expect(mapper.handle(textDelta("Hel"))).toEqual([
      { type: "text", text: "Hel" },
    ]);
    expect(mapper.handle(textDelta("lo"))).toEqual([
      { type: "text", text: "lo" },
    ]);
    // Full assistant message repeats the streamed text - must not re-emit
    expect(
      mapper.handle(assistantMessage([{ type: "text", text: "Hello" }]))
    ).toEqual([]);
  });

  test("falls back to full message text when no deltas were streamed", () => {
    const mapper = new ClaudeCodeEventMapper();
    expect(
      mapper.handle(assistantMessage([{ type: "text", text: "Hello" }]))
    ).toEqual([{ type: "text", text: "Hello" }]);
  });

  test("emits tool_use and matching tool_result", () => {
    const mapper = new ClaudeCodeEventMapper();
    const toolUse = mapper.handle(
      assistantMessage([
        { type: "tool_use", id: "tool-1", name: "Read", input: { file_path: "a.ts" } },
      ])
    );
    expect(toolUse).toEqual([
      { type: "tool_use", id: "tool-1", name: "Read", input: { file_path: "a.ts" } },
    ]);

    const result = mapper.handle(
      userToolResult("tool-1", [{ type: "text", text: "file contents" }])
    );
    expect(result).toEqual([
      {
        type: "tool_result",
        toolUseId: "tool-1",
        result: "file contents",
        isError: false,
      },
    ]);
  });

  test("ignores tool_results for unknown tool ids (history replay)", () => {
    const mapper = new ClaudeCodeEventMapper();
    expect(mapper.handle(userToolResult("stale-tool", "old output"))).toEqual([]);
  });

  test("ignores subagent traffic", () => {
    const mapper = new ClaudeCodeEventMapper();
    const msg = assistantMessage([{ type: "text", text: "sub" }]);
    msg.parent_tool_use_id = "parent-1";
    expect(mapper.handle(msg)).toEqual([]);
  });

  test("throws a descriptive error on result errors", () => {
    const mapper = new ClaudeCodeEventMapper();
    expect(() =>
      mapper.handle({
        type: "result",
        subtype: "error_during_execution",
        errors: ["something broke"],
      } as any)
    ).toThrow(/something broke/);
  });

  test("emits a warning instead of throwing on max turns", () => {
    const mapper = new ClaudeCodeEventMapper();
    const events = mapper.handle({
      type: "result",
      subtype: "error_max_turns",
      errors: [],
    } as any);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "text" });
  });

  test("success results emit a usage event from modelUsage", () => {
    const mapper = new ClaudeCodeEventMapper();
    const events = mapper.handle({
      type: "result",
      subtype: "success",
      result: "Hello",
      modelUsage: {
        "claude-sonnet-4-6": {
          inputTokens: 1000,
          cacheReadInputTokens: 4000,
          cacheCreationInputTokens: 500,
          contextWindow: 1_000_000,
        },
      },
    } as any);
    expect(events).toEqual([
      { type: "usage", contextTokens: 5500, contextWindow: 1_000_000 },
    ]);
  });

  test("success results without usage emit nothing", () => {
    const mapper = new ClaudeCodeEventMapper();
    expect(
      mapper.handle({ type: "result", subtype: "success", result: "Hello" } as any)
    ).toEqual([]);
  });

  test("max-turns result emits usage before the warning", () => {
    const mapper = new ClaudeCodeEventMapper();
    const events = mapper.handle({
      type: "result",
      subtype: "error_max_turns",
      errors: [],
      modelUsage: {
        opus: {
          inputTokens: 200,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          contextWindow: 1_000_000,
        },
      },
    } as any);
    expect(events[0]).toEqual({
      type: "usage",
      contextTokens: 200,
      contextWindow: 1_000_000,
    });
    expect(events[1]).toMatchObject({ type: "text" });
  });
});

describe("usageFromResult", () => {
  test("picks the primary (largest-prompt) model and its context window", () => {
    const usage = usageFromResult({
      modelUsage: {
        // Subagent with a small prompt.
        haiku: {
          inputTokens: 10,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          contextWindow: 200_000,
        },
        // Primary model with the larger prompt.
        opus: {
          inputTokens: 1000,
          cacheReadInputTokens: 2000,
          cacheCreationInputTokens: 0,
          contextWindow: 1_000_000,
        },
      },
    });
    expect(usage).toEqual({ contextTokens: 3000, contextWindow: 1_000_000 });
  });

  test("falls back to aggregate usage with a 0 window when modelUsage is absent", () => {
    const usage = usageFromResult({
      usage: {
        input_tokens: 100,
        cache_read_input_tokens: 50,
        cache_creation_input_tokens: 25,
      },
    });
    expect(usage).toEqual({ contextTokens: 175, contextWindow: 0 });
  });

  test("returns null when no usage information is present", () => {
    expect(usageFromResult({})).toBeNull();
  });
});

describe("getClaudeCodeContextWindow", () => {
  test("maps aliases to windows and defaults unknown/empty to 200K", () => {
    expect(getClaudeCodeContextWindow("sonnet")).toBe(1_000_000);
    expect(getClaudeCodeContextWindow("opus")).toBe(1_000_000);
    expect(getClaudeCodeContextWindow("haiku")).toBe(200_000);
    expect(getClaudeCodeContextWindow("default")).toBe(200_000);
    expect(getClaudeCodeContextWindow(null)).toBe(200_000);
  });
});
