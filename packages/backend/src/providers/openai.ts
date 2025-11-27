import OpenAI from "openai";
import { Provider, ProviderMessage, StreamEvent, ToolDefinition } from "./base";
import { zodToJsonSchema } from "zod-to-json-schema";

// Add default model list (will be overridden by dynamic fetching)
export const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"] as const;

export class OpenAIProvider implements Provider {
  name = "openai";
  private client: OpenAI;
  private model: string;

  constructor(model: string = "gpt-4o-mini", apiKey?: string) {
    // Use provided API key or fall back to environment variable
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY is required");
    }
    this.client = new OpenAI({ apiKey: key });
    this.model = model;
  }

  async *stream(
    messages: ProviderMessage[],
    tools: ToolDefinition[]
  ): AsyncGenerator<StreamEvent> {
    // Convert our message format to OpenAI's format
    const openaiMessages = messages.map((msg) => {
      const contentParts: any[] = [];

      for (const part of msg.content) {
        if (part.type === "text") {
          contentParts.push({
            type: "text",
            text: part.text || "",
          });
        } else if (part.type === "tool_use") {
          // For assistant messages with tool calls, we need to add them separately
          // OpenAI uses a different structure for tool calls in messages
          contentParts.push({
            type: "tool_call",
            id: part.id,
            function: {
              name: part.name,
              arguments: JSON.stringify(part.input),
            },
          });
        } else if (part.type === "tool_result") {
          // Tool results are sent as separate messages with role "tool"
          contentParts.push({
            type: "tool_result",
            tool_call_id: part.tool_use_id,
            content: part.content || "",
          });
        }
      }

      // Handle the message structure based on role and content
      if (msg.role === "assistant") {
        // Check if there are tool calls
        const toolCalls = msg.content
          .filter((p) => p.type === "tool_use")
          .map((p) => ({
            id: p.id!,
            type: "function" as const,
            function: {
              name: p.name!,
              arguments: JSON.stringify(p.input),
            },
          }));

        // Get text content
        const textContent = msg.content
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("");

        if (toolCalls.length > 0) {
          return {
            role: "assistant",
            content: textContent || null,
            tool_calls: toolCalls,
          };
        } else {
          return {
            role: "assistant",
            content: textContent,
          };
        }
      } else {
        // User messages - handle tool results separately
        const toolResults = msg.content.filter((p) => p.type === "tool_result");
        const textContent = msg.content
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("");

        // If there are tool results, they need to be separate messages
        if (toolResults.length > 0) {
          // This case is complex - tool results should be in separate messages
          // For now, we'll return the text content and handle tool results in conversion
          return {
            role: "user",
            content: textContent,
          };
        }

        return {
          role: "user",
          content: textContent,
        };
      }
    });

    // Flatten messages and add tool result messages
    const flatMessages: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const openaiMsg = openaiMessages[i];

      if (!msg) continue;

      // Check if this is a user message with ONLY tool results (no text content)
      const hasOnlyToolResults =
        msg.role === "user" &&
        msg.content.length > 0 &&
        msg.content.every((p) => p.type === "tool_result");

      // Only add the message if it's not a tool-result-only user message
      // (we'll add those as separate tool messages below)
      if (!hasOnlyToolResults) {
        flatMessages.push(openaiMsg);
      }

      // Add tool result messages after the previous assistant message
      const toolResults = msg.content.filter((p) => p.type === "tool_result");
      for (const toolResult of toolResults) {
        flatMessages.push({
          role: "tool",
          tool_call_id: toolResult.tool_use_id,
          content: toolResult.content || "",
        });
      }
    }

    // Convert tools to OpenAI format
    const openaiTools = tools.map((tool) => {
      const schema = zodToJsonSchema(tool.input_schema) as any;
      // Remove $schema property that zod-to-json-schema adds
      delete schema.$schema;

      return {
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: schema,
        },
      };
    });

    // Debug logging for message sequence
    console.log(
      "[OpenAIProvider] Sending messages:",
      JSON.stringify(
        flatMessages.map((m) => ({
          role: m.role,
          hasContent: !!m.content,
          hasToolCalls: !!m.tool_calls,
          toolCallId: m.tool_call_id,
        })),
        null,
        2
      )
    );

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: flatMessages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        stream: true,
      });

      let currentToolCall: {
        id: string;
        name: string;
        arguments: string;
      } | null = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (!delta) continue;

        // Handle text content
        if (delta.content) {
          yield {
            type: "text",
            text: delta.content,
          };
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name) {
              // New tool call starting
              console.log("[OpenAIProvider] Tool use:", toolCall.function.name);
              currentToolCall = {
                id: toolCall.id || "",
                name: toolCall.function.name,
                arguments: toolCall.function.arguments || "",
              };
            } else if (currentToolCall && toolCall.function?.arguments) {
              // Accumulate arguments
              currentToolCall.arguments += toolCall.function.arguments;
            }
          }
        }

        // Check if the chunk indicates completion and we have a tool call
        const finishReason = chunk.choices[0]?.finish_reason;
        if (finishReason === "tool_calls" && currentToolCall) {
          // Parse accumulated arguments
          const input = currentToolCall.arguments
            ? JSON.parse(currentToolCall.arguments)
            : {};

          yield {
            type: "tool_use",
            toolUse: {
              id: currentToolCall.id,
              name: currentToolCall.name,
              input: input as Record<string, unknown>,
            },
          };

          currentToolCall = null;
        }
      }

      console.log("[OpenAIProvider] Stream completed");
      yield { type: "done" };
    } catch (error: any) {
      console.error("[OpenAIProvider] Error:", error);
      console.error("[OpenAIProvider] Error details:", JSON.stringify(error, null, 2));
      if (error.message) {
        console.error("[OpenAIProvider] Error message:", error.message);
      }
      throw error;
    }
  }
}
