import { Tool } from "./base";
import { ReadFileTool } from "./read";

export const tools: Tool[] = [new ReadFileTool()];

export function getToolDefinitions() {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.schema,
  }));
}

export function executeTool(
  name: string,
  input: unknown,
  context: any
): Promise<string> {
  const tool = tools.find((t) => t.name === name);

  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const validatedInput = tool.schema.parse(input);
  return tool.execute(validatedInput, context);
}
