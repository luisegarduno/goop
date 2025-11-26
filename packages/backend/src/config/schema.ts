import { z } from "zod";

export const MessageRoleSchema = z.enum(["user", "assistant"]);

export const MessagePartTypeSchema = z.enum([
  "text",
  "tool_use",
  "tool_result",
]);

export const TextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const ToolUsePartSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.record(z.unknown()),
});

export const ToolResultPartSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  content: z.string(),
  is_error: z.boolean().optional(),
});

export const MessagePartSchema = z.discriminatedUnion("type", [
  TextPartSchema,
  ToolUsePartSchema,
  ToolResultPartSchema,
]);
