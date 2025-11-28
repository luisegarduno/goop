import type {
  Provider,
  ProviderMessage,
  StreamEvent,
  ToolDefinition,
} from "../../src/providers/base";

/**
 * Mock provider that returns predefined responses
 */
export class MockProvider implements Provider {
  name = "mock";
  private responses: StreamEvent[];

  constructor(responses: StreamEvent[] = []) {
    this.responses = responses;
  }

  async *stream(
    messages: ProviderMessage[],
    tools: ToolDefinition[]
  ): AsyncGenerator<StreamEvent> {
    for (const event of this.responses) {
      yield event;
    }
  }

  /**
   * Configure mock to return text response
   */
  static withTextResponse(text: string): MockProvider {
    return new MockProvider([
      { type: "text", text },
      { type: "done" },
    ]);
  }

  /**
   * Configure mock to return tool use
   */
  static withToolUse(
    toolName: string,
    toolInput: any,
    resultText?: string
  ): MockProvider {
    const events: StreamEvent[] = [
      {
        type: "tool_use",
        toolUse: {
          id: "test-tool-id",
          name: toolName,
          input: toolInput,
        },
      },
    ];

    if (resultText) {
      events.push({ type: "text", text: resultText });
    }

    events.push({ type: "done" });

    return new MockProvider(events);
  }
}
