import { describe, test, expect } from "bun:test";
import { ClaudeCodeEventMapper } from "./claude-code";

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

  test("success results emit nothing (text already streamed)", () => {
    const mapper = new ClaudeCodeEventMapper();
    expect(
      mapper.handle({ type: "result", subtype: "success", result: "Hello" } as any)
    ).toEqual([]);
  });
});
