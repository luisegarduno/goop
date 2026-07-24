import Anthropic from "@anthropic-ai/sdk";
import { Provider, ProviderMessage, StreamEvent, ToolDefinition } from "./base";
import { zodToJsonSchema } from "zod-to-json-schema";

// Current Claude model aliases (older claude-3-* models are retired and 404)
export const ANTHROPIC_MODELS = [
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-sonnet-5",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "claude-opus-4-5",
  "claude-sonnet-4-5",
] as const;

// Max output tokens per request (all current models support 64K when streaming)
const MODEL_MAX_TOKENS: Record<string, number> = {
  "claude-opus-4-8": 64000,
  "claude-opus-4-7": 64000,
  "claude-opus-4-6": 64000,
  "claude-sonnet-5": 64000,
  "claude-sonnet-4-6": 64000,
  "claude-haiku-4-5": 64000,
  "claude-opus-4-5": 64000,
  "claude-sonnet-4-5": 64000,
};

// Total context window (input) per model, used by the context-usage indicator.
// Values from the Claude model catalog; unmapped models fall back to 200K.
const DEFAULT_CONTEXT_WINDOW = 200_000;
export const CONTEXT_WINDOWS: Record<string, number> = {
  "claude-opus-4-8": 1_000_000,
  "claude-opus-4-7": 1_000_000,
  "claude-opus-4-6": 1_000_000,
  "claude-sonnet-5": 1_000_000,
  "claude-sonnet-4-6": 1_000_000,
  "claude-sonnet-4-5": 1_000_000,
  "claude-haiku-4-5": 200_000,
  "claude-opus-4-5": 200_000,
};

/** Total context window (input tokens) for a model, defaulting to 200K. */
export function getContextWindow(model: string): number {
  return CONTEXT_WINDOWS[model] ?? DEFAULT_CONTEXT_WINDOW;
}

export class AnthropicProvider implements Provider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;
  /** Total context window (input tokens) for the configured model. */
  readonly contextWindow: number;

  constructor(
    model: string = "claude-opus-4-8",
    apiKey?: string,
    // Optional injected client, primarily for tests. When omitted a real
    // Anthropic client is constructed from the API key.
    client?: Anthropic
  ) {
    // Validate model is in allowed list
    if (!ANTHROPIC_MODELS.includes(model as any)) {
      throw new Error(
        `Invalid Anthropic model: ${model}. Allowed models: ${ANTHROPIC_MODELS.join(", ")}`
      );
    }

    if (client) {
      this.client = client;
    } else {
      // Use provided API key or fall back to environment variable
      const key = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!key) {
        throw new Error("ANTHROPIC_API_KEY is required");
      }
      this.client = new Anthropic({
        apiKey: key,
      });
    }
    this.model = model;
    this.contextWindow = getContextWindow(model);
  }

  /** The model this provider is configured to use. */
  getModel(): string {
    return this.model;
  }

  /** Map goop tool definitions to the Anthropic tool wire format. */
  private toAnthropicTools(tools: ToolDefinition[]) {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: zodToJsonSchema(tool.input_schema) as any,
    }));
  }

  /**
   * Count the input tokens that a request with these messages, tools, and
   * (optional) system prompt would consume. Wraps the SDK's free
   * `messages.countTokens` endpoint. Returns `input_tokens`.
   */
  async countTokens(
    messages: ProviderMessage[],
    tools: ToolDefinition[] = [],
    system?: string
  ): Promise<number> {
    const request: any = {
      model: this.model,
      messages: messages as any,
    };
    if (tools.length > 0) {
      request.tools = this.toAnthropicTools(tools) as any;
    }
    if (system && system.length > 0) {
      request.system = system;
    }

    const result = await this.client.messages.countTokens(request);
    return result.input_tokens;
  }

  async *stream(
    messages: ProviderMessage[],
    tools: ToolDefinition[]
  ): AsyncGenerator<StreamEvent> {
    const anthropicTools = this.toAnthropicTools(tools);

    try {
      // Get max tokens for this model, default to 8192 if not found
      const maxTokens = MODEL_MAX_TOKENS[this.model] || 8192;

      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: maxTokens,
        messages: messages as any,
        tools: anthropicTools as any,
      });

      // Track current tool use being built
      let currentToolUse: {
        id: string;
        name: string;
        inputJson: string;
      } | null = null;

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use") {
            console.log(
              "[AnthropicProvider] Tool use:",
              event.content_block.name
            );
            // Initialize tool use tracking
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              inputJson: "",
            };
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            yield {
              type: "text",
              text: event.delta.text,
            };
          } else if (
            event.delta.type === "input_json_delta" &&
            currentToolUse
          ) {
            // Accumulate input JSON chunks
            currentToolUse.inputJson += event.delta.partial_json;
          }
        } else if (event.type === "content_block_stop" && currentToolUse) {
          // Tool use is complete, parse the accumulated input
          const input = currentToolUse.inputJson
            ? JSON.parse(currentToolUse.inputJson)
            : {};

          yield {
            type: "tool_use",
            toolUse: {
              id: currentToolUse.id,
              name: currentToolUse.name,
              input: input as Record<string, unknown>,
            },
          };

          currentToolUse = null;
        }
      }

      console.log("[AnthropicProvider] Stream completed");
      yield { type: "done" };
    } catch (error: any) {
      console.error("[AnthropicProvider] Error:", error);
      console.error("[AnthropicProvider] Error details:", JSON.stringify(error, null, 2));
      if (error.message) {
        console.error("[AnthropicProvider] Error message:", error.message);
      }
      throw error;
    }
  }
}
