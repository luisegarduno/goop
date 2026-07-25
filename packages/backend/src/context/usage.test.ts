import { describe, test, expect } from "bun:test";
import { z } from "zod";
import { computeContextUsage, simpleUsage, type TokenCounter } from "./usage";
import type { ProviderMessage, ToolDefinition } from "../providers/base";

const messages: ProviderMessage[] = [
  { role: "user", content: [{ type: "text", text: "hello" }] },
];

const tools: ToolDefinition[] = [
  {
    name: "read_file",
    description: "Read a file",
    input_schema: z.object({ path: z.string() }),
  },
];

function category(usage: Awaited<ReturnType<typeof computeContextUsage>>, label: string) {
  const cat = usage.categories.find((c) => c.label === label);
  if (!cat) throw new Error(`missing category ${label}`);
  return cat;
}

describe("computeContextUsage", () => {
  test("attributes tokens via incremental subtraction (no system prompt)", async () => {
    // count(messages) = 100, count(messages+tools) = 130
    const count: TokenCounter = async ({ tools }) =>
      tools && tools.length > 0 ? 130 : 100;

    const usage = await computeContextUsage({
      model: "claude-opus-4-8",
      contextWindow: 1000,
      system: "",
      messages,
      tools,
      count,
    });

    expect(category(usage, "Messages").tokens).toBe(100);
    expect(category(usage, "Tools").tokens).toBe(30);
    expect(category(usage, "System prompt").tokens).toBe(0);
    expect(usage.totalTokens).toBe(130);
    expect(category(usage, "Free space").tokens).toBe(870);
  });

  test("attributes system-prompt tokens when a system prompt is present", async () => {
    // count(messages)=100, count(messages+system)=140, count(all)=170
    const count: TokenCounter = async ({ system, tools }) => {
      if (tools && tools.length > 0) return 170;
      if (system) return 140;
      return 100;
    };

    const usage = await computeContextUsage({
      model: "claude-opus-4-8",
      contextWindow: 1000,
      system: "You are helpful.",
      messages,
      tools,
      count,
    });

    expect(category(usage, "Messages").tokens).toBe(100);
    expect(category(usage, "System prompt").tokens).toBe(40);
    expect(category(usage, "Tools").tokens).toBe(30);
    expect(usage.totalTokens).toBe(170);
  });

  test("percentages are fractions of the context window and categories sum to the window", async () => {
    const count: TokenCounter = async ({ tools }) =>
      tools && tools.length > 0 ? 250 : 250;

    const usage = await computeContextUsage({
      model: "claude-opus-4-8",
      contextWindow: 1000,
      system: "",
      messages,
      tools,
      count,
    });

    expect(usage.usedPercent).toBeCloseTo(0.25, 5);
    expect(category(usage, "Messages").percent).toBeCloseTo(0.25, 5);
    expect(category(usage, "Free space").percent).toBeCloseTo(0.75, 5);

    const sum = usage.categories.reduce((acc, c) => acc + c.tokens, 0);
    expect(sum).toBe(1000); // used + free == context window
  });

  test("empty history reports zero usage and full free space without counting", async () => {
    let called = false;
    const count: TokenCounter = async () => {
      called = true;
      return 999;
    };

    const usage = await computeContextUsage({
      model: "claude-opus-4-8",
      contextWindow: 1000,
      system: "",
      messages: [],
      tools,
      count,
    });

    expect(called).toBe(false); // no request would be sent → skip counting
    expect(usage.totalTokens).toBe(0);
    expect(usage.usedPercent).toBe(0);
    expect(category(usage, "Free space").tokens).toBe(1000);
  });

  test("clamps free space to zero when usage exceeds the window", async () => {
    const count: TokenCounter = async () => 1200;

    const usage = await computeContextUsage({
      model: "claude-haiku-4-5",
      contextWindow: 1000,
      system: "",
      messages,
      tools,
      count,
    });

    expect(usage.totalTokens).toBe(1200);
    expect(category(usage, "Free space").tokens).toBe(0);
  });
});

describe("simpleUsage", () => {
  test("produces a coarse Used/Free breakdown", () => {
    const usage = simpleUsage({
      model: "sonnet",
      contextWindow: 1_000_000,
      totalTokens: 250_000,
    });

    expect(usage.totalTokens).toBe(250_000);
    expect(usage.usedPercent).toBeCloseTo(0.25, 5);
    expect(usage.categories.map((c) => c.label)).toEqual(["Used", "Free space"]);
    expect(category(usage, "Used").tokens).toBe(250_000);
    expect(category(usage, "Free space").tokens).toBe(750_000);
  });

  test("clamps free space to zero and totals to non-negative", () => {
    const usage = simpleUsage({
      model: "haiku",
      contextWindow: 200_000,
      totalTokens: 250_000,
    });
    expect(category(usage, "Free space").tokens).toBe(0);
  });
});
