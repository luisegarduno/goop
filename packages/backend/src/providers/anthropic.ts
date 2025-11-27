import Anthropic from "@anthropic-ai/sdk";
import { Provider, ProviderMessage, StreamEvent, ToolDefinition } from "./base";
import { zodToJsonSchema } from "zod-to-json-schema";

// Add model list constant
export const ANTHROPIC_MODELS = [
  "claude-3-haiku-20240307",
  "claude-3-5-haiku-latest",
  "claude-opus-4-0",
  "claude-sonnet-4-0",
  "claude-opus-4-1",
  "claude-haiku-4-5",
  "claude-opus-4-5",
  "claude-sonnet-4-5",
] as const;

// Max output tokens for each model
const MODEL_MAX_TOKENS: Record<string, number> = {
  "claude-3-haiku-20240307": 4096,
  "claude-3-5-haiku-latest": 8192,
  "claude-opus-4-0": 32768,
  "claude-sonnet-4-0": 64000,
  "claude-opus-4-1": 32768,
  "claude-haiku-4-5": 64000,
  "claude-opus-4-5": 64000,
  "claude-sonnet-4-5": 64000,
};

export class AnthropicProvider implements Provider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(model: string = "claude-3-5-haiku-latest", apiKey?: string) {
    // Validate model is in allowed list
    if (!ANTHROPIC_MODELS.includes(model as any)) {
      throw new Error(
        `Invalid Anthropic model: ${model}. Allowed models: ${ANTHROPIC_MODELS.join(", ")}`
      );
    }

    // Use provided API key or fall back to environment variable
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY is required");
    }
    this.client = new Anthropic({
      apiKey: key,
    });
    this.model = model;
  }

  async *stream(
    messages: ProviderMessage[],
    tools: ToolDefinition[]
  ): AsyncGenerator<StreamEvent> {
    const anthropicTools = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: zodToJsonSchema(tool.input_schema) as any,
    }));

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
