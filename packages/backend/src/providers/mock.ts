import { Provider, ProviderMessage, StreamEvent, ToolDefinition } from "./base";

/**
 * Deterministic, offline provider used ONLY by the integration test suite.
 *
 * The real API-key providers (anthropic/openai) make live, billed, and
 * non-deterministic calls, which makes them unsuitable for gating CI: a turn
 * can fail because a key expired, the account is out of quota, or the model
 * simply chose not to emit a tool call. This provider exercises goop's own
 * pipeline (session loop → tool execution → DB persistence → SSE grammar)
 * without touching the network, so the integration tests stay reliable.
 *
 * It is never exposed in the product provider list and is only accepted by the
 * API when NODE_ENV === "test" (see `isMockEnabled` / the route guards).
 */
export const MOCK_MODELS = ["mock-model"] as const;

/** Whether the test-only mock provider may be created. Test env only. */
export function isMockEnabled(): boolean {
  return process.env.NODE_ENV === "test";
}

export class MockProvider implements Provider {
  name = "mock";

  constructor(model: string = "mock-model") {
    // Model is accepted but otherwise unused; behaviour is fixed.
    void model;
  }

  async *stream(
    messages: ProviderMessage[],
    _tools: ToolDefinition[]
  ): AsyncGenerator<StreamEvent> {
    const last = messages[messages.length - 1];

    // Second pass: the session loop fed us the tool result. Wrap up with a
    // short final message so the turn terminates deterministically.
    const isToolResultTurn = last?.content?.some(
      (block) => block.type === "tool_result"
    );
    if (isToolResultTurn) {
      yield { type: "text", text: "Done — I listed the files using the glob tool." };
      yield { type: "done" };
      return;
    }

    // First pass: decide whether the user's message asks for a tool. Keying off
    // "glob" keeps the branch explicit and matches the tool-execution test.
    const latestUserText = [...messages]
      .reverse()
      .find((m) => m.role === "user")
      ?.content.find((block) => block.type === "text")?.text?.toLowerCase();

    if (latestUserText?.includes("glob")) {
      yield { type: "text", text: "Sure, let me list the files." };
      yield {
        type: "tool_use",
        toolUse: {
          id: "mock-tool-1",
          name: "glob",
          input: { pattern: "*" },
        },
      };
      yield { type: "done" };
      return;
    }

    // Plain text turn (e.g. "Say hello").
    yield { type: "text", text: "Hello! This is a deterministic mock response." };
    yield { type: "done" };
  }
}
