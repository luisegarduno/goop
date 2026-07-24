import { describe, test, expect } from "bun:test";
import { z } from "zod";
import {
  AnthropicProvider,
  CONTEXT_WINDOWS,
  getContextWindow,
} from "./anthropic";
import type { ProviderMessage, ToolDefinition } from "./base";

// These are "learning tests" for the @anthropic-ai/sdk messages.countTokens
// endpoint. They pin our understanding of its request/response contract against
// a fake client, so they run offline (the repo does not hit live APIs in CI).
//
// A guarded live test at the bottom exercises the real endpoint when
// RUN_LIVE_SDK_TESTS is set and a real key is available.

/** Minimal fake Anthropic client that records the last countTokens request. */
function fakeClient(inputTokens: number) {
  const calls: any[] = [];
  const client = {
    messages: {
      async countTokens(request: any) {
        calls.push(request);
        return { input_tokens: inputTokens };
      },
    },
  };
  return { client: client as any, calls };
}

const sampleMessages: ProviderMessage[] = [
  { role: "user", content: [{ type: "text", text: "hello" }] },
];

const sampleTools: ToolDefinition[] = [
  {
    name: "read_file",
    description: "Read a file",
    input_schema: z.object({ path: z.string() }),
  },
];

describe("AnthropicProvider.countTokens (SDK contract)", () => {
  test("sends model + messages and returns input_tokens", async () => {
    const { client, calls } = fakeClient(123);
    const provider = new AnthropicProvider("claude-opus-4-8", "sk-ant-test", client);

    const tokens = await provider.countTokens(sampleMessages);

    expect(tokens).toBe(123);
    expect(calls).toHaveLength(1);
    expect(calls[0].model).toBe("claude-opus-4-8");
    expect(calls[0].messages).toEqual(sampleMessages);
  });

  test("maps tools to the Anthropic wire format (name/description/input_schema)", async () => {
    const { client, calls } = fakeClient(200);
    const provider = new AnthropicProvider("claude-opus-4-8", "sk-ant-test", client);

    await provider.countTokens(sampleMessages, sampleTools);

    const sent = calls[0].tools;
    expect(sent).toHaveLength(1);
    expect(sent[0].name).toBe("read_file");
    expect(sent[0].description).toBe("Read a file");
    // Zod schema converted to JSON schema
    expect(sent[0].input_schema.type).toBe("object");
    expect(sent[0].input_schema.properties.path).toBeDefined();
  });

  test("omits tools when none are provided", async () => {
    const { client, calls } = fakeClient(10);
    const provider = new AnthropicProvider("claude-opus-4-8", "sk-ant-test", client);

    await provider.countTokens(sampleMessages, []);

    expect(calls[0].tools).toBeUndefined();
  });

  test("includes system only when non-empty", async () => {
    const { client, calls } = fakeClient(10);
    const provider = new AnthropicProvider("claude-opus-4-8", "sk-ant-test", client);

    await provider.countTokens(sampleMessages, [], "");
    expect(calls[0].system).toBeUndefined();

    await provider.countTokens(sampleMessages, [], "You are helpful.");
    expect(calls[1].system).toBe("You are helpful.");
  });
});

describe("context window resolution", () => {
  test("1M-context models resolve to 1,000,000", () => {
    expect(getContextWindow("claude-opus-4-8")).toBe(1_000_000);
    expect(getContextWindow("claude-sonnet-5")).toBe(1_000_000);
  });

  test("200K-context models resolve to 200,000", () => {
    expect(getContextWindow("claude-haiku-4-5")).toBe(200_000);
    expect(getContextWindow("claude-opus-4-5")).toBe(200_000);
  });

  test("unknown models default to 200,000", () => {
    expect(getContextWindow("some-future-model")).toBe(200_000);
  });

  test("provider exposes contextWindow for its model", () => {
    const { client } = fakeClient(1);
    const provider = new AnthropicProvider("claude-opus-4-8", "sk-ant-test", client);
    expect(provider.contextWindow).toBe(1_000_000);
    expect(provider.getModel()).toBe("claude-opus-4-8");
  });

  test("every allowed model has a context-window entry or a sane default", () => {
    // Sanity: mapped values are positive.
    for (const value of Object.values(CONTEXT_WINDOWS)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});

// Live test — skipped by default. Set RUN_LIVE_SDK_TESTS=1 and ANTHROPIC_API_KEY
// to exercise the real countTokens endpoint and confirm the contract.
const runLive = process.env.RUN_LIVE_SDK_TESTS && process.env.ANTHROPIC_API_KEY;
(runLive ? test : test.skip)(
  "live: real countTokens returns a positive input_tokens",
  async () => {
    const provider = new AnthropicProvider("claude-opus-4-8");
    const tokens = await provider.countTokens([
      { role: "user", content: [{ type: "text", text: "Hello, Claude" }] },
    ]);
    expect(tokens).toBeGreaterThan(0);
  }
);
