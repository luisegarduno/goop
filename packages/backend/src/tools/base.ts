import { z } from "zod";

export interface ToolContext {
  workingDir: string;
}

export interface Tool<TInput = any> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  execute(input: TInput, context: ToolContext): Promise<string>;
}
