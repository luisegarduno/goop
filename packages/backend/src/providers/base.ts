import { z } from "zod";

export interface ProviderMessage {
  role: "user" | "assistant";
  content: Array<{
    type: "text" | "tool_use" | "tool_result";
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string;
    is_error?: boolean;
  }>;
}

export interface StreamEvent {
  type: "text" | "tool_use" | "done";
  text?: string;
  toolUse?: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
}

export interface Provider {
  name: string;
  stream(
    messages: ProviderMessage[],
    tools: ToolDefinition[]
  ): AsyncGenerator<StreamEvent>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: z.ZodType<any>;
}
