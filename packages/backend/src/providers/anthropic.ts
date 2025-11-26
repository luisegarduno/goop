import Anthropic from "@anthropic-ai/sdk";
import { Provider, ProviderMessage, StreamEvent, ToolDefinition } from "./base";
import { loadConfig } from "../config/index";
import { zodToJsonSchema } from "zod-to-json-schema";

export class AnthropicProvider implements Provider {
  name = "anthropic";
  private client: Anthropic;

  constructor() {
    const config = loadConfig();
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
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

    console.log(
      "[AnthropicProvider] Starting stream with",
      messages.length,
      "messages"
    );
    console.log("[AnthropicProvider] Messages:", JSON.stringify(messages, null, 2));

    try {
      const stream = await this.client.messages.stream({
        model: "claude-3-5-haiku-latest",
        max_tokens: 8192,
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
