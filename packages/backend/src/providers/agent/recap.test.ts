import { describe, test, expect } from "bun:test";
import { buildRecapPrompt, withRecap } from "./recap";
import { ProviderMessage } from "../base";

describe("buildRecapPrompt", () => {
  test("returns null for empty history", () => {
    expect(buildRecapPrompt([])).toBeNull();
  });

  test("labels roles and notes tool usage", () => {
    const history: ProviderMessage[] = [
      { role: "user", content: [{ type: "text", text: "read foo.ts" }] },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Sure." },
          { type: "tool_use", id: "t1", name: "read_file", input: {} },
        ],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "t1", content: "..." }],
      },
    ];

    const recap = buildRecapPrompt(history)!;
    expect(recap).toContain("User: read foo.ts");
    expect(recap).toContain("Assistant: Sure.");
    expect(recap).toContain("[used tool: read_file]");
    // tool_result-only messages are omitted
    expect(recap.split("\n\n")).toHaveLength(2);
  });

  test("keeps the most recent messages when over budget", () => {
    const history: ProviderMessage[] = [];
    for (let i = 0; i < 50; i++) {
      history.push({
        role: "user",
        content: [{ type: "text", text: `message ${i} ${"x".repeat(900)}` }],
      });
    }

    const recap = buildRecapPrompt(history)!;
    expect(recap).toContain("message 49");
    expect(recap).not.toContain("message 0 ");
    expect(recap).toContain("earlier message(s) omitted");
  });
});

describe("withRecap", () => {
  test("returns the prompt unchanged without a recap", () => {
    expect(withRecap("hi", null)).toBe("hi");
  });

  test("wraps the recap before the prompt", () => {
    const wrapped = withRecap("continue please", "User: earlier message");
    expect(wrapped).toContain("<conversation-recap>");
    expect(wrapped).toContain("User: earlier message");
    expect(wrapped.endsWith("continue please")).toBe(true);
  });
});
