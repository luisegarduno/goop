import { describe, test, expect } from "bun:test";
import { CodexEventMapper } from "./codex";

describe("CodexEventMapper", () => {
  test("emits session id from thread.started", () => {
    const mapper = new CodexEventMapper();
    expect(
      mapper.handle({ type: "thread.started", thread_id: "thread-1" } as any)
    ).toEqual([{ type: "session", agentSessionId: "thread-1" }]);
  });

  test("streams agent_message text as cumulative deltas", () => {
    const mapper = new CodexEventMapper();
    const item = (text: string) => ({ id: "m1", type: "agent_message", text });

    expect(
      mapper.handle({ type: "item.updated", item: item("Hel") } as any)
    ).toEqual([{ type: "text", text: "Hel" }]);
    expect(
      mapper.handle({ type: "item.updated", item: item("Hello") } as any)
    ).toEqual([{ type: "text", text: "lo" }]);
    // completed with same text adds nothing
    expect(
      mapper.handle({ type: "item.completed", item: item("Hello") } as any)
    ).toEqual([]);
  });

  test("maps command execution to tool_use and tool_result", () => {
    const mapper = new CodexEventMapper();
    const started = mapper.handle({
      type: "item.started",
      item: {
        id: "cmd-1",
        type: "command_execution",
        command: "ls -la",
        aggregated_output: "",
        status: "in_progress",
      },
    } as any);
    expect(started).toEqual([
      { type: "tool_use", id: "cmd-1", name: "shell", input: { command: "ls -la" } },
    ]);

    const completed = mapper.handle({
      type: "item.completed",
      item: {
        id: "cmd-1",
        type: "command_execution",
        command: "ls -la",
        aggregated_output: "file.txt",
        exit_code: 0,
        status: "completed",
      },
    } as any);
    expect(completed).toEqual([
      {
        type: "tool_result",
        toolUseId: "cmd-1",
        result: "file.txt\n(exit code 0)",
        isError: false,
      },
    ]);
  });

  test("announces the tool_use even when only a completed event arrives", () => {
    const mapper = new CodexEventMapper();
    const events = mapper.handle({
      type: "item.completed",
      item: {
        id: "cmd-2",
        type: "command_execution",
        command: "false",
        aggregated_output: "",
        exit_code: 1,
        status: "failed",
      },
    } as any);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: "tool_use", name: "shell" });
    expect(events[1]).toMatchObject({
      type: "tool_result",
      toolUseId: "cmd-2",
      isError: true,
    });
  });

  test("maps file changes to a completed patch tool call", () => {
    const mapper = new CodexEventMapper();
    const events = mapper.handle({
      type: "item.completed",
      item: {
        id: "patch-1",
        type: "file_change",
        status: "completed",
        changes: [
          { kind: "update", path: "src/a.ts" },
          { kind: "add", path: "src/b.ts" },
        ],
      },
    } as any);
    expect(events[0]).toMatchObject({ type: "tool_use", name: "apply_patch" });
    expect(events[1]).toMatchObject({
      type: "tool_result",
      result: "update src/a.ts\nadd src/b.ts",
      isError: false,
    });
  });

  test("ignores reasoning and todo items", () => {
    const mapper = new CodexEventMapper();
    expect(
      mapper.handle({
        type: "item.completed",
        item: { id: "r1", type: "reasoning", text: "thinking..." },
      } as any)
    ).toEqual([]);
    expect(
      mapper.handle({
        type: "item.completed",
        item: { id: "t1", type: "todo_list", items: [] },
      } as any)
    ).toEqual([]);
  });

  test("surfaces non-fatal error items as text", () => {
    const mapper = new CodexEventMapper();
    const events = mapper.handle({
      type: "item.completed",
      item: { id: "e1", type: "error", message: "rate limited" },
    } as any);
    expect(events).toHaveLength(1);
    expect((events[0] as any).text).toContain("rate limited");
  });

  test("throws on turn.failed and stream errors", () => {
    const mapper = new CodexEventMapper();
    expect(() =>
      mapper.handle({ type: "turn.failed", error: { message: "boom" } } as any)
    ).toThrow(/boom/);
    expect(() =>
      mapper.handle({ type: "error", message: "stream died" } as any)
    ).toThrow(/stream died/);
  });
});
