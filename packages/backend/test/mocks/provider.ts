import type {
  Provider,
  ProviderMessage,
  StreamEvent,
  ToolDefinition,
} from "../../src/providers/base";

/**
 * Mock provider that returns predefined responses
 * Supports multi-turn conversations by popping events from queue
 */
export class MockProvider implements Provider {
  name = "mock";
  private responses: StreamEvent[][];
  private callCount = 0;

  constructor(responses: StreamEvent[] | StreamEvent[][] = []) {
    // Support both single array and array of arrays
    if (responses.length > 0 && Array.isArray(responses[0]) && 'type' in responses[0] === false) {
      this.responses = responses as StreamEvent[][];
    } else {
      this.responses = [responses as StreamEvent[]];
    }
  }

  async *stream(
    messages: ProviderMessage[],
    tools: ToolDefinition[]
  ): AsyncGenerator<StreamEvent> {
    const eventsToYield = this.responses[this.callCount] || [];
    this.callCount++;

    for (const event of eventsToYield) {
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
