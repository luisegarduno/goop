import { Tool } from "./base";
import { ReadFileTool } from "./read";
import { WriteFileTool } from "./write";
import { EditFileTool } from "./edit";
import { GrepTool } from "./grep";
import { GlobTool } from "./glob";

export const tools: Tool[] = [
  new ReadFileTool(),
  new WriteFileTool(),
  new EditFileTool(),
  new GrepTool(),
  new GlobTool(),
];

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
